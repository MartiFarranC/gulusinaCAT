from __future__ import annotations

import datetime
import io
import json
import urllib.request
from collections.abc import Callable

import pytest

from gulusinacat.aplicacio.ports import FontNoDisponibleError
from gulusinacat.domini.combustible import Combustible
from gulusinacat.infraestructura.ministeri import (
    ESPERA_ENTRE_INTENTS_S,
    INTENTS_PREUS_ACTUALS,
    ClientMinisteri,
)

REGISTRE = {
    "Rótulo": "REPSOL",
    "Precio Gasolina 95 E5": "1,739",
    "Precio Gasoleo A": "",
    "Municipio": " Reus ",
    "Dirección": "AVINGUDA DE SANT JORDI, 5",
    "Latitud": "41,155000",
    "Longitud (WGS84)": "-0,107000",
}


def _servidor(respostes: list[object], urls: list[str] | None = None) -> Callable[..., io.BytesIO]:
    """Retorna cada resposta per ordre; les excepcions es llancen."""

    def obre(peticio: urllib.request.Request, timeout: float) -> io.BytesIO:  # noqa: ARG001
        if urls is not None:
            urls.append(peticio.full_url)
        resposta = respostes.pop(0)
        if isinstance(resposta, Exception):
            raise resposta
        return io.BytesIO(json.dumps(resposta).encode())

    return obre


def test_llegeix_la_data_i_les_estacions() -> None:
    client = ClientMinisteri(
        obre=_servidor([{"Fecha": "30/09/2026", "ListaEESSPrecio": [REGISTRE]}])
    )

    publicacio = client.preus_actuals()

    assert publicacio.data == "30/09/2026"
    estacio = publicacio.estacions[0]
    assert estacio.preus == {Combustible.GASOLINA_95: 1.739}
    assert estacio.municipi == "Reus"
    assert (estacio.latitud, estacio.longitud) == (41.155, -0.107)


def test_torna_a_provar_amb_una_espera_creixent() -> None:
    esperes: list[float] = []
    respostes: list[object] = [ConnectionResetError(), ConnectionResetError(), {"Fecha": "x"}]
    client = ClientMinisteri(obre=_servidor(respostes), espera=esperes.append)

    client.preus_actuals()

    assert esperes == [ESPERA_ENTRE_INTENTS_S, 2 * ESPERA_ENTRE_INTENTS_S]


def test_despres_de_tots_els_intents_la_font_no_esta_disponible() -> None:
    respostes: list[object] = [ConnectionResetError()] * INTENTS_PREUS_ACTUALS
    client = ClientMinisteri(obre=_servidor(respostes), espera=lambda _segons: None)

    with pytest.raises(FontNoDisponibleError):
        client.preus_actuals()


def test_una_resposta_que_no_es_un_objecte_es_un_error_de_la_font() -> None:
    respostes: list[object] = [[1, 2, 3]] * INTENTS_PREUS_ACTUALS
    client = ClientMinisteri(obre=_servidor(respostes), espera=lambda _segons: None)

    with pytest.raises(FontNoDisponibleError):
        client.preus_actuals()


def test_demana_l_historic_amb_la_data_al_format_del_ministeri() -> None:
    urls: list[str] = []
    client = ClientMinisteri(obre=_servidor([{"ListaEESSPrecio": []}], urls))

    client.preus_del_dia(datetime.date(2026, 3, 5))

    assert urls[0].endswith("/EstacionesTerrestresHist/FiltroCCAA/05-03-2026/09")


def test_una_llista_d_estacions_mal_formada_es_llegeix_com_a_buida() -> None:
    client = ClientMinisteri(obre=_servidor([{"ListaEESSPrecio": "no és una llista"}]))

    assert client.preus_del_dia(datetime.date(2026, 3, 5)) == ()
