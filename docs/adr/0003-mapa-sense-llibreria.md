# 3. Mapa sense llibreria

- Estat: acceptada
- Data: 2026-09-30

## Context

La pàgina havia de mostrar un mapa amb les benzineres. La manera habitual és una
llibreria com Leaflet, però seria la primera dependència de producció de la pàgina
(vegeu l'[ADR 1](0001-pagina-estatica-sense-compilacio.md)).

El que cal és poc: posar marcadors damunt d'un mapa, apropar, allunyar i arrossegar.

## Decisió

El mapa es dibuixa a mà: les imatges del mapa d'OpenStreetMap es col·loquen amb la
projecció de Mercator i les benzineres, la ubicació i el radi es dibuixen en SVG al
damunt. S'hi mostra l'atribució que demana la llicència d'OpenStreetMap.

## Conseqüències

- La pàgina continua sense dependències de producció.
- La interacció és més senzilla que la d'una llibreria: no hi ha zoom amb dos dits
  ni amb la roda del ratolí, només botons, doble clic i arrossegar.
- La pàgina depèn del servidor d'imatges d'OpenStreetMap i n'ha de respectar la
  política d'ús. Si el trànsit creix, caldrà un proveïdor d'imatges propi o de
  pagament.
