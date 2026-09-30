from __future__ import annotations

from pathlib import Path

import pytest

from gulusinacat.aplicacio.documents import DiaHistoric
from gulusinacat.domini.historic import HistoricAnual, MostraMensual, PreusMarca, ResumAnual
from gulusinacat.infraestructura.fitxers import (
    FITXER_ANUAL,
    FITXER_HISTORIC,
    FitxerDeDadesInvalidError,
    MagatzemDeFitxers,
)

DIA = DiaHistoric(data="2026-09-30", marques={"repsol": PreusMarca(g95=1.5, dsl=None)})


def test_sense_fitxers_l_historic_es_buit(tmp_path: Path) -> None:
    magatzem = MagatzemDeFitxers(tmp_path)

    assert magatzem.llegeix_historic() == {}
    assert magatzem.llegeix_anual() == HistoricAnual(noms={}, mostres={})


def test_un_fitxer_que_no_es_json_es_tracta_com_si_no_existis(tmp_path: Path) -> None:
    (tmp_path / FITXER_HISTORIC).write_text("{no és json", encoding="utf-8")

    assert MagatzemDeFitxers(tmp_path).llegeix_historic() == {}


def test_l_historic_desat_es_torna_a_llegir_igual(tmp_path: Path) -> None:
    magatzem = MagatzemDeFitxers(tmp_path)

    magatzem.desa_historic([DIA])

    assert magatzem.llegeix_historic() == {"2026-09-30": DIA}


def test_un_historic_amb_l_estructura_equivocada_es_un_error(tmp_path: Path) -> None:
    (tmp_path / FITXER_HISTORIC).write_text('{"dies": [{"marques": {}}]}', encoding="utf-8")

    with pytest.raises(FitxerDeDadesInvalidError):
        MagatzemDeFitxers(tmp_path).llegeix_historic()


def test_un_anual_amb_noms_que_no_son_text_es_un_error(tmp_path: Path) -> None:
    (tmp_path / FITXER_ANUAL).write_text('{"noms": {"repsol": 3}}', encoding="utf-8")

    with pytest.raises(FitxerDeDadesInvalidError):
        MagatzemDeFitxers(tmp_path).llegeix_anual()


def test_l_anual_conserva_les_mostres_sense_versio(tmp_path: Path) -> None:
    magatzem = MagatzemDeFitxers(tmp_path)
    preus = {"repsol": PreusMarca(g95=1.5, dsl=1.4)}
    historic = HistoricAnual(
        noms={"repsol": "Repsol"},
        mostres={
            "2026-08": MostraMensual(versio=None, preus=preus),
            "2026-09": MostraMensual(versio=2, preus=preus),
        },
    )

    magatzem.desa_anual(historic, [ResumAnual(any_=2026, mesos=2, preus=preus)])

    assert magatzem.llegeix_anual() == historic
    assert '"2026-08": {"repsol"' in (tmp_path / FITXER_ANUAL).read_text(encoding="utf-8")
