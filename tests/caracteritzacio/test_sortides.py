"""Fixa, byte a byte, els fitxers que generen les tasques de dades."""

from __future__ import annotations

from pathlib import Path

import pytest

from .entorn import ESPERAT
from .escenaris import ESCENARIS, Escenari


@pytest.mark.parametrize("escenari", ESCENARIS, ids=lambda escenari: escenari.nom)
def test_genera_els_mateixos_fitxers_que_la_referencia(escenari: Escenari, tmp_path: Path) -> None:
    escenari.executa(tmp_path)

    for nom in escenari.fitxers:
        generat = (tmp_path / nom).read_bytes()
        esperat = (ESPERAT / escenari.nom / nom).read_bytes()
        assert generat == esperat, f"{escenari.nom}: {nom} ha canviat"
