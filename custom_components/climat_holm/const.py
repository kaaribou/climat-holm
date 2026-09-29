"""Constantes de l'intégration Climat HOLM."""
from __future__ import annotations

from typing import Final

DOMAIN: Final = "climat_holm"
NAME: Final = "Climat HOLM"
VERSION: Final = "1.0.0"

CARD_FILENAME: Final = "holm-climat-card.js"
CARD_URL_PATH: Final = "/climat_holm/holm-climat-card.js"

STORAGE_KEY: Final = f"{DOMAIN}.data"
STORAGE_VERSION: Final = 1

DAYS: Final = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
DAY_LABELS: Final = {"mon": "Lundi", "tue": "Mardi", "wed": "Mercredi", "thu": "Jeudi", "fri": "Vendredi", "sat": "Samedi", "sun": "Dimanche"}

MODE_AUTO: Final = "auto"
MODE_MANUAL: Final = "manual"
MODE_OFF: Final = "off"

SEASON_HEAT: Final = "heat"
SEASON_COOL: Final = "cool"

DEFAULT_SETTINGS: Final = {
    "boost_temp": 21.0,
    "boost_minutes": 60,
    "away_temp": 16.0,
    "cool_away_off": True,
    "window_delay": 60,
    "manual_temp": 19.5,
    "comfort_temp": 19.5,
}

DEFAULT_PROFILE: Final = "Normal"

# Planning proposé pour une nouvelle pièce (chauffage)
DEFAULT_WEEK: Final = {
    **{d: [{"t": "06:30", "temp": 19.5}, {"t": "08:15", "off": True}, {"t": "17:00", "temp": 19.5}, {"t": "22:15", "off": True}] for d in ["mon", "tue", "wed", "thu", "fri"]},
    **{d: [{"t": "08:30", "temp": 19.5}, {"t": "22:30", "off": True}] for d in ["sat", "sun"]},
}

TICK_SECONDS: Final = 30
