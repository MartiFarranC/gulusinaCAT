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

### Canviat

- El panell d'ubicació es veu sempre a sobre del mapa; fer-lo servir activa
  «Les més properes». Desapareix el botó «Busca les més properes».
- El README s'organitza en requisits, instal·lació, ús, configuració, tests,
  estructura i llicència.

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
