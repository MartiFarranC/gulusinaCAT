"""Client del web de preus de carburants del Govern d'Andorra.

El web no té API: retorna una taula HTML per combustible, amb una fila per benzinera.
"""

from __future__ import annotations

import datetime
import html.parser
import logging
import urllib.parse
import urllib.request
from collections.abc import Callable, Mapping
from dataclasses import dataclass, field
from typing import IO, TypeAlias
from zoneinfo import ZoneInfo

from gulusinacat.aplicacio.ports import FontNoDisponibleError
from gulusinacat.domini.combustible import Combustible
from gulusinacat.domini.estacio import Estacio, PublicacioDePreus
from gulusinacat.infraestructura.coordenades_andorra import COORDENADES

URL_PREUS = "https://sig.govern.ad/IPE/PreusCarburants/GetPreus"
PRODUCTES = {Combustible.GASOLINA_95: "4", Combustible.DIESEL: "6"}
CAPCALERES = {"User-Agent": "Mozilla/5.0", "Accept": "text/html"}
TEMPS_MAXIM_S = 90
ZONA_HORARIA = ZoneInfo("Europe/Andorra")
FORMAT_DE_LA_CONSULTA = "%Y-%m-%d %H:%M:%S"
FORMAT_DE_LA_PUBLICACIO = "%d/%m/%Y %H:%M:%S"
# Per a un dia passat el web vol l'última hora del dia, com fa el seu formulari.
FINAL_DEL_DIA = datetime.time(23, 59, 59)
PREFIX_DE_FILA = "TRHeader_"
COLUMNES = 4

Obridor: TypeAlias = Callable[..., IO[bytes]]
registre = logging.getLogger(__name__)


@dataclass
class FilaDeBenzinera:
    """Textos de les cel·les d'una fila de la taula, tal com surten al web."""

    identificador: int
    celles: list[str] = field(default_factory=list)


class _LectorDeLaTaula(html.parser.HTMLParser):
    """Recull el text de cada cel·la de les files de benzinera.

    A la cel·la de l'adreça, el que va després del salt de línia és l'enllaç
    «Navega» i no es guarda.
    """

    def __init__(self) -> None:
        super().__init__()
        self.files: list[FilaDeBenzinera] = []
        self._fila: FilaDeBenzinera | None = None
        self._dins_de_cella = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "tr":
            self._fila = _fila_de(dict(attrs).get("class") or "")
            if self._fila:
                self.files.append(self._fila)
        elif tag == "td" and self._fila:
            self._fila.celles.append("")
            self._dins_de_cella = True
        elif tag == "br":
            self._dins_de_cella = False

    def handle_endtag(self, tag: str) -> None:
        if tag == "td":
            self._dins_de_cella = False
        elif tag == "tr":
            self._fila = None

    def handle_data(self, data: str) -> None:
        if self._fila and self._dins_de_cella:
            self._fila.celles[-1] += data


def _fila_de(classes: str) -> FilaDeBenzinera | None:
    for classe in classes.split():
        identificador = classe.removeprefix(PREFIX_DE_FILA)
        if classe.startswith(PREFIX_DE_FILA) and identificador.isdigit():
            return FilaDeBenzinera(int(identificador))
    return None


def llegeix_la_taula(text: str) -> dict[int, FilaDeBenzinera]:
    """Files de benzinera de la resposta del web, per identificador."""
    lector = _LectorDeLaTaula()
    lector.feed(text)
    return {fila.identificador: fila for fila in lector.files if len(fila.celles) >= COLUMNES}


def preu_del_text(text: str) -> float | None:
    """'1,423 €/l' dona 1.423; un text sense preu positiu dona `None`."""
    try:
        preu = float(text.replace("€/l", "").strip().replace(",", "."))
    except ValueError:
        return None
    return preu if preu > 0 else None


def _net(text: str) -> str:
    return " ".join(text.split())


class ClientGovernAndorra:
    """Font de preus que llegeix el web del Govern d'Andorra.

    `obre` i `ara` permeten substituir la xarxa i el rellotge; per defecte són
    `urllib.request.urlopen` i l'hora actual d'Andorra.
    """

    def __init__(
        self,
        obre: Obridor | None = None,
        ara: Callable[[], datetime.datetime] | None = None,
    ) -> None:
        self._obre = obre
        self._ara = ara

    def preus_actuals(self) -> PublicacioDePreus:
        """Preus d'ara mateix de totes les benzineres d'Andorra."""
        moment = self._moment_actual()
        return PublicacioDePreus(
            data=moment.strftime(FORMAT_DE_LA_PUBLICACIO), estacions=self._estacions(moment)
        )

    def preus_del_dia(self, dia: datetime.date) -> tuple[Estacio, ...]:
        """Preus que hi havia al final del dia indicat."""
        return self._estacions(datetime.datetime.combine(dia, FINAL_DEL_DIA))

    def _moment_actual(self) -> datetime.datetime:
        return self._ara() if self._ara else datetime.datetime.now(ZONA_HORARIA)

    def _estacions(self, moment: datetime.datetime) -> tuple[Estacio, ...]:
        taules = {
            combustible: llegeix_la_taula(self._baixa(producte, moment))
            for combustible, producte in PRODUCTES.items()
        }
        identificadors = sorted(
            {identificador for taula in taules.values() for identificador in taula}
        )
        sense_lloc = [i for i in identificadors if i not in COORDENADES]
        if sense_lloc:
            registre.warning("Benzineres sense coordenades (no surten al mapa): %s", sense_lloc)
        return tuple(_estacio(identificador, taules) for identificador in identificadors)

    def _baixa(self, producte: str, moment: datetime.datetime) -> str:
        consulta = urllib.parse.urlencode(
            {
                "idProducte": producte,
                "data": moment.strftime(FORMAT_DE_LA_CONSULTA),
                "idParroquia": "",
            }
        )
        peticio = urllib.request.Request(f"{URL_PREUS}?{consulta}", headers=CAPCALERES)  # noqa: S310 - URL fixa i https
        obre = self._obre or urllib.request.urlopen
        try:
            with obre(peticio, timeout=TEMPS_MAXIM_S) as resposta:
                return bytes(resposta.read()).decode("utf-8")
        except (OSError, UnicodeDecodeError) as error:
            missatge = f"El web del Govern d'Andorra no respon: {error}"
            raise FontNoDisponibleError(missatge) from error


def _estacio(
    identificador: int, taules: Mapping[Combustible, Mapping[int, FilaDeBenzinera]]
) -> Estacio:
    files = [taula[identificador] for taula in taules.values() if identificador in taula]
    nom, adreca, marca, _ = (_net(cella) for cella in files[0].celles[:COLUMNES])
    carrer, _, nucli = adreca.rpartition(",")
    preus = {
        combustible: preu
        for combustible, taula in taules.items()
        if identificador in taula
        and (preu := preu_del_text(taula[identificador].celles[COLUMNES - 1])) is not None
    }
    latitud, longitud = COORDENADES.get(identificador, (None, None))
    return Estacio(
        rotul=marca or nom,
        preus=preus,
        municipi=nucli.strip(),
        adreca=carrer.strip() or nom,
        latitud=latitud,
        longitud=longitud,
    )
