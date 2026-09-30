"""Escenaris de caracterització: què s'executa i quins fitxers en surten."""

from __future__ import annotations

import shutil
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path

from .entorn import DADES, FITXERS_DIARIS, entorn_controlat
from .execucio import executa_anual, executa_preus

MESOS_QUE_FALLEN = frozenset((2026, mes) for mes in range(1, 6))


@dataclass(frozen=True)
class Escenari:
    """Una execució d'una tasca de dades amb unes condicions concretes."""

    nom: str
    tasca: Callable[[], None]
    fitxers: tuple[str, ...]
    variables: dict[str, str] = field(default_factory=dict)
    mesos_que_fallen: frozenset[tuple[int, int]] = frozenset()
    fitxers_inicials: tuple[str, ...] = ()

    def executa(self, directori: Path) -> None:
        """Prepara `directori` amb els fitxers inicials i hi executa la tasca."""
        for nom in self.fitxers_inicials:
            shutil.copy(DADES / "inicials" / self.nom / nom, directori / nom)
        with entorn_controlat(directori, self.variables, self.mesos_que_fallen):
            self.tasca()


ESCENARIS = (
    Escenari("preus", executa_preus, FITXERS_DIARIS),
    Escenari("preus_amb_dies_enrere", executa_preus, ("historic.json",), {"DIES_ENRERE": "2"}),
    Escenari("anual_complet", executa_anual, ("anual.json",), {"MAX_PETICIONS": "200"}),
    Escenari(
        "anual_amb_fallades",
        executa_anual,
        ("anual.json",),
        {"MAX_PETICIONS": "40"},
        MESOS_QUE_FALLEN,
    ),
    Escenari(
        "anual_amb_mesos_antics",
        executa_anual,
        ("anual.json",),
        {"MAX_PETICIONS": "3"},
        fitxers_inicials=("anual.json",),
    ),
)
