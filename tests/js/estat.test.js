import assert from "node:assert/strict";
import { test } from "node:test";

import {
  creaEstat,
  esProperes,
  marquesOrdenades,
  marquesReals,
  nomDeLaReferencia,
  textDelKicker,
} from "../../assets/js/estat.js";
import { estacio } from "./fabriques.js";

const estatInicial = () => creaEstat({ movimentReduit: true, excloses: new Set() });

test("d'inici es mostren els preus de reserva ordenats de més barat a més car", () => {
  const estat = estatInicial();

  assert.deepEqual(
    marquesOrdenades(estat).map((m) => m.id),
    ["esclatoil", "bonarea", "petrocat", "repsol"],
  );
});

test("les marques excloses i les que no tenen preu no es comparen", () => {
  const estat = estatInicial();
  estat.excloses.add("esclatoil");
  estat.marques.push({ id: "altres", nom: "Altres", color: "#000", g95: 1, dsl: null, data: "" });
  estat.marques.push({ id: "bp", nom: "BP", color: "#000", g95: null, dsl: 1, data: "" });

  assert.deepEqual(
    marquesOrdenades(estat).map((m) => m.id),
    ["altres", "bonarea", "petrocat", "repsol"],
  );
  assert.deepEqual(
    marquesReals(estat).map((m) => m.id),
    ["bonarea", "petrocat", "repsol"],
  );
});

test("l'àmbit és el de les properes només quan ja s'hi han calculat les marques", () => {
  const estat = estatInicial();
  estat.base = { marques: estat.marques, mitjana: null };
  estat.ambit = "properes";
  estat.ubicacio = { lat: 41, lon: 1, nom: "Reus" };
  estat.estacions = [estacio()];

  assert.equal(esProperes(estat), false);
  estat.marques = [];
  assert.equal(esProperes(estat), true);
  assert.equal(nomDeLaReferencia(estat), "la zona");
  assert.equal(textDelKicker(estat), "Les quatre marques més barates a menys de 50 km");
});

test("fora de les properes, la referència és Catalunya", () => {
  const estat = estatInicial();

  assert.equal(nomDeLaReferencia(estat), "Catalunya");
  assert.equal(textDelKicker(estat), "Les quatre marques més barates");
});
