"""Resums de preus per marca i per a tot Catalunya."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

from gulusinacat.domini.combustible import Combustible
from gulusinacat.domini.estacio import Estacio
from gulusinacat.domini.estadistica import mitjana, percentil
from gulusinacat.domini.marques import ALTRES, Classificacio

# La franja de preus d'una marca va del percentil 10 al 90: hi cap 8 de cada 10 estacions.
QUANTIL_INFERIOR = 0.1
QUANTIL_SUPERIOR = 0.9


@dataclass(frozen=True)
class MitjanaMarca:
    """Preu mitjà d'una marca i quantes estacions en tenen algun preu."""

    nom: str
    preus: dict[Combustible, float | None]
    estacions: int


@dataclass(frozen=True)
class MitjanaGeneral:
    """Preu mitjà de totes les estacions, de qualsevol marca."""

    preus: dict[Combustible, float | None]
    estacions: int


@dataclass(frozen=True)
class EstacioMesBarata:
    """L'estació més barata d'una marca per a un combustible."""

    preu: float
    municipi: str
    latitud: float | None
    longitud: float | None


@dataclass(frozen=True)
class DetallMarca:
    """Franja de preus i estació més barata d'una marca, per combustible."""

    franges: dict[Combustible, tuple[float, float] | None]
    mes_barates: dict[Combustible, EstacioMesBarata]


@dataclass(frozen=True)
class PreuAssignat:
    """Un preu d'una estació, amb la marca que se li ha assignat."""

    marca: str
    combustible: Combustible
    preu: float
    estacio: Estacio


def preus_assignats(
    estacions: Sequence[Estacio], classificacio: Classificacio
) -> list[PreuAssignat]:
    """Tots els preus publicats, estació per estació i combustible per combustible."""
    return [
        PreuAssignat(marca, combustible, preu, estacio)
        for estacio, marca in zip(estacions, classificacio.marques, strict=True)
        for combustible in Combustible
        if (preu := estacio.preu(combustible)) is not None
    ]


def _agrupa_per_marca(
    preus: Sequence[PreuAssignat],
) -> dict[str, dict[Combustible, list[PreuAssignat]]]:
    """Agrupa els preus per marca, en l'ordre en què apareix cada marca."""
    grups: dict[str, dict[Combustible, list[PreuAssignat]]] = {}
    for preu in preus:
        grups.setdefault(preu.marca, {combustible: [] for combustible in Combustible})
        grups[preu.marca][preu.combustible].append(preu)
    return grups


def mitjanes_per_marca(
    estacions: Sequence[Estacio], classificacio: Classificacio
) -> dict[str, MitjanaMarca]:
    """Preu mitjà de cada marca que té algun preu publicat."""
    grups = _agrupa_per_marca(preus_assignats(estacions, classificacio))
    return {
        marca: MitjanaMarca(
            nom=classificacio.noms[marca],
            preus={
                combustible: mitjana([preu.preu for preu in llista])
                for combustible, llista in per_combustible.items()
            },
            estacions=max(len(llista) for llista in per_combustible.values()),
        )
        for marca, per_combustible in grups.items()
    }


def mitjana_general(estacions: Sequence[Estacio]) -> MitjanaGeneral:
    """Preu mitjà de totes les estacions amb preu."""
    per_combustible = {
        combustible: [
            preu for estacio in estacions if (preu := estacio.preu(combustible)) is not None
        ]
        for combustible in Combustible
    }
    return MitjanaGeneral(
        preus={combustible: mitjana(llista) for combustible, llista in per_combustible.items()},
        estacions=max(len(llista) for llista in per_combustible.values()),
    )


def detall_per_marca(
    estacions: Sequence[Estacio], classificacio: Classificacio
) -> dict[str, DetallMarca]:
    """Franja de preus i estació més barata de cada marca que té algun preu."""
    grups = _agrupa_per_marca(preus_assignats(estacions, classificacio))
    return {
        marca: DetallMarca(
            franges={
                combustible: _franja([preu.preu for preu in llista])
                for combustible, llista in per_combustible.items()
            },
            mes_barates={
                combustible: _mes_barata(llista)
                for combustible, llista in per_combustible.items()
                if llista
            },
        )
        for marca, per_combustible in grups.items()
    }


def hi_ha_marques_reconegudes(mitjanes: dict[str, MitjanaMarca]) -> bool:
    """Si alguna marca, a part de les independents, té estacions amb preu."""
    return any(resum.estacions for marca, resum in mitjanes.items() if marca != ALTRES)


def _franja(preus: Sequence[float]) -> tuple[float, float] | None:
    inferior = percentil(preus, QUANTIL_INFERIOR)
    superior = percentil(preus, QUANTIL_SUPERIOR)
    if inferior is None or superior is None:
        return None
    return inferior, superior


def _mes_barata(preus: Sequence[PreuAssignat]) -> EstacioMesBarata:
    mes_barat = min(preus, key=lambda preu: preu.preu)
    return EstacioMesBarata(
        preu=mes_barat.preu,
        municipi=mes_barat.estacio.municipi,
        latitud=mes_barat.estacio.latitud,
        longitud=mes_barat.estacio.longitud,
    )
