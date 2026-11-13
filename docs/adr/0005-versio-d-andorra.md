# 5. Versió d'Andorra

- Estat: acceptada
- Data: 2026-11-13

## Context

Es vol poder comparar també les benzineres d'Andorra, amb les mateixes seccions que
les de Catalunya. Les dades del Ministeri només cobreixen Espanya. El Govern d'Andorra
publica el preu de cada benzinera al seu web, però sense API: el formulari demana una
taula HTML per combustible i data. Aquesta taula té el nom, l'adreça, la marca i el
preu, però no les coordenades. El web sí que respon als servidors de GitHub i té els
preus de dies passats.

## Decisió

- Un segon adaptador de la mateixa font de preus (`ClientGovernAndorra`) llegeix la
  taula del web amb l'analitzador HTML de la biblioteca estàndard. Els casos d'ús, les
  marques i els fitxers són els mateixos; la línia d'ordres tria la font amb
  `--regio` i els workflows desen el resultat a `andorra/`.
- Les coordenades són les de les benzineres d'OpenStreetMap, aparellades a mà amb
  l'identificador del web del Govern i desades al codi. Geolocalitzar les adreces
  amb Nominatim es va descartar: la meitat no es troben i moltes cauen al centre de
  la parròquia.
- A la pàgina, la regió es tria amb l'adreça (`?zona=andorra`) i es recorda al
  navegador. Canviar de regió torna a carregar la pàgina, de manera que l'estat i la
  càrrega de les dades no han de saber canviar de regió a mig fer.

## Conseqüències

- Afegir una regió nova vol dir afegir una font de preus a la línia d'ordres, una
  entrada a `assets/js/regio.js` i un pas als workflows.
- Si el Govern d'Andorra canvia l'HTML del web, la tasca d'Andorra fallarà (sense
  aturar la de Catalunya) fins que s'adapti el lector.
- Una benzinera nova d'Andorra no surt al mapa fins que se n'afegeixen les
  coordenades a mà.
- La clau `catalunya` dels fitxers de dades és la mitjana de tota la regió, també a
  Andorra; es manté el nom per no canviar el format dels fitxers.
