import assert from "node:assert/strict";
import { test } from "node:test";

import {
  eixRodo,
  extremsIMig,
  separaEtiquetes,
  totsOAlterns,
  valorDe,
} from "../../assets/js/grafic-calculs.js";

test("l'eix té passos rodons i inclou tots els valors", () => {
  const eix = eixRodo([1.43, 1.61], 0.02);

  assert.equal(eix.pas, 0.05);
  assert.equal(eix.divisions, 5);
  assert.ok(Math.abs(eix.minim - 1.4) < 1e-9);
  assert.ok(Math.abs(eix.maxim - 1.65) < 1e-9);
});

test("si els valors són massa a prop, l'eix n'agafa l'amplada mínima", () => {
  const eix = eixRodo([1.5, 1.5], 0.02);

  assert.ok(eix.maxim - eix.minim >= 0.02);
  assert.ok(eix.minim <= 1.49 && eix.maxim >= 1.51);
});

test("les etiquetes massa juntes es separen cap avall", () => {
  const separades = separaEtiquetes([{ y: 50 }, { y: 10 }, { y: 12 }], 200);

  assert.deepEqual(
    separades.map((e) => e.etiquetaY),
    [10, 25, 50],
  );
});

test("les etiquetes que sortirien per baix pugen totes plegades", () => {
  const separades = separaEtiquetes([{ y: 95 }, { y: 100 }], 100);

  assert.deepEqual(
    separades.map((e) => e.etiquetaY),
    [85, 100],
  );
});

test("l'eix horitzontal dels dies mostra el primer, el del mig i l'últim", () => {
  assert.deepEqual(extremsIMig(30), [0, 15, 29]);
  assert.deepEqual(extremsIMig(2), [0, 1]);
});

test("l'eix dels anys mostra un de cada dos si és estret, acabant per l'últim", () => {
  assert.deepEqual(totsOAlterns(5, false), [0, 1, 2, 3, 4]);
  assert.deepEqual(totsOAlterns(4, true), [1, 3]);
});

test("un valor que no és un número finit no es dibuixa", () => {
  const punt = { valors: { a: 1.5, b: null, c: Number.NaN } };

  assert.deepEqual(
    ["a", "b", "c", "d"].map((id) => valorDe(punt, { id })),
    [1.5, null, null, null],
  );
});
