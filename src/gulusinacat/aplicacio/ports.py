"""Interfícies que els casos d'ús necessiten del món exterior."""

from __future__ import annotations

import datetime
from collections.abc import Sequence
from typing import Protocol

from gulusinacat.aplicacio.documents import DiaHistoric, DocumentEstacions, DocumentPreus
from gulusinacat.domini.estacio import Estacio, PublicacioDePreus
from gulusinacat.domini.historic import HistoricAnual, ResumAnual


class FontNoDisponibleError(Exception):
    """La font de preus no ha respost, o ha respost amb dades que no s'entenen."""


class FontDePreus(Protocol):
    """D'on surten els preus de les estacions."""

    def preus_actuals(self) -> PublicacioDePreus:
        """Preus d'ara mateix.

        Raises:
            FontNoDisponibleError: si no s'han pogut obtenir.
        """
        ...

    def preus_del_dia(self, dia: datetime.date) -> tuple[Estacio, ...]:
        """Preus que hi havia un dia passat.

        Raises:
            FontNoDisponibleError: si no s'han pogut obtenir.
        """
        ...


class MagatzemDeDades(Protocol):
    """On es desen els fitxers de dades que llegeix la pàgina."""

    def desa_preus(self, document: DocumentPreus) -> None:
        """Desa les mitjanes per marca."""
        ...

    def desa_estacions(self, document: DocumentEstacions) -> None:
        """Desa totes les estacions amb coordenades."""
        ...

    def llegeix_historic(self) -> dict[str, DiaHistoric]:
        """Dies desats, indexats per data ISO. Buit si encara no n'hi ha cap."""
        ...

    def desa_historic(self, dies: Sequence[DiaHistoric]) -> None:
        """Desa els dies, ja ordenats."""
        ...

    def llegeix_anual(self) -> HistoricAnual:
        """Mostres mensuals desades. Buit si encara no n'hi ha cap."""
        ...

    def desa_anual(self, historic: HistoricAnual, resums: Sequence[ResumAnual]) -> None:
        """Desa les mostres mensuals i el resum de cada any."""
        ...
