"""Històric de preus: un resum per mes i per any."""

from __future__ import annotations

import datetime
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import TypedDict

from gulusinacat.domini.combustible import Combustible
from gulusinacat.domini.estadistica import mitjana

ANYS_D_HISTORIC = 10
# Cada mes es resumeix amb els preus del dia 15.
DIA_DE_LA_MOSTRA = 15
MESOS_DE_L_ANY = 12
# Versió del format de cada mostra mensual. La 2 inclou totes les marques; la 1, només quatre.
VERSIO_ACTUAL = 2
VERSIO_SENSE_INDICAR = 1


class PreusMarca(TypedDict):
    """Preu de cada combustible, o `None` si no n'hi ha."""

    g95: float | None
    dsl: float | None


@dataclass(frozen=True)
class Mes:
    """Un mes concret."""

    any_: int
    mes: int

    @property
    def clau(self) -> str:
        """Identificador del mes als fitxers de dades: 'aaaa-mm'."""
        return f"{self.any_}-{self.mes:02d}"

    @property
    def dia_de_la_mostra(self) -> datetime.date:
        """Dia de l'històric del Ministeri que representa el mes."""
        return datetime.date(self.any_, self.mes, DIA_DE_LA_MOSTRA)


@dataclass
class MostraMensual:
    """Preus mitjans d'un mes: per marca i, amb la clau 'catalunya', de totes.

    `versio` és `None` quan la mostra és d'abans que el format tingués versió.
    """

    versio: int | None
    preus: dict[str, PreusMarca]

    @property
    def es_antiga(self) -> bool:
        """Si cal tornar-la a baixar perquè és d'un format anterior."""
        return (self.versio or VERSIO_SENSE_INDICAR) < VERSIO_ACTUAL


@dataclass
class HistoricAnual:
    """Les mostres mensuals desades i el nom de cada marca que hi apareix."""

    noms: dict[str, str]
    mostres: dict[str, MostraMensual]


@dataclass(frozen=True)
class ResumAnual:
    """Preus mitjans d'un any a partir de les mostres mensuals que s'han pogut obtenir."""

    any_: int
    mesos: int
    preus: dict[str, PreusMarca]


def mesos_a_cobrir(avui: datetime.date) -> list[Mes]:
    """Mesos dels últims `ANYS_D_HISTORIC` anys que ja tenen mostra.

    El mes en curs només hi entra quan ja ha passat el dia de la mostra.
    """
    return [
        mes
        for any_ in range(avui.year - ANYS_D_HISTORIC, avui.year + 1)
        for numero in range(1, MESOS_DE_L_ANY + 1)
        if (mes := Mes(any_, numero)).dia_de_la_mostra < avui
    ]


def mesos_pendents(mesos: Sequence[Mes], mostres: Mapping[str, MostraMensual]) -> list[Mes]:
    """Mesos que cal baixar, del més recent al més antic.

    Primer els que no hi són; després els que tenen una mostra d'un format antic,
    que es conserva fins que se'n baixa la nova.
    """
    recents_primer = list(reversed(mesos))
    falten = [mes for mes in recents_primer if mes.clau not in mostres]
    antics = [mes for mes in recents_primer if mes.clau in mostres and mostres[mes.clau].es_antiga]
    return falten + antics


def resums_anuals(any_actual: int, mostres: Mapping[str, MostraMensual]) -> list[ResumAnual]:
    """Resum de cada any amb alguna mostra, del més antic al més recent."""
    resums = []
    for any_ in range(any_actual - ANYS_D_HISTORIC, any_actual + 1):
        del_any = [mostra for clau, mostra in mostres.items() if clau.startswith(f"{any_}-")]
        if del_any:
            resums.append(_resum_de_l_any(any_, del_any))
    return resums


def _resum_de_l_any(any_: int, mostres: Sequence[MostraMensual]) -> ResumAnual:
    marques = sorted({marca for mostra in mostres for marca in mostra.preus})
    return ResumAnual(
        any_=any_,
        mesos=len(mostres),
        preus={marca: _mitjana_de_la_marca(marca, mostres) for marca in marques},
    )


def preu_de(preus: PreusMarca, combustible: Combustible) -> float | None:
    """Preu d'un combustible dins d'un `PreusMarca`."""
    if combustible is Combustible.GASOLINA_95:
        return preus["g95"]
    return preus["dsl"]


def _mitjana_de_la_marca(marca: str, mostres: Sequence[MostraMensual]) -> PreusMarca:
    def mitjana_de(combustible: Combustible) -> float | None:
        # Un preu 0 o absent vol dir que aquell mes no se'n va publicar cap.
        valors = [
            valor
            for mostra in mostres
            if marca in mostra.preus and (valor := preu_de(mostra.preus[marca], combustible))
        ]
        return mitjana(valors)

    return PreusMarca(g95=mitjana_de(Combustible.GASOLINA_95), dsl=mitjana_de(Combustible.DIESEL))
