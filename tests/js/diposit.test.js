import assert from "node:assert/strict";
import { test } from "node:test";

import { dinersPerOmplir } from "../../assets/js/diposit.js";

const COTXE = { consum: 6, kmQueQueden: 100, diposit: 50, preu: 1.5 };

test("calcula els litres que queden i els que hi caben", () => {
  const carrega = dinersPerOmplir(COTXE);

  assert.equal(carrega.litresQueQueden, 6);
  assert.equal(carrega.litresQueHiCaben, 44);
  assert.equal(carrega.eurosFinsAlCapdamunt, 66);
});

test("deixa un marge del 5 % del dipòsit i arrodoneix cap avall a 5 €", () => {
  // 44 L − 2,5 L de marge = 41,5 L × 1,5 €/L = 62,25 € → 60 €
  assert.equal(dinersPerOmplir(COTXE).euros, 60);
});

test("una quantitat justa múltiple de 5 € no es rebaixa", () => {
  const carrega = dinersPerOmplir({ consum: 5, kmQueQueden: 0, diposit: 40, preu: 1.25 });

  // 40 L − 2 L = 38 L × 1,25 = 47,5 € → 45 €
  assert.equal(carrega.euros, 45);
});

test("amb el dipòsit gairebé ple no cal posar res", () => {
  const carrega = dinersPerOmplir({ ...COTXE, kmQueQueden: 800 });

  assert.equal(carrega.litresQueHiCaben, 2);
  assert.equal(carrega.euros, 0);
});

test("si l'autonomia supera el dipòsit, es considera ple", () => {
  const carrega = dinersPerOmplir({ ...COTXE, kmQueQueden: 2000 });

  assert.equal(carrega.litresQueQueden, 50);
  assert.equal(carrega.litresQueHiCaben, 0);
  assert.equal(carrega.euros, 0);
});
