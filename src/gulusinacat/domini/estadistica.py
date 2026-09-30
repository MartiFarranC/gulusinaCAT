"""Estadística senzilla sobre llistes de preus."""

from __future__ import annotations

import math
from collections.abc import Sequence

DECIMALS_DELS_PREUS = 3


def mitjana(valors: Sequence[float]) -> float | None:
    """Mitjana arrodonida a mil·lèsimes d'euro, o `None` si no hi ha valors.

    La suma és exacta (`math.fsum`) perquè el resultat no depengui de la versió de
    Python: la 3.12 va canviar com suma `sum()` els decimals i, en els casos límit,
    l'arrodoniment a mil·lèsimes donava una altra xifra.
    """
    if not valors:
        return None
    return round(math.fsum(valors) / len(valors), DECIMALS_DELS_PREUS)


def percentil(valors: Sequence[float], quantil: float) -> float | None:
    """Valor de la llista ordenada a la posició més propera al quantil (0 a 1).

    No interpola: el resultat és sempre un dels valors de la llista.
    """
    if not valors:
        return None
    ordenats = sorted(valors)
    return ordenats[round(quantil * (len(ordenats) - 1))]
