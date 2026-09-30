import assert from "node:assert/strict";
import { test } from "node:test";

import {
  agregaPerMarca,
  buscaMunicipi,
  estacionsDinsDelRadi,
  llegeixEstacions,
  municipiMesProper,
  municipisDe,
  nomDeLaUbicacio,
} from "../../assets/js/proximitat.js";
import { estacio } from "./fabriques.js";

const REUS = { lat: 41.155, lon: 1.107 };
const TARRAGONA = estacio({
  m: "bonarea",
  nom: "bonÀrea",
  lat: 41.119,
  lon: 1.245,
  mun: "Tarragona",
  g95: 1.4,
  dsl: null,
});
const LLEIDA = estacio({ lat: 41.617, lon: 0.62, mun: "Lleida", g95: 1.6 });

test("llegeix les files d'estacions.json i descarta les coordenades impossibles", () => {
  /** @type {import("../../assets/js/ministeri.js").DocumentEstacions} */
  const document = {
    marques: { repsol: "Repsol" },
    e: [
      ["repsol", 41.1, 1.1, 1.5, null, "Reus", "Carrer"],
      ["repsol", 0, 0, 1.5, 1.4, "Enlloc", ""],
    ],
  };

  const estacions = llegeixEstacions(document);

  assert.equal(estacions.length, 1);
  assert.deepEqual(estacions[0], {
    m: "repsol",
    nom: "Repsol",
    lat: 41.1,
    lon: 1.1,
    g95: 1.5,
    dsl: null,
    mun: "Reus",
    adr: "Carrer",
  });
});

test("cada municipi és al centre de les seves benzineres", () => {
  const municipis = municipisDe([
    estacio({ lat: 41, lon: 1 }),
    estacio({ mun: "REUS", lat: 42, lon: 2 }),
  ]);

  assert.deepEqual([...municipis], [["REUS", { nom: "Reus", lat: 41.5, lon: 1.5 }]]);
});

test("troba un municipi pel nom exacte o per l'únic que comença així", () => {
  const municipis = municipisDe([estacio(), TARRAGONA, estacio({ mun: "Tàrrega" })]);

  assert.equal(buscaMunicipi("reus", municipis)?.nom, "Reus");
  assert.equal(buscaMunicipi("tarrag", municipis)?.nom, "Tarragona");
  assert.equal(buscaMunicipi("tar", municipis), null);
});

test("el municipi més proper a una ubicació", () => {
  const municipis = municipisDe([estacio(), LLEIDA]);

  assert.equal(municipiMesProper({ lat: 41.6, lon: 0.6 }, municipis)?.nom, "Lleida");
  assert.equal(municipiMesProper(REUS, new Map()), null);
});

test("la ubicació del GPS s'anomena pel municipi on és o el més proper", () => {
  assert.equal(nomDeLaUbicacio({ nom: "Reus", d: 1 }), "la teva ubicació (Reus)");
  assert.equal(nomDeLaUbicacio({ nom: "Reus", d: 8 }), "la teva ubicació (a prop de Reus)");
  assert.equal(nomDeLaUbicacio(null), "la teva ubicació");
});

test("només queden les benzineres de dins del radi, amb la distància", () => {
  const dins = estacionsDinsDelRadi([estacio(), TARRAGONA, LLEIDA], REUS, 20);

  assert.deepEqual(
    dins.map((e) => e.mun),
    ["Reus", "Tarragona"],
  );
  assert.equal(dins[0]?.d, 0);
});

test("agrega les benzineres de dins del radi per marca", () => {
  const { marques, mitjana } = agregaPerMarca(
    [estacio(), estacio({ g95: 1.7, mun: "Cambrils" }), TARRAGONA],
    20,
  );

  const repsol = marques.find((m) => m.id === "repsol");
  assert.equal(repsol?.g95, 1.6);
  assert.equal(repsol?.n, 2);
  assert.deepEqual(repsol?.barata?.g95, { preu: 1.5, municipi: "Reus", lat: 41.155, lon: 1.107 });
  assert.equal(repsol?.data, "2 a menys de 20 km");
  assert.deepEqual(mitjana, { g95: 1.533, dsl: 1.4, n: 3 });
});

test("una marca sense preu d'un combustible no en té mitjana ni franja", () => {
  const { marques } = agregaPerMarca([TARRAGONA], 20);

  assert.equal(marques[0]?.dsl, null);
  assert.equal(marques[0]?.rang?.dsl, undefined);
});
