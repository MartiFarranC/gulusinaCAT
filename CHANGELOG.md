# Registre de canvis

Tots els canvis rellevants del projecte es recullen en aquest fitxer.

El format segueix [Keep a Changelog](https://keepachangelog.com/ca/1.1.0/) i el
projecte fa servir [Semantic Versioning](https://semver.org/lang/ca/).

## [Unreleased]

### Afegit

- Accés ràpid a «Quant hi he de posar?»: botó «Quant hi poso?» a la barra de dalt,
  drecera a la icona de l'app instal·lada i adreça directa amb `#dipositSec`.
- Els rètols de les quatre marques més barates diuen on és la benzinera més propera
  de cada marca i enllacen a la ruta. Si encara no se sap on ets, un botó demana el
  GPS.
- Animació de càrrega amb la gota del logo, que s'omple mentre es demanen els preus
  o la ubicació del GPS.
- Logo: icona a la pestanya del navegador i a la pantalla d'inici del mòbil, manifest
  per instal·lar la pàgina i imatge de previsualització en compartir l'enllaç. També
  surt al costat del títol.
- Menú de dreceres a les seccions de la pàgina: fix i centrat a l'esquerra en
  pantalles amples, i desplegable amb el botó «Menú» en les estretes.
- Calculadora «Quant hi he de posar?»: amb el consum, l'autonomia i el dipòsit del
  cotxe, diu quants diners cal demanar a la benzinera triada per omplir el
  dipòsit, amb marge i arrodonit cap avall a 5 €.
- Llicència MIT.
- Guia de contribució amb el flux de treball i les convencions de commits.
- Fitxers `.editorconfig`, `.gitignore` i `.env.example`.
- Aquest registre de canvis.
- Registres de decisions d'arquitectura a `docs/adr/`.
- Tests de les tasques de dades amb pytest, i Ruff i mypy estricte.
- Tests de la pàgina: e2e amb Playwright i unitaris amb `node:test`.
- Prettier, ESLint i comprovació de tipus de la pàgina amb TypeScript sobre JSDoc,
  com a eines de desenvolupament.
- Workflow _Comprovacions_ a cada push i pull request, i hooks de pre-commit.

### Eliminat

- La calculadora «Omple el dipòsit», que comparava el cost d'uns litres a les quatre
  marques més barates. La substitueix «Quant hi he de posar?».

### Canviat

- En entrar només es veu la gota que s'omple fins que han arribat totes les dades
  (preus, benzineres i històrics); llavors apareix la pàgina sencera, ja pintada.
  Si alguna dada triga més de 20 segons, es mostra igualment i la resta arriba després.
- La benzinera de «Quant hi he de posar?» es busca per marca, municipi o adreça entre
  totes les de Catalunya; ja no cal activar «Les més properes».
- «Totes les marques» mostra d'entrada les 10 primeres (abans, 20); el botó de sota
  mostra totes les altres.
- El gràfic de 10 anys passa a ser dels últims 5 anys, i la taula de sota mostra
  sempre el preu mitjà de cada any, també amb l'opció «Respecte a Catalunya».
- El títol del gràfic dels anys diu quants n'hi ha mentre encara no se n'han
  baixat cinc (per exemple, «Últims tres anys»).
- La tasca anual només baixa els últims 5 anys d'històric (abans, 10), de manera
  que fa menys peticions al Ministeri.
- Les tasques de dades passen a ser el paquet `gulusinacat`, separat en domini,
  casos d'ús, infraestructura i línia d'ordres (`python -m gulusinacat preus` i
  `anual`). Els fitxers generats són idèntics.
- Els missatges de les tasques fan servir `logging`, i els errors esperats (Ministeri
  sense resposta, fitxers de dades malmesos, variables d'entorn incorrectes) acaben
  amb un missatge clar en lloc d'una traça.
- El panell d'ubicació es veu sempre a sobre del mapa; fer-lo servir activa
  «Les més properes». Desapareix el botó «Busca les més properes».
- El codi de la pàgina es divideix en fitxers CSS per secció i mòduls ES a
  `assets/`, sense cap pas de compilació. La pàgina es comporta igual.
- El README s'organitza en requisits, instal·lació, ús, configuració, tests,
  estructura i llicència.

### Corregit

- Les mitjanes es calculen amb una suma exacta i surten iguals amb qualsevol versió
  de Python. Amb Python 3.12, alguna mitjana de l'històric anual podia diferir en
  una mil·lèsima de la calculada amb Python 3.11.

## [1.0.0] - 2026-09-30

### Afegit

- Comparació del preu de la gasolina 95 i el dièsel de totes les marques de
  benzineres de Catalunya, amb les dades oficials del Ministeri.
- Tres fonts de preus per ordre: el Ministeri directament, `preus.json` actualitzat
  cada 30 minuts per un workflow, i uns preus desats a la pàgina.
- Rètols amb les quatre marques més barates i la tendència respecte al dia anterior.
- Rànquing de totes les marques respecte a la mitjana de Catalunya, amb la franja
  de preus i la benzinera més barata de cada una.
- Mode «Les més properes» amb ubicació per GPS o per municipi i un radi ajustable.
- Mapa de les benzineres fet sense llibreries, sobre les imatges d'OpenStreetMap.
- Filtre de marques que el navegador recorda.
- Gràfics dels últims 30 dies i dels últims 10 anys.
- Calculadora del cost d'omplir el dipòsit.
- Avís quan les dades tenen més d'un dia.
