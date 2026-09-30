"""Dobles de les fronteres de l'aplicació: la font de preus i el magatzem."""

from __future__ import annotations

import datetime
from collections.abc import Sequence
from dataclasses import dataclass, field

from gulusinacat.aplicacio.documents import DiaHistoric, DocumentEstacions, DocumentPreus
from gulusinacat.aplicacio.ports import FontNoDisponibleError
from gulusinacat.domini.estacio import Estacio, PublicacioDePreus
from gulusinacat.domini.historic import HistoricAnual, ResumAnual


@dataclass
class FontEnMemoria:
    """Font de preus que respon amb unes estacions fixes.

    Els dies de `dies_que_fallen` es comporten com si el servidor no respongués.
    """

    estacions: tuple[Estacio, ...]
    data: str = "30/09/2026 12:00:00"
    dies_que_fallen: frozenset[datetime.date] = frozenset()
    dies_demanats: list[datetime.date] = field(default_factory=list)

    def preus_actuals(self) -> PublicacioDePreus:
        return PublicacioDePreus(data=self.data, estacions=self.estacions)

    def preus_del_dia(self, dia: datetime.date) -> tuple[Estacio, ...]:
        self.dies_demanats.append(dia)
        if dia in self.dies_que_fallen:
            missatge = f"Sense resposta el {dia}"
            raise FontNoDisponibleError(missatge)
        return self.estacions


@dataclass
class MagatzemEnMemoria:
    """Magatzem que guarda els documents en atributs en lloc de fitxers."""

    preus: DocumentPreus | None = None
    estacions: DocumentEstacions | None = None
    historic: list[DiaHistoric] = field(default_factory=list)
    anual: HistoricAnual = field(default_factory=lambda: HistoricAnual(noms={}, mostres={}))
    resums: list[ResumAnual] = field(default_factory=list)

    def desa_preus(self, document: DocumentPreus) -> None:
        self.preus = document

    def desa_estacions(self, document: DocumentEstacions) -> None:
        self.estacions = document

    def llegeix_historic(self) -> dict[str, DiaHistoric]:
        return {dia["data"]: dia for dia in self.historic}

    def desa_historic(self, dies: Sequence[DiaHistoric]) -> None:
        self.historic = list(dies)

    def llegeix_anual(self) -> HistoricAnual:
        return self.anual

    def desa_anual(self, historic: HistoricAnual, resums: Sequence[ResumAnual]) -> None:
        self.anual = historic
        self.resums = list(resums)
