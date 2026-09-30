# Registre de canvis

Tots els canvis rellevants del projecte es recullen en aquest fitxer.

El format segueix [Keep a Changelog](https://keepachangelog.com/ca/1.1.0/) i el
projecte fa servir [Semantic Versioning](https://semver.org/lang/ca/).

## [Unreleased]

### Afegit

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

### Canviat

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
