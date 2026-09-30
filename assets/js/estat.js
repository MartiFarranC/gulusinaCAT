/** Estat de la pàgina i les consultes que en deriven. */

import { ALTRES, colorDe } from "./marques.js";

/** @typedef {import("./tipus.js").Combustible} Combustible */
/** @typedef {import("./tipus.js").Marca} Marca */
/** @typedef {import("./tipus.js").Mitjana} Mitjana */

/**
 * @typedef {object} Estat
 * @property {Combustible} combustible
 * @property {Marca[]} marques Les de l'àmbit actual.
 * @property {Mitjana | null} mitjana De totes les benzineres de l'àmbit actual.
 * @property {{marques: Marca[], mitjana: Mitjana | null} | null} base Les de tot Catalunya.
 * @property {import("./tipus.js").Estacio[] | null} estacions
 * @property {Map<string, import("./tipus.js").Municipi>} municipis
 * @property {"totes" | "properes"} ambit
 * @property {import("./tipus.js").Ubicacio | null} ubicacio
 * @property {number} radi En quilòmetres.
 * @property {"preu" | "dist"} ordre De la llista de benzineres properes.
 * @property {number} mostrades Benzineres properes que es mostren.
 * @property {Set<string>} excloses Marques que l'usuari ha tret amb el filtre.
 * @property {string[] | null} triades Marques dels gràfics; null fins que es decideixen.
 * @property {import("./tipus.js").DiaHistoric[]} historic
 * @property {import("./tipus.js").AnyHistoric[]} anual
 * @property {Record<string, string>} nomsAnual
 * @property {"preu" | "dif"} modeAnys
 * @property {string | null} diaDelsPreus Dia (aaaa-mm-dd) dels preus que es mostren.
 * @property {boolean} totesLesMarquesALaComparativa
 * @property {boolean} totesLesMarquesAlsGrafics
 * @property {boolean} movimentReduit
 */

export const MARQUES_VISIBLES_A_LA_COMPARATIVA = 20;
export const BENZINERES_PROPERES_PER_PAGINA = 10;

/** Preus de reserva (finals de setembre) si no es pot carregar res. */
const MARQUES_DE_RESERVA = [
  { id: "bonarea", nom: "bonÀrea", g95: 1.748, dsl: 1.742, data: "dada del 26-27 set." },
  { id: "esclatoil", nom: "Esclatoil", g95: 1.667, dsl: 1.683, data: "dada del 6 set." },
  { id: "petrocat", nom: "Petrocat", g95: 1.935, dsl: 1.952, data: "dada del 14 set." },
  { id: "repsol", nom: "Repsol", g95: 2.019, dsl: 2.017, data: "dada del 26 set." },
];

/**
 * @param {object} entorn
 * @param {boolean} entorn.movimentReduit
 * @param {Set<string>} entorn.excloses Marques excloses desades.
 * @returns {Estat}
 */
export function creaEstat({ movimentReduit, excloses }) {
  return {
    combustible: "g95",
    marques: MARQUES_DE_RESERVA.map((marca) => ({ ...marca, color: colorDe(marca.id) })),
    mitjana: null,
    base: null,
    estacions: null,
    municipis: new Map(),
    ambit: "totes",
    ubicacio: null,
    radi: 50,
    ordre: "preu",
    mostrades: BENZINERES_PROPERES_PER_PAGINA,
    excloses,
    triades: null,
    historic: [],
    anual: [],
    nomsAnual: {},
    modeAnys: "preu",
    diaDelsPreus: null,
    totesLesMarquesALaComparativa: false,
    totesLesMarquesAlsGrafics: false,
    movimentReduit,
  };
}

/**
 * @param {Estat} estat
 * @returns {boolean} Si les marques que es mostren són les de les benzineres properes.
 */
export const esProperes = (estat) =>
  estat.ambit === "properes" &&
  Boolean(estat.ubicacio && estat.estacions && estat.base) &&
  estat.marques !== estat.base?.marques;

/** @param {Estat} estat */
export const nomDeLaReferencia = (estat) => (esProperes(estat) ? "la zona" : "Catalunya");

/**
 * @param {Estat} estat
 * @param {Marca} marca
 * @returns {number} El preu del combustible triat (0 si no en té).
 */
export const preuDe = (estat, marca) => marca[estat.combustible] ?? 0;

/**
 * @param {Estat} estat
 * @returns {Marca[]} Les marques no excloses amb preu, de més barata a més cara.
 */
export const marquesOrdenades = (estat) =>
  estat.marques
    .filter((marca) => preuDe(estat, marca) > 0 && !estat.excloses.has(marca.id))
    .sort((a, b) => preuDe(estat, a) - preuDe(estat, b));

/**
 * @param {Estat} estat
 * @returns {Marca[]} Com marquesOrdenades, sense el grup d'independents.
 */
export const marquesReals = (estat) =>
  marquesOrdenades(estat).filter((marca) => marca.id !== ALTRES);

/** @param {Estat} estat */
export const textDelKicker = (estat) =>
  esProperes(estat)
    ? `Les quatre marques més barates a menys de ${estat.radi} km`
    : "Les quatre marques més barates";

/** @type {Readonly<Record<Combustible, string>>} */
export const NOM_DEL_COMBUSTIBLE = { g95: "Gasolina 95", dsl: "Dièsel" };
