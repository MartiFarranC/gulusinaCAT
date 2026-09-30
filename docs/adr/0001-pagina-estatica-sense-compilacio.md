# 1. Pàgina estàtica sense pas de compilació

- Estat: acceptada
- Data: 2026-09-29

## Context

La pàgina es publica a GitHub Pages i la manté una sola persona. Un pas de
compilació (empaquetador, transpilador) afegiria dependències, configuració i una
etapa més al desplegament, i qualsevol canvi hauria de passar per aquesta etapa abans
de ser visible.

## Decisió

La pàgina és HTML, CSS i JavaScript que el navegador executa tal com és al
repositori. No hi ha dependències de producció: el que es publica és exactament el
que hi ha a `main`.

Les eines de desenvolupament (formatadors, linters, tests) sí que es poden afegir,
sempre que no formin part del que es publica.

## Conseqüències

- Publicar és fer push a `main`; GitHub Pages serveix els fitxers directament.
- Només es poden fer servir funcionalitats que els navegadors actuals suporten sense
  transformació (per exemple, mòduls ES natius en lloc d'un empaquetador).
- No hi ha minificació: la mida del codi s'ha de vigilar a mà.
