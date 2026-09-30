from __future__ import annotations

import urllib.request
from pathlib import Path

import pytest

from gulusinacat.presentacio.cli import CODI_ERROR, main


def _sense_xarxa(*_arguments: object, **_opcions: object) -> None:
    raise ConnectionResetError(104, "Connection reset by peer")


def test_una_variable_d_entorn_que_no_es_un_enter_acaba_amb_error(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("DIES_ENRERE", "molts")

    assert main(["--directori", str(tmp_path), "preus"]) == CODI_ERROR


def test_si_el_ministeri_no_respon_acaba_amb_error_sense_desar_res(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(urllib.request, "urlopen", _sense_xarxa)
    monkeypatch.setattr("time.sleep", lambda _segons: None)

    assert main(["--directori", str(tmp_path), "preus"]) == CODI_ERROR
    assert list(tmp_path.iterdir()) == []


def test_cal_indicar_una_ordre() -> None:
    with pytest.raises(SystemExit):
        main([])
