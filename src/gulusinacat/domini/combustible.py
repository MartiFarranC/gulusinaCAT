"""Combustibles que es comparen."""

from enum import StrEnum


class Combustible(StrEnum):
    """Combustible amb l'identificador que fan servir els fitxers de dades."""

    GASOLINA_95 = "g95"
    DIESEL = "dsl"
