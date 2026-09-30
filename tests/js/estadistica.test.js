import assert from "node:assert/strict";
import { test } from "node:test";

import { elMesPetit, mitjana, percentil } from "../../assets/js/estadistica.js";

test("la mitjana s'arrodoneix a mil·lèsimes", () => {
  assert.equal(mitjana([1.1, 1.2, 1.25]), 1.183);
});

test("sense valors no hi ha mitjana", () => {
  assert.equal(mitjana([]), null);
});

test("el percentil és el valor de la posició més propera, sense interpolar", () => {
  const valors = [5, 1, 4, 2, 3];

  assert.equal(percentil(valors, 0.1), 1);
  assert.equal(percentil(valors, 0.9), 5);
});

test("el més petit és el primer amb el valor mínim", () => {
  const elements = [
    { id: "a", v: 2 },
    { id: "b", v: 1 },
    { id: "c", v: 1 },
  ];

  assert.equal(elMesPetit(elements, (e) => e.v).id, "b");
});
