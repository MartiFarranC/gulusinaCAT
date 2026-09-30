import assert from "node:assert/strict";
import { test } from "node:test";

import { indexDeLaSeccioActual } from "../../assets/js/seccio-actual.js";

const LECTURA = { linia: 300, esAlFinal: false };

test("és l'última secció que ja ha passat la línia de lectura", () => {
  assert.equal(indexDeLaSeccioActual([-800, -100, 250, 900], LECTURA), 2);
});

test("a dalt de tot és la primera secció", () => {
  assert.equal(indexDeLaSeccioActual([400, 1200, 2000], LECTURA), 0);
});

test("al final de la pàgina és l'última, encara que no arribi a la línia", () => {
  assert.equal(indexDeLaSeccioActual([-900, -300, 500], { linia: 300, esAlFinal: true }), 2);
});

test("les seccions amagades no compten", () => {
  assert.equal(indexDeLaSeccioActual([-900, null, 100, null], LECTURA), 2);
  assert.equal(indexDeLaSeccioActual([-900, 100, null], { linia: 300, esAlFinal: true }), 1);
});

test("sense cap secció visible no n'hi ha cap d'actual", () => {
  assert.equal(indexDeLaSeccioActual([null, null], LECTURA), -1);
});
