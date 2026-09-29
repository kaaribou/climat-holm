"""Base commune des entités Climat HOLM."""
from __future__ import annotations

from homeassistant.core import callback
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity import Entity

from .const import DOMAIN, NAME, VERSION
from .manager import ClimatManager


class ClimatEntity(Entity):
    _attr_should_poll = False
    _attr_has_entity_name = True

    def __init__(self, mgr: ClimatManager) -> None:
        self.mgr = mgr
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, "hub")}, name=NAME, manufacturer="HOLM", model="Programmation chauffage & clim", sw_version=VERSION,
        )

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(self.mgr.add_listener(self._refresh))

    @callback
    def _refresh(self) -> None:
        if self.hass is not None:
            self.async_write_ha_state()
