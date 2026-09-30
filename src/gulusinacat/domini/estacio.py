"""Estacions de servei i els preus publicats."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass

from gulusinacat.domini.combustible import Combustible

# Rectangle que conté Catalunya amb marge. Serveix per descartar coordenades
# impossibles, com les (0, 0) que apareixen a vegades a les dades del Ministeri.
LATITUD_MINIMA = 40.0
LATITUD_MAXIMA = 43.5
LONGITUD_MINIMA = -0.5
LONGITUD_MAXIMA = 3.6


@dataclass(frozen=True)
class Estacio:
    """Una estació de servei tal com la publica el Ministeri.

    `preus` només conté els combustibles que l'estació té a la venda.
    """

    rotul: str
    preus: Mapping[Combustible, float]
    municipi: str
    adreca: str
    latitud: float | None
    longitud: float | None

    def preu(self, combustible: Combustible) -> float | None:
        """Preu del combustible, o `None` si l'estació no en ven."""
        return self.preus.get(combustible)

    def coordenades_valides(self) -> tuple[float, float] | None:
        """Latitud i longitud, si existeixen i cauen dins de Catalunya."""
        if self.latitud is None or self.longitud is None:
            return None
        dins = (
            LATITUD_MINIMA < self.latitud < LATITUD_MAXIMA
            and LONGITUD_MINIMA < self.longitud < LONGITUD_MAXIMA
        )
        return (self.latitud, self.longitud) if dins else None


@dataclass(frozen=True)
class PublicacioDePreus:
    """Els preus de totes les estacions en un moment donat.

    `data` és el text que publica el Ministeri, amb el format `dd/mm/aaaa hh:mm:ss`.
    """

    data: str
    estacions: tuple[Estacio, ...]
