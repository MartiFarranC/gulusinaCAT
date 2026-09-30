import assert from "node:assert/strict";
import { test } from "node:test";

import {
  formataAmbSigne,
  formataCentims,
  formataDistancia,
  formataEuros,
  formataPreu,
  ordinal,
  plural,
} from "../../assets/js/format.js";

test("el preu té tres decimals amb coma", () => {
  assert.equal(formataPreu(1.5), "1,500");
});

test("els euros tenen dos decimals i el símbol", () => {
  assert.equal(formataEuros(69.2), "69,20 €");
});

test("una diferència en euros es mostra en cèntims amb un decimal", () => {
  assert.equal(formataCentims(0.0153), "1,5");
});

test("les distàncies curtes tenen un decimal i les llargues cap", () => {
  assert.equal(formataDistancia(3.25), "3,3 km");
  assert.equal(formataDistancia(12.6), "13 km");
});

test("els valors positius i negatius porten el signe i el zero no", () => {
  assert.equal(formataAmbSigne(1.25), "+1,3");
  assert.equal(formataAmbSigne(-2, 0), "−2");
  assert.equal(formataAmbSigne(0), "0,0");
});

test("els ordinals de les quatre primeres posicions", () => {
  assert.deepEqual([1, 2, 3, 4].map(ordinal), ["1r", "2n", "3r", "4t"]);
});

test("el plural només és singular per a una unitat", () => {
  assert.equal(plural(1, "benzinera", "benzineres"), "benzinera");
  assert.equal(plural(0, "benzinera", "benzineres"), "benzineres");
});
