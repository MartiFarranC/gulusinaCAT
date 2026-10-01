import assert from "node:assert/strict";
import { mock, test } from "node:test";

import { esperaSensePassarDe } from "../../assets/js/espera.js";

test("diu que ha acabat si la promesa acaba abans del límit", async () => {
  const resultat = await esperaSensePassarDe(Promise.resolve("fet"), 1000);

  assert.equal(resultat, true);
});

test("no falla si la promesa falla", async () => {
  const resultat = await esperaSensePassarDe(Promise.reject(new Error("xarxa")), 1000);

  assert.equal(resultat, false);
});

test("deixa d'esperar quan arriba al límit", async () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  const espera = esperaSensePassarDe(new Promise(() => {}), 1000);

  mock.timers.tick(1000);
  const resultat = await espera;

  mock.timers.reset();
  assert.equal(resultat, false);
});
