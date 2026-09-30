from __future__ import annotations

from gulusinacat.domini.combustible import Combustible
from gulusinacat.domini.marques import ALTRES, classifica
from gulusinacat.domini.resum import (
    detall_per_marca,
    hi_ha_marques_reconegudes,
    mitjana_general,
    mitjanes_per_marca,
)
from tests.unit.fabriques import estacio

REPSOLS = [
    estacio(gasolina_95=1.6, diesel=1.5, municipi="Reus"),
    estacio(gasolina_95=1.4, diesel=None, municipi="Vic"),
    estacio(gasolina_95=1.5, diesel=1.3, municipi="Olot"),
]


def test_la_mitjana_d_una_marca_nomes_compta_les_estacions_amb_preu() -> None:
    mitjanes = mitjanes_per_marca(REPSOLS, classifica([e.rotul for e in REPSOLS]))

    assert mitjanes["repsol"].preus == {Combustible.GASOLINA_95: 1.5, Combustible.DIESEL: 1.4}
    assert mitjanes["repsol"].estacions == 3


def test_la_mitjana_general_inclou_totes_les_estacions() -> None:
    general = mitjana_general([*REPSOLS, estacio(rotul="SENSE NOM", gasolina_95=2.0)])

    assert general.preus[Combustible.GASOLINA_95] == 1.625
    assert general.estacions == 4


def test_el_detall_indica_l_estacio_mes_barata_de_cada_combustible() -> None:
    detalls = detall_per_marca(REPSOLS, classifica([e.rotul for e in REPSOLS]))

    assert detalls["repsol"].mes_barates[Combustible.GASOLINA_95].municipi == "Vic"
    assert detalls["repsol"].mes_barates[Combustible.DIESEL].municipi == "Olot"


def test_nomes_hi_ha_independents_vol_dir_que_no_hi_ha_marques_reconegudes() -> None:
    independents = [estacio(rotul="SIN RÓTULO")]

    mitjanes = mitjanes_per_marca(independents, classifica([e.rotul for e in independents]))

    assert list(mitjanes) == [ALTRES]
    assert not hi_ha_marques_reconegudes(mitjanes)
