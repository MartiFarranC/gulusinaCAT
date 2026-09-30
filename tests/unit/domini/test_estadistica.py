from __future__ import annotations

from gulusinacat.domini.estadistica import mitjana, percentil


def test_mitjana_arrodoneix_a_mil_lesimes() -> None:
    assert mitjana([1.2345, 1.2346]) == 1.235


def test_mitjana_d_una_llista_buida_es_none() -> None:
    assert mitjana([]) is None


def test_percentil_retorna_un_dels_valors_sense_interpolar() -> None:
    assert percentil([3.0, 1.0, 2.0, 5.0, 4.0], 0.9) == 5.0


def test_percentil_d_una_llista_buida_es_none() -> None:
    assert percentil([], 0.5) is None
