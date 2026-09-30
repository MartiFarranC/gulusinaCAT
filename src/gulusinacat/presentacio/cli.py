"""Línia d'ordres: `python -m gulusinacat preus` i `python -m gulusinacat anual`."""

from __future__ import annotations

import argparse
import datetime
import logging
import os
from collections.abc import Sequence
from pathlib import Path

from gulusinacat.aplicacio.actualitza_preus import CapMarcaReconegudaError, actualitza_preus
from gulusinacat.aplicacio.historic_anual import completa_historic_anual
from gulusinacat.aplicacio.ports import FontNoDisponibleError
from gulusinacat.infraestructura.fitxers import FitxerDeDadesInvalidError, MagatzemDeFitxers
from gulusinacat.infraestructura.ministeri import ClientMinisteri

ORDRE_PREUS = "preus"
ORDRE_ANUAL = "anual"
VARIABLE_DIES_ENRERE = "DIES_ENRERE"
VARIABLE_MAX_PETICIONS = "MAX_PETICIONS"
DIES_ENRERE_PER_DEFECTE = 0
MAX_PETICIONS_PER_DEFECTE = 30
CODI_ERROR = 1

registre = logging.getLogger(__name__)


class VariableDEntornInvalidaError(Exception):
    """Una variable d'entorn no té un valor acceptable."""

    def __init__(self, nom: str, valor: str) -> None:
        super().__init__(f"{nom} ha de ser un nombre enter positiu o zero, i val «{valor}»")


def main(arguments: Sequence[str] | None = None) -> int:
    """Executa l'ordre demanada i retorna el codi de sortida del procés."""
    opcions = _analitzador().parse_args(arguments)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    magatzem = MagatzemDeFitxers(opcions.directori)
    try:
        if opcions.ordre == ORDRE_PREUS:
            dies_enrere = _enter_de_l_entorn(VARIABLE_DIES_ENRERE, DIES_ENRERE_PER_DEFECTE)
            actualitza_preus(ClientMinisteri(), magatzem, dies_enrere)
        else:
            max_peticions = _enter_de_l_entorn(VARIABLE_MAX_PETICIONS, MAX_PETICIONS_PER_DEFECTE)
            completa_historic_anual(
                ClientMinisteri(), magatzem, datetime.date.today(), max_peticions
            )
    except (
        FontNoDisponibleError,
        CapMarcaReconegudaError,
        FitxerDeDadesInvalidError,
        VariableDEntornInvalidaError,
    ) as error:
        registre.error("%s", error)
        return CODI_ERROR
    return 0


def _analitzador() -> argparse.ArgumentParser:
    analitzador = argparse.ArgumentParser(
        prog="gulusinacat", description="Actualitza els fitxers de dades de preus de benzineres."
    )
    analitzador.add_argument(
        "--directori",
        type=Path,
        default=Path(),
        help="on es llegeixen i es desen els fitxers JSON (per defecte, el directori actual)",
    )
    ordres = analitzador.add_subparsers(dest="ordre", required=True)
    ordres.add_parser(ORDRE_PREUS, help="preus d'avui: preus.json, estacions.json i historic.json")
    ordres.add_parser(ORDRE_ANUAL, help="històric dels últims 5 anys: anual.json")
    return analitzador


def _enter_de_l_entorn(nom: str, per_defecte: int) -> int:
    valor = os.environ.get(nom, "")
    if not valor:
        return per_defecte
    if not valor.isdigit():
        raise VariableDEntornInvalidaError(nom, valor)
    return int(valor)
