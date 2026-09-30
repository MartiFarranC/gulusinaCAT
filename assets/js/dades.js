/** Lectura de les dades: el Ministeri en directe i els fitxers que actualitza GitHub Actions. */

import { resumeixElMinisteri, URL_DEL_MINISTERI } from "./ministeri.js";

/** @typedef {import("./tipus.js").DiaHistoric} DiaHistoric */
/** @typedef {import("./tipus.js").AnyHistoric} AnyHistoric */
/** @typedef {import("./tipus.js").Mitjana} Mitjana */
/** @typedef {import("./ministeri.js").ResumDeMarca} ResumDeMarca */
/** @typedef {import("./ministeri.js").DocumentEstacions} DocumentEstacions */

/**
 * @typedef {object} PreusLlegits
 * @property {Record<string, Partial<ResumDeMarca>>} marques
 * @property {Partial<Mitjana> | null} catalunya
 * @property {string} fecha Data del Ministeri.
 */

const TEMPS_DEL_MINISTERI_MS = 10000;
const TEMPS_DE_LES_ESTACIONS_MS = 10000;
const TEMPS_DELS_FITXERS_MS = 8000;

export class RespostaInvalidaError extends Error {
  /** @param {string} origen */
  constructor(origen) {
    super(`La resposta de ${origen} no té el format esperat`);
    this.name = "RespostaInvalidaError";
  }
}

/**
 * @param {unknown} valor
 * @returns {valor is Record<string, unknown>}
 */
const esObjecte = (valor) => typeof valor === "object" && valor !== null && !Array.isArray(valor);

/**
 * @param {string} adreca
 * @param {number} temps Mil·lisegons abans d'abandonar.
 * @returns {Promise<unknown>}
 */
async function llegeixJson(adreca, temps) {
  const control = new AbortController();
  const rellotge = setTimeout(() => control.abort(), temps);
  try {
    const resposta = await fetch(adreca, { signal: control.signal, cache: "no-store" });
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status} a ${adreca}`);
    return await resposta.json();
  } finally {
    clearTimeout(rellotge);
  }
}

/**
 * Evita la memòria cau del navegador i de GitHub Pages.
 *
 * @param {string} fitxer
 */
const senseCau = (fitxer) => `${fitxer}?${Date.now()}`;

/**
 * Preus en directe. Falla si el navegador no pot llegir el Ministeri (no envia capçaleres CORS).
 *
 * @returns {Promise<PreusLlegits & {estacions: DocumentEstacions}>}
 */
export async function llegeixElMinisteri() {
  const resposta = await llegeixJson(URL_DEL_MINISTERI, TEMPS_DEL_MINISTERI_MS);
  if (!esObjecte(resposta)) throw new RespostaInvalidaError("el Ministeri");
  const llista = Array.isArray(resposta["ListaEESSPrecio"]) ? resposta["ListaEESSPrecio"] : [];
  const resum = resumeixElMinisteri(llista.filter(esObjecte));
  return { ...resum, fecha: String(resposta["Fecha"] || "") };
}

/** @returns {Promise<PreusLlegits>} La còpia de preus.json. */
export async function llegeixLaCopia() {
  const copia = await llegeixJson(senseCau("preus.json"), TEMPS_DELS_FITXERS_MS);
  if (!esObjecte(copia)) throw new RespostaInvalidaError("preus.json");
  return {
    marques: esObjecte(copia["marques"])
      ? /** @type {PreusLlegits["marques"]} */ (copia["marques"])
      : {},
    catalunya: esObjecte(copia["catalunya"]) ? copia["catalunya"] : null,
    fecha: String(copia["fecha"] || ""),
  };
}

/**
 * Les dades opcionals (estacions, històrics) que no hi són es tracten com a buides: la pàgina
 * funciona sense.
 *
 * @template T
 * @param {string} fitxer
 * @param {number} temps
 * @param {(json: Record<string, unknown>) => T} llegeix
 * @returns {Promise<T | null>}
 */
async function llegeixOpcional(fitxer, temps, llegeix) {
  try {
    const json = await llegeixJson(senseCau(fitxer), temps);
    return esObjecte(json) ? llegeix(json) : null;
  } catch {
    return null;
  }
}

/** @returns {Promise<DocumentEstacions | null>} */
export const llegeixLesEstacions = () =>
  llegeixOpcional("estacions.json", TEMPS_DE_LES_ESTACIONS_MS, (json) =>
    Array.isArray(json["e"])
      ? /** @type {DocumentEstacions} */ (/** @type {unknown} */ (json))
      : null,
  );

/** @returns {Promise<DiaHistoric[]>} Ordenat per data. */
export async function llegeixLHistoric() {
  const dies = await llegeixOpcional("historic.json", TEMPS_DELS_FITXERS_MS, (json) =>
    (Array.isArray(json["dies"]) ? json["dies"] : [])
      .filter(
        (d) =>
          esObjecte(d) && /^\d{4}-\d{2}-\d{2}$/.test(String(d["data"])) && esObjecte(d["marques"]),
      )
      .map((d) => /** @type {DiaHistoric} */ (d))
      .sort((a, b) => (a.data < b.data ? -1 : 1)),
  );
  return dies ?? [];
}

/**
 * @param {Record<string, unknown>} any
 * @returns {AnyHistoric}
 */
function anyHistoric(any) {
  const { any: numero, mesos, ...preus } = any;
  return {
    any: /** @type {number} */ (numero),
    mesos: Number(mesos),
    preus: /** @type {AnyHistoric["preus"]} */ (preus),
  };
}

/** @returns {Promise<{anys: AnyHistoric[], noms: Record<string, string>}>} */
export async function llegeixLAnual() {
  const anual = await llegeixOpcional("anual.json", TEMPS_DELS_FITXERS_MS, (json) => ({
    anys: (Array.isArray(json["anys"]) ? json["anys"] : [])
      .filter((a) => esObjecte(a) && Number.isInteger(a["any"]))
      .map(anyHistoric)
      .sort((a, b) => a.any - b.any),
    noms: esObjecte(json["noms"]) ? /** @type {Record<string, string>} */ (json["noms"]) : {},
  }));
  return anual ?? { anys: [], noms: {} };
}
