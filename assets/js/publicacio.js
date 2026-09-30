/** Conversió dels preus publicats (en directe o de la còpia) a les marques de la pàgina. */

import { plural } from "./format.js";
import { ALTRES, NOMS, colorDe } from "./marques.js";

/** @typedef {import("./tipus.js").Marca} Marca */
/** @typedef {import("./tipus.js").Mitjana} Mitjana */
/** @typedef {import("./dades.js").PreusLlegits} PreusLlegits */

/** @param {unknown} valor */
const preuPositiu = (valor) => (typeof valor === "number" && valor > 0 ? valor : null);

/**
 * @param {PreusLlegits["marques"]} marques
 * @param {string} origen Text sobre l'origen de la dada, com «avui» o la data de la còpia.
 * @returns {Marca[] | null} Les marques amb algun preu, o null si no n'hi ha cap de reconeguda.
 */
export function marquesDeLaPublicacio(marques, origen) {
  const amb = Object.entries(marques)
    .filter(([, m]) => m && (preuPositiu(m.g95) || preuPositiu(m.dsl)))
    .map(([id, m]) => ({
      id,
      nom: m.nom || NOMS[id] || id,
      color: colorDe(id),
      g95: preuPositiu(m.g95),
      dsl: preuPositiu(m.dsl),
      n: m.n || 0,
      rang: m.rang || null,
      barata: m.barata || null,
      data: `${m.n} ${plural(m.n ?? 0, "benzinera", "benzineres")} · ${origen}`,
    }));
  return amb.some((m) => m.id !== ALTRES) ? amb : null;
}

/**
 * @param {Partial<Mitjana> | null} mitjana
 * @returns {Mitjana | null} La mitjana si té preu dels dos combustibles.
 */
export function mitjanaCompleta(mitjana) {
  const g95 = preuPositiu(mitjana?.g95);
  const dsl = preuPositiu(mitjana?.dsl);
  return g95 && dsl ? { g95, dsl, n: mitjana?.n ?? 0 } : null;
}
