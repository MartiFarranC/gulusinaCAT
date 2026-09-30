/** Càlculs dels gràfics de línies que no depenen del navegador. */

const DIVISIONS_APROXIMADES = 4;
const PASSOS_RODONS = [1, 2, 2.5, 5, 10];
const TOLERANCIA = 1e-9;
const SEPARACIO_ETIQUETES = 15;

/**
 * @param {{valors: Record<string, number | null>}} punt
 * @param {{id: string}} serie
 * @returns {number | null} El valor de la sèrie en aquest punt, si és un número.
 */
export function valorDe(punt, serie) {
  const valor = punt.valors[serie.id];
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null;
}

/**
 * @typedef {object} Eix
 * @property {number} minim
 * @property {number} maxim
 * @property {number} pas
 * @property {number} divisions
 */

/**
 * Eix vertical amb passos rodons (1, 2, 2,5 o 5 × 10ⁿ) i unes quatre divisions.
 *
 * @param {readonly number[]} valors Almenys un valor.
 * @param {number} ampladaMinima Si els valors són massa a prop, l'eix n'agafa almenys aquesta.
 * @returns {Eix}
 */
export function eixRodo(valors, ampladaMinima) {
  let minim = Math.min(...valors);
  let maxim = Math.max(...valors);
  if (maxim - minim < ampladaMinima) {
    const centre = (maxim + minim) / 2;
    minim = centre - ampladaMinima / 2;
    maxim = centre + ampladaMinima / 2;
  }
  const pasCru = (maxim - minim) / DIVISIONS_APROXIMADES;
  const potencia = 10 ** Math.floor(Math.log10(pasCru));
  const pas = /** @type {number} */ (
    PASSOS_RODONS.map((factor) => factor * potencia).find((p) => p >= pasCru)
  );
  const baix = Math.floor(minim / pas + TOLERANCIA) * pas;
  const alt = Math.ceil(maxim / pas - TOLERANCIA) * pas;
  return { minim: baix, maxim: alt, pas, divisions: Math.round((alt - baix) / pas) };
}

/**
 * Posa les etiquetes del final de les línies una sota l'altra perquè no es trepitgin, sense
 * passar del límit inferior.
 *
 * @template {{y: number}} T
 * @param {readonly T[]} finals Punt final de cada línia.
 * @param {number} limitInferior
 * @returns {Array<T & {etiquetaY: number}>} Ordenats de dalt a baix.
 */
export function separaEtiquetes(finals, limitInferior) {
  /** @type {Array<T & {etiquetaY: number}>} */
  const ordenats = [...finals]
    .sort((a, b) => a.y - b.y)
    .map((final) => ({ ...final, etiquetaY: final.y }));
  ordenats.forEach((final, i) => {
    const anterior = ordenats[i - 1];
    if (anterior) final.etiquetaY = Math.max(final.y, anterior.etiquetaY + SEPARACIO_ETIQUETES);
  });
  const sobra = (ordenats.at(-1)?.etiquetaY ?? 0) - limitInferior;
  if (sobra > 0) for (const final of ordenats) final.etiquetaY -= sobra;
  return ordenats;
}

/**
 * @param {number} longitud Nombre de punts.
 * @returns {number[]} El primer, el del mig i l'últim.
 */
export const extremsIMig = (longitud) => [
  ...new Set([0, Math.round((longitud - 1) / 2), longitud - 1]),
];

/**
 * @param {number} longitud Nombre de punts.
 * @returns {number[]} Tots els punts.
 */
export const tots = (longitud) => [...Array(longitud).keys()];
