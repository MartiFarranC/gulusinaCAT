import assert from "node:assert/strict";
import { test } from "node:test";

import {
  calEvitarElMinisteri,
  desaMarquesExcloses,
  llegeixMarquesExcloses,
  recordaElMinisteri,
} from "../../assets/js/preferencies.js";

/** Magatzem en memòria amb la mateixa interfície que localStorage. */
class MagatzemEnMemoria {
  /** @type {Map<string, string>} */
  valors = new Map();
  /** @param {string} clau */
  getItem(clau) {
    return this.valors.get(clau) ?? null;
  }
  /** @param {string} clau @param {string} valor */
  setItem(clau, valor) {
    this.valors.set(clau, valor);
  }
  /** @param {string} clau */
  removeItem(clau) {
    this.valors.delete(clau);
  }
}

class MagatzemBloquejat extends MagatzemEnMemoria {
  /** @returns {never} */
  getItem() {
    throw new Error("bloquejat");
  }
  /** @returns {never} */
  setItem() {
    throw new Error("bloquejat");
  }
}

const HORA = 3600e3;
/** @param {MagatzemEnMemoria} magatzem */
const comStorage = (magatzem) => /** @type {Storage} */ (/** @type {unknown} */ (magatzem));

test("les marques excloses es desen i es tornen a llegir", () => {
  const magatzem = comStorage(new MagatzemEnMemoria());

  desaMarquesExcloses(magatzem, new Set(["repsol", "bp"]));

  assert.deepEqual(llegeixMarquesExcloses(magatzem), new Set(["repsol", "bp"]));
});

test("sense magatzem o amb dades estranyes no hi ha cap marca exclosa", () => {
  const magatzem = new MagatzemEnMemoria();
  magatzem.setItem("marques-excloses", "{no és json");

  assert.deepEqual(llegeixMarquesExcloses(comStorage(magatzem)), new Set());
  assert.deepEqual(llegeixMarquesExcloses(null), new Set());
});

test("si el magatzem està bloquejat, la pàgina funciona sense desar res", () => {
  const magatzem = comStorage(new MagatzemBloquejat());

  desaMarquesExcloses(magatzem, new Set(["repsol"]));
  recordaElMinisteri(magatzem, 0);

  assert.deepEqual(llegeixMarquesExcloses(magatzem), new Set());
  assert.equal(calEvitarElMinisteri(magatzem, 0), false);
});

test("després d'una fallada, no es torna a provar el Ministeri fins al cap de sis hores", () => {
  const magatzem = comStorage(new MagatzemEnMemoria());

  recordaElMinisteri(magatzem, 10 * HORA);

  assert.equal(calEvitarElMinisteri(magatzem, 15 * HORA), true);
  assert.equal(calEvitarElMinisteri(magatzem, 16 * HORA), false);
});

test("quan el Ministeri respon, s'oblida la fallada", () => {
  const magatzem = comStorage(new MagatzemEnMemoria());
  recordaElMinisteri(magatzem, 10 * HORA);

  recordaElMinisteri(magatzem, null);

  assert.equal(calEvitarElMinisteri(magatzem, 10 * HORA), false);
});
