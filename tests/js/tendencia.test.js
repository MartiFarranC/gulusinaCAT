import assert from "node:assert/strict";
import { test } from "node:test";

import { tendencia } from "../../assets/js/tendencia.js";

const HISTORIC = [
  { data: "2026-09-27", marques: { repsol: { g95: 1.6 } } },
  { data: "2026-09-29", marques: { repsol: { g95: 1.512 }, bonarea: { g95: 0 } } },
  { data: "2026-09-30", marques: { repsol: { g95: 1.5 } } },
];
const CONTEXT = {
  combustible: /** @type {const} */ ("g95"),
  historic: HISTORIC,
  dia: "2026-09-30",
  avui: "2026-09-30",
};

test("compara amb el dia anterior de l'històric i diu «des d'ahir»", () => {
  const canvi = tendencia({ id: "repsol", preu: 1.5 }, CONTEXT);

  assert.deepEqual(canvi, { text: "▼ 1,2 cèntims des d'ahir", curt: "▼ 1,2", diferencia: -1.2 });
});

test("si el dia anterior no és ahir, diu la data", () => {
  const canvi = tendencia({ id: "repsol", preu: 1.7 }, { ...CONTEXT, dia: "2026-09-29" });

  assert.equal(canvi?.text, "▲ 10,0 cèntims des del 27/9");
});

test("una diferència de menys d'una dècima de cèntim és igual", () => {
  const canvi = tendencia({ id: "repsol", preu: 1.5123 }, CONTEXT);

  assert.deepEqual(canvi, { text: "= Igual des d'ahir", curt: "=", diferencia: 0 });
});

test("sense cap dia anterior amb preu no hi ha tendència", () => {
  assert.equal(tendencia({ id: "bonarea", preu: 1.4 }, CONTEXT), null);
});
