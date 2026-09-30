"""Lectura i escriptura dels fitxers JSON que llegeix la pàgina."""

from __future__ import annotations

import json
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import Any, cast

from gulusinacat.aplicacio.documents import DiaHistoric, DocumentEstacions, DocumentPreus
from gulusinacat.domini.historic import HistoricAnual, MostraMensual, PreusMarca, ResumAnual

FITXER_PREUS = "preus.json"
FITXER_ESTACIONS = "estacions.json"
FITXER_HISTORIC = "historic.json"
FITXER_ANUAL = "anual.json"
CLAU_VERSIO = "v"


class FitxerDeDadesInvalidError(Exception):
    """Un fitxer de dades existeix però no té l'estructura esperada."""

    def __init__(self, fitxer: Path, motiu: str) -> None:
        super().__init__(f"{fitxer} no és vàlid: {motiu}. Esborra'l o corregeix-lo.")


class MagatzemDeFitxers:
    """Desa i llegeix els fitxers de dades dins d'un directori."""

    def __init__(self, directori: Path) -> None:
        self._directori = directori

    def desa_preus(self, document: DocumentPreus) -> None:
        """`preus.json`, indentat perquè es pugui llegir."""
        self._escriu(FITXER_PREUS, json.dumps(document, ensure_ascii=False, indent=2))

    def desa_estacions(self, document: DocumentEstacions) -> None:
        """`estacions.json`, compacte perquè la pàgina el baixi ràpid."""
        self._escriu(
            FITXER_ESTACIONS, json.dumps(document, ensure_ascii=False, separators=(",", ":"))
        )

    def llegeix_historic(self) -> dict[str, DiaHistoric]:
        """Dies de `historic.json` indexats per data."""
        contingut = self._llegeix(FITXER_HISTORIC)
        if contingut is None:
            return {}
        fitxer = self._directori / FITXER_HISTORIC
        dies = _objecte(contingut, fitxer).get("dies", [])
        if not isinstance(dies, list):
            raise FitxerDeDadesInvalidError(fitxer, "'dies' no és una llista")
        return {dia["data"]: dia for dia in (_dia_historic(dia, fitxer) for dia in dies)}

    def desa_historic(self, dies: Sequence[DiaHistoric]) -> None:
        """`historic.json`, amb un dia per línia perquè els canvis es llegeixin bé a git."""
        linies = ",\n".join(_json(dia) for dia in dies)
        self._escriu(FITXER_HISTORIC, '{"dies": [\n' + linies + "\n]}\n")

    def llegeix_anual(self) -> HistoricAnual:
        """Mostres mensuals i noms de marca de `anual.json`."""
        contingut = self._llegeix(FITXER_ANUAL)
        if contingut is None:
            return HistoricAnual(noms={}, mostres={})
        fitxer = self._directori / FITXER_ANUAL
        dades = _objecte(contingut, fitxer)
        noms = _objecte(dades.get("noms", {}), fitxer)
        if not all(isinstance(nom, str) for nom in noms.values()):
            raise FitxerDeDadesInvalidError(fitxer, "hi ha noms de marca que no són text")
        mostres = _objecte(dades.get("mesos", {}), fitxer)
        return HistoricAnual(
            noms=cast("dict[str, str]", noms),
            mostres={clau: _mostra(mostra, fitxer) for clau, mostra in mostres.items()},
        )

    def desa_anual(self, historic: HistoricAnual, resums: Sequence[ResumAnual]) -> None:
        """`anual.json`: noms, un any per línia i un mes per línia, per ordre."""
        anys = ",\n".join(
            _json({"any": resum.any_, "mesos": resum.mesos, **resum.preus}) for resum in resums
        )
        mesos = ",\n".join(
            f"{_json(clau)}: {_json(_mostra_serialitzable(historic.mostres[clau]))}"
            for clau in sorted(historic.mostres)
        )
        contingut = (
            f'{{"noms": {_json(historic.noms)},\n"anys": [\n{anys}\n],\n'
            f'"mesos": {{\n{mesos}\n}}}}\n'
        )
        self._escriu(FITXER_ANUAL, contingut)

    def _escriu(self, nom: str, contingut: str) -> None:
        (self._directori / nom).write_text(contingut, encoding="utf-8", newline="\n")

    def _llegeix(self, nom: str) -> object | None:
        """Contingut JSON del fitxer, o `None` si no existeix o no és JSON."""
        try:
            with (self._directori / nom).open(encoding="utf-8") as fitxer:
                contingut: object = json.load(fitxer)
        except (FileNotFoundError, ValueError):
            return None
        return contingut


def _json(valor: object) -> str:
    return json.dumps(valor, ensure_ascii=False)


def _objecte(valor: object, fitxer: Path) -> dict[str, Any]:
    if not isinstance(valor, dict):
        raise FitxerDeDadesInvalidError(fitxer, "s'esperava un objecte JSON")
    return cast("dict[str, Any]", valor)


def _dia_historic(valor: object, fitxer: Path) -> DiaHistoric:
    dia = _objecte(valor, fitxer)
    if not isinstance(dia.get("data"), str) or not isinstance(dia.get("marques"), dict):
        raise FitxerDeDadesInvalidError(fitxer, "hi ha un dia sense 'data' o sense 'marques'")
    return cast("DiaHistoric", dia)


def _mostra(valor: object, fitxer: Path) -> MostraMensual:
    mostra = _objecte(valor, fitxer)
    versio = mostra.get(CLAU_VERSIO)
    preus = {
        marca: _preus_marca(preu, fitxer) for marca, preu in mostra.items() if marca != CLAU_VERSIO
    }
    return MostraMensual(versio=versio if isinstance(versio, int) else None, preus=preus)


def _preus_marca(valor: object, fitxer: Path) -> PreusMarca:
    preus = _objecte(valor, fitxer)
    return PreusMarca(g95=preus.get("g95"), dsl=preus.get("dsl"))


def _mostra_serialitzable(mostra: MostraMensual) -> Mapping[str, object]:
    if mostra.versio is None:
        return mostra.preus
    return {CLAU_VERSIO: mostra.versio, **mostra.preus}
