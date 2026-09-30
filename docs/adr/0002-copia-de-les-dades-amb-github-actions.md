# 2. Còpia de les dades amb GitHub Actions

- Estat: acceptada
- Data: 2026-09-29

## Context

Les dades surten de l'API pública del Ministeri per a la Transició Ecològica. Aquesta
API no envia capçaleres CORS, així que el navegador no pot llegir-la des d'una altra
pàgina. A més, el servidor talla sovint les connexions, també les que venen dels
servidors de GitHub.

Un intermediari CORS de tercers resoldria el primer problema, però faria dependre la
pàgina d'un servei extern que no controlem i per on passarien totes les peticions.

## Decisió

Dos workflows de GitHub Actions descarreguen les dades i en desen una còpia en fitxers
JSON al mateix repositori (`preus.json`, `historic.json`, `estacions.json` i
`anual.json`). La pàgina llegeix aquests fitxers.

La pàgina continua intentant llegir el Ministeri directament per si algun dia envia
capçaleres CORS; si no pot, fa servir la còpia. Si tampoc hi és, mostra uns preus
desats a la mateixa pàgina.

Els scripts tornen a provar les peticions que fallen i no sobreescriuen mai les dades
bones amb dades buides.

## Conseqüències

- La pàgina funciona encara que el Ministeri no respongui, amb dades de fins a
  30 minuts d'antiguitat (o més, si falla el workflow; la pàgina avisa si passen
  d'un dia).
- Cada actualització que canvia les dades és un commit a `main`.
- Quan el Ministeri bloqueja els servidors de GitHub, les dades no s'actualitzen fins
  a la propera execució que se'n surti.
