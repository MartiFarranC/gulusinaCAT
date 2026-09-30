import assert from "node:assert/strict";
import { test } from "node:test";

import {
  desprojecta,
  distancia,
  esDinsDeCatalunya,
  metresPerPixel,
  projecta,
  vistaQueEncaixa,
  zoomPerAlRadi,
} from "../../assets/js/geo.js";

const BARCELONA = { lat: 41.3874, lon: 2.1686 };
const GIRONA = { lat: 41.9794, lon: 2.8214 };

test("la distància entre Barcelona i Girona és d'uns 85 km", () => {
  assert.ok(Math.abs(distancia(BARCELONA, GIRONA) - 85) < 1);
});

test("les coordenades a zero o absents no són de Catalunya", () => {
  assert.equal(esDinsDeCatalunya(BARCELONA.lat, BARCELONA.lon), true);
  assert.equal(esDinsDeCatalunya(0, 0), false);
  assert.equal(esDinsDeCatalunya(null, 2), false);
});

test("desprojectar un punt projectat torna el mateix punt", () => {
  const { x, y } = projecta(BARCELONA.lat, BARCELONA.lon, 12);

  const punt = desprojecta(x, y, 12);

  assert.ok(Math.abs(punt.lat - BARCELONA.lat) < 1e-9);
  assert.ok(Math.abs(punt.lon - BARCELONA.lon) < 1e-9);
});

test("cada nivell de zoom divideix per dos els metres per píxel", () => {
  assert.equal(metresPerPixel(41, 10) / metresPerPixel(41, 11), 2);
});

test("el zoom per al radi fa que el cercle ocupi el 92 % del costat", () => {
  const zoom = zoomPerAlRadi(41, 50, 400);

  const diametrePx = (2 * 50000) / metresPerPixel(41, zoom);

  assert.ok(Math.abs(diametrePx - 400 * 0.92) < 1e-6);
});

test("la vista que encaixa els punts té el centre entre els extrems", () => {
  const { centre, zoom } = vistaQueEncaixa([BARCELONA, GIRONA], 600, 400);

  assert.ok(centre.lat > BARCELONA.lat && centre.lat < GIRONA.lat);
  assert.ok(centre.lon > BARCELONA.lon && centre.lon < GIRONA.lon);
  assert.ok(zoom > 6 && zoom < 12);
});
