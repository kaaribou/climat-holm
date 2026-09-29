"""Thermostat virtuel par pièce : mode Auto (planning), Manuel, Arrêt."""
from __future__ import annotations

from typing import Any

from homeassistant.components.climate import ClimateEntity, ClimateEntityFeature, HVACAction, HVACMode
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import ATTR_TEMPERATURE, UnitOfTemperature
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.util import slugify

from .const import DOMAIN, MODE_AUTO, MODE_MANUAL, MODE_OFF, SEASON_COOL, VERSION
from .entity import ClimatEntity

PRESET_NONE = "none"
PRESET_BOOST = "boost"


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    mgr = entry.runtime_data
    async_add_entities(RoomClimate(mgr, r["id"]) for r in mgr.data["rooms"])


class RoomClimate(ClimatEntity, ClimateEntity):
    _attr_temperature_unit = UnitOfTemperature.CELSIUS
    _attr_target_temperature_step = 0.5
    _attr_min_temp = 5
    _attr_max_temp = 30
    _attr_preset_modes = [PRESET_NONE, PRESET_BOOST]
    _attr_translation_key = "room"
    _enable_turn_on_off_backwards_compatibility = False

    def __init__(self, mgr, room_id: str) -> None:
        super().__init__(mgr)
        self.room_id = room_id
        room = mgr.room(room_id)
        self._attr_unique_id = f"{DOMAIN}_room_{room_id}"
        self._attr_name = None
        # identifiant explicite (climate.holm_<pièce>) pour ne jamais se confondre avec les vrais appareils
        self.entity_id = f"climate.holm_{slugify(room['name']) or room_id}"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, f"room_{room_id}")}, name=room["name"], manufacturer="HOLM", model="Pièce Climat HOLM",
            sw_version=VERSION, via_device=(DOMAIN, "hub"),
        )
        self._attr_icon = room.get("icon") or "mdi:radiator"
        self._attr_supported_features = (
            ClimateEntityFeature.TARGET_TEMPERATURE | ClimateEntityFeature.PRESET_MODE
            | ClimateEntityFeature.TURN_ON | ClimateEntityFeature.TURN_OFF
        )

    @property
    def room(self) -> dict:
        return self.mgr.room(self.room_id)

    @property
    def _state(self) -> dict:
        return self.mgr.room_state(self.room)

    @property
    def available(self) -> bool:
        try:
            self.room
        except KeyError:
            return False
        return True

    @property
    def _season_mode(self) -> HVACMode:
        return HVACMode.COOL if self.mgr.glob.get("season") == SEASON_COOL else HVACMode.HEAT

    @property
    def hvac_modes(self) -> list[HVACMode]:
        return [HVACMode.AUTO, self._season_mode, HVACMode.OFF]

    @property
    def hvac_mode(self) -> HVACMode:
        mode = self.room.get("mode")
        if mode == MODE_OFF:
            return HVACMode.OFF
        if mode == MODE_MANUAL:
            return self._season_mode
        return HVACMode.AUTO

    @property
    def hvac_action(self) -> HVACAction | None:
        return {"heating": HVACAction.HEATING, "cooling": HVACAction.COOLING, "idle": HVACAction.IDLE, "off": HVACAction.OFF}.get(self._state["action"])

    @property
    def current_temperature(self) -> float | None:
        return self._state["current"]

    @property
    def target_temperature(self) -> float | None:
        st = self._state
        return st["temp"] if st["temp"] is not None else (self.room.get("manual_temp") if self.room.get("mode") == MODE_MANUAL else None)

    @property
    def preset_mode(self) -> str:
        return PRESET_BOOST if self.room.get("boost_until") else PRESET_NONE

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        st = self._state
        return {
            "room_id": self.room_id,
            "source": st["source"],
            "until": st["until"],
            "next_change": st["next_at"],
            "next_temperature": st["next_temp"],
            "window_open": st["window_open"],
            "profile": self.mgr.glob.get("profile"),
            "climates": self.room.get("climates"),
        }

    async def async_set_hvac_mode(self, hvac_mode: HVACMode) -> None:
        from .core import do_room_action

        mode = MODE_OFF if hvac_mode == HVACMode.OFF else MODE_AUTO if hvac_mode == HVACMode.AUTO else MODE_MANUAL
        await do_room_action(self.hass, self.room_id, "mode", {"mode": mode})

    async def async_turn_on(self) -> None:
        await self.async_set_hvac_mode(HVACMode.AUTO)

    async def async_turn_off(self) -> None:
        await self.async_set_hvac_mode(HVACMode.OFF)

    async def async_set_temperature(self, **kwargs: Any) -> None:
        from .core import do_room_action

        if (t := kwargs.get(ATTR_TEMPERATURE)) is not None:
            await do_room_action(self.hass, self.room_id, "temp", {"temp": t})

    async def async_set_preset_mode(self, preset_mode: str) -> None:
        from .core import do_room_action

        await do_room_action(self.hass, self.room_id, "boost" if preset_mode == PRESET_BOOST else "cancel", {})
