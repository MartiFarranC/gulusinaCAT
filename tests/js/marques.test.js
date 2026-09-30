import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ALTRES,
  classificaRotuls,
  colorDe,
  nomLlegible,
  normalitza,
} from "../../assets/js/marques.js";

test("normalitza treu accents, signes i majúscules", () => {
  assert.equal(normalitza("  Bon Àrea-Guissona! "), "BON AREA GUISSONA");
  assert.equal(normalitza(null), "");
});

test("el nom llegible només capitalitza les paraules amb vocals", () => {
  assert.equal(nomLlegible("GASOLINERA GM OIL"), "Gasolinera GM Oil");
});

test("les marques conegudes tenen el seu color i la resta un de la paleta", () => {
  assert.equal(colorDe("repsol"), "#F07D00");
  assert.equal(colorDe("marca-nova"), colorDe("marca-nova"));
  assert.match(colorDe("marca-nova"), /^#[0-9A-F]{6}$/);
});

test("reconeix les marques conegudes per qualsevol variant del ròtul", () => {
  const rotuls = ["BONAREA", "Bon Area Guissona", "BON AREA"];

  const { ids } = classificaRotuls(rotuls);

  assert.deepEqual(ids, ["bonarea", "bonarea", "bonarea"]);
});

test("una marca coneguda amb menys de tres benzineres va a altres", () => {
  const { ids } = classificaRotuls(["REPSOL", "REPSOL"]);

  assert.deepEqual(ids, [ALTRES, ALTRES]);
});

test("una marca desconeguda amb prou benzineres és una marca pròpia", () => {
  const { ids, noms } = classificaRotuls(["PETROLIS MARTÍ", "PETROLIS MARTI", "Petrolis Martí"]);

  assert.deepEqual(ids, ["petrolis-marti", "petrolis-marti", "petrolis-marti"]);
  assert.equal(noms["petrolis-marti"], "Petrolis Martí");
});

test("els ròtuls genèrics van a altres encara que se'n repeteixin", () => {
  const { ids } = classificaRotuls(["SIN ROTULO", "SIN ROTULO", "SIN ROTULO", "E.S. 24"]);

  assert.deepEqual(ids, [ALTRES, ALTRES, ALTRES, ALTRES]);
});
