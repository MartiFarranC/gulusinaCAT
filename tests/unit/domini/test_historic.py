from __future__ import annotations

import datetime

from gulusinacat.domini.historic import (
    Mes,
    MostraMensual,
    PreusMarca,
    mesos_a_cobrir,
    mesos_pendents,
    resums_anuals,
)


def _mostra(versio: int | None, g95: float | None) -> MostraMensual:
    return MostraMensual(versio=versio, preus={"repsol": PreusMarca(g95=g95, dsl=None)})


def test_el_mes_en_curs_no_es_cobreix_fins_passat_el_dia_15() -> None:
    mesos = mesos_a_cobrir(datetime.date(2026, 9, 10))

    assert mesos[-1] == Mes(2026, 8)
    assert mesos[0] == Mes(2022, 1)
    assert len(mesos) == 4 * 12 + 8


def test_els_mesos_que_falten_van_abans_que_els_antics_i_del_mes_recent_al_mes_vell() -> None:
    mesos = [Mes(2026, 1), Mes(2026, 2), Mes(2026, 3)]
    mostres = {"2026-03": _mostra(None, 1.5)}

    pendents = mesos_pendents(mesos, mostres)

    assert pendents == [Mes(2026, 2), Mes(2026, 1), Mes(2026, 3)]


def test_una_mostra_de_la_versio_actual_no_esta_pendent() -> None:
    mostres = {"2026-01": _mostra(2, 1.5)}

    assert mesos_pendents([Mes(2026, 1)], mostres) == []


def test_el_resum_anual_fa_la_mitjana_dels_mesos_amb_preu() -> None:
    mostres = {
        "2025-01": _mostra(2, 1.4),
        "2025-02": _mostra(2, 1.6),
        "2025-03": _mostra(2, None),
    }

    resums = resums_anuals(2026, mostres)

    assert len(resums) == 1
    assert resums[0].mesos == 3
    assert resums[0].preus["repsol"] == PreusMarca(g95=1.5, dsl=None)
