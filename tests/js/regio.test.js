import assert from "node:assert/strict";
import { test } from "node:test";

import { REGIONS, regioTriada } from "../../assets/js/regio.js";

test("l'adreça mana sobre la regió desada", () => {
  const regio = regioTriada("?zona=andorra", "catalunya");

  assert.equal(regio, REGIONS.andorra);
});

test("sense res a l'adreça, obre la regió triada l'última vegada", () => {
  const regio = regioTriada("", "andorra");

  assert.equal(regio, REGIONS.andorra);
});

test("si no se sap res o el valor no és cap regió, obre Catalunya", () => {
  assert.equal(regioTriada("", null), REGIONS.catalunya);
  assert.equal(regioTriada("?zona=franca", "lluna"), REGIONS.catalunya);
});

test("cada regió llegeix les dades del seu directori", () => {
  assert.equal(REGIONS.catalunya.directori, "");
  assert.equal(REGIONS.andorra.directori, "andorra/");
  assert.equal(REGIONS.andorra.teMinisteri, false);
});
