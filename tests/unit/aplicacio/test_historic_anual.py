from __future__ import annotations

import datetime

from gulusinacat.aplicacio.historic_anual import MAXIM_FALLADES_SEGUIDES, completa_historic_anual
from gulusinacat.domini.historic import Mes, mesos_a_cobrir
from tests.unit.aplicacio.dobles import FontEnMemoria, MagatzemEnMemoria
from tests.unit.fabriques import estacio

AVUI = datetime.date(2026, 9, 30)
TRES_REPSOLS = (estacio(), estacio(), estacio())


def test_baixa_com_a_maxim_les_peticions_indicades() -> None:
    font = FontEnMemoria(TRES_REPSOLS)
    magatzem = MagatzemEnMemoria()

    completa_historic_anual(font, magatzem, AVUI, max_peticions=3)

    assert font.dies_demanats == [
        datetime.date(2026, 9, 15),
        datetime.date(2026, 8, 15),
        datetime.date(2026, 7, 15),
    ]
    assert sorted(magatzem.anual.mostres) == ["2026-07", "2026-08", "2026-09"]
    assert magatzem.anual.noms == {"repsol": "Repsol"}


def test_s_atura_despres_de_massa_errors_seguits() -> None:
    mesos = list(reversed(mesos_a_cobrir(AVUI)))
    que_fallen = frozenset(mes.dia_de_la_mostra for mes in mesos[:MAXIM_FALLADES_SEGUIDES])
    font = FontEnMemoria(TRES_REPSOLS, dies_que_fallen=que_fallen)
    magatzem = MagatzemEnMemoria()

    completa_historic_anual(font, magatzem, AVUI, max_peticions=20)

    assert len(font.dies_demanats) == MAXIM_FALLADES_SEGUIDES
    assert magatzem.anual.mostres == {}


def test_un_error_aillat_no_atura_la_resta() -> None:
    font = FontEnMemoria(TRES_REPSOLS, dies_que_fallen=frozenset({Mes(2026, 8).dia_de_la_mostra}))
    magatzem = MagatzemEnMemoria()

    completa_historic_anual(font, magatzem, AVUI, max_peticions=3)

    assert sorted(magatzem.anual.mostres) == ["2026-07", "2026-09"]


def test_un_mes_sense_estacions_no_es_desa() -> None:
    magatzem = MagatzemEnMemoria()

    completa_historic_anual(FontEnMemoria(()), magatzem, AVUI, max_peticions=2)

    assert magatzem.anual.mostres == {}


def test_desa_el_resum_de_cada_any_amb_mostres() -> None:
    magatzem = MagatzemEnMemoria()

    completa_historic_anual(FontEnMemoria(TRES_REPSOLS), magatzem, AVUI, max_peticions=2)

    assert [resum.any_ for resum in magatzem.resums] == [2026]
