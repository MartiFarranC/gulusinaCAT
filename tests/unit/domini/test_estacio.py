from __future__ import annotations

import dataclasses

from gulusinacat.domini.combustible import Combustible
from tests.unit.fabriques import estacio


def test_preu_d_un_combustible_que_no_ven_es_none() -> None:
    sense_diesel = estacio(diesel=None)

    assert sense_diesel.preu(Combustible.DIESEL) is None


def test_coordenades_dins_de_catalunya_son_valides() -> None:
    assert estacio().coordenades_valides() is not None


def test_coordenades_a_zero_no_son_valides() -> None:
    a_l_ocea = dataclasses.replace(estacio(), latitud=0.0, longitud=0.0)

    assert a_l_ocea.coordenades_valides() is None


def test_coordenades_absents_no_son_valides() -> None:
    sense_latitud = dataclasses.replace(estacio(), latitud=None)

    assert sense_latitud.coordenades_valides() is None
