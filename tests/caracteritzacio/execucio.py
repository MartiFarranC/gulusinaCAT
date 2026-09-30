"""Com s'executen les dues tasques de dades des dels tests de caracterització."""

from __future__ import annotations

import runpy

from .entorn import ARREL


def executa_preus() -> None:
    """Descarrega els preus d'avui i actualitza els fitxers diaris."""
    runpy.run_path(str(ARREL / "actualitza_preus.py"), run_name="__main__")


def executa_anual() -> None:
    """Completa l'històric dels últims 10 anys."""
    runpy.run_path(str(ARREL / "historic_anual.py"), run_name="__main__")
