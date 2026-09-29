"""Climat HOLM : programmation du chauffage et de la climatisation, pièce par pièce.

Toute la logique est dans core.py ; ce fichier ne fait que l'exposer à Home Assistant.
"""
from .core import CONFIG_SCHEMA, async_setup_entry, async_unload_entry  # noqa: F401
