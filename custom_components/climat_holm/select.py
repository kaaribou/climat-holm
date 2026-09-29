"""Sélecteurs globaux : profil actif et saison."""
from __future__ import annotations

from homeassistant.components.select import SelectEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN, SEASON_COOL, SEASON_HEAT
from .entity import ClimatEntity

SEASONS = {SEASON_HEAT: "Chauffage", SEASON_COOL: "Climatisation"}


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    mgr = entry.runtime_data
    async_add_entities([ProfileSelect(mgr), SeasonSelect(mgr)])


class ProfileSelect(ClimatEntity, SelectEntity):
    _attr_translation_key = "profile"
    _attr_icon = "mdi:calendar-clock"

    def __init__(self, mgr) -> None:
        super().__init__(mgr)
        self._attr_unique_id = f"{DOMAIN}_profile"

    @property
    def options(self) -> list[str]:
        return list(self.mgr.data["profiles"])

    @property
    def current_option(self) -> str | None:
        return self.mgr.glob.get("profile")

    async def async_select_option(self, option: str) -> None:
        from .core import do_global

        await do_global(self.hass, {"profile": option})


class SeasonSelect(ClimatEntity, SelectEntity):
    _attr_translation_key = "season"
    _attr_icon = "mdi:sun-snowflake-variant"

    def __init__(self, mgr) -> None:
        super().__init__(mgr)
        self._attr_unique_id = f"{DOMAIN}_season"
        self._attr_options = list(SEASONS.values())

    @property
    def current_option(self) -> str | None:
        return SEASONS.get(self.mgr.glob.get("season"))

    async def async_select_option(self, option: str) -> None:
        from .core import do_global

        key = next(k for k, v in SEASONS.items() if v == option)
        await do_global(self.hass, {"season": key})
