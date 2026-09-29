"""Descarrega els preus oficials del Ministeri per a Catalunya i desa
la mitjana de cada marca a preus.json. L'executa GitHub Actions."""
import json, unicodedata, urllib.request

API = ("https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/"
       "PreciosCarburantes/EstacionesTerrestres/FiltroCCAA/09")
MARQUES = {"bonarea": ["BONAREA"], "esclatoil": ["ESCLATOIL", "ESCLAT OIL"],
           "petrocat": ["PETROCAT"], "repsol": ["REPSOL"]}

def norm(t):
    t = unicodedata.normalize("NFD", t or "")
    return "".join(c for c in t if unicodedata.category(c) != "Mn").upper()

def num(v):
    try:
        n = float(str(v).replace(",", "."))
        return n if n > 0 else None
    except ValueError:
        return None

req = urllib.request.Request(API, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"})
with urllib.request.urlopen(req, timeout=120) as r:
    dades = json.load(r)

acc = {k: {"g": [], "d": []} for k in MARQUES}
for e in dades.get("ListaEESSPrecio", []):
    rotul = norm(e.get("Rótulo"))
    marca = next((k for k, ms in MARQUES.items() if any(m in rotul for m in ms)), None)
    if not marca:
        continue
    g, d = num(e.get("Precio Gasolina 95 E5")), num(e.get("Precio Gasoleo A"))
    if g: acc[marca]["g"].append(g)
    if d: acc[marca]["d"].append(d)

mitjana = lambda a: round(sum(a) / len(a), 3) if a else None
sortida = {
    "fecha": dades.get("Fecha", ""),
    "marques": {k: {"g95": mitjana(v["g"]), "dsl": mitjana(v["d"]),
                    "n": max(len(v["g"]), len(v["d"]))} for k, v in acc.items()},
}
with open("preus.json", "w", encoding="utf-8") as f:
    json.dump(sortida, f, ensure_ascii=False, indent=2)
print(json.dumps(sortida, ensure_ascii=False, indent=2))
