# 6. Benzineres de la ruta

- Estat: acceptada
- Data: 2026-11-14

## Context

Es vol poder triar una sortida i una destinació, com a Google Maps, i veure les
benzineres que queden a prop del camí, amb la més barata remarcada, tant per Catalunya
com per Andorra. Cal una ruta per carretera i trobar llocs i adreces pel nom. La pàgina
és estàtica (ADR 1) i el mapa no fa servir cap llibreria (ADR 3).

El projecte `tempCat` ja fa una ruta així amb OSRM, Open-Meteo, Nominatim i Leaflet.

## Decisió

- Els mateixos serveis públics que `tempCat`, cridats directament des del navegador
  (tots tres envien capçaleres CORS): OSRM per a la ruta, Open-Meteo per trobar pobles i
  Nominatim per a les adreces, amb una petició per segon com a màxim.
- No s'hi afegeix Leaflet: la part comuna del mapa propi (`mapa-base.js`) serveix per als
  dos mapes, i el de la ruta hi dibuixa la línia i els extrems.
- La desviació es mesura en línia recta de cada benzinera al tram de ruta més proper,
  sobre un pla local en quilòmetres. És prou precís per a rutes de pocs centenars de
  quilòmetres i no necessita cap servei més.
- La ruta llegeix les benzineres de totes les regions, tant si la pàgina mostra Catalunya
  com Andorra, perquè una ruta pot passar per totes dues.

## Conseqüències

- La funció depèn de serveis gratuïts sense garantia: el servidor públic d'OSRM és de
  demostració. Si no respon, la secció ho diu i la resta de la pàgina funciona igual.
- La desviació en línia recta pot ser menor que el camí real fins a la benzinera.
- Canviar el combustible, el filtre de marques o la desviació no torna a demanar la ruta.
