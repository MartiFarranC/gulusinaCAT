"""Omple anual.json amb el preu mitjà de cada marca i de Catalunya dels
últims 10 anys. Per a cada mes agafa el dia 15 de l'històric del Ministeri,
i la mitjana de l'any és la mitjana dels seus mesos.

Com que el servidor del Ministeri talla sovint la connexió, cada execució
només demana els mesos que falten (com a màxim MAX_PETICIONS) i desa el que
aconsegueix. Amb unes quantes execucions queda complet."""
import datetime, json, os, sys
from actualitza_preus import API_HIST, MARQUES, baixa, detall, mitjanes

ANYS = 10
MAX_PETICIONS = int(os.environ.get("MAX_PETICIONS") or 30)
FITXER = "anual.json"

avui = datetime.date.today()
# El mes en curs només compta quan ja ha passat el dia 15
mesos = [(a, m) for a in range(avui.year - ANYS, avui.year + 1) for m in range(1, 13)
         if datetime.date(a, m, 15) < avui]

try:
    with open(FITXER, encoding="utf-8") as f:
        mostres = json.load(f).get("mesos", {})
except (FileNotFoundError, ValueError):
    mostres = {}

pendents = [(a, m) for a, m in reversed(mesos) if f"{a}-{m:02d}" not in mostres]
print(f"{len(mesos) - len(pendents)} mesos desats, {len(pendents)} pendents")
fallades = 0
for a, m in pendents[:MAX_PETICIONS]:
    clau, dia = f"{a}-{m:02d}", datetime.date(a, m, 15)
    try:
        llista = baixa(API_HIST.format(dia.strftime("%d-%m-%Y")), intents=2).get("ListaEESSPrecio", [])
    except Exception as e:
        fallades += 1
        print(f"Avís: {clau} no s'ha pogut baixar: {e}", file=sys.stderr)
        if fallades >= 5:
            print("Massa errors seguits; es prova en la propera execució", file=sys.stderr)
            break
        continue
    fallades = 0
    if not llista:
        print(f"Avís: {clau} sense dades", file=sys.stderr)
        continue
    marques = mitjanes(llista)
    cat, _ = detall(llista)
    mostres[clau] = {"catalunya": {"g95": cat["g95"], "dsl": cat["dsl"]},
                     **{k: {"g95": v["g95"], "dsl": v["dsl"]} for k, v in marques.items()}}
    print(f"{clau}: " + ", ".join(f"{k} {v['g95']}" for k, v in marques.items()) + f", Catalunya {cat['g95']}")

# Mitjana de cada any a partir dels seus mesos
anys = []
for a in range(avui.year - ANYS, avui.year + 1):
    del_any = [v for k, v in mostres.items() if k.startswith(f"{a}-")]
    if not del_any:
        continue
    fila = {"any": a, "mesos": len(del_any)}
    for k in ["catalunya", *MARQUES]:
        fila[k] = {}
        for c in ("g95", "dsl"):
            vals = [v[k][c] for v in del_any if v.get(k, {}).get(c)]
            fila[k][c] = round(sum(vals) / len(vals), 3) if vals else None
    anys.append(fila)

with open(FITXER, "w", encoding="utf-8") as f:
    f.write('{"anys": [\n' + ",\n".join(json.dumps(x, ensure_ascii=False) for x in anys) + "\n],\n"
            '"mesos": {\n' + ",\n".join(f'"{k}": ' + json.dumps(mostres[k], ensure_ascii=False) for k in sorted(mostres))
            + "\n}}\n")
print(f"{FITXER}: {len(anys)} anys, {len(mostres)} mesos de {len(mesos)}")
