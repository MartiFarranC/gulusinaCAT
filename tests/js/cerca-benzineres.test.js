import assert from "node:assert/strict";
import { test } from "node:test";

import { MAXIM_DE_RESULTATS, buscaBenzineres } from "../../assets/js/cerca-benzineres.js";
import { estacio } from "./fabriques.js";

const REUS = estacio();
const TARRAGONA = estacio({ lat: 41.119, lon: 1.245, mun: "Tarragona", adr: "Rambla Nova, 1" });
const PLENOIL = estacio({
  m: "plenoil",
  nom: "Plenergy (Plenoil)",
  mun: "Blanes",
  lat: 41.67,
  lon: 2.79,
});
const SENSE_DIESEL = estacio({ mun: "Valls", dsl: null });
const ESTACIONS = [TARRAGONA, PLENOIL, REUS, SENSE_DIESEL];
const SENSE_UBICACIO = { combustible: /** @type {const} */ ("g95"), punt: null };

test("troba per marca, municipi o adreça, sense accents ni majúscules", () => {
  assert.deepEqual(
    buscaBenzineres(ESTACIONS, "plenergy", SENSE_UBICACIO).map((e) => e.mun),
    ["Blanes"],
  );
  assert.deepEqual(
    buscaBenzineres(ESTACIONS, "TARRAGONA", SENSE_UBICACIO).map((e) => e.mun),
    ["Tarragona"],
  );
  assert.deepEqual(
    buscaBenzineres(ESTACIONS, "rambla", SENSE_UBICACIO).map((e) => e.mun),
    ["Tarragona"],
  );
});

test("totes les paraules han de coincidir", () => {
  const trobades = buscaBenzineres(ESTACIONS, "repsol reus", SENSE_UBICACIO);

  assert.deepEqual(
    trobades.map((e) => e.mun),
    ["Reus"],
  );
});

test("sense ubicació s'ordenen per municipi i no tenen distància", () => {
  const trobades = buscaBenzineres(ESTACIONS, "repsol", SENSE_UBICACIO);

  assert.deepEqual(
    trobades.map((e) => e.mun),
    ["Reus", "Tarragona", "Valls"],
  );
  assert.equal(trobades[0]?.d, null);
});

test("amb ubicació s'ordenen de la més propera a la més llunyana", () => {
  const trobades = buscaBenzineres(ESTACIONS, "repsol", {
    combustible: "g95",
    punt: { lat: 41.12, lon: 1.24 },
  });

  assert.deepEqual(
    trobades.map((e) => e.mun),
    ["Tarragona", "Reus", "Valls"],
  );
  assert.ok((trobades[0]?.d ?? 99) < 1);
});

test("només surten les que venen el combustible", () => {
  const trobades = buscaBenzineres(ESTACIONS, "valls", { combustible: "dsl", punt: null });

  assert.deepEqual(trobades, []);
});

test("sense text, només amb ubicació, surten les més properes", () => {
  assert.deepEqual(buscaBenzineres(ESTACIONS, " ", SENSE_UBICACIO), []);
  const properes = buscaBenzineres(ESTACIONS, "", {
    combustible: "g95",
    punt: { lat: 41.67, lon: 2.79 },
  });
  assert.equal(properes[0]?.mun, "Blanes");
});

test("com a màxim surten uns quants resultats", () => {
  const moltes = Array.from({ length: 20 }, (_, i) => estacio({ mun: `Poble ${i}` }));

  assert.equal(buscaBenzineres(moltes, "repsol", SENSE_UBICACIO).length, MAXIM_DE_RESULTATS);
});
