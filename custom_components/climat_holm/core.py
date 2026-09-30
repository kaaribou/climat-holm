"""Climat HOLM : mise en place de l'intégration (services, WebSocket, carte)."""
from __future__ import annotations

import hashlib

import copy
import logging
from datetime import timedelta
from pathlib import Path

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED, Platform
from homeassistant.core import CoreState, HomeAssistant, ServiceCall, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.event import async_call_later
from homeassistant.util import dt as dt_util

from .const import (
    CARD_FILENAME,
    CARD_URL_PATH,
    DAYS,
    DOMAIN,
    MODE_AUTO,
    MODE_MANUAL,
    MODE_OFF,
    SEASON_COOL,
    SEASON_HEAT,
    VERSION,
)
from .manager import HVAC_CHOICES, OPTIONS, ClimatManager, clean_opts, clean_week, next_slot, slot_is_off

_LOGGER = logging.getLogger(__name__)
PLATFORMS = [Platform.CLIMATE, Platform.SELECT, Platform.SWITCH]
_CARD_KEY = f"{DOMAIN}_card"
_WS_KEY = f"{DOMAIN}_ws"
_SVC_KEY = f"{DOMAIN}_svc"

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


def _manager(hass: HomeAssistant) -> ClimatManager:
    for entry in hass.config_entries.async_loaded_entries(DOMAIN):
        return entry.runtime_data
    raise HomeAssistantError("Climat HOLM n'est pas chargé")


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    mgr = ClimatManager(hass)
    first = await mgr.async_load()
    if first:
        if entry.data.get("import_cs"):
            try:
                n = await mgr.async_import_climate_scheduler()
                _LOGGER.info("Climat HOLM : %s pièce(s) importée(s) depuis Climate Scheduler", n)
            except Exception:  # noqa: BLE001
                _LOGGER.warning("Import Climate Scheduler impossible", exc_info=True)
        known = {e for r in mgr.data["rooms"] for e in r["climates"]}
        for eid in entry.data.get("climates") or []:
            if eid not in known:
                mgr.new_room({"name": mgr.default_name(eid), "climates": [eid]})
        mgr.glob["running"] = bool(entry.data.get("start_running", False))
        mgr.save()
    entry.runtime_data = mgr

    from homeassistant.helpers import device_registry as dr
    from .const import NAME

    dr.async_get(hass).async_get_or_create(
        config_entry_id=entry.entry_id, identifiers={(DOMAIN, "hub")}, name=NAME, manufacturer="HOLM",
        model="Programmation chauffage & clim", sw_version=VERSION,
    )

    _register_ws(hass)
    _register_services(hass)

    async def _frontend(_event=None) -> None:
        await _register_card(hass)

    if hass.state == CoreState.running:
        await _frontend()
    else:
        hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, _frontend)

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    async def _start(_event=None) -> None:
        await mgr.async_start()

    if hass.state == CoreState.running:
        await _start()
    else:
        hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, _start)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    mgr: ClimatManager = entry.runtime_data
    await mgr.async_stop()
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)


async def _reload(hass: HomeAssistant) -> None:
    for entry in hass.config_entries.async_loaded_entries(DOMAIN):
        await entry.runtime_data._store.async_save(entry.runtime_data.data)  # noqa: SLF001
        hass.async_create_task(hass.config_entries.async_reload(entry.entry_id))


# ------------------------------------------------------------------ carte
def _card_digest() -> str:
    try:
        return hashlib.sha1((Path(__file__).parent / "www" / CARD_FILENAME).read_bytes()).hexdigest()[:8]
    except OSError:
        return "0"


async def _register_card(hass: HomeAssistant, _now=None) -> None:
    if not hass.data.get(_CARD_KEY):
        await hass.http.async_register_static_paths(
            [StaticPathConfig(CARD_URL_PATH, str(Path(__file__).parent / "www" / CARD_FILENAME), cache_headers=True)]
        )
        hass.data[_CARD_KEY] = True
    lovelace = hass.data.get("lovelace")
    resources = getattr(lovelace, "resources", None)
    if resources is None:
        async def _retry(_now) -> None:
            await _register_card(hass)

        async_call_later(hass, 5, _retry)
        return
    # version + empreinte du fichier : toute modification de la carte change l'URL,
    # ce qui force les navigateurs à recharger (le fichier est servi avec un long cache)
    digest = await hass.async_add_executor_job(_card_digest)
    url = f"{CARD_URL_PATH}?v={VERSION}-{digest}"
    if not hasattr(resources, "async_create_item"):
        add_extra_js_url(hass, url)
        return
    try:
        if not getattr(resources, "loaded", False):
            await resources.async_load()
        existing = next((i for i in resources.async_items() if str(i.get("url", "")).split("?", 1)[0] == CARD_URL_PATH), None)
        if existing is None:
            await resources.async_create_item({"res_type": "module", "url": url})
        elif existing.get("url") != url:
            await resources.async_update_item(existing["id"], {"url": url})
    except Exception:  # noqa: BLE001
        _LOGGER.warning("Impossible d'enregistrer la ressource Lovelace, repli sur add_extra_js_url", exc_info=True)
        add_extra_js_url(hass, url)


# ------------------------------------------------------------------ actions communes (carte + services)
async def do_room_action(hass: HomeAssistant, room_id: str, action: str, data: dict) -> None:
    mgr = _manager(hass)
    room = mgr.room(room_id)
    now = dt_util.now()
    s = mgr.settings
    if action == "mode":
        mode = data.get("mode")
        if mode not in (MODE_AUTO, MODE_MANUAL, MODE_OFF):
            raise HomeAssistantError("Mode inconnu")
        room["mode"] = mode
        room["override"] = None
        if mode == MODE_MANUAL and data.get("temp") is not None:
            room["manual_temp"] = float(data["temp"])
    elif action == "temp":
        temp = round(float(data["temp"]) * 2) / 2
        if room["mode"] == MODE_MANUAL:
            room["manual_temp"] = temp
        else:
            if room["mode"] == MODE_OFF:
                room["mode"] = MODE_AUTO
            _n, nxt_at = next_slot(mgr.week(room), now)
            until = data.get("until") or (nxt_at.isoformat() if nxt_at else (now + timedelta(hours=4)).isoformat())
            room["override"] = {"temp": temp, "until": until}
            room["boost_until"] = None
    elif action == "boost":
        minutes = int(data.get("minutes") or s["boost_minutes"])
        room["boost_until"] = (now + timedelta(minutes=minutes)).isoformat() if minutes > 0 else None
    elif action == "next_slot":
        week = mgr.week(room)
        nxt, nxt_at = next_slot(week, now)
        if nxt is None:
            raise HomeAssistantError("Aucun créneau suivant")
        after, after_at = next_slot(week, nxt_at + timedelta(minutes=1))
        until = (after_at or nxt_at + timedelta(days=1)).isoformat()
        if slot_is_off(nxt):
            room["override"] = {"off": True, "until": until}
        else:
            room["override"] = {"temp": nxt.get("temp"), "hvac": nxt.get("hvac"),
                                "opts": {k: nxt[k] for k in OPTIONS if nxt.get(k)}, "until": until}
        room["boost_until"] = None
        if room["mode"] == MODE_OFF:
            room["mode"] = MODE_AUTO
    elif action == "manual_opts":
        # mode et options utilisés en mode Manuel (hvac None = mode de la saison)
        if "hvac" in data:
            room["manual_hvac"] = data["hvac"] if data["hvac"] in HVAC_CHOICES else None
        if "opts" in data:
            room["manual_opts"] = clean_opts(data["opts"])
    elif action == "cancel":
        room["override"] = None
        room["boost_until"] = None
    else:
        raise HomeAssistantError(f"Action inconnue : {action}")
    await mgr.async_changed()


async def do_global(hass: HomeAssistant, data: dict) -> None:
    mgr = _manager(hass)
    g = mgr.glob
    if "running" in data:
        g["running"] = bool(data["running"])
        if g["running"]:
            for rt in mgr.runtime.values():
                rt["sig"] = None
    if "profile" in data:
        if data["profile"] not in mgr.data["profiles"]:
            raise HomeAssistantError("Profil inconnu")
        g["profile"] = data["profile"]
        for r in mgr.data["rooms"]:
            r["override"] = None
    if "season" in data:
        if data["season"] not in (SEASON_HEAT, SEASON_COOL):
            raise HomeAssistantError("Saison inconnue")
        g["season"] = data["season"]
    if "away" in data:
        g["away"] = bool(data["away"])
        g["away_until"] = data.get("away_until") if g["away"] else None
    if "all_off" in data:
        g["all_off"] = bool(data["all_off"])
    await mgr.async_changed()


# ------------------------------------------------------------------ services
@callback
def _register_services(hass: HomeAssistant) -> None:
    if hass.data.get(_SVC_KEY):
        return
    hass.data[_SVC_KEY] = True

    def _room_ids(call: ServiceCall) -> list[str]:
        mgr = _manager(hass)
        ids = call.data.get("entity_id") or []
        if isinstance(ids, str):
            ids = [ids]
        out = []
        for eid in ids:
            st = hass.states.get(eid)
            rid = st and st.attributes.get("room_id")
            if rid:
                out.append(rid)
        if call.data.get("room"):
            name = str(call.data["room"]).lower()
            out += [r["id"] for r in mgr.data["rooms"] if r["name"].lower() == name or r["id"] == name]
        if not out:
            raise HomeAssistantError("Aucune pièce Climat HOLM ciblée")
        return out

    async def boost(call: ServiceCall) -> None:
        for rid in _room_ids(call):
            await do_room_action(hass, rid, "boost", {"minutes": call.data.get("minutes")})

    async def next_(call: ServiceCall) -> None:
        for rid in _room_ids(call):
            await do_room_action(hass, rid, "next_slot", {})

    async def cancel(call: ServiceCall) -> None:
        for rid in _room_ids(call):
            await do_room_action(hass, rid, "cancel", {})

    async def set_profile(call: ServiceCall) -> None:
        await do_global(hass, {"profile": call.data["profile"]})

    async def set_away(call: ServiceCall) -> None:
        until = call.data.get("until")
        await do_global(hass, {"away": call.data.get("away", True), "away_until": until.isoformat() if hasattr(until, "isoformat") else until})

    target = {vol.Optional("entity_id"): cv.entity_ids, vol.Optional("room"): cv.string}
    hass.services.async_register(DOMAIN, "boost", boost, schema=vol.Schema({**target, vol.Optional("minutes"): vol.All(vol.Coerce(int), vol.Range(min=0, max=720))}))
    hass.services.async_register(DOMAIN, "next_slot", next_, schema=vol.Schema(target))
    hass.services.async_register(DOMAIN, "cancel_override", cancel, schema=vol.Schema(target))
    hass.services.async_register(DOMAIN, "set_profile", set_profile, schema=vol.Schema({vol.Required("profile"): cv.string}))
    hass.services.async_register(DOMAIN, "set_away", set_away, schema=vol.Schema({vol.Optional("away", default=True): cv.boolean, vol.Optional("until"): cv.datetime}))


# ------------------------------------------------------------------ websocket
@callback
def _register_ws(hass: HomeAssistant) -> None:
    if hass.data.get(_WS_KEY):
        return
    for fn in (ws_data, ws_subscribe, ws_room_save, ws_room_delete, ws_schedule, ws_action, ws_global, ws_profile, ws_settings, ws_import):
        websocket_api.async_register_command(hass, fn)
    hass.data[_WS_KEY] = True


def _payload(hass: HomeAssistant) -> dict:
    mgr = _manager(hass)
    rooms = []
    for r in mgr.data["rooms"]:
        rooms.append({**copy.deepcopy(r), "state": mgr.room_state(r), "entity_id": _room_entity(hass, r["id"])})
    return {
        "version": VERSION,
        "settings": mgr.settings,
        "profiles": mgr.data["profiles"],
        "global": mgr.glob,
        "rooms": rooms,
        "days": DAYS,
        "has_climate_scheduler": hass.services.has_service("climate_scheduler", "get_groups"),
        "now": dt_util.now().isoformat(),
    }


def _room_entity(hass: HomeAssistant, room_id: str) -> str | None:
    from homeassistant.helpers import entity_registry as er

    return er.async_get(hass).async_get_entity_id("climate", DOMAIN, f"{DOMAIN}_room_{room_id}")


def _wrap(fn):
    async def inner(hass, connection, msg):
        try:
            await fn(hass, connection, msg)
        except (KeyError, HomeAssistantError, ValueError) as err:
            connection.send_error(msg["id"], "climat_holm_error", str(err) or "Pièce introuvable")
    return inner


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/data"})
@callback
def ws_data(hass, connection, msg) -> None:
    try:
        connection.send_result(msg["id"], _payload(hass))
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "not_loaded", str(err))


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/subscribe"})
@callback
def ws_subscribe(hass, connection, msg) -> None:
    mgr = _manager(hass)

    @callback
    def forward() -> None:
        connection.send_message(websocket_api.event_message(msg["id"], {"changed": True}))

    connection.subscriptions[msg["id"]] = mgr.add_listener(forward)
    connection.send_result(msg["id"])


ROOM_SCHEMA = vol.Schema({
    vol.Optional("id"): str,
    vol.Required("name"): vol.All(str, vol.Length(min=1, max=40)),
    vol.Optional("icon"): vol.Any(None, str),
    vol.Required("climates"): [str],
    vol.Optional("temp_sensor"): vol.Any(None, str),
    vol.Optional("windows"): [str],
    vol.Optional("opts"): vol.Any(None, dict),
}, extra=vol.REMOVE_EXTRA)


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/room/save", vol.Required("room"): dict})
@websocket_api.async_response
@_wrap
async def ws_room_save(hass, connection, msg) -> None:
    mgr = _manager(hass)
    cfg = ROOM_SCHEMA(msg["room"])
    if not cfg["climates"]:
        raise HomeAssistantError("Choisissez au moins un appareil")
    if cfg.get("id"):
        room = mgr.room(cfg["id"])
        renamed = room["name"] != cfg["name"]
        cfg["opts"] = clean_opts(cfg.get("opts"))
        room.update({k: v for k, v in cfg.items() if k != "id"})
        await mgr.async_changed(retrack=True)
        if renamed:
            await _reload(hass)
        connection.send_result(msg["id"], {"id": room["id"]})
    else:
        room = mgr.new_room(cfg)
        await mgr.async_changed(retrack=True)
        await _reload(hass)
        connection.send_result(msg["id"], {"id": room["id"]})


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/room/delete", vol.Required("room_id"): str})
@websocket_api.async_response
@_wrap
async def ws_room_delete(hass, connection, msg) -> None:
    mgr = _manager(hass)
    room = mgr.room(msg["room_id"])
    mgr.data["rooms"].remove(room)
    from homeassistant.helpers import entity_registry as er

    reg = er.async_get(hass)
    eid = reg.async_get_entity_id("climate", DOMAIN, f"{DOMAIN}_room_{room['id']}")
    if eid:
        reg.async_remove(eid)
    await mgr.async_changed(retrack=True)
    connection.send_result(msg["id"])


@websocket_api.websocket_command({
    vol.Required("type"): f"{DOMAIN}/schedule",
    vol.Required("room_id"): str,
    vol.Optional("profile"): str,
    vol.Required("days"): dict,
    vol.Optional("apply_to"): [str],
})
@websocket_api.async_response
@_wrap
async def ws_schedule(hass, connection, msg) -> None:
    mgr = _manager(hass)
    prof = msg.get("profile") or mgr.glob["profile"]
    if prof not in mgr.data["profiles"]:
        raise HomeAssistantError("Profil inconnu")
    week = clean_week(msg["days"])
    targets = [msg["room_id"]] + [r for r in msg.get("apply_to") or [] if r != msg["room_id"]]
    for rid in targets:
        room = mgr.room(rid)
        room["schedules"][prof] = copy.deepcopy(week)
        room["override"] = None
    await mgr.async_changed()
    connection.send_result(msg["id"])


@websocket_api.websocket_command({
    vol.Required("type"): f"{DOMAIN}/action",
    vol.Required("room_id"): str,
    vol.Required("action"): str,
    vol.Optional("mode"): str,
    vol.Optional("temp"): vol.Coerce(float),
    vol.Optional("minutes"): vol.Coerce(int),
    vol.Optional("hvac"): vol.Any(None, str),
    vol.Optional("opts"): vol.Any(None, dict),
})
@websocket_api.async_response
@_wrap
async def ws_action(hass, connection, msg) -> None:
    await do_room_action(hass, msg["room_id"], msg["action"], msg)
    connection.send_result(msg["id"])


@websocket_api.websocket_command({
    vol.Required("type"): f"{DOMAIN}/global",
    vol.Optional("running"): bool,
    vol.Optional("profile"): str,
    vol.Optional("season"): str,
    vol.Optional("away"): bool,
    vol.Optional("away_until"): vol.Any(None, str),
    vol.Optional("all_off"): bool,
})
@websocket_api.async_response
@_wrap
async def ws_global(hass, connection, msg) -> None:
    await do_global(hass, {k: v for k, v in msg.items() if k not in ("id", "type")})
    connection.send_result(msg["id"])


@websocket_api.websocket_command({
    vol.Required("type"): f"{DOMAIN}/profile",
    vol.Required("op"): vol.In(["add", "rename", "delete"]),
    vol.Required("name"): vol.All(str, vol.Length(min=1, max=30)),
    vol.Optional("new_name"): vol.All(str, vol.Length(min=1, max=30)),
    vol.Optional("source"): str,
})
@websocket_api.async_response
@_wrap
async def ws_profile(hass, connection, msg) -> None:
    mgr = _manager(hass)
    profiles = mgr.data["profiles"]
    name = msg["name"].strip()
    if msg["op"] == "add":
        if name in profiles:
            raise HomeAssistantError("Ce profil existe déjà")
        src = msg.get("source") or mgr.glob["profile"]
        profiles.append(name)
        for r in mgr.data["rooms"]:
            r["schedules"][name] = copy.deepcopy(r["schedules"].get(src) or {})
    elif msg["op"] == "rename":
        new = (msg.get("new_name") or "").strip()
        if name not in profiles or not new or new in profiles:
            raise HomeAssistantError("Renommage impossible")
        profiles[profiles.index(name)] = new
        for r in mgr.data["rooms"]:
            r["schedules"][new] = r["schedules"].pop(name, {})
        if mgr.glob["profile"] == name:
            mgr.glob["profile"] = new
    else:
        if name not in profiles or len(profiles) <= 1:
            raise HomeAssistantError("Il faut garder au moins un profil")
        profiles.remove(name)
        for r in mgr.data["rooms"]:
            r["schedules"].pop(name, None)
        if mgr.glob["profile"] == name:
            mgr.glob["profile"] = profiles[0]
    for r in mgr.data["rooms"]:
        mgr._fix_room(r)  # noqa: SLF001
    await mgr.async_changed()
    await _reload(hass)
    connection.send_result(msg["id"])


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/settings", vol.Required("settings"): dict})
@websocket_api.async_response
@_wrap
async def ws_settings(hass, connection, msg) -> None:
    mgr = _manager(hass)
    allowed = {"boost_temp": float, "boost_minutes": int, "away_temp": float, "cool_away_off": bool, "window_delay": int, "manual_temp": float, "comfort_temp": float}
    for k, v in msg["settings"].items():
        if k in allowed and v is not None:
            mgr.settings[k] = allowed[k](v)
    await mgr.async_changed()
    connection.send_result(msg["id"])


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/import_climate_scheduler"})
@websocket_api.async_response
@_wrap
async def ws_import(hass, connection, msg) -> None:
    mgr = _manager(hass)
    n = await mgr.async_import_climate_scheduler()
    await mgr.async_changed(retrack=True)
    if n:
        await _reload(hass)
    connection.send_result(msg["id"], {"imported": n})
