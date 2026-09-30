"""Format dels fitxers de dades que llegeix la pàgina, i com es construeixen."""

from __future__ import annotations

import datetime
from typing import TypeAlias, TypedDict

from gulusinacat.domini.combustible import Combustible
from gulusinacat.domini.estacio import PublicacioDePreus
from gulusinacat.domini.historic import VERSIO_ACTUAL, MostraMensual, PreusMarca
from gulusinacat.domini.marques import Classificacio, nom_llegible
from gulusinacat.domini.resum import (
    DetallMarca,
    EstacioMesBarata,
    MitjanaGeneral,
    MitjanaMarca,
)

CLAU_CATALUNYA = "catalunya"
DECIMALS_DE_LES_COORDENADES = 5


class PreusGenerals(TypedDict):
    """Mitjana de totes les estacions de Catalunya."""

    g95: float | None
    dsl: float | None
    n: int


class EstacioMesBarataDocument(TypedDict):
    """L'estació més barata d'una marca."""

    preu: float
    municipi: str
    lat: float | None
    lon: float | None


class MarcaDocument(TypedDict):
    """Resum d'una marca a `preus.json`."""

    nom: str
    g95: float | None
    dsl: float | None
    n: int
    rang: dict[str, list[float] | None]
    barata: dict[str, EstacioMesBarataDocument]


class DocumentPreus(TypedDict):
    """Contingut de `preus.json`."""

    fecha: str
    catalunya: PreusGenerals
    marques: dict[str, MarcaDocument]


# Cada estació és [marca, lat, lon, g95, dsl, municipi, adreça] perquè el fitxer ocupi poc.
FilaEstacio: TypeAlias = list[str | float | None]


class DocumentEstacions(TypedDict):
    """Contingut de `estacions.json`."""

    marques: dict[str, str]
    e: list[FilaEstacio]
    fecha: str


class DiaHistoric(TypedDict):
    """Un dia de `historic.json`."""

    data: str
    marques: dict[str, PreusMarca]


def document_preus(
    publicacio: PublicacioDePreus,
    mitjanes: dict[str, MitjanaMarca],
    general: MitjanaGeneral,
    detalls: dict[str, DetallMarca],
) -> DocumentPreus:
    """`preus.json`: la mitjana general i les marques, de la que té més estacions a la que menys."""
    ordre = sorted(mitjanes, key=lambda marca: -mitjanes[marca].estacions)
    return DocumentPreus(
        fecha=publicacio.data,
        catalunya=PreusGenerals(
            g95=general.preus[Combustible.GASOLINA_95],
            dsl=general.preus[Combustible.DIESEL],
            n=general.estacions,
        ),
        marques={marca: _marca_document(mitjanes[marca], detalls[marca]) for marca in ordre},
    )


def document_estacions(
    publicacio: PublicacioDePreus, classificacio: Classificacio
) -> DocumentEstacions:
    """`estacions.json`: les estacions amb algun preu i coordenades dins de Catalunya."""
    files: list[FilaEstacio] = []
    for estacio, marca in zip(publicacio.estacions, classificacio.marques, strict=True):
        coordenades = estacio.coordenades_valides()
        if not estacio.preus or coordenades is None:
            continue
        latitud, longitud = coordenades
        files.append(
            [
                marca,
                round(latitud, DECIMALS_DE_LES_COORDENADES),
                round(longitud, DECIMALS_DE_LES_COORDENADES),
                estacio.preu(Combustible.GASOLINA_95),
                estacio.preu(Combustible.DIESEL),
                estacio.municipi,
                nom_llegible(estacio.adreca),
            ]
        )
    return DocumentEstacions(marques=classificacio.noms, e=files, fecha=publicacio.data)


def dia_historic(
    dia: datetime.date, mitjanes: dict[str, MitjanaMarca], general: MitjanaGeneral
) -> DiaHistoric:
    """Resum d'un dia per a `historic.json`: cada marca i, al final, tot Catalunya."""
    marques = {marca: _preus_marca(resum.preus) for marca, resum in mitjanes.items()}
    marques[CLAU_CATALUNYA] = _preus_marca(general.preus)
    return DiaHistoric(data=dia.isoformat(), marques=marques)


def mostra_mensual(mitjanes: dict[str, MitjanaMarca], general: MitjanaGeneral) -> MostraMensual:
    """Resum d'un mes per a `anual.json`: tot Catalunya i, després, cada marca."""
    preus = {CLAU_CATALUNYA: _preus_marca(general.preus)}
    preus.update({marca: _preus_marca(resum.preus) for marca, resum in mitjanes.items()})
    return MostraMensual(versio=VERSIO_ACTUAL, preus=preus)


def _preus_marca(preus: dict[Combustible, float | None]) -> PreusMarca:
    return PreusMarca(g95=preus[Combustible.GASOLINA_95], dsl=preus[Combustible.DIESEL])


def _marca_document(mitjana: MitjanaMarca, detall: DetallMarca) -> MarcaDocument:
    return MarcaDocument(
        nom=mitjana.nom,
        g95=mitjana.preus[Combustible.GASOLINA_95],
        dsl=mitjana.preus[Combustible.DIESEL],
        n=mitjana.estacions,
        rang={
            combustible.value: list(franja) if franja else None
            for combustible, franja in detall.franges.items()
        },
        barata={
            combustible.value: _estacio_mes_barata(estacio)
            for combustible, estacio in detall.mes_barates.items()
        },
    )


def _estacio_mes_barata(estacio: EstacioMesBarata) -> EstacioMesBarataDocument:
    return EstacioMesBarataDocument(
        preu=estacio.preu, municipi=estacio.municipi, lat=estacio.latitud, lon=estacio.longitud
    )
