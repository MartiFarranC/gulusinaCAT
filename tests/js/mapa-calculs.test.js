import assert from "node:assert/strict";
import { test } from "node:test";

import {
  esDinsDelMapa,
  limitaElZoom,
  triaEtiquetes,
  zoomDeLesRajoles,
} from "../../assets/js/mapa-calculs.js";

const MAPA = { ample: 600, alt: 400 };
/** @param {[number, number]} punt */
const posicio = (punt) => punt;

test("les etiquetes que trepitjarien una de més barata es queden com a punt", () => {
  /** @type {[number, number][]} */
  const punts = [
    [100, 100],
    [120, 110],
    [300, 100],
  ];

  assert.deepEqual(triaEtiquetes(punts, posicio, MAPA), [
    [100, 100],
    [300, 100],
  ]);
});

test("com a màxim hi ha deu etiquetes", () => {
  /** @type {[number, number][]} */
  const punts = Array.from({ length: 12 }, (_, i) => [
    40 + (i % 6) * 100,
    100 + Math.floor(i / 6) * 100,
  ]);

  assert.equal(triaEtiquetes(punts, posicio, MAPA).length, 10);
});

test("les benzineres de fora del mapa no gasten etiqueta", () => {
  /** @type {[number, number][]} */
  const punts = [
    [-100, 100],
    [100, 100],
  ];

  assert.deepEqual(triaEtiquetes(punts, posicio, MAPA), [[100, 100]]);
});

test("un punt és dins del mapa amb el marge indicat", () => {
  assert.equal(esDinsDelMapa(610, 10, MAPA, 20), true);
  assert.equal(esDinsDelMapa(630, 10, MAPA, 20), false);
});

test("el zoom es queda entre els nivells amb rajoles", () => {
  assert.equal(limitaElZoom(3), 6);
  assert.equal(limitaElZoom(9.5), 9.5);
  assert.equal(limitaElZoom(20), 17);
  assert.equal(zoomDeLesRajoles(9.6), 10);
});
