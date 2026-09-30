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
de línia (LF) i la indentació: dos espais en general i quatre a Python. Els scripts de
Python segueixen PEP 8.

## Comprovacions abans d'obrir una pull request

1. Serveix la pàgina en local i obre-la en mòbil i en ordinador:

   ```bash
   python3 -m http.server 8000
   ```

2. Comprova-la amb les tres fonts de preus: el Ministeri directament, `preus.json` i
   els preus desats a la pàgina (per exemple, bloquejant `preus.json` des de les eines
   del navegador).
3. Si has tocat els scripts de dades, executa'ls i comprova que els JSON generats són
   vàlids:

   ```bash
   python3 actualitza_preus.py
   python3 -m json.tool preus.json > /dev/null
   ```

4. Revisa que la consola del navegador no mostri errors.
