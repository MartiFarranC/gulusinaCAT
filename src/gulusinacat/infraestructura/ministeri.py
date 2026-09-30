"""Client de l'API de preus de carburants del Ministeri per a la Transició Ecològica."""

from __future__ import annotations

import datetime
import json
import logging
import time
import urllib.request
from collections.abc import Callable, Mapping
from typing import IO, Any, TypeAlias

from gulusinacat.aplicacio.ports import FontNoDisponibleError
from gulusinacat.domini.combustible import Combustible
from gulusinacat.domini.estacio import Estacio, PublicacioDePreus

URL_BASE = "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/"
CODI_CATALUNYA = "09"
URL_PREUS_ACTUALS = f"{URL_BASE}EstacionesTerrestres/FiltroCCAA/{CODI_CATALUNYA}"
URL_HISTORIC = f"{URL_BASE}EstacionesTerrestresHist/FiltroCCAA/{{data}}/{CODI_CATALUNYA}"
FORMAT_DATA_HISTORIC = "%d-%m-%Y"
CAPCALERES = {"User-Agent": "Mozilla/5.0", "Accept": "application/json"}
TEMPS_MAXIM_S = 120
# El servidor talla sovint la connexió: es torna a provar amb una espera creixent.
INTENTS_PREUS_ACTUALS = 3
INTENTS_HISTORIC = 2
ESPERA_ENTRE_INTENTS_S = 15

CAMP_DATA = "Fecha"
CAMP_ESTACIONS = "ListaEESSPrecio"
CAMP_ROTUL = "Rótulo"
CAMP_MUNICIPI = "Municipio"
CAMP_ADRECA = "Dirección"
CAMP_LATITUD = "Latitud"
CAMP_LONGITUD = "Longitud (WGS84)"
CAMPS_DE_PREU = {
    Combustible.GASOLINA_95: "Precio Gasolina 95 E5",
    Combustible.DIESEL: "Precio Gasoleo A",
}

Obridor: TypeAlias = Callable[..., IO[bytes]]
registre = logging.getLogger(__name__)


class ClientMinisteri:
    """Font de preus que llegeix l'API pública del Ministeri.

    `obre` i `espera` permeten substituir la xarxa i el rellotge; per defecte són
    `urllib.request.urlopen` i `time.sleep`.
    """

    def __init__(
        self,
        obre: Obridor | None = None,
        espera: Callable[[float], None] | None = None,
    ) -> None:
        self._obre = obre
        self._espera = espera

    def preus_actuals(self) -> PublicacioDePreus:
        """Preus d'ara mateix de totes les estacions de Catalunya."""
        resposta = self._baixa(URL_PREUS_ACTUALS, INTENTS_PREUS_ACTUALS)
        return PublicacioDePreus(
            data=_text(resposta.get(CAMP_DATA)), estacions=_estacions(resposta)
        )

    def preus_del_dia(self, dia: datetime.date) -> tuple[Estacio, ...]:
        """Preus que hi havia el dia indicat."""
        url = URL_HISTORIC.format(data=dia.strftime(FORMAT_DATA_HISTORIC))
        return _estacions(self._baixa(url, INTENTS_HISTORIC))

    def _baixa(self, url: str, intents: int) -> dict[str, Any]:
        peticio = urllib.request.Request(url, headers=CAPCALERES)  # noqa: S310 - URL fixa i https
        for intent in range(1, intents + 1):
            try:
                return _llegeix_resposta(self._obridor(), peticio)
            except (OSError, ValueError) as error:
                if intent == intents:
                    missatge = f"El Ministeri no respon després de {intents} intents: {error}"
                    raise FontNoDisponibleError(missatge) from error
                registre.warning("Intent %d fallit (%s); es torna a provar", intent, error)
                self._esperador()(ESPERA_ENTRE_INTENTS_S * intent)
        missatge = "Cal com a mínim un intent"
        raise ValueError(missatge)

    def _obridor(self) -> Obridor:
        # Es busca en el moment de fer servir-lo perquè els tests puguin substituir-lo.
        return self._obre or urllib.request.urlopen

    def _esperador(self) -> Callable[[float], None]:
        return self._espera or time.sleep


def _llegeix_resposta(obre: Obridor, peticio: urllib.request.Request) -> dict[str, Any]:
    with obre(peticio, timeout=TEMPS_MAXIM_S) as resposta:
        dades = json.load(resposta)
    if not isinstance(dades, dict):
        missatge = "La resposta del Ministeri no és un objecte JSON"
        raise ValueError(missatge)  # noqa: TRY004 - es tracta com qualsevol resposta il·legible
    return dades


def _estacions(resposta: Mapping[str, Any]) -> tuple[Estacio, ...]:
    registres = resposta.get(CAMP_ESTACIONS, [])
    if not isinstance(registres, list):
        return ()
    return tuple(_estacio(registre) for registre in registres if isinstance(registre, dict))


def _estacio(registre: Mapping[str, Any]) -> Estacio:
    preus = {
        combustible: preu
        for combustible, camp in CAMPS_DE_PREU.items()
        if (preu := _preu(registre.get(camp))) is not None
    }
    return Estacio(
        rotul=_text(registre.get(CAMP_ROTUL)),
        preus=preus,
        municipi=_text(registre.get(CAMP_MUNICIPI)).strip(),
        adreca=_text(registre.get(CAMP_ADRECA)).strip(),
        latitud=_nombre(registre.get(CAMP_LATITUD)),
        longitud=_nombre(registre.get(CAMP_LONGITUD)),
    )


def _text(valor: object) -> str:
    return valor if isinstance(valor, str) else ""


def _nombre(valor: object) -> float | None:
    """Nombre amb coma decimal, com els publica el Ministeri ('1,739')."""
    try:
        return float(str(valor).replace(",", "."))
    except ValueError:
        return None


def _preu(valor: object) -> float | None:
    """Preu positiu, o `None` si està buit o no té sentit."""
    preu = _nombre(valor)
    return preu if preu is not None and preu > 0 else None
