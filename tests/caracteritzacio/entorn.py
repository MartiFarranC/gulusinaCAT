"""Entorn controlat per executar els scripts de dades sense xarxa ni rellotge real.

El servidor del Ministeri se substitueix per un de fals que respon amb una mostra
desada; l'històric es deriva d'aquesta mostra amb un factor fix per data, perquè
cada mes tingui preus diferents però sempre els mateixos.
"""

from __future__ import annotations

import datetime
import io
import json
import re
import time
import urllib.request
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Any

import pytest

ARREL = Path(__file__).resolve().parents[2]
DADES = Path(__file__).parent / "dades"
ESPERAT = DADES / "esperat"
AVUI = datetime.date(2026, 9, 30)
FITXERS_DIARIS = ("preus.json", "estacions.json", "historic.json")
CAMPS_DE_PREU = ("Precio Gasolina 95 E5", "Precio Gasoleo A")
DATA_A_LA_URL = re.compile(r"/(\d{2})-(\d{2})-(\d{4})/")


class DataFixa(datetime.date):
    """`datetime.date` amb un `today()` que sempre retorna `AVUI`."""

    @classmethod
    def today(cls) -> DataFixa:
        return cls(AVUI.year, AVUI.month, AVUI.day)


def resposta_actual() -> dict[str, Any]:
    """Resposta desada de l'API del Ministeri per a Catalunya."""
    with (DADES / "ministeri.json").open(encoding="utf-8") as fitxer:
        resposta: dict[str, Any] = json.load(fitxer)
    return resposta


def _escala(preu: str, factor: float) -> str:
    if not preu:
        return preu
    return f"{float(preu.replace(',', '.')) * factor:.3f}".replace(".", ",")


def resposta_historica(dia: datetime.date) -> dict[str, Any]:
    """Resposta de l'històric per a `dia`: la mostra amb els preus escalats."""
    factor = 1 + (dia.year - AVUI.year) * 0.02 + (dia.month - AVUI.month) * 0.001
    resposta = resposta_actual()
    for estacio in resposta["ListaEESSPrecio"]:
        for camp in CAMPS_DE_PREU:
            estacio[camp] = _escala(estacio[camp], factor)
    return resposta


def _data_de(url: str) -> datetime.date | None:
    coincidencia = DATA_A_LA_URL.search(url)
    if not coincidencia:
        return None
    dia, mes, any_ = (int(part) for part in coincidencia.groups())
    return datetime.date(any_, mes, dia)


def servidor_fals(
    mesos_que_fallen: frozenset[tuple[int, int]] = frozenset(),
) -> Callable[..., io.BytesIO]:
    """Substitut de `urllib.request.urlopen` que no fa servir la xarxa.

    Les peticions a l'històric dels mesos de `mesos_que_fallen` tallen la connexió,
    com fa a vegades el servidor real.
    """

    def urlopen(peticio: urllib.request.Request, timeout: float = 0) -> io.BytesIO:  # noqa: ARG001
        dia = _data_de(peticio.full_url)
        if dia is None:
            resposta = resposta_actual()
        elif (dia.year, dia.month) in mesos_que_fallen:
            raise ConnectionResetError(104, "Connection reset by peer")
        else:
            resposta = resposta_historica(dia)
        return io.BytesIO(json.dumps(resposta, ensure_ascii=False).encode("utf-8"))

    return urlopen


@contextmanager
def entorn_controlat(
    directori: Path,
    variables: dict[str, str] | None = None,
    mesos_que_fallen: frozenset[tuple[int, int]] = frozenset(),
) -> Iterator[pytest.MonkeyPatch]:
    """Executa el bloc dins de `directori` amb el servidor fals i la data fixa."""
    with pytest.MonkeyPatch.context() as mp:
        mp.chdir(directori)
        mp.setattr(urllib.request, "urlopen", servidor_fals(mesos_que_fallen))
        mp.setattr(time, "sleep", lambda _segons: None)
        mp.setattr(datetime, "date", DataFixa)
        mp.syspath_prepend(str(ARREL))
        for nom in ("DIES_ENRERE", "MAX_PETICIONS"):
            mp.delenv(nom, raising=False)
        for nom, valor in (variables or {}).items():
            mp.setenv(nom, valor)
        yield mp
