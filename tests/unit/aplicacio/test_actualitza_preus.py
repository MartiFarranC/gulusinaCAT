from __future__ import annotations

import datetime

import pytest

from gulusinacat.aplicacio.actualitza_preus import (
    DIES_A_L_HISTORIC,
    CapMarcaReconegudaError,
    actualitza_preus,
)
from gulusinacat.aplicacio.documents import DiaHistoric
from tests.unit.aplicacio.dobles import FontEnMemoria, MagatzemEnMemoria
from tests.unit.fabriques import estacio

TRES_REPSOLS = (estacio(), estacio(), estacio())
AVUI = datetime.date(2026, 9, 30)


def _dia(data: datetime.date) -> DiaHistoric:
    return DiaHistoric(data=data.isoformat(), marques={})


def test_desa_els_preus_i_les_estacions() -> None:
    magatzem = MagatzemEnMemoria()

    actualitza_preus(FontEnMemoria(TRES_REPSOLS), magatzem, dies_enrere=0)

    assert magatzem.preus is not None
    assert list(magatzem.preus["marques"]) == ["repsol"]
    assert magatzem.estacions is not None
    assert len(magatzem.estacions["e"]) == 3


def test_sense_cap_marca_reconeguda_no_desa_res() -> None:
    magatzem = MagatzemEnMemoria()
    independents = FontEnMemoria((estacio(rotul="SIN RÓTULO"),))

    with pytest.raises(CapMarcaReconegudaError):
        actualitza_preus(independents, magatzem, dies_enrere=0)

    assert magatzem.preus is None


def test_afegeix_el_dia_d_avui_a_l_historic() -> None:
    magatzem = MagatzemEnMemoria(historic=[_dia(AVUI - datetime.timedelta(days=1))])

    actualitza_preus(FontEnMemoria(TRES_REPSOLS), magatzem, dies_enrere=0)

    assert [dia["data"] for dia in magatzem.historic] == ["2026-09-29", "2026-09-30"]


def test_recupera_nomes_els_dies_enrere_que_falten() -> None:
    font = FontEnMemoria(TRES_REPSOLS)
    ahir = AVUI - datetime.timedelta(days=1)
    magatzem = MagatzemEnMemoria(historic=[_dia(ahir)])

    actualitza_preus(font, magatzem, dies_enrere=2)

    assert font.dies_demanats == [AVUI - datetime.timedelta(days=2)]


def test_un_dia_enrere_que_falla_no_atura_l_actualitzacio() -> None:
    abans_d_ahir = AVUI - datetime.timedelta(days=2)
    font = FontEnMemoria(TRES_REPSOLS, dies_que_fallen=frozenset({abans_d_ahir}))
    magatzem = MagatzemEnMemoria()

    actualitza_preus(font, magatzem, dies_enrere=2)

    assert [dia["data"] for dia in magatzem.historic] == ["2026-09-29", "2026-09-30"]


def test_l_historic_nomes_conserva_l_ultim_any() -> None:
    antics = [_dia(AVUI - datetime.timedelta(days=dies)) for dies in range(400, 0, -1)]
    magatzem = MagatzemEnMemoria(historic=antics)

    actualitza_preus(FontEnMemoria(TRES_REPSOLS), magatzem, dies_enrere=0)

    assert len(magatzem.historic) == DIES_A_L_HISTORIC
    assert magatzem.historic[-1]["data"] == AVUI.isoformat()
