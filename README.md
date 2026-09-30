# On omplo el dipòsit?

Pàgina web que compara el preu de la gasolina 95 i el dièsel de totes les marques de
benzineres de Catalunya, amb les dades oficials del Ministeri per a la Transició
Ecològica.

Publicada a <https://martifarranc.github.io/gulusinaCAT/>.

## Funcionalitats

- **Rètols de preus** amb les quatre marques més barates i la tendència respecte al
  dia anterior.
- **Totes les marques**: rànquing amb la diferència respecte a la mitjana de
  Catalunya, la franja de preus de cada marca i la seva benzinera més barata.
- **Les més properes**: compara només les benzineres dins d'un radi (50 km per
  defecte, de 5 a 150 km) al voltant de la ubicació del GPS o d'un municipi.
- **Mapa** amb totes les benzineres, o les properes amb la ubicació i el radi.
- **Filtre de marques** per triar quines es comparen. El navegador el recorda.
- **Gràfics** de l'evolució dels últims 30 dies i dels últims 10 anys.
- **Calculadora** de quant costa omplir el dipòsit a cada marca.

## Requisits

- Un navegador actual. La pàgina és HTML estàtic, sense cap pas de compilació.
- Python 3.12 per als scripts que descarreguen les dades. Només fan servir la
  biblioteca estàndard.

## Instal·lació

```bash
git clone https://github.com/MartiFarranC/gulusinaCAT.git
cd gulusinaCAT
```

Per publicar-la a GitHub Pages:

1. A **Settings → Pages**, a *Source* tria **Deploy from a branch**, branca `main`,
   carpeta `/ (root)`.
2. A **Settings → Actions → General**, a *Workflow permissions*, marca **Read and
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
python3 actualitza_preus.py   # preus.json, historic.json i estacions.json
python3 historic_anual.py     # anual.json
```

## Configuració

Els scripts accepten dues variables d'entorn opcionals, documentades a
[`.env.example`](.env.example):

| Variable        | Script                | Valor per defecte | Què fa                                              |
|-----------------|-----------------------|-------------------|-----------------------------------------------------|
| `DIES_ENRERE`   | `actualitza_preus.py` | `0`               | Dies passats que cal recuperar a `historic.json`.   |
| `MAX_PETICIONS` | `historic_anual.py`   | `30`              | Mesos pendents que es demanen en una execució.      |

Als workflows es corresponen amb les opcions *dies_enrere* i *max_peticions* de
**Run workflow**.

### Workflows

| Workflow            | Quan s'executa                          | Què actualitza                                   |
|---------------------|-----------------------------------------|--------------------------------------------------|
| *Actualitza preus*  | Cada 30 minuts, de 5:00 a 21:00 UTC     | `preus.json`, `historic.json`, `estacions.json`  |
| *Històric de 10 anys* | Cada dia a les 3:17 UTC               | `anual.json`                                     |

El servidor del Ministeri talla sovint les connexions que venen de GitHub. Els scripts
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

`actualitza_preus.py` (llista `CONEGUDES`) reconeix les cadenes habituals pel rètol:
Repsol, Moeve (Cepsa), Galp, BP, Shell, Plenergy (Plenoil), Ballenoil, Petroprix,
bonÀrea, Esclatoil, Petrocat, Petromiralles, supermercats… Qualsevol altre rètol que
es repeteixi en 3 o més benzineres també compta com a marca. La resta s'agrupa a
«Independents i altres». El registre del workflow mostra els rètols més repetits que
han anat a aquest grup.

La pàgina fa la mateixa classificació quan llegeix el Ministeri directament.

### Històric

- `historic.json`: l'última mitjana de cada dia, un any com a màxim. D'aquí surten la
  tendència i el gràfic de 30 dies.
- `anual.json`: el preu mitjà de cada any dels últims 10, a partir del dia 15 de cada
  mes de l'històric del Ministeri.

### Mapa

El mapa està fet sense cap llibreria: dibuixa les benzineres en SVG damunt de les
imatges del mapa d'OpenStreetMap. La llista de municipis per buscar una ubicació surt
de les mateixes dades del Ministeri, sense cap servei extern de geolocalització.

## Tests

El projecte encara no té tests automàtics. Mentrestant, cal comprovar els canvis
obrint la pàgina en local (vegeu [Ús](#ús)), en mòbil i en ordinador.

## Estructura

```
.
├── .github/workflows/
│   ├── preus.yml          # Actualitza preus (cada 30 minuts)
│   └── anual.yml          # Històric de 10 anys (cada dia)
├── docs/adr/              # Decisions d'arquitectura
├── index.html             # La pàgina: HTML, CSS i JavaScript
├── actualitza_preus.py    # Descarrega els preus i genera els JSON diaris
├── historic_anual.py      # Genera anual.json
├── preus.json             # Mitjanes per marca (generat)
├── estacions.json         # Totes les benzineres amb coordenades (generat)
├── historic.json          # Una mitjana per dia (generat)
└── anual.json             # Una mitjana per any (generat)
```

## Llicència

[MIT](LICENSE).
