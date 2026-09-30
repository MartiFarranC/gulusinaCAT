"""Cas d'ús: descarregar els preus d'avui i actualitzar els fitxers diaris."""

from __future__ import annotations

import datetime
import logging
from collections.abc import Sequence

from gulusinacat.aplicacio.documents import (
    DiaHistoric,
    dia_historic,
    document_estacions,
    document_preus,
)
from gulusinacat.aplicacio.ports import FontDePreus, FontNoDisponibleError, MagatzemDeDades
from gulusinacat.domini.combustible import Combustible
from gulusinacat.domini.estacio import Estacio, PublicacioDePreus
from gulusinacat.domini.marques import classifica
from gulusinacat.domini.resum import (
    detall_per_marca,
    hi_ha_marques_reconegudes,
    mitjana_general,
    mitjanes_per_marca,
)

DIES_A_L_HISTORIC = 365
FORMAT_DATA_DEL_MINISTERI = "%d/%m/%Y"
LONGITUD_DATA_DEL_MINISTERI = len("dd/mm/aaaa")

registre = logging.getLogger(__name__)


class CapMarcaReconegudaError(Exception):
    """Les dades no tenen cap estació d'una marca reconeguda; no es desa res."""

    def __init__(self, estacions: int) -> None:
        super().__init__(f"Cap estació reconeguda entre {estacions}: no es desa preus.json")


def actualitza_preus(font: FontDePreus, magatzem: MagatzemDeDades, dies_enrere: int) -> None:
    """Desa els preus d'avui i afegeix el dia a l'històric.

    Amb `dies_enrere` > 0 també recupera els dies anteriors que faltin a l'històric.

    Raises:
        FontNoDisponibleError: si no s'han pogut obtenir els preus d'avui.
        CapMarcaReconegudaError: si les dades no tenen cap marca reconeguda.
    """
    publicacio = font.preus_actuals()
    classificacio = classifica([estacio.rotul for estacio in publicacio.estacions])
    registre.info(
        "Rètols a 'altres' (els més repetits): %s", ", ".join(classificacio.rotuls_agrupats)
    )
    mitjanes = mitjanes_per_marca(publicacio.estacions, classificacio)
    if not hi_ha_marques_reconegudes(mitjanes):
        raise CapMarcaReconegudaError(len(publicacio.estacions))

    general = mitjana_general(publicacio.estacions)
    detalls = detall_per_marca(publicacio.estacions, classificacio)
    document = document_preus(publicacio, mitjanes, general, detalls)
    magatzem.desa_preus(document)
    magatzem.desa_estacions(document_estacions(publicacio, classificacio))
    registre.info(
        "%d estacions, %d marques: %s",
        len(publicacio.estacions),
        len(mitjanes),
        ", ".join(
            f"{marca['nom']} ({marca['n']}) {marca[Combustible.GASOLINA_95.value]}"
            for marca in document["marques"].values()
        ),
    )

    avui = _dia_de(publicacio)
    _actualitza_historic(font, magatzem, dia_historic(avui, mitjanes, general), dies_enrere)


def resum_del_dia(dia: datetime.date, estacions: Sequence[Estacio]) -> DiaHistoric:
    """Resum d'un dia qualsevol a partir dels preus de les seves estacions."""
    classificacio = classifica([estacio.rotul for estacio in estacions])
    return dia_historic(
        dia, mitjanes_per_marca(estacions, classificacio), mitjana_general(estacions)
    )


def _dia_de(publicacio: PublicacioDePreus) -> datetime.date:
    data = publicacio.data[:LONGITUD_DATA_DEL_MINISTERI]
    return datetime.datetime.strptime(data, FORMAT_DATA_DEL_MINISTERI).date()


def _actualitza_historic(
    font: FontDePreus, magatzem: MagatzemDeDades, avui: DiaHistoric, dies_enrere: int
) -> None:
    dies = magatzem.llegeix_historic()
    dies[avui["data"]] = avui
    dia_d_avui = datetime.date.fromisoformat(avui["data"])
    for enrere in range(1, dies_enrere + 1):
        dia = dia_d_avui - datetime.timedelta(days=enrere)
        if dia.isoformat() not in dies:
            _recupera_dia(font, dies, dia)
    ordenats = [dies[data] for data in sorted(dies)][-DIES_A_L_HISTORIC:]
    magatzem.desa_historic(ordenats)
    registre.info("historic.json: %d dies", len(ordenats))


def _recupera_dia(font: FontDePreus, dies: dict[str, DiaHistoric], dia: datetime.date) -> None:
    try:
        estacions = font.preus_del_dia(dia)
    except FontNoDisponibleError as error:
        registre.warning("No s'ha pogut baixar l'històric del %s: %s", dia, error)
        return
    if estacions:
        dies[dia.isoformat()] = resum_del_dia(dia, estacions)
        registre.info("Històric %s: desat", dia)
