# 4. Mòduls ES i tipus amb JSDoc

- Estat: acceptada
- Data: 2026-09-30

## Context

Tot el codi de la pàgina era dins d'`index.html`, amb variables globals que
compartien totes les parts. Costava de llegir, de provar i de canviar sense trencar
res, i no es podia comprovar amb cap eina. A més, la pàgina no pot tenir un pas de
compilació ([ADR 1](0001-pagina-estatica-sense-compilacio.md)), de manera que
TypeScript o un empaquetador no poden formar part del que es publica.

## Decisió

- El JavaScript es divideix en mòduls ES natius a `assets/js/`, que el navegador
  carrega tal com són. `principal.js` crea l'estat i les parts de la pàgina.
- Els càlculs (marques, resum del Ministeri, proximitat, estadística, geografia,
  eixos i etiquetes) són en mòduls que no toquen el DOM i es proven amb `node:test`.
- Cada part de la pàgina és una classe que rep l'estat pel constructor, en lloc de
  llegir variables globals.
- Els tipus s'escriuen amb comentaris JSDoc, i TypeScript els comprova en mode
  estricte (`checkJs`, `noEmit`) com a eina de desenvolupament.
- Els estils es divideixen en un fitxer CSS per part, carregats en ordre.

## Conseqüències

- La pàgina publicada continua sense dependències ni compilació.
- El navegador fa una petició per mòdul i per fitxer CSS. Amb HTTP/2 a GitHub Pages
  i uns pocs kilobytes per fitxer, l'efecte és petit.
- Els tipus en JSDoc són més llargs d'escriure que en TypeScript, però es comproven
  igual i no cal cap pas per executar el codi.
- La pàgina ja no funciona oberta com a fitxer local (`file://`), perquè els mòduls
  ES necessiten HTTP; cal servir-la, com ja calia per llegir els JSON.
