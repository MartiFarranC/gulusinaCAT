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

La pàgina no té cap pas de compilació: `index.html` carrega els estils de
`assets/css/` i el mòdul `assets/js/principal.js`. Els càlculs viuen en mòduls que no
toquen el DOM (i tenen tests unitaris), i cada part de la pàgina és una classe que
rep l'estat pel constructor. Els tipus s'escriuen amb JSDoc i TypeScript els comprova
en mode estricte. Prettier formata el codi i ESLint limita la mida de funcions (30
línies), fitxers (300 línies) i paràmetres (4).

## Comprovacions abans d'obrir una pull request

Els hooks de pre-commit (`.venv/bin/pre-commit install`) passen les comprovacions
ràpides a cada commit, i el workflow _Comprovacions_ les torna a passar totes a la
pull request. Per passar-les a mà:

1. Tasques de dades:

   ```bash
   .venv/bin/ruff format --check && .venv/bin/ruff check
   .venv/bin/mypy
   .venv/bin/pytest --cov
   ```

   Si un canvi altera a propòsit el contingut dels fitxers generats, actualitza els
   fitxers de referència de `tests/caracteritzacio/dades/esperat/` i explica-ho al
   commit.

2. Pàgina:

   ```bash
   npm run check       # format, lint, tipus i tests unitaris
   npm run test:e2e    # la pàgina al navegador
   ```

   Si un canvi altera a propòsit el que mostra la pàgina, actualitza les
   instantànies amb `npx playwright test --update-snapshots` i revisa'n el diff.

3. Obre la pàgina en local (`python3 -m http.server 8000`) en mòbil i en ordinador,
   i revisa que la consola del navegador no mostri errors.

Tota lògica nova o modificada ha de portar tests.
