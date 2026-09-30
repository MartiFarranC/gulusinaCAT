"""Com s'executen les dues tasques de dades des dels tests de caracterització."""

from __future__ import annotations

from gulusinacat.presentacio.cli import main


def executa_preus() -> None:
    """Descarrega els preus d'avui i actualitza els fitxers diaris."""
    assert main(["preus"]) == 0


def executa_anual() -> None:
    """Completa l'històric dels últims 10 anys."""
    assert main(["anual"]) == 0
