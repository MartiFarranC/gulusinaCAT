import assert from "node:assert/strict";
import { test } from "node:test";

import { marquesDeLaPublicacio, mitjanaCompleta } from "../../assets/js/publicacio.js";

test("converteix les marques publicades a marques de la pàgina", () => {
  const marques = marquesDeLaPublicacio(
    { repsol: { nom: "Repsol", g95: 1.5, dsl: 0, n: 1 } },
    "avui",
  );

  assert.deepEqual(marques, [
    {
      id: "repsol",
      nom: "Repsol",
      color: "#F07D00",
      g95: 1.5,
      dsl: null,
      n: 1,
      rang: null,
      barata: null,
      data: "1 benzinera · avui",
    },
  ]);
});

test("sense cap marca reconeguda no hi ha publicació", () => {
  assert.equal(marquesDeLaPublicacio({ altres: { g95: 1.5, n: 4 } }, "avui"), null);
  assert.equal(marquesDeLaPublicacio({ repsol: { g95: 0, dsl: 0 } }, "avui"), null);
});

test("una marca sense nom rep el nom conegut", () => {
  const marques = marquesDeLaPublicacio({ bonarea: { g95: 1.4, n: 3 } }, "30/09/2026");

  assert.equal(marques?.[0]?.nom, "bonÀrea");
  assert.equal(marques?.[0]?.data, "3 benzineres · 30/09/2026");
});

test("la mitjana només serveix si té els dos combustibles", () => {
  assert.deepEqual(mitjanaCompleta({ g95: 1.5, dsl: 1.4, n: 30 }), { g95: 1.5, dsl: 1.4, n: 30 });
  assert.equal(mitjanaCompleta({ g95: 1.5, dsl: null }), null);
  assert.equal(mitjanaCompleta(null), null);
});
