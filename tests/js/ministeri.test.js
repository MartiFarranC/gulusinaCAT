import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { resumeixElMinisteri } from "../../assets/js/ministeri.js";

/** @param {string} nom */
const dades = (nom) =>
  JSON.parse(readFileSync(new URL(`../e2e/dades/${nom}`, import.meta.url), "utf-8"));

/** @param {Record<string, unknown>} camps */
const registre = (camps) => ({
  Rótulo: "REPSOL",
  "Precio Gasolina 95 E5": "1,500",
  "Precio Gasoleo A": "1,400",
  Municipio: "Reus",
  Dirección: "CARRER MAJOR, 1",
  Latitud: "41,155",
  "Longitud (WGS84)": "1,107",
  ...camps,
});

test("fa el mateix resum que el paquet de Python", () => {
  const ministeri = dades("ministeri.json");
  const esperat = dades("preus.json");

  const resum = resumeixElMinisteri(ministeri.ListaEESSPrecio);

  for (const [id, marca] of Object.entries(esperat.marques)) {
    const calculada = resum.marques[id];
    assert.ok(calculada, `falta la marca ${id}`);
    assert.deepEqual(
      { nom: calculada.nom, n: calculada.n, rang: calculada.rang, barata: calculada.barata },
      { nom: marca.nom, n: marca.n, rang: marca.rang, barata: marca.barata },
    );
    // Python arrodoneix els empats a parell i el navegador cap amunt: hi pot haver una mil·lèsima
    for (const combustible of /** @type {const} */ (["g95", "dsl"])) {
      const diferencia = Math.abs(Number(calculada[combustible]) - marca[combustible]);
      assert.ok(diferencia <= 0.0010001, `${id} ${combustible}`);
    }
  }
  assert.deepEqual(resum.catalunya, esperat.catalunya);
});

test("les benzineres són les mateixes que les del paquet de Python", () => {
  const ministeri = dades("ministeri.json");
  const esperat = dades("estacions.json");

  const { estacions } = resumeixElMinisteri(ministeri.ListaEESSPrecio);

  assert.deepEqual(estacions.e, esperat.e);
  assert.deepEqual(estacions.marques, { ...estacions.marques, ...esperat.marques });
});

test("els preus buits o a zero no compten", () => {
  const registres = [1, 2, 3].map(() => registre({ "Precio Gasoleo A": "" }));
  registres.push(registre({ "Precio Gasolina 95 E5": "0,000" }));

  const { marques } = resumeixElMinisteri(registres);

  assert.equal(marques["repsol"]?.g95, 1.5);
  assert.equal(marques["repsol"]?.dsl, 1.4);
  assert.equal(marques["repsol"]?.n, 3);
});

test("les benzineres sense coordenades vàlides no surten a la llista", () => {
  const registres = [registre({}), registre({ Latitud: "0,000", "Longitud (WGS84)": "0,000" })];

  const { estacions } = resumeixElMinisteri(registres);

  assert.equal(estacions.e.length, 1);
});
