# Com contribuir

## Flux de treball

1. Crea una branca des de `main` amb el prefix del tipus de canvi:
   `feat/<descripcio-curta>`, `fix/<descripcio-curta>`, `docs/…`, `refactor/…`,
   `chore/…`.
2. Fes canvis petits i verificables. Cada commit ha de deixar la pàgina funcionant.
3. Obre una pull request cap a `main` explicant què canvia i per què.

## Idioma

El codi, els identificadors, els comentaris, la documentació i els commits són en
català, igual que el text de la pàgina.

## Commits

Seguim [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipus>: <resum en imperatiu>

<cos opcional que explica el perquè>
```

- Tipus: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `build`, `ci`.
- El resum va en imperatiu («afegeix», «corregeix») i no passa de 72 caràcters.
- Un canvi lògic per commit: no barregis refactoritzacions amb canvis de
  funcionament.
- Sense signatures ni línies afegides al final del missatge.

Els commits `Preus actualitzats` i `Històric anual actualitzat` els fan els
workflows de dades; no cal fer-ne a mà.

## Estil

El fitxer [`.editorconfig`](.editorconfig) fixa la codificació (UTF-8), els finals
de línia (LF) i la indentació: dos espais en general i quatre a Python. El codi de
Python el formata i el revisa Ruff, i mypy en comprova els tipus en mode estricte.

El paquet `src/gulusinacat/` separa el domini (regles, sense xarxa ni fitxers), els
casos d'ús, la infraestructura (API i fitxers) i la línia d'ordres. El domini no pot
importar res de les altres capes.

## Comprovacions abans d'obrir una pull request

1. Serveix la pàgina en local i obre-la en mòbil i en ordinador:

   ```bash
   python3 -m http.server 8000
   ```

2. Comprova-la amb les tres fonts de preus: el Ministeri directament, `preus.json` i
   els preus desats a la pàgina (per exemple, bloquejant `preus.json` des de les eines
   del navegador).
3. Si has tocat les tasques de dades, passa totes les comprovacions:

   ```bash
   .venv/bin/ruff format --check && .venv/bin/ruff check
   .venv/bin/mypy
   .venv/bin/pytest --cov
   ```

   Tota lògica nova o modificada ha de portar tests. Si un canvi altera a propòsit el
   contingut dels fitxers generats, actualitza els fitxers de referència de
   `tests/caracteritzacio/dades/esperat/` i explica-ho al commit.

4. Revisa que la consola del navegador no mostri errors.
