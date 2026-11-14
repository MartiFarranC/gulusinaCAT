import assert from "node:assert/strict";
import { test } from "node:test";

import {
  benzineresDeLaRuta,
  laMesBarataDeLaRuta,
  llargadaDelRecorregut,
  preparaRecorregut,
  situaALaRuta,
} from "../../assets/js/ruta-calculs.js";
import { estacio } from "./fabriques.js";

// Una ruta recta d'oest a est per la latitud 41,5, d'uns 33 km, amb un colze al mig.
const RUTA = preparaRecorregut([
  { lat: 41.5, lon: 1.6 },
  { lat: 41.5, lon: 1.8 },
  { lat: 41.5, lon: 2.0 },
]);
const AL_MIG = estacio({ lat: 41.5, lon: 1.8, g95: 1.6 });
const A_UN_KM = estacio({ lat: 41.509, lon: 1.7, g95: 1.5, mun: "Nord" });
const LLUNY = estacio({ lat: 41.6, lon: 1.8, g95: 1.2, mun: "Lluny" });
const ABANS_DE_SORTIR = estacio({ lat: 41.5, lon: 1.58, g95: 1.7, mun: "Abans" });

test("mesura la llargada de la ruta en quilòmetres", () => {
  assert.ok(Math.abs(llargadaDelRecorregut(RUTA) - 33.4) < 0.2);
});

test("situa un punt al quilòmetre de la ruta més proper i diu quant se'n desvia", () => {
  const { desviacio, km } = situaALaRuta(A_UN_KM, RUTA);

  assert.ok(Math.abs(desviacio - 1) < 0.01);
  assert.ok(Math.abs(km - 8.35) < 0.1);
});

test("abans de l'inici, la desviació és fins al punt de sortida", () => {
  const { desviacio, km } = situaALaRuta(ABANS_DE_SORTIR, RUTA);

  assert.ok(Math.abs(desviacio - 1.67) < 0.02);
  assert.equal(km, 0);
});

test("només compta les benzineres dins de la desviació, en l'ordre del trajecte", () => {
  const trobades = benzineresDeLaRuta([LLUNY, AL_MIG, A_UN_KM, ABANS_DE_SORTIR], RUTA, 2);

  assert.deepEqual(
    trobades.map((t) => t.estacio),
    [ABANS_DE_SORTIR, A_UN_KM, AL_MIG],
  );
});

test("amb una desviació més gran n'entren més", () => {
  const trobades = benzineresDeLaRuta([LLUNY, AL_MIG, A_UN_KM], RUTA, 15);

  assert.equal(trobades.length, 3);
});

test("la més barata de la ruta és la de menys preu; si empaten, la primera del trajecte", () => {
  const empatada = estacio({ lat: 41.5, lon: 1.95, g95: 1.5 });
  const trobades = benzineresDeLaRuta([AL_MIG, empatada, A_UN_KM], RUTA, 2);

  const barata = laMesBarataDeLaRuta(trobades, (e) => e.g95 ?? 0);

  assert.equal(barata?.estacio, A_UN_KM);
  assert.equal(
    laMesBarataDeLaRuta([], (e) => e.g95 ?? 0),
    null,
  );
});

test("una ruta d'un sol punt mesura la distància fins a aquest punt", () => {
  const punt = preparaRecorregut([{ lat: 41.5, lon: 1.8 }]);

  assert.equal(llargadaDelRecorregut(punt), 0);
  assert.ok(Math.abs(situaALaRuta(LLUNY, punt).desviacio - 11.06) < 0.05);
});
