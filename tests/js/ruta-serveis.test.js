import assert from "node:assert/strict";
import { test } from "node:test";

import { RespostaInvalidaError } from "../../assets/js/dades.js";
import { llocsDeLOpenMeteo, llocsDeNominatim, rutaDeLOsrm } from "../../assets/js/ruta-serveis.js";

test("llegeix la ruta d'OSRM amb els punts en latitud i longitud", () => {
  const json = {
    code: "Ok",
    routes: [
      {
        distance: 152300,
        duration: 6000,
        geometry: {
          type: "LineString",
          coordinates: [
            [1.5, 42.5],
            [2.0, 41.4],
          ],
        },
      },
    ],
  };

  const ruta = rutaDeLOsrm(json);

  assert.deepEqual(ruta.punts, [
    { lat: 42.5, lon: 1.5 },
    { lat: 41.4, lon: 2.0 },
  ]);
  assert.equal(ruta.km, 152.3);
  assert.equal(ruta.minuts, 100);
});

test("una resposta d'OSRM sense ruta és un error", () => {
  assert.throws(() => rutaDeLOsrm({ code: "NoRoute", routes: [] }), RespostaInvalidaError);
  assert.throws(() => rutaDeLOsrm(null), RespostaInvalidaError);
});

test("dels llocs d'Open-Meteo, primer els de Catalunya i Andorra", () => {
  const json = {
    results: [
      { name: "Encamp", latitude: 1, longitude: 2, country_code: "US", country: "Estats Units" },
      { name: "Encamp", latitude: 42.53, longitude: 1.58, country_code: "AD", country: "Andorra" },
      {
        name: "Lleida",
        latitude: 41.6,
        longitude: 0.6,
        country_code: "ES",
        admin1: "Catalunya",
        admin2: "Lleida",
      },
      { name: "Sense coordenades" },
    ],
  };

  const llocs = llocsDeLOpenMeteo(json);

  assert.deepEqual(
    llocs.map((l) => `${l.nom} (${l.detall})`),
    ["Lleida (Lleida, Catalunya)", "Encamp (Andorra)", "Encamp (Estats Units)"],
  );
});

test("sense resultats d'Open-Meteo no hi ha cap lloc", () => {
  assert.deepEqual(llocsDeLOpenMeteo({ generationtime_ms: 1 }), []);
});

test("de Nominatim agafa el nom i la resta de l'adreça", () => {
  const json = [
    {
      lat: "41.6176",
      lon: "0.6200",
      name: "",
      display_name: "5, Carrer Major, Lleida, Segrià, Catalunya, Espanya",
    },
    { lat: "x", lon: "y", display_name: "res" },
  ];

  const llocs = llocsDeNominatim(json);

  assert.deepEqual(llocs, [
    { nom: "5", detall: "Carrer Major, Lleida, Segrià", lat: 41.6176, lon: 0.62 },
  ]);
  assert.deepEqual(llocsDeNominatim({ error: "res" }), []);
});
