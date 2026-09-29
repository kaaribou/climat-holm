"""Cœur de Climat HOLM : pièces, plannings, profils et pilotage des thermostats."""
from __future__ import annotations

import copy
import logging
import re
import uuid
from datetime import datetime, timedelta
from typing import Any, Callable

from homeassistant.components.climate import HVACMode
from homeassistant.const import ATTR_ENTITY_ID, STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers.event import async_track_state_change_event, async_track_time_interval
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import (
    DAYS,
    DEFAULT_PROFILE,
    DEFAULT_SETTINGS,
    DEFAULT_WEEK,
    MODE_AUTO,
    MODE_MANUAL,
    MODE_OFF,
    SEASON_COOL,
    SEASON_HEAT,
    STORAGE_KEY,
    STORAGE_VERSION,
    TICK_SECONDS,
)

_LOGGER = logging.getLogger(__name__)

TIME_RE = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)$")
# modes CVC qu'un créneau peut imposer (sinon : mode de la saison)
HVAC_CHOICES = ("heat", "cool", "heat_cool", "auto", "dry", "fan_only")
# options d'appareil : clé interne -> (attribut liste, service, champ, attribut courant)
OPTIONS = {
    "preset": ("preset_modes", "set_preset_mode", "preset_mode", "preset_mode"),
    "fan": ("fan_modes", "set_fan_mode", "fan_mode", "fan_mode"),
    "swing": ("swing_modes", "set_swing_mode", "swing_mode", "swing_mode"),
    "hswing": ("swing_horizontal_modes", "set_swing_horizontal_mode", "swing_horizontal_mode", "swing_horizontal_mode"),
}
NO_TEMP_HVAC = ("fan_only",)


def clean_opts(o: dict | None) -> dict:
    return {k: str(v) for k, v in (o or {}).items() if k in OPTIONS and v not in (None, "")}


# ---------------------------------------------------------------------------
#  Outils planning (fonctions pures, testables)
# ---------------------------------------------------------------------------
def _minutes(t: str) -> int:
    h, m = t.split(":")
    return int(h) * 60 + int(m)


def clean_day(slots: list[dict]) -> list[dict]:
    """Normalise une journée : créneaux valides, triés, sans doublon d'heure."""
    out: dict[str, dict] = {}
    for s in slots or []:
        t = str(s.get("t") or s.get("time") or "").strip()
        if len(t) == 4 and t[1] == ":":
            t = "0" + t
        if not TIME_RE.match(t):
            continue
        if s.get("off"):
            out[t] = {"t": t, "off": True}
            continue
        hvac = s.get("hvac") if s.get("hvac") in HVAC_CHOICES else None
        slot: dict[str, Any] = {"t": t}
        try:
            slot["temp"] = round(float(s.get("temp")) * 2) / 2
        except (TypeError, ValueError):
            if hvac not in NO_TEMP_HVAC:
                continue
        if hvac:
            slot["hvac"] = hvac
        slot.update(clean_opts({k: s.get(k) for k in OPTIONS}))
        out[t] = slot
    return [out[k] for k in sorted(out, key=_minutes)]


def clean_week(days: dict) -> dict:
    return {d: clean_day((days or {}).get(d, [])) for d in DAYS}


def slot_at(week: dict, now: datetime) -> tuple[dict | None, datetime | None]:
    """Créneau actif à `now` (en remontant aux jours précédents) et son début."""
    cur_min = now.hour * 60 + now.minute
    for back in range(0, 8):
        day = DAYS[(now.weekday() - back) % 7]
        slots = week.get(day) or []
        cands = [s for s in slots if back > 0 or _minutes(s["t"]) <= cur_min]
        if cands:
            s = cands[-1]
            base = (now - timedelta(days=back)).replace(hour=0, minute=0, second=0, microsecond=0)
            return s, base + timedelta(minutes=_minutes(s["t"]))
    return None, None


def next_slot(week: dict, now: datetime) -> tuple[dict | None, datetime | None]:
    """Prochain changement de créneau après `now`."""
    cur_min = now.hour * 60 + now.minute
    for fwd in range(0, 8):
        day = DAYS[(now.weekday() + fwd) % 7]
        for s in week.get(day) or []:
            m = _minutes(s["t"])
            if fwd == 0 and m <= cur_min:
                continue
            base = (now + timedelta(days=fwd)).replace(hour=0, minute=0, second=0, microsecond=0)
            return s, base + timedelta(minutes=m)
    return None, None


def slot_value(s: dict | None) -> float | None:
    """Température d'un créneau, ou None (arrêt, ou ventilation seule)."""
    if not s or s.get("off") or s.get("temp") is None:
        return None
    return float(s["temp"])


def slot_is_off(s: dict | None) -> bool:
    return not s or bool(s.get("off"))


# ---------------------------------------------------------------------------
class ClimatManager:
    """Stockage + moteur de pilotage."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self._store: Store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self.data: dict[str, Any] = {}
        self.runtime: dict[str, dict] = {}  # par pièce : état calculé, fenêtres, dernier envoi
        self._listeners: list[Callable[[], None]] = []
        self._unsubs: list[Callable[[], None]] = []
        self._room_unsubs: list[Callable[[], None]] = []

    # ------------------------------------------------------------ stockage
    async def async_load(self) -> bool:
        """Charge les données ; retourne True si c'est la première fois."""
        raw = await self._store.async_load()
        first = raw is None
        raw = raw or {}
        self.data = {
            "settings": {**DEFAULT_SETTINGS, **(raw.get("settings") or {})},
            "profiles": raw.get("profiles") or [DEFAULT_PROFILE],
            "global": {
                "running": False,
                "profile": None,
                "season": SEASON_HEAT,
                "away": False,
                "away_until": None,
                "all_off": False,
                **(raw.get("global") or {}),
            },
            "rooms": raw.get("rooms") or [],
        }
        g = self.data["global"]
        if g["profile"] not in self.data["profiles"]:
            g["profile"] = self.data["profiles"][0]
        for room in self.data["rooms"]:
            self._fix_room(room)
        return first

    def _fix_room(self, room: dict) -> dict:
        room.setdefault("id", uuid.uuid4().hex[:10])
        room.setdefault("name", "Pièce")
        room.setdefault("icon", "mdi:radiator")
        room.setdefault("climates", [])
        room.setdefault("temp_sensor", None)
        room.setdefault("windows", [])
        room.setdefault("mode", MODE_AUTO)
        room.setdefault("manual_temp", self.data["settings"]["manual_temp"])
        room.setdefault("schedules", {})
        room.setdefault("override", None)
        room.setdefault("boost_until", None)
        room.setdefault("opts", {})
        if room.get("fan_mode") and "fan" not in room["opts"]:
            room["opts"]["fan"] = room["fan_mode"]
        room.pop("fan_mode", None)
        room["opts"] = clean_opts(room["opts"])
        room.setdefault("manual_hvac", None)
        room.setdefault("manual_opts", {})
        for p in self.data["profiles"]:
            if p not in room["schedules"]:
                room["schedules"][p] = clean_week(copy.deepcopy(DEFAULT_WEEK))
        for p in list(room["schedules"]):
            if p not in self.data["profiles"]:
                del room["schedules"][p]
            else:
                room["schedules"][p] = clean_week(room["schedules"][p])
        return room

    @callback
    def save(self) -> None:
        self._store.async_delay_save(lambda: self.data, 2)

    # ------------------------------------------------------------ accès
    def room(self, room_id: str) -> dict:
        for r in self.data["rooms"]:
            if r["id"] == room_id:
                return r
        raise KeyError(room_id)

    @property
    def settings(self) -> dict:
        return self.data["settings"]

    @property
    def glob(self) -> dict:
        return self.data["global"]

    def week(self, room: dict) -> dict:
        prof = self.glob["profile"]
        return room["schedules"].get(prof) or room["schedules"].get(self.data["profiles"][0]) or {}

    # ------------------------------------------------------------ écouteurs
    @callback
    def add_listener(self, fn: Callable[[], None]) -> Callable[[], None]:
        self._listeners.append(fn)

        def _remove() -> None:
            if fn in self._listeners:
                self._listeners.remove(fn)

        return _remove

    @callback
    def notify(self) -> None:
        for fn in list(self._listeners):
            try:
                fn()
            except Exception:  # noqa: BLE001
                _LOGGER.exception("Erreur dans un écouteur Climat HOLM")

    # ------------------------------------------------------------ démarrage
    async def async_start(self) -> None:
        self._unsubs.append(async_track_time_interval(self.hass, self._tick, timedelta(seconds=TICK_SECONDS)))
        self._track_rooms()
        await self.async_evaluate(force=True)

    @callback
    def _track_rooms(self) -> None:
        for u in self._room_unsubs:
            u()
        self._room_unsubs = []
        watched: set[str] = set()
        for r in self.data["rooms"]:
            watched.update(r.get("windows") or [])
            watched.update(r.get("climates") or [])
            if r.get("temp_sensor"):
                watched.add(r["temp_sensor"])
        if watched:
            self._room_unsubs.append(async_track_state_change_event(self.hass, list(watched), self._on_state))

    async def async_stop(self) -> None:
        for u in self._unsubs + self._room_unsubs:
            u()
        self._unsubs, self._room_unsubs = [], []

    @callback
    def _on_state(self, event: Event) -> None:
        eid = event.data.get(ATTR_ENTITY_ID)
        is_window = any(eid in (r.get("windows") or []) for r in self.data["rooms"])
        if is_window:
            self.hass.async_create_task(self.async_evaluate())
        else:
            self.notify()

    async def _tick(self, _now=None) -> None:
        await self.async_evaluate()

    # ------------------------------------------------------------ calcul
    def _window_open(self, room: dict, now: datetime) -> bool:
        rt = self.runtime.setdefault(room["id"], {})
        opened = [w for w in room.get("windows") or [] if (st := self.hass.states.get(w)) and st.state == "on"]
        if not opened:
            rt["window_since"] = None
            return False
        since = rt.get("window_since")
        if since is None:
            rt["window_since"] = since = now
        return (now - since).total_seconds() >= float(self.settings.get("window_delay", 60))

    def compute(self, room: dict, now: datetime | None = None) -> dict:
        """Consigne voulue pour une pièce (sans effet de bord hormis l'expiration des dérogations)."""
        now = now or dt_util.now()
        g, s = self.glob, self.settings
        season = g.get("season", SEASON_HEAT)
        week = self.week(room)
        cur, cur_start = slot_at(week, now)
        nxt, nxt_at = next_slot(week, now)
        out: dict[str, Any] = {
            "hvac": "off", "temp": None, "source": "schedule", "until": None,
            "slot_temp": slot_value(cur), "slot_start": cur_start.isoformat() if cur_start else None,
            "next_at": nxt_at.isoformat() if nxt_at else None, "next_temp": slot_value(nxt), "next_off": bool(nxt and nxt.get("off")),
            "next_hvac": (nxt or {}).get("hvac"), "slot_hvac": (cur or {}).get("hvac"),
            "window_open": False, "opts": {},
        }
        room_opts = clean_opts(room.get("opts"))

        def on(temp: float | None, source: str, until: datetime | str | None = None,
               hvac: str | None = None, opts: dict | None = None, off: bool | None = None) -> dict:
            is_off = (temp is None) if off is None else off
            if is_off:
                out.update(hvac="off", temp=None, source=source, opts={})
            else:
                h = hvac or season
                out.update(hvac=h, temp=None if h in NO_TEMP_HVAC or temp is None else float(temp), source=source,
                           opts={**room_opts, **clean_opts(opts)})
            if until is not None:
                out["until"] = until.isoformat() if isinstance(until, datetime) else until
            return out

        cur_on = not slot_is_off(cur)
        cur_hvac = cur.get("hvac") if cur_on else None
        cur_opts = {k: cur[k] for k in OPTIONS if cur_on and cur.get(k)}

        # expiration des dérogations
        bu = room.get("boost_until")
        if bu and dt_util.parse_datetime(bu) and dt_util.parse_datetime(bu) <= now:
            room["boost_until"] = None
            self.save()
        ov = room.get("override")
        if ov and ov.get("until") and dt_util.parse_datetime(ov["until"]) and dt_util.parse_datetime(ov["until"]) <= now:
            room["override"] = None
            self.save()
        au = g.get("away_until")
        if g.get("away") and au and dt_util.parse_datetime(au) and dt_util.parse_datetime(au) <= now:
            g["away"], g["away_until"] = False, None
            self.save()

        if not g.get("running"):
            out["source"] = "paused"
            return out
        if g.get("all_off"):
            return on(None, "all_off")
        if self._window_open(room, now):
            out["window_open"] = True
            return on(None, "window")
        if room.get("mode") == MODE_OFF:
            return on(None, "room_off")
        if room.get("boost_until"):
            return on(float(s["boost_temp"]), "boost", room["boost_until"])
        if g.get("away"):
            if season == SEASON_COOL and s.get("cool_away_off", True):
                return on(None, "away", g.get("away_until"))
            return on(float(s["away_temp"]), "away", g.get("away_until"))
        if room.get("mode") == MODE_MANUAL:
            return on(float(room.get("manual_temp") or s["manual_temp"]), "manual",
                      hvac=room.get("manual_hvac"), opts=room.get("manual_opts"), off=False)
        if room.get("override"):
            ov = room["override"]
            if ov.get("off"):
                return on(None, "override", ov.get("until"))
            return on(ov.get("temp"), "override", ov.get("until"), hvac=ov.get("hvac", cur_hvac),
                      opts=ov.get("opts", cur_opts), off=False)
        return on(slot_value(cur), "schedule", nxt_at, hvac=cur_hvac, opts=cur_opts, off=not cur_on)

    # ------------------------------------------------------------ pilotage
    async def async_evaluate(self, force: bool = False) -> None:
        now = dt_util.now()
        for room in list(self.data["rooms"]):
            want = self.compute(room, now)
            rt = self.runtime.setdefault(room["id"], {})
            rt["desired"] = want
            if want["source"] == "paused":
                rt["sig"] = None
                continue
            sig = (want["hvac"], want["temp"], tuple(sorted((want.get("opts") or {}).items())))
            if not force and rt.get("sig") == sig:
                continue
            ok = await self._apply(room, want)
            if ok:
                rt["sig"] = sig
        self.notify()

    async def _apply(self, room: dict, want: dict) -> bool:
        ok = True
        for eid in room.get("climates") or []:
            st = self.hass.states.get(eid)
            if st is None or st.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
                ok = False
                continue
            modes = st.attributes.get("hvac_modes") or []
            hvac = want["hvac"]
            if hvac not in modes and hvac in ("heat_cool", "auto"):
                hvac = "auto" if "auto" in modes else "heat_cool" if "heat_cool" in modes else hvac
            call = self.hass.services.async_call
            try:
                if hvac == "off" or hvac not in modes:
                    if st.state != HVACMode.OFF:
                        await call("climate", "set_hvac_mode", {ATTR_ENTITY_ID: eid, "hvac_mode": HVACMode.OFF}, blocking=True)
                    continue
                if st.state != hvac:
                    await call("climate", "set_hvac_mode", {ATTR_ENTITY_ID: eid, "hvac_mode": hvac}, blocking=True)
                opts = want.get("opts") or {}
                # préréglage d'abord : certains appareils changent la consigne avec
                for key in ("preset",):
                    await self._apply_opt(eid, key, opts.get(key))
                temp = self._clamp(st, want["temp"]) if hvac not in NO_TEMP_HVAC else None
                fresh = self.hass.states.get(eid) or st
                cur_t = fresh.attributes.get("temperature")
                if temp is not None and "temperature" in fresh.attributes and (cur_t is None or abs(float(cur_t) - temp) > 0.01):
                    await call("climate", "set_temperature", {ATTR_ENTITY_ID: eid, "temperature": temp}, blocking=True)
                for key in ("fan", "swing", "hswing"):
                    await self._apply_opt(eid, key, opts.get(key))
            except Exception as err:  # noqa: BLE001
                ok = False
                _LOGGER.warning("Climat HOLM : impossible de piloter %s : %s", eid, err)
        return ok

    async def _apply_opt(self, eid: str, key: str, value: str | None) -> None:
        """Applique une option (ventilation, oscillation, préréglage) si l'appareil la connaît."""
        if not value:
            return
        st = self.hass.states.get(eid)
        if st is None:
            return
        lst_attr, service, field, cur_attr = OPTIONS[key]
        if value not in (st.attributes.get(lst_attr) or []) or st.attributes.get(cur_attr) == value:
            return
        await self.hass.services.async_call("climate", service, {ATTR_ENTITY_ID: eid, field: value}, blocking=True)

    @staticmethod
    def _clamp(st, temp: float | None) -> float | None:
        if temp is None:
            return None
        lo = st.attributes.get("min_temp")
        hi = st.attributes.get("max_temp")
        step = float(st.attributes.get("target_temp_step") or 0.5)
        if lo is not None:
            temp = max(float(lo), temp)
        if hi is not None:
            temp = min(float(hi), temp)
        return round(round(temp / step) * step, 2)

    # ------------------------------------------------------------ infos pièce
    def room_state(self, room: dict) -> dict:
        rt = self.runtime.get(room["id"], {})
        want = rt.get("desired") or self.compute(room)
        temps, actions, units_on = [], [], 0
        for eid in room.get("climates") or []:
            st = self.hass.states.get(eid)
            if not st or st.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
                continue
            if st.state != "off":
                units_on += 1
            if st.attributes.get("current_temperature") is not None:
                temps.append(float(st.attributes["current_temperature"]))
            if st.attributes.get("hvac_action"):
                actions.append(st.attributes["hvac_action"])
        current = None
        hum = None
        ts = room.get("temp_sensor")
        if ts and (st := self.hass.states.get(ts)):
            try:
                current = float(st.state)
            except (TypeError, ValueError):
                current = None
        if current is None and temps:
            current = round(sum(temps) / len(temps), 1)
        action = "heating" if "heating" in actions else "cooling" if "cooling" in actions else ("idle" if units_on else "off")
        return {**want, "current": current, "humidity": hum, "action": action, "units_on": units_on}

    # ------------------------------------------------------------ modifications
    async def async_changed(self, reapply: bool = True, retrack: bool = False) -> None:
        self.save()
        if retrack:
            self._track_rooms()
        if reapply:
            await self.async_evaluate()
        else:
            self.notify()

    def new_room(self, cfg: dict) -> dict:
        room = self._fix_room({k: v for k, v in cfg.items() if k != "id"})
        self.data["rooms"].append(room)
        return room

    def default_name(self, entity_id: str) -> str:
        st = self.hass.states.get(entity_id)
        name = (st and st.attributes.get("friendly_name")) or entity_id.split(".", 1)[1]
        return re.sub(r"^(Chauffage|Climatisation|Radiateur|Clim)\s+(du|de la|de l'|des|de|d')\s*", "", name, flags=re.I).strip().capitalize() or name

    # ------------------------------------------------------------ import Climate Scheduler
    async def async_import_climate_scheduler(self) -> int:
        """Crée une pièce par groupe Climate Scheduler, avec son planning actif."""
        if not self.hass.services.has_service("climate_scheduler", "get_groups"):
            return 0
        resp = await self.hass.services.async_call("climate_scheduler", "get_groups", {}, blocking=True, return_response=True)
        groups = (resp or {}).get("groups") or {}
        count = 0
        existing = {tuple(sorted(r["climates"])) for r in self.data["rooms"]}
        for gname, g in groups.items():
            ents = [e for e in g.get("entities") or [] if e.startswith("climate.")]
            if not ents or tuple(sorted(ents)) in existing:
                continue
            prof = (g.get("profiles") or {}).get(g.get("active_profile")) or {}
            mode = prof.get("schedule_mode") or g.get("schedule_mode") or "individual"
            sch = prof.get("schedules") or g.get("schedules") or {}

            def conv(lst):
                return clean_day([{
                    "t": s.get("time"), "off": s.get("hvac_mode") == "off", "temp": s.get("temp"),
                    "hvac": s.get("hvac_mode") if s.get("hvac_mode") not in (None, "off", "heat") else None,
                    "fan": s.get("fan_mode"), "swing": s.get("swing_mode"), "preset": s.get("preset_mode"),
                } for s in lst or []])

            week: dict[str, list] = {}
            for d in DAYS:
                if mode == "all_days":
                    src = sch.get("all_days")
                elif mode == "5/2":
                    src = sch.get("weekend") if d in ("sat", "sun") else sch.get("weekday")
                else:
                    src = sch.get(d)
                week[d] = conv(src)
            name = re.sub(r"^(Chauffage|Climatisation)\s+(du|de la|de l'|des|de|d')\s*", "", gname, flags=re.I).strip()
            name = name[:1].upper() + name[1:] if name else gname
            room = self.new_room({"name": name, "climates": ents})
            room["schedules"] = {p: copy.deepcopy(week) for p in self.data["profiles"]}
            count += 1
        return count
