"""Assistant de configuration Climat HOLM."""
from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import callback
from homeassistant.helpers.selector import (
    BooleanSelector,
    EntitySelector,
    EntitySelectorConfig,
    NumberSelector,
    NumberSelectorConfig,
    NumberSelectorMode,
)

from .const import DEFAULT_SETTINGS, DOMAIN, NAME


class ClimatHolmConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input: dict | None = None) -> ConfigFlowResult:
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()
        has_cs = self.hass.services.has_service("climate_scheduler", "get_groups")
        if user_input is not None:
            return self.async_create_entry(title=NAME, data={
                "climates": user_input.get("climates") or [],
                "import_cs": bool(user_input.get("import_cs")),
                "start_running": bool(user_input.get("start_running")),
            })
        schema: dict = {}
        if has_cs:
            schema[vol.Optional("import_cs", default=True)] = BooleanSelector()
        schema[vol.Optional("climates", default=[])] = EntitySelector(EntitySelectorConfig(domain="climate", multiple=True, exclude_entities=[e for e in self.hass.states.async_entity_ids("climate") if e.startswith("climate.climate_scheduler_")]))
        schema[vol.Optional("start_running", default=False)] = BooleanSelector()
        return self.async_show_form(step_id="user", data_schema=vol.Schema(schema), description_placeholders={"cs": "oui" if has_cs else "non"})

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return ClimatHolmOptionsFlow()


class ClimatHolmOptionsFlow(OptionsFlow):
    async def async_step_init(self, user_input: dict | None = None) -> ConfigFlowResult:
        mgr = self.config_entry.runtime_data
        s = {**DEFAULT_SETTINGS, **mgr.settings}
        if user_input is not None:
            for k, v in user_input.items():
                mgr.settings[k] = v
            await mgr.async_changed()
            return self.async_create_entry(title="", data={})

        def num(lo, hi, step, unit):
            return NumberSelector(NumberSelectorConfig(min=lo, max=hi, step=step, unit_of_measurement=unit, mode=NumberSelectorMode.BOX))

        schema = vol.Schema({
            vol.Required("boost_temp", default=s["boost_temp"]): num(10, 30, 0.5, "°C"),
            vol.Required("boost_minutes", default=s["boost_minutes"]): num(10, 480, 10, "min"),
            vol.Required("away_temp", default=s["away_temp"]): num(5, 25, 0.5, "°C"),
            vol.Required("cool_away_off", default=s["cool_away_off"]): BooleanSelector(),
            vol.Required("manual_temp", default=s["manual_temp"]): num(5, 30, 0.5, "°C"),
            vol.Required("window_delay", default=s["window_delay"]): num(0, 1800, 10, "s"),
        })
        return self.async_show_form(step_id="init", data_schema=schema)
