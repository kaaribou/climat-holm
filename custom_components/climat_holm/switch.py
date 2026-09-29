"""Interrupteurs globaux : programmation active, absence, tout arrêter."""
from __future__ import annotations

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .entity import ClimatEntity


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    mgr = entry.runtime_data
    async_add_entities([
        GlobalSwitch(mgr, "running", "mdi:calendar-sync", "running"),
        GlobalSwitch(mgr, "away", "mdi:home-export-outline", "away"),
        GlobalSwitch(mgr, "all_off", "mdi:power", "all_off"),
    ])


class GlobalSwitch(ClimatEntity, SwitchEntity):
    def __init__(self, mgr, key: str, icon: str, tkey: str) -> None:
        super().__init__(mgr)
        self.key = key
        self._attr_icon = icon
        self._attr_translation_key = tkey
        self._attr_unique_id = f"{DOMAIN}_{key}"

    @property
    def is_on(self) -> bool:
        return bool(self.mgr.glob.get(self.key))

    @property
    def extra_state_attributes(self):
        return {"until": self.mgr.glob.get("away_until")} if self.key == "away" else None

    async def async_turn_on(self, **kwargs) -> None:
        from .core import do_global

        await do_global(self.hass, {self.key: True})

    async def async_turn_off(self, **kwargs) -> None:
        from .core import do_global

        await do_global(self.hass, {self.key: False})
