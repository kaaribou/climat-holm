"""Préréglages (#3) et sécurité de sens de la correction d'après la sonde."""
from datetime import timedelta

from homeassistant.util import dt as dt_util

from custom_components.climat_holm.const import SEASON_COOL
from custom_components.climat_holm.core import do_room_action
from custom_components.climat_holm.manager import ClimatManager


async def _mgr(hass):
    mgr = ClimatManager(hass)
    await mgr.async_load()
    mgr.glob["running"] = True
    room = mgr.new_room({"name": "Salon", "climates": ["climate.split"], "temp_sensor": "sensor.salon", "sensor_regulate": True})
    room["mode"] = "manual"
    room["manual_temp"] = 19.0
    return mgr, room


async def test_preset_temps(hass):
    mgr, room = await _mgr(hass)
    room["preset"] = "eco"
    w = mgr.compute(room)
    assert (w["source"], w["temp"], w["preset"]) == ("preset", 17.0, "eco")
    room["preset"] = "frost"
    assert mgr.compute(room)["temp"] == 7.0
    mgr.glob["season"] = SEASON_COOL
    assert mgr.compute(room)["hvac"] == "off"           # hors-gel en été : arrêt
    room["preset"] = "comfort"
    w = mgr.compute(room)
    assert (w["hvac"], w["temp"]) == ("cool", 24.0)


async def test_sensor_never_brakes_heating(hass):
    mgr, room = await _mgr(hass)
    room["mode"] = "auto"
    room["preset"] = "comfort"            # consigne 19 °C, hors mode Manuel (où la correction est inactive)
    mgr.settings["comfort_temp"] = 19.0
    now = dt_util.now()
    # cas de l'issue #3 : consigne 19, split 13,5, sonde 16 → avant : 16,5 envoyé ; maintenant : pas de baisse
    hass.states.async_set("climate.split", "heat", {"current_temperature": 13.5, "target_temp_step": 0.5})
    hass.states.async_set("sensor.salon", "16")
    want = mgr.compute(room, now)
    assert want["temp"] == 19.0
    assert mgr._sensor_offsets(room, want, now) == {}
    assert mgr.runtime[room["id"]]["offsets"]["climate.split"]["v"] == -2.5   # écart mesuré, mais pas appliqué
    # pièce chaude (sonde 19,5 > 19) : la correction négative s'applique de nouveau
    hass.states.async_set("sensor.salon", "19.5")
    out = mgr._sensor_offsets(room, want, now + timedelta(minutes=11))
    assert out == {"climate.split": -3.0}
    # split qui lit trop haut (24) avec pièce froide : la hausse reste permise
    hass.states.async_set("climate.split", "heat", {"current_temperature": 21.0, "target_temp_step": 0.5})
    hass.states.async_set("sensor.salon", "17")
    out = mgr._sensor_offsets(room, want, now + timedelta(minutes=30))
    assert out == {"climate.split": 3.0}


async def test_preset_cleared_by_mode(hass):
    mgr, room = await _mgr(hass)
    from custom_components.climat_holm.const import DOMAIN
    hass.data.setdefault(DOMAIN, {})
    import custom_components.climat_holm.core as core
    core._manager = lambda h: mgr   # le gestionnaire du test
    await do_room_action(hass, room["id"], "preset", {"preset": "away"})
    assert room["preset"] == "away"
    await do_room_action(hass, room["id"], "mode", {"mode": "auto"})
    assert room["preset"] is None
