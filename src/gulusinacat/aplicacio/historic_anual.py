"""Cas d'ús: completar l'històric dels últims 10 anys, mes a mes."""

from __future__ import annotations

import datetime
import logging
from collections.abc import Sequence

from gulusinacat.aplicacio.documents import mostra_mensual
from gulusinacat.aplicacio.ports import FontDePreus, FontNoDisponibleError, MagatzemDeDades
from gulusinacat.domini.estacio import Estacio
from gulusinacat.domini.historic import (
    HistoricAnual,
    Mes,
    mesos_a_cobrir,
    mesos_pendents,
    resums_anuals,
)
from gulusinacat.domini.marques import classifica
from gulusinacat.domini.resum import mitjana_general, mitjanes_per_marca

# El servidor del Ministeri a vegades bloqueja els servidors de GitHub durant una
# estona: després de tants errors seguits no val la pena continuar.
MAXIM_FALLADES_SEGUIDES = 5

registre = logging.getLogger(__name__)


def completa_historic_anual(
    font: FontDePreus, magatzem: MagatzemDeDades, avui: datetime.date, max_peticions: int
) -> None:
    """Baixa com a màxim `max_peticions` mesos pendents i recalcula el resum de cada any.

    Desa el que ha aconseguit encara que alguna petició falli: la propera execució
    continua pels mesos que encara falten.
    """
    historic = magatzem.llegeix_anual()
    mesos = mesos_a_cobrir(avui)
    pendents = mesos_pendents(mesos, historic.mostres)
    registre.info("%d mesos desats, %d pendents", len(mesos) - len(pendents), len(pendents))

    _baixa_mesos(font, historic, pendents[:max_peticions])

    resums = resums_anuals(avui.year, historic.mostres)
    magatzem.desa_anual(historic, resums)
    registre.info(
        "anual.json: %d anys, %d mesos de %d", len(resums), len(historic.mostres), len(mesos)
    )


def _baixa_mesos(font: FontDePreus, historic: HistoricAnual, mesos: Sequence[Mes]) -> None:
    fallades_seguides = 0
    for mes in mesos:
        try:
            estacions = font.preus_del_dia(mes.dia_de_la_mostra)
        except FontNoDisponibleError as error:
            fallades_seguides += 1
            registre.warning("%s no s'ha pogut baixar: %s", mes.clau, error)
            if fallades_seguides >= MAXIM_FALLADES_SEGUIDES:
                registre.warning("Massa errors seguits; es prova en la propera execució")
                return
            continue
        fallades_seguides = 0
        if not estacions:
            registre.warning("%s sense dades", mes.clau)
            continue
        _desa_mostra(historic, mes, estacions)


def _desa_mostra(historic: HistoricAnual, mes: Mes, estacions: Sequence[Estacio]) -> None:
    classificacio = classifica([estacio.rotul for estacio in estacions])
    mitjanes = mitjanes_per_marca(estacions, classificacio)
    historic.noms.update({marca: resum.nom for marca, resum in mitjanes.items()})
    historic.mostres[mes.clau] = mostra_mensual(mitjanes, mitjana_general(estacions))
    registre.info("%s: %d marques", mes.clau, len(mitjanes))
