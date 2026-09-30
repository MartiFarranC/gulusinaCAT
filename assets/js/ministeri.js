/**
 * Resum dels preus que publica el Ministeri, amb el mateix càlcul que el paquet gulusinacat:
 * marques, mitjana, franja del 10 al 90 % i benzinera més barata.
 */

import { mitjana, percentil, elMesPetit } from "./estadistica.js";
import { esDinsDeCatalunya } from "./geo.js";
import { classificaRotuls, nomLlegible } from "./marques.js";

/** @typedef {import("./tipus.js").Combustible} Combustible */
/** @typedef {import("./tipus.js").EstacioMesBarata} EstacioMesBarata */
/** @typedef {Record<string, unknown>} RegistreDelMinisteri */

/**
 * @typedef {object} ResumDeMarca
 * @property {string} nom
 * @property {number | null} g95
 * @property {number | null} dsl
 * @property {number} n
 * @property {Partial<Record<Combustible, [number, number]>>} rang
 * @property {Partial<Record<Combustible, EstacioMesBarata>>} barata
 *
 * @typedef {[string, number | null, number | null, number | null, number | null, string, string]} FilaEstacio
 * Marca, latitud, longitud, preus de gasolina 95 i dièsel, municipi i adreça.
 *
 * @typedef {object} DocumentEstacions
 * @property {Record<string, string>} marques
 * @property {FilaEstacio[]} e
 *
 * @typedef {object} ResumDelMinisteri
 * @property {Record<string, ResumDeMarca>} marques
 * @property {import("./tipus.js").Mitjana} catalunya
 * @property {DocumentEstacions} estacions
 */

export const URL_DEL_MINISTERI =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroCCAA/09";

/** @type {Readonly<Record<Combustible, string>>} */
const CAMPS_DE_PREU = { g95: "Precio Gasolina 95 E5", dsl: "Precio Gasoleo A" };
/** @type {readonly Combustible[]} */
const COMBUSTIBLES = ["g95", "dsl"];
const QUANTIL_BAIX = 0.1;
const QUANTIL_ALT = 0.9;

/**
 * @param {unknown} valor Número amb coma decimal.
 * @returns {number | null}
 */
const llegeixNumero = (valor) => {
  const numero = parseFloat(String(valor ?? "").replace(",", "."));
  return Number.isFinite(numero) ? numero : null;
};

/** @param {unknown} valor */
const llegeixPreu = (valor) => {
  const preu = parseFloat(String(valor || "").replace(",", "."));
  return preu > 0 ? preu : null;
};

/** @param {unknown} valor */
const llegeixText = (valor) => String(valor || "").trim();

/**
 * @param {RegistreDelMinisteri} registre
 * @param {Combustible} combustible
 */
const preuDe = (registre, combustible) => llegeixPreu(registre[CAMPS_DE_PREU[combustible]]);

/**
 * @param {Array<[number, RegistreDelMinisteri]>} preus Preu i registre de cada benzinera.
 * @returns {EstacioMesBarata}
 */
function mesBarata(preus) {
  const [preu, registre] = elMesPetit(preus, ([valor]) => valor);
  return {
    preu,
    municipi: llegeixText(registre["Municipio"]),
    lat: llegeixNumero(registre["Latitud"]),
    lon: llegeixNumero(registre["Longitud (WGS84)"]),
  };
}

/**
 * @param {string} nom
 * @param {Record<Combustible, Array<[number, RegistreDelMinisteri]>>} preus
 * @returns {ResumDeMarca}
 */
function resumDeMarca(nom, preus) {
  /** @type {ResumDeMarca} */
  const resum = { nom, g95: null, dsl: null, n: 0, rang: {}, barata: {} };
  for (const combustible of COMBUSTIBLES) {
    const valors = preus[combustible].map(([valor]) => valor);
    resum[combustible] = mitjana(valors);
    if (!valors.length) continue;
    resum.rang[combustible] = [percentil(valors, QUANTIL_BAIX), percentil(valors, QUANTIL_ALT)];
    resum.barata[combustible] = mesBarata(preus[combustible]);
  }
  resum.n = Math.max(preus.g95.length, preus.dsl.length);
  return resum;
}

/**
 * @param {string} id
 * @param {RegistreDelMinisteri} registre
 * @returns {FilaEstacio}
 */
const filaEstacio = (id, registre) => [
  id,
  llegeixNumero(registre["Latitud"]),
  llegeixNumero(registre["Longitud (WGS84)"]),
  preuDe(registre, "g95"),
  preuDe(registre, "dsl"),
  llegeixText(registre["Municipio"]),
  nomLlegible(llegeixText(registre["Dirección"])),
];

/**
 * @param {readonly RegistreDelMinisteri[]} registres
 * @param {readonly string[]} ids Marca de cada registre.
 */
function agrupaElsPreus(registres, ids) {
  /** @type {Map<string, Record<Combustible, Array<[number, RegistreDelMinisteri]>>>} */
  const perMarca = new Map();
  /** @type {Record<Combustible, number[]>} */
  const tots = { g95: [], dsl: [] };
  registres.forEach((registre, i) => {
    const id = /** @type {string} */ (ids[i]);
    const preus = perMarca.get(id) ?? { g95: [], dsl: [] };
    perMarca.set(id, preus);
    for (const combustible of COMBUSTIBLES) {
      const preu = preuDe(registre, combustible);
      if (preu === null) continue;
      tots[combustible].push(preu);
      preus[combustible].push([preu, registre]);
    }
  });
  return { perMarca, tots };
}

/**
 * @param {readonly RegistreDelMinisteri[]} registres
 * @returns {ResumDelMinisteri}
 */
export function resumeixElMinisteri(registres) {
  const { ids, noms } = classificaRotuls(registres.map((r) => String(r["Rótulo"] || "")));
  const { perMarca, tots } = agrupaElsPreus(registres, ids);
  const nomDe = (/** @type {string} */ id) => noms[id] || id;
  return {
    marques: Object.fromEntries([...perMarca].map(([id, p]) => [id, resumDeMarca(nomDe(id), p)])),
    catalunya: {
      g95: mitjana(tots.g95),
      dsl: mitjana(tots.dsl),
      n: Math.max(tots.g95.length, tots.dsl.length),
    },
    estacions: {
      marques: Object.fromEntries([...perMarca.keys()].map((id) => [id, nomDe(id)])),
      e: registres
        .map((registre, i) => filaEstacio(/** @type {string} */ (ids[i]), registre))
        .filter(([, lat, lon, g95, dsl]) => esDinsDeCatalunya(lat, lon) && (g95 || dsl)),
    },
  };
}
