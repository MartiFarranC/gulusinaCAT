"""Descarrega els preus oficials del Ministeri per a Catalunya i desa
la mitjana de cada marca a preus.json i un preu per dia a historic.json.
L'executa GitHub Actions.

Amb la variable DIES_ENRERE=N també omple els N dies anteriors que faltin
a historic.json, amb l'històric del Ministeri."""
import datetime, json, os, re, sys, unicodedata, urllib.request

BASE = "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/"
API = BASE + "EstacionesTerrestres/FiltroCCAA/09"
API_HIST = BASE + "EstacionesTerrestresHist/FiltroCCAA/{}/09"  # data en format dd-mm-aaaa
DIES_HISTORIC = 365
# Es compara el rètol sense accents, espais ni signes: "BON ÀREA", "bonÀrea",
# "ESCLAT OIL" o "Esclatoil" donen el mateix resultat.
MARQUES = {"bonarea": ["BONAREA"], "esclatoil": ["ESCLATOIL"],
           "petrocat": ["PETROCAT"], "repsol": ["REPSOL"]}

def norm(t):
    t = unicodedata.normalize("NFD", t or "")
    t = "".join(c for c in t if unicodedata.category(c) != "Mn").upper()
    return re.sub(r"[^A-Z0-9]", "", t)

def num(v):
    try:
        n = float(str(v).replace(",", "."))
        return n if n > 0 else None
    except ValueError:
        return None

def baixa(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)

def mitjanes(llista):
    acc = {k: {"g": [], "d": []} for k in MARQUES}
    for e in llista:
        rotul = norm(e.get("Rótulo"))
        marca = next((k for k, ms in MARQUES.items() if any(m in rotul for m in ms)), None)
        if not marca:
            continue
        g, d = num(e.get("Precio Gasolina 95 E5")), num(e.get("Precio Gasoleo A"))
        if g: acc[marca]["g"].append(g)
        if d: acc[marca]["d"].append(d)
    mitjana = lambda a: round(sum(a) / len(a), 3) if a else None
    return {k: {"g95": mitjana(v["g"]), "dsl": mitjana(v["d"]),
                "n": max(len(v["g"]), len(v["d"]))} for k, v in acc.items()}

def dia_historic(data, marques):
    return {"data": data, "marques": {k: {"g95": m["g95"], "dsl": m["dsl"]} for k, m in marques.items()}}

dades = baixa(API)
llista = dades.get("ListaEESSPrecio", [])
marques = mitjanes(llista)
if not any(m["n"] for m in marques.values()):
    sys.exit(f"Cap estació reconeguda entre {len(llista)}: no es desa preus.json")
for k, m in marques.items():
    if not m["n"]:
        print(f"Avís: cap estació de {k}", file=sys.stderr)

sortida = {"fecha": dades.get("Fecha", ""), "marques": marques}
with open("preus.json", "w", encoding="utf-8") as f:
    json.dump(sortida, f, ensure_ascii=False, indent=2)
print(json.dumps(sortida, ensure_ascii=False, indent=2))

# Històric: un registre per dia, amb l'última mitjana del dia
avui = datetime.datetime.strptime(sortida["fecha"][:10], "%d/%m/%Y").date()
try:
    with open("historic.json", encoding="utf-8") as f:
        dies = {d["data"]: d for d in json.load(f).get("dies", [])}
except (FileNotFoundError, ValueError):
    dies = {}
dies[avui.isoformat()] = dia_historic(avui.isoformat(), marques)

for i in range(1, int(os.environ.get("DIES_ENRERE") or 0) + 1):
    dia = avui - datetime.timedelta(days=i)
    if dia.isoformat() in dies:
        continue
    try:
        m = mitjanes(baixa(API_HIST.format(dia.strftime("%d-%m-%Y"))).get("ListaEESSPrecio", []))
    except Exception as e:
        print(f"Avís: no s'ha pogut baixar l'històric del {dia}: {e}", file=sys.stderr)
        continue
    if any(v["n"] for v in m.values()):
        dies[dia.isoformat()] = dia_historic(dia.isoformat(), m)
        print(f"Històric {dia}: " + ", ".join(f"{k} {v['g95']}/{v['dsl']}" for k, v in m.items()))

ordenats = [dies[k] for k in sorted(dies)][-DIES_HISTORIC:]
with open("historic.json", "w", encoding="utf-8") as f:
    # Un dia per línia perquè els diffs siguin llegibles
    f.write('{"dies": [\n' + ",\n".join(json.dumps(d, ensure_ascii=False) for d in ordenats) + "\n]}\n")
print(f"historic.json: {len(ordenats)} dies")
