from __future__ import annotations

from gulusinacat.domini.marques import (
    ALTRES,
    NOM_ALTRES,
    classifica,
    identificador_de,
    nom_llegible,
    normalitza_rotul,
)


def test_normalitza_treu_accents_i_signes() -> None:
    assert normalitza_rotul("  bonÀrea-Agropecuària ") == "BONAREA AGROPECUARIA"


def test_nom_llegible_capitalitza_paraules_i_respecta_sigles() -> None:
    assert nom_llegible("GM OIL DE SORT") == "GM Oil De Sort"


def test_identificador_de_substitueix_espais_per_guions() -> None:
    assert identificador_de("PETROLIS MARTI") == "petrolis-marti"


def test_reconeix_les_variants_d_una_marca_coneguda() -> None:
    classificacio = classifica(["BONAREA", "bonÀrea Agropecuaria", "BON AREA"])

    assert classificacio.marques == ("bonarea", "bonarea", "bonarea")
    assert classificacio.noms == {"bonarea": "bonÀrea"}


def test_agrupa_una_marca_coneguda_amb_massa_poques_estacions() -> None:
    classificacio = classifica(["CAMPSA", "REPSOL", "REPSOL", "REPSOL"])

    assert classificacio.marques[0] == ALTRES


def test_converteix_en_marca_un_retol_desconegut_que_es_repeteix() -> None:
    classificacio = classifica(["PETROLIS MARTÍ"] * 3)

    assert classificacio.marques == ("petrolis-marti",) * 3
    assert classificacio.noms == {"petrolis-marti": "Petrolis Martí"}


def test_agrupa_un_retol_desconegut_poc_repetit_i_l_avisa() -> None:
    classificacio = classifica(["E.S. SANT JOAN", "REPSOL", "REPSOL", "REPSOL"])

    assert classificacio.marques[0] == ALTRES
    assert classificacio.noms[ALTRES] == NOM_ALTRES
    assert classificacio.rotuls_agrupats == ("E S SANT JOAN",)


def test_els_retols_generics_no_es_converteixen_en_marca() -> None:
    classificacio = classifica(["Nº 10.235", "SIN RÓTULO", "", "Nº 10.235", "Nº 10.235"])

    assert set(classificacio.marques) == {ALTRES}
    assert classificacio.rotuls_agrupats == ()
