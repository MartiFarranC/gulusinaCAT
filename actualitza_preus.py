"""Descarrega els preus oficials del Ministeri per a Catalunya i desa
la mitjana de cada marca a preus.json i un preu per dia a historic.json.
L'executa GitHub Actions.

Amb la variable DIES_ENRERE=N també omple els N dies anteriors que faltin
a historic.json, amb l'històric del Ministeri."""
import collections, datetime, json, os, re, sys, time, unicodedata, urllib.request

BASE = "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/"
API = BASE + "EstacionesTerrestres/FiltroCCAA/09"
API_HIST = BASE + "EstacionesTerrestresHist/FiltroCCAA/{}/09"  # data en format dd-mm-aaaa
DIES_HISTORIC = 365
CAMPS = {"g95": "Precio Gasolina 95 E5", "dsl": "Precio Gasoleo A"}

# Cadenes conegudes: (id, nom, expressió sobre el rètol normalitzat). L'ordre compta:
# es queda la primera que coincideix.
CONEGUDES = [
    ("bonarea", "bonÀrea", r"\bBON ?AREA\b"),
    ("esclatoil", "Esclatoil", r"\bESCLAT ?OIL\b"),
    ("petrocat", "Petrocat", r"\bPETROCAT\b"),
    ("repsol", "Repsol", r"\bREPSOL\b"),
    ("campsa", "Campsa", r"\bCAMPSA\b"),
    ("moeve", "Moeve (Cepsa)", r"\b(MOEVE|CEPSA)\b"),
    ("galp", "Galp", r"\bGALP\b"),
    ("bp", "BP", r"\bBP\b"),
    ("shell", "Shell", r"\bSHELL\b"),
    ("petronor", "Petronor", r"\bPETRONOR\b"),
    ("avia", "Avia", r"\bAVIA\b"),
    ("ballenoil", "Ballenoil", r"\bBALLENOIL\b"),
    ("plenoil", "Plenergy (Plenoil)", r"\b(PLENOIL|PLENERGY)\b"),
    ("petroprix", "Petroprix", r"\bPETROPRIX\b"),
    ("petromiralles", "Petromiralles", r"\bPETRO ?MIRALLES\b"),
    ("meroil", "Meroil", r"\bMEROIL\b"),
    ("autonet", "Autonet & Oil", r"\bAUTONET"),
    ("lowcostfuel", "Low Cost Fuel", r"\bLOW ?COST ?FUEL\b"),
    ("petrolisind", "Petrolis Independents", r"\bPETROLIS INDEPENDENTS\b"),
    ("q8", "Q8", r"\bQ8\b"),
    ("tamoil", "Tamoil", r"\bTAMOIL\b"),
    ("eni", "Eni", r"\bENI\b"),
    ("staroil", "Star Oil", r"\bSTAR ?OIL\b"),
    ("gasexpress", "GasExpress", r"\bGAS ?EXPRESS\b"),
    ("valcarce", "Valcarce", r"\bVALCARCE\b"),
    ("carrefour", "Carrefour", r"\bCARREFOUR\b"),
    ("alcampo", "Alcampo", r"\bALCAMPO\b"),
    ("eroski", "Eroski", r"\bEROSKI\b"),
    ("leclerc", "E.Leclerc", r"\bLECLERC\b"),
]
# Rètols que no identifiquen cap cadena
GENERICS = re.compile(r"^(|SIN ROTULO|SENSE ROTUL|NO ROTULO|SIN MARCA|GASOLINERA|ESTACION DE SERVICIO|"
                      r"E ?S|ES|BLANCA|INDEPENDIENTE|(N|NO|NUM)?( ?\d+)+)$")
# Mínim d'estacions perquè una marca surti per separat; si no, va a "altres"
MIN_ESTACIONS = 3
ALTRES = ("altres", "Independents i altres")

def norm(t):
    """Majúscules, sense accents i amb només lletres, xifres i espais simples."""
    t = unicodedata.normalize("NFD", t or "")
    t = "".join(c for c in t if unicodedata.category(c) != "Mn").upper()
    return re.sub(r"[^A-Z0-9]+", " ", t).strip()

def bonic(rotul):
    """'PETROLIS MARTÍ' -> 'Petrolis Martí'; les sigles sense vocals queden igual ('GM OIL' -> 'GM Oil')."""
    return " ".join(w if not re.search(r"[AEIOUÀÈÉÍÒÓÚaeiouàèéíòóú]", w) else w.capitalize() for w in rotul.split())

def num(v):
    try:
        n = float(str(v).replace(",", "."))
        return n if n > 0 else None
    except ValueError:
        return None

def baixa(url, intents=3):
    """El servidor del Ministeri a vegades talla la connexió: es torna a provar."""
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"})
    for i in range(intents):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.load(r)
        except (OSError, ValueError) as e:
            if i == intents - 1:
                raise
            print(f"Intent {i + 1} fallit ({e}); es torna a provar", file=sys.stderr)
            time.sleep(15 * (i + 1))

def classifica(llista, avisa=False):
    """Retorna ([(id_marca, estació)], {id_marca: nom}). Les cadenes conegudes es
    reconeixen pel nom; qualsevol altre rètol que es repeteixi en MIN_ESTACIONS o més
    estacions també compta com a marca, i la resta va a "Independents i altres"."""
    primer = []
    desconeguts = collections.Counter()
    originals = collections.defaultdict(collections.Counter)
    for e in llista:
        r = norm(e.get("Rótulo"))
        marca = next((k for k, _, rx in CONEGUDES if re.search(rx, r)), None)
        if not marca and not GENERICS.match(r):
            desconeguts[r] += 1
            originals[r][(e.get("Rótulo") or "").strip()] += 1
            marca = "?" + r
        primer.append((marca, e))
    noms = {k: n for k, n, _ in CONEGUDES}
    for r, c in desconeguts.items():
        if c >= MIN_ESTACIONS:
            id_ = re.sub(r"[^a-z0-9]+", "-", r.lower()).strip("-")
            noms[id_] = bonic(originals[r].most_common(1)[0][0])
    comptes = collections.Counter(m for m, _ in primer)
    sortida = []
    for marca, e in primer:
        if marca and marca.startswith("?"):
            id_ = re.sub(r"[^a-z0-9]+", "-", marca[1:].lower()).strip("-")
            marca = id_ if id_ in noms else None
        elif marca and comptes[marca] < MIN_ESTACIONS:
            marca = None
        sortida.append((marca or ALTRES[0], e))
    noms[ALTRES[0]] = ALTRES[1]
    presents = {m for m, _ in sortida}
    if avisa:
        petits = [r for r, c in desconeguts.most_common(15) if c < MIN_ESTACIONS]
        print("Rètols a 'altres' (els més repetits): " + ", ".join(petits), file=sys.stderr)
    return sortida, {k: v for k, v in noms.items() if k in presents}

def mitjana(a):
    return round(sum(a) / len(a), 3) if a else None

def mitjanes(llista):
    """Mitjana de cada marca: {id: {nom, g95, dsl, n}}."""
    classificades, noms = classifica(llista)
    acc = collections.defaultdict(lambda: {c: [] for c in CAMPS})
    for marca, e in classificades:
        for c, camp in CAMPS.items():
            v = num(e.get(camp))
            if v:
                acc[marca][c].append(v)
    return {k: {"nom": noms[k], "g95": mitjana(v["g95"]), "dsl": mitjana(v["dsl"]),
                "n": max(len(v["g95"]), len(v["dsl"]))} for k, v in acc.items()}

def percentil(a, q):
    a = sorted(a)
    return a[round(q * (len(a) - 1))] if a else None

def detall(llista):
    """Mitjana de totes les estacions de Catalunya i, per a cada marca, la franja
    on hi ha 8 de cada 10 estacions (percentils 10-90) i l'estació més barata."""
    classificades, _ = classifica(llista)
    tots = {c: [] for c in CAMPS}
    per_marca = collections.defaultdict(lambda: {c: [] for c in CAMPS})
    for marca, e in classificades:
        for c, camp in CAMPS.items():
            v = num(e.get(camp))
            if v:
                tots[c].append(v)
                per_marca[marca][c].append((v, e))
    cat = {c: mitjana(v) for c, v in tots.items()}
    cat["n"] = max(len(v) for v in tots.values())
    extra = {}
    for k, cs in per_marca.items():
        extra[k] = {"rang": {}, "barata": {}}
        for c, llistat in cs.items():
            preus = [v for v, _ in llistat]
            extra[k]["rang"][c] = [percentil(preus, .1), percentil(preus, .9)] if preus else None
            if llistat:
                v, e = min(llistat, key=lambda x: x[0])
                extra[k]["barata"][c] = {"preu": v, "municipi": (e.get("Municipio") or "").strip(),
                                         "lat": coord(e.get("Latitud")), "lon": coord(e.get("Longitud (WGS84)"))}
    return cat, extra

def estacions(llista):
    """Totes les estacions amb coordenades, per al mode "les més properes".
    Cada estació és [marca, lat, lon, g95, dsl, municipi, adreça] per ocupar poc."""
    classificades, noms = classifica(llista)
    files = []
    for marca, e in classificades:
        lat, lon = coord(e.get("Latitud")), coord(e.get("Longitud (WGS84)"))
        g, d = num(e.get(CAMPS["g95"])), num(e.get(CAMPS["dsl"]))
        if lat is None or lon is None or not (g or d):
            continue
        files.append([marca, round(lat, 5), round(lon, 5), g, d, (e.get("Municipio") or "").strip(),
                      bonic((e.get("Dirección") or "").strip())])
    return {"marques": noms, "e": files}

def coord(v):
    """Coordenades amb coma decimal i, a vegades, negatives."""
    try:
        return float(str(v).replace(",", "."))
    except ValueError:
        return None

def dia_historic(data, marques, cat=None):
    d = {"data": data, "marques": {k: {"g95": m["g95"], "dsl": m["dsl"]} for k, m in marques.items()}}
    if cat:
        d["marques"]["catalunya"] = {"g95": cat["g95"], "dsl": cat["dsl"]}
    return d

def main():
    dades = baixa(API)
    llista = dades.get("ListaEESSPrecio", [])
    classifica(llista, avisa=True)
    marques = mitjanes(llista)
    if not any(m["n"] for k, m in marques.items() if k != ALTRES[0]):
        sys.exit(f"Cap estació reconeguda entre {len(llista)}: no es desa preus.json")

    catalunya, extra = detall(llista)
    ordre = sorted(marques, key=lambda k: -marques[k]["n"])
    sortida = {"fecha": dades.get("Fecha", ""), "catalunya": catalunya,
               "marques": {k: {**marques[k], **extra[k]} for k in ordre}}
    with open("preus.json", "w", encoding="utf-8") as f:
        json.dump(sortida, f, ensure_ascii=False, indent=2)
    est = estacions(llista)
    est["fecha"] = sortida["fecha"]
    with open("estacions.json", "w", encoding="utf-8") as f:
        json.dump(est, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(llista)} estacions, {len(marques)} marques: " +
          ", ".join(f"{m['nom']} ({m['n']}) {m['g95']}" for m in sortida["marques"].values()))

    # Històric: un registre per dia, amb l'última mitjana del dia
    avui = datetime.datetime.strptime(sortida["fecha"][:10], "%d/%m/%Y").date()
    try:
        with open("historic.json", encoding="utf-8") as f:
            dies = {d["data"]: d for d in json.load(f).get("dies", [])}
    except (FileNotFoundError, ValueError):
        dies = {}
    dies[avui.isoformat()] = dia_historic(avui.isoformat(), marques, catalunya)

    for i in range(1, int(os.environ.get("DIES_ENRERE") or 0) + 1):
        dia = avui - datetime.timedelta(days=i)
        if dia.isoformat() in dies:
            continue
        try:
            ll = baixa(API_HIST.format(dia.strftime("%d-%m-%Y")), intents=2).get("ListaEESSPrecio", [])
        except Exception as e:
            print(f"Avís: no s'ha pogut baixar l'històric del {dia}: {e}", file=sys.stderr)
            continue
        if ll:
            dies[dia.isoformat()] = dia_historic(dia.isoformat(), mitjanes(ll), detall(ll)[0])
            print(f"Històric {dia}: desat")

    ordenats = [dies[k] for k in sorted(dies)][-DIES_HISTORIC:]
    with open("historic.json", "w", encoding="utf-8") as f:
        # Un dia per línia perquè els diffs siguin llegibles
        f.write('{"dies": [\n' + ",\n".join(json.dumps(d, ensure_ascii=False) for d in ordenats) + "\n]}\n")
    print(f"historic.json: {len(ordenats)} dies")


if __name__ == "__main__":
    main()
