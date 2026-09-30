"""Reconeixement de la marca d'una benzinera a partir del seu rètol."""

from __future__ import annotations

import re
import unicodedata
from collections import Counter
from collections.abc import Sequence
from dataclasses import dataclass

ALTRES = "altres"
NOM_ALTRES = "Independents i altres"
# Per sota d'aquest nombre d'estacions, una marca s'agrupa amb les independents.
MINIM_ESTACIONS_PER_MARCA = 3
MAXIM_ROTULS_A_L_AVIS = 15

_CATEGORIA_ACCENT = "Mn"
_NO_ALFANUMERIC = re.compile(r"[^A-Z0-9]+")
_NO_IDENTIFICADOR = re.compile(r"[^a-z0-9]+")
_VOCAL = re.compile(r"[AEIOUÀÈÉÍÒÓÚaeiouàèéíòóú]")


@dataclass(frozen=True)
class MarcaConeguda:
    """Cadena que es reconeix pel rètol, encara que s'escrigui de maneres diferents."""

    identificador: str
    nom: str
    patro: re.Pattern[str]


def _coneguda(identificador: str, nom: str, patro: str) -> MarcaConeguda:
    return MarcaConeguda(identificador, nom, re.compile(patro))


# L'ordre compta: una estació és de la primera marca que coincideix.
MARQUES_CONEGUDES = (
    _coneguda("bonarea", "bonÀrea", r"\bBON ?AREA\b"),
    _coneguda("esclatoil", "Esclatoil", r"\bESCLAT ?OIL\b"),
    _coneguda("petrocat", "Petrocat", r"\bPETROCAT\b"),
    _coneguda("repsol", "Repsol", r"\bREPSOL\b"),
    _coneguda("campsa", "Campsa", r"\bCAMPSA\b"),
    _coneguda("moeve", "Moeve (Cepsa)", r"\b(MOEVE|CEPSA)\b"),
    _coneguda("galp", "Galp", r"\bGALP\b"),
    _coneguda("bp", "BP", r"\bBP\b"),
    _coneguda("shell", "Shell", r"\bSHELL\b"),
    _coneguda("petronor", "Petronor", r"\bPETRONOR\b"),
    _coneguda("avia", "Avia", r"\bAVIA\b"),
    _coneguda("ballenoil", "Ballenoil", r"\bBALLENOIL\b"),
    _coneguda("plenoil", "Plenergy (Plenoil)", r"\b(PLENOIL|PLENERGY)\b"),
    _coneguda("petroprix", "Petroprix", r"\bPETROPRIX\b"),
    _coneguda("petromiralles", "Petromiralles", r"\bPETRO ?MIRALLES\b"),
    _coneguda("meroil", "Meroil", r"\bMEROIL\b"),
    _coneguda("autonet", "Autonet & Oil", r"\bAUTONET"),
    _coneguda("lowcostfuel", "Low Cost Fuel", r"\bLOW ?COST ?FUEL\b"),
    _coneguda("petrolisind", "Petrolis Independents", r"\bPETROLIS INDEPENDENTS\b"),
    _coneguda("q8", "Q8", r"\bQ8\b"),
    _coneguda("tamoil", "Tamoil", r"\bTAMOIL\b"),
    _coneguda("eni", "Eni", r"\bENI\b"),
    _coneguda("staroil", "Star Oil", r"\bSTAR ?OIL\b"),
    _coneguda("gasexpress", "GasExpress", r"\bGAS ?EXPRESS\b"),
    _coneguda("valcarce", "Valcarce", r"\bVALCARCE\b"),
    _coneguda("carrefour", "Carrefour", r"\bCARREFOUR\b"),
    _coneguda("alcampo", "Alcampo", r"\bALCAMPO\b"),
    _coneguda("eroski", "Eroski", r"\bEROSKI\b"),
    _coneguda("leclerc", "E.Leclerc", r"\bLECLERC\b"),
)

# Rètols que no identifiquen cap cadena: buits, genèrics o només un número.
ROTULS_GENERICS = re.compile(
    r"^(|SIN ROTULO|SENSE ROTUL|NO ROTULO|SIN MARCA|GASOLINERA|ESTACION DE SERVICIO|"
    r"E ?S|ES|BLANCA|INDEPENDIENTE|(N|NO|NUM)?( ?\d+)+)$"
)


@dataclass(frozen=True)
class Classificacio:
    """Resultat de classificar una llista de rètols.

    `marques` té la marca de cada rètol, en el mateix ordre. `noms` té el nom de
    cada marca present. `rotuls_agrupats` són els rètols desconeguts més repetits
    que no arriben al mínim i han anat a parar a «Independents i altres».
    """

    marques: tuple[str, ...]
    noms: dict[str, str]
    rotuls_agrupats: tuple[str, ...]


def normalitza_rotul(rotul: str) -> str:
    """Majúscules, sense accents i amb només lletres, xifres i espais simples."""
    descompost = unicodedata.normalize("NFD", rotul)
    sense_accents = "".join(
        caracter for caracter in descompost if unicodedata.category(caracter) != _CATEGORIA_ACCENT
    )
    return _NO_ALFANUMERIC.sub(" ", sense_accents.upper()).strip()


def nom_llegible(text: str) -> str:
    """Posa en majúscula inicial cada paraula amb vocals; les sigles queden igual.

    'PETROLIS MARTÍ' dona 'Petrolis Martí' i 'GM OIL' dona 'GM Oil'.
    """
    return " ".join(
        paraula.capitalize() if _VOCAL.search(paraula) else paraula for paraula in text.split()
    )


def identificador_de(rotul_normalitzat: str) -> str:
    """Identificador estable d'una marca nova: 'PETROLIS MARTI' dona 'petrolis-marti'."""
    return _NO_IDENTIFICADOR.sub("-", rotul_normalitzat.lower()).strip("-")


def marca_coneguda(rotul_normalitzat: str) -> str | None:
    """Identificador de la primera marca coneguda que coincideix amb el rètol."""
    for marca in MARQUES_CONEGUDES:
        if marca.patro.search(rotul_normalitzat):
            return marca.identificador
    return None


def classifica(rotuls: Sequence[str]) -> Classificacio:
    """Assigna una marca a cada rètol.

    Les cadenes conegudes es reconeixen pel nom. Qualsevol altre rètol que es
    repeteixi en `MINIM_ESTACIONS_PER_MARCA` estacions o més també compta com a
    marca. La resta, i les marques conegudes amb massa poques estacions, van a
    «Independents i altres».
    """
    normalitzats = [normalitza_rotul(rotul) for rotul in rotuls]
    conegudes = [marca_coneguda(normalitzat) for normalitzat in normalitzats]
    desconeguts = Counter(
        normalitzat
        for normalitzat, coneguda in zip(normalitzats, conegudes, strict=True)
        if coneguda is None and not ROTULS_GENERICS.match(normalitzat)
    )
    noms = _noms_candidats(rotuls, normalitzats, desconeguts)
    estacions_per_marca = Counter(conegudes)
    marques = tuple(
        _marca_final(normalitzat, coneguda, noms, estacions_per_marca)
        for normalitzat, coneguda in zip(normalitzats, conegudes, strict=True)
    )
    presents = set(marques)
    return Classificacio(
        marques=marques,
        noms={
            identificador: nom for identificador, nom in noms.items() if identificador in presents
        },
        rotuls_agrupats=_rotuls_agrupats(desconeguts),
    )


def _noms_candidats(
    rotuls: Sequence[str], normalitzats: Sequence[str], desconeguts: Counter[str]
) -> dict[str, str]:
    """Noms de totes les marques possibles: conegudes, noves i les independents."""
    noms = {marca.identificador: marca.nom for marca in MARQUES_CONEGUDES}
    originals: dict[str, Counter[str]] = {}
    for rotul, normalitzat in zip(rotuls, normalitzats, strict=True):
        if normalitzat in desconeguts:
            originals.setdefault(normalitzat, Counter())[rotul.strip()] += 1
    for normalitzat, estacions in desconeguts.items():
        if estacions >= MINIM_ESTACIONS_PER_MARCA:
            escriptura_mes_habitual = originals[normalitzat].most_common(1)[0][0]
            noms[identificador_de(normalitzat)] = nom_llegible(escriptura_mes_habitual)
    noms[ALTRES] = NOM_ALTRES
    return noms


def _marca_final(
    normalitzat: str,
    coneguda: str | None,
    noms: dict[str, str],
    estacions_per_marca: Counter[str | None],
) -> str:
    if coneguda is not None:
        return coneguda if estacions_per_marca[coneguda] >= MINIM_ESTACIONS_PER_MARCA else ALTRES
    if ROTULS_GENERICS.match(normalitzat):
        return ALTRES
    identificador = identificador_de(normalitzat)
    return identificador if identificador in noms and identificador != ALTRES else ALTRES


def _rotuls_agrupats(desconeguts: Counter[str]) -> tuple[str, ...]:
    return tuple(
        rotul
        for rotul, estacions in desconeguts.most_common(MAXIM_ROTULS_A_L_AVIS)
        if estacions < MINIM_ESTACIONS_PER_MARCA
    )
