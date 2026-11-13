from __future__ import annotations

import datetime
import io
import urllib.parse
import urllib.request
from collections.abc import Callable

import pytest

from gulusinacat.aplicacio.ports import FontNoDisponibleError
from gulusinacat.domini.combustible import Combustible
from gulusinacat.infraestructura.govern_andorra import (
    ClientGovernAndorra,
    llegeix_la_taula,
    preu_del_text,
)

ARA = datetime.datetime(2026, 11, 13, 21, 6, 2)


def _fila(identificador: int, nom: str, adreca: str, marca: str, preu: str) -> str:
    """Fila tal com la genera el web, amb la fila amagada del detall a sota."""
    return f"""
    <tr class="TRHeader TRHeader_{identificador}">
        <td width="40%">
            <a onclick="ipe.showDetail(this, {identificador})">{nom} <i class="fas"></i></a>
        </td>
        <td width="40%">
            {adreca}
            <br />
            <a target="_blank" href="https://www.google.com/maps/dir//x">Navega<i></i></a>
        </td>
        <td width="10%">{marca}</td>
        <td width="10%">{preu}</td>
    </tr>
    <tr style="display:none" class="TRData TRData_{identificador}">
        <td colspan="4"><div class="col-sm-10">13/11/2026</div></td>
    </tr>"""


def _taula(*files: str) -> str:
    return f"""<h3>Canillo</h3><h5>Gasolina sense plom 95 octans</h5>
    <table class="table"><thead><tr><th>Estació de servei</th><th>Adreça</th>
    <th>Marca</th><th>Preu</th></tr></thead>
    <tbody class="datosIPE">{"".join(files)}</tbody></table>"""


GASOLINA = _taula(
    _fila(53, "Arap BP VI", "Ctra. General 2  , Incles", "BP", "1,423 €/l"),
    _fila(39, "Elf Aixovall", ", Sant Julià de Lòria", "ELF", "1,464 €/l"),
    _fila(999, "Nova", "Carrer Nou 1 , Encamp", "REPSOL", "1,500 €/l"),
)
DIESEL = _taula(_fila(53, "Arap BP VI", "Ctra. General 2  , Incles", "BP", "1,643 €/l"))
PRODUCTE_GASOLINA = "4"


def _servidor(urls: list[str] | None = None) -> Callable[..., io.BytesIO]:
    """Respon la taula del combustible demanat."""

    def obre(peticio: urllib.request.Request, timeout: float) -> io.BytesIO:  # noqa: ARG001
        if urls is not None:
            urls.append(peticio.full_url)
        consulta = urllib.parse.parse_qs(urllib.parse.urlparse(peticio.full_url).query)
        text = GASOLINA if consulta["idProducte"] == [PRODUCTE_GASOLINA] else DIESEL
        return io.BytesIO(text.encode())

    return obre


def test_llegeix_cada_fila_sense_l_enllac_de_navegacio() -> None:
    files = llegeix_la_taula(GASOLINA)

    assert [" ".join(cella.split()) for cella in files[53].celles] == [
        "Arap BP VI",
        "Ctra. General 2 , Incles",
        "BP",
        "1,423 €/l",
    ]
    assert set(files) == {53, 39, 999}


@pytest.mark.parametrize(
    ("text", "esperat"),
    [("1,423 €/l", 1.423), ("0,000 €/l", None), ("", None), ("consultar", None)],
)
def test_converteix_el_preu(text: str, esperat: float | None) -> None:
    assert preu_del_text(text) == esperat


def test_ajunta_els_combustibles_de_cada_benzinera() -> None:
    client = ClientGovernAndorra(obre=_servidor(), ara=lambda: ARA)

    publicacio = client.preus_actuals()

    assert publicacio.data == "13/11/2026 21:06:02"
    estacio = next(e for e in publicacio.estacions if e.municipi == "Incles")
    assert estacio.rotul == "BP"
    assert estacio.adreca == "Ctra. General 2"
    assert estacio.preus == {Combustible.GASOLINA_95: 1.423, Combustible.DIESEL: 1.643}
    assert (estacio.latitud, estacio.longitud) == (42.58188, 1.66204)


def test_sense_carrer_l_adreca_es_el_nom_de_la_benzinera() -> None:
    client = ClientGovernAndorra(obre=_servidor(), ara=lambda: ARA)

    estacio = next(e for e in client.preus_actuals().estacions if e.rotul == "ELF")

    assert (estacio.adreca, estacio.municipi) == ("Elf Aixovall", "Sant Julià de Lòria")
    assert estacio.preus == {Combustible.GASOLINA_95: 1.464}


def test_una_benzinera_sense_coordenades_conegudes_no_te_posicio(
    caplog: pytest.LogCaptureFixture,
) -> None:
    client = ClientGovernAndorra(obre=_servidor(), ara=lambda: ARA)

    estacio = next(e for e in client.preus_actuals().estacions if e.municipi == "Encamp")

    assert estacio.coordenades_valides() is None
    assert "999" in caplog.text


def test_demana_els_preus_d_un_dia_passat_al_final_del_dia() -> None:
    urls: list[str] = []
    client = ClientGovernAndorra(obre=_servidor(urls))

    client.preus_del_dia(datetime.date(2025, 6, 15))

    consultes = [urllib.parse.parse_qs(urllib.parse.urlparse(url).query) for url in urls]
    assert {consulta["data"][0] for consulta in consultes} == {"2025-06-15 23:59:59"}
    assert sorted(consulta["idProducte"][0] for consulta in consultes) == ["4", "6"]


def test_si_el_web_no_respon_avisa_que_la_font_no_esta_disponible() -> None:
    def sense_xarxa(peticio: urllib.request.Request, timeout: float) -> io.BytesIO:  # noqa: ARG001
        raise ConnectionResetError

    client = ClientGovernAndorra(obre=sense_xarxa, ara=lambda: ARA)

    with pytest.raises(FontNoDisponibleError, match="Govern d'Andorra"):
        client.preus_actuals()
