"""Construcció d'objectes del domini per als tests."""

from __future__ import annotations

from gulusinacat.domini.combustible import Combustible
from gulusinacat.domini.estacio import Estacio

LATITUD_DE_BARCELONA = 41.387
LONGITUD_DE_BARCELONA = 2.168


def estacio(
    rotul: str = "REPSOL",
    gasolina_95: float | None = 1.5,
    diesel: float | None = 1.4,
    municipi: str = "Barcelona",
) -> Estacio:
    """Estació de Barcelona amb els preus indicats (`None` si no en ven)."""
    preus = {
        combustible: preu
        for combustible, preu in (
            (Combustible.GASOLINA_95, gasolina_95),
            (Combustible.DIESEL, diesel),
        )
        if preu is not None
    }
    return Estacio(
        rotul=rotul,
        preus=preus,
        municipi=municipi,
        adreca="CARRER MAJOR, 1",
        latitud=LATITUD_DE_BARCELONA,
        longitud=LONGITUD_DE_BARCELONA,
    )
