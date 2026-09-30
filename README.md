# On omplo el dipòsit?

Pàgina web que compara el preu de la gasolina 95 i el dièsel de totes les marques de
benzineres de Catalunya, amb les dades oficials del Ministeri per a la Transició
Ecològica.

Publicada a <https://martifarranc.github.io/gulusinaCAT/>.

## Funcionalitats

- **Menú de dreceres** a l'esquerra per anar a cada secció (en mòbil, amb el botó
  «Menú»).
- **Rètols de preus** amb les quatre marques més barates i la tendència respecte al
  dia anterior.
- **Totes les marques**: rànquing amb la diferència respecte a la mitjana de
  Catalunya, la franja de preus de cada marca i la seva benzinera més barata.
- **Les més properes**: compara només les benzineres dins d'un radi (50 km per
  defecte, de 5 a 150 km) al voltant de la ubicació del GPS o d'un municipi.
- **Mapa** amb totes les benzineres, o les properes amb la ubicació i el radi.
- **Filtre de marques** per triar quines es comparen. El navegador el recorda.
- **Gràfics** de l'evolució dels últims 30 dies i dels últims 5 anys, amb una taula
  del preu mitjà de cada any.
- **Quant hi he de posar?**: a partir del consum, l'autonomia que queda i la mida del
  dipòsit, diu quants diners cal demanar en una de les benzineres properes per omplir-lo
  sense que vessi (amb un marge del 5 % i arrodonit cap avall a 5 €). El navegador
  recorda el consum i el dipòsit.

## Requisits

- Un navegador actual. La pàgina és HTML estàtic, sense cap pas de compilació.
- Python 3.11 o posterior per a les tasques que descarreguen les dades. Només fan
  servir la biblioteca estàndard; les eines de desenvolupament són a
  `requirements-dev.txt`.
- Node.js 22.13 o posterior, només per a les eines de desenvolupament de la pàgina
  (format, lint, tipus i tests), que són a `package.json`. La pàgina publicada no en
  depèn.

## Instal·lació

```bash
git clone https://github.com/MartiFarranC/gulusinaCAT.git
cd gulusinaCAT
```

Per publicar-la a GitHub Pages:

1. A **Settings → Pages**, a _Source_ tria **Deploy from a branch**, branca `main`,
   carpeta `/ (root)`.
2. A **Settings → Actions → General**, a _Workflow permissions_, marca **Read and
   write permissions**.
3. A **Actions → Actualitza preus**, prem **Run workflow** perquè es creïn les
   primeres dades.

La pàgina queda a `https://<usuari>.github.io/<repositori>/`.

## Ús

Per veure la pàgina en local cal servir-la per HTTP, perquè llegeix els fitxers JSON
amb `fetch`:

```bash
python3 -m http.server 8000
```

i obrir <http://localhost:8000/>.

Per actualitzar les dades a mà (cal accés a Internet):

```bash
python3 -m pip install .
python3 -m gulusinacat preus   # preus.json, historic.json i estacions.json
python3 -m gulusinacat anual   # anual.json
```

Amb `--directori <camí>` els fitxers es llegeixen i es desen en un altre directori.

## Configuració

Les tasques accepten dues variables d'entorn opcionals, documentades a
[`.env.example`](.env.example):

| Variable        | Tasca               | Valor per defecte | Què fa                                            |
| --------------- | ------------------- | ----------------- | ------------------------------------------------- |
| `DIES_ENRERE`   | `gulusinacat preus` | `0`               | Dies passats que cal recuperar a `historic.json`. |
| `MAX_PETICIONS` | `gulusinacat anual` | `30`              | Mesos pendents que es demanen en una execució.    |

Als workflows es corresponen amb les opcions _dies_enrere_ i _max_peticions_ de
**Run workflow**.

### Workflows

| Workflow             | Quan s'executa                      | Què actualitza                                  |
| -------------------- | ----------------------------------- | ----------------------------------------------- |
| _Actualitza preus_   | Cada 30 minuts, de 5:00 a 21:00 UTC | `preus.json`, `historic.json`, `estacions.json` |
| _Històric de 5 anys_ | Cada dia a les 3:17 UTC             | `anual.json`                                    |

El servidor del Ministeri talla sovint les connexions que venen de GitHub. Les tasques
tornen a provar-ho uns quants cops i, si no se'n surten, l'execució falla sense
sobreescriure les dades bones. El workflow anual desa el que aconsegueix i continua a
la propera execució.

## Com funciona

### Fonts dels preus

Cada vegada que algú obre la pàgina:

1. Demana els preus d'avui directament al Ministeri.
2. Si el navegador no ho permet (el Ministeri no envia capçaleres CORS) o no respon,
   llegeix `preus.json`, la còpia que actualitza el workflow.
3. Si tampoc hi és, mostra uns preus desats dins la pàgina.

A sota del selector de combustible s'indica quina font s'està fent servir, i si les
dades tenen més d'un dia.

### Marques

`src/gulusinacat/domini/marques.py` (llista `MARQUES_CONEGUDES`) reconeix les cadenes
habituals pel rètol:
Repsol, Moeve (Cepsa), Galp, BP, Shell, Plenergy (Plenoil), Ballenoil, Petroprix,
bonÀrea, Esclatoil, Petrocat, Petromiralles, supermercats… Qualsevol altre rètol que
es repeteixi en 3 o més benzineres també compta com a marca. La resta s'agrupa a
«Independents i altres». El registre del workflow mostra els rètols més repetits que
han anat a aquest grup.

La pàgina fa la mateixa classificació (`assets/js/marques.js`) quan llegeix el
Ministeri directament, i un test comprova que en surt el mateix resum.

### Històric

- `historic.json`: l'última mitjana de cada dia, un any com a màxim. D'aquí surten la
  tendència i el gràfic de 30 dies.
- `anual.json`: el preu mitjà de cada any dels últims 5, a partir del dia 15 de cada
  mes de l'històric del Ministeri.

### Mapa

El mapa està fet sense cap llibreria: dibuixa les benzineres en SVG damunt de les
imatges del mapa d'OpenStreetMap. La llista de municipis per buscar una ubicació surt
de les mateixes dades del Ministeri, sense cap servei extern de geolocalització.

## Tests

### Tasques de dades

Tests amb pytest, format i lint amb Ruff i tipus amb mypy estricte:

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/ruff format --check && .venv/bin/ruff check
.venv/bin/mypy
.venv/bin/pytest --cov
```

Els tests de `tests/caracteritzacio/` executen les tasques amb una resposta del
Ministeri desada, sense xarxa, i comparen byte a byte els fitxers generats amb els de
referència.

### Pàgina

Format amb Prettier, lint amb ESLint, tipus amb TypeScript (només comprova els
comentaris JSDoc, no compila res) i tests unitaris amb `node:test`:

```bash
npm ci
npm run check
```

Els tests e2e obren la pàgina amb Playwright i Chromium, amb dades desades, el
rellotge fix i sense xarxa, i comparen el que mostra amb les instantànies de
`tests/e2e/instantanies/`. Serveixen la pàgina amb `python3 -m http.server`:

```bash
npx playwright install chromium
npm run test:e2e
```

Si un canvi altera a propòsit el que mostra la pàgina, les instantànies
s'actualitzen amb `npx playwright test --update-snapshots`.

### Abans de cada commit

Els hooks de [pre-commit](https://pre-commit.com/) executen les comprovacions
ràpides de les dues parts:

```bash
.venv/bin/pre-commit install
```

El workflow _Comprovacions_ les torna a passar totes, amb els tests e2e, a cada push
a `main` i a cada pull request.

## Estructura

```
.
├── .github/workflows/
│   ├── ci.yml             # Comprovacions (a cada push i pull request)
│   ├── preus.yml          # Actualitza preus (cada 30 minuts)
│   └── anual.yml          # Històric de 5 anys (cada dia)
├── docs/adr/              # Decisions d'arquitectura
├── index.html             # L'estructura de la pàgina
├── assets/
│   ├── css/               # Estils, un fitxer per part de la pàgina
│   ├── icones/            # Logo (logo.svg) i icones generades a partir d'ell
│   └── js/                # Mòduls ES: principal.js hi entra i crea les parts
├── scripts/               # Generació de les icones (npm run icones)
├── src/gulusinacat/       # Tasques de dades (Python)
│   ├── domini/            # Marques, estadística i resums, sense xarxa ni fitxers
│   ├── aplicacio/         # Casos d'ús: preus d'avui i històric anual
│   ├── infraestructura/   # API del Ministeri i fitxers JSON
│   └── presentacio/       # Línia d'ordres
├── tests/
│   ├── unit/              # Tests unitaris de les tasques de dades
│   ├── caracteritzacio/   # Fitxers generats amb una resposta desada del Ministeri
│   ├── js/                # Tests unitaris dels mòduls de càlcul de la pàgina
│   └── e2e/               # Tests de la pàgina al navegador
├── preus.json             # Mitjanes per marca (generat)
├── estacions.json         # Totes les benzineres amb coordenades (generat)
├── historic.json          # Una mitjana per dia (generat)
└── anual.json             # Una mitjana per any (generat)
```

## Llicència

[MIT](LICENSE).
