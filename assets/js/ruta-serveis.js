/**
 * Serveis públics d'OpenStreetMap per a les rutes: OSRM per a la ruta en cotxe i Open-Meteo i
 * Nominatim per trobar els llocs i les adreces.
 */

import { RespostaInvalidaError, llegeixJson } from "./dades.js";

/** @typedef {{lat: number, lon: number}} Punt */

/**
 * @typedef {object} Lloc
 * @property {string} nom
 * @property {string} detall Comarca, país o la resta de l'adreça.
 * @property {number} lat
 * @property {number} lon
 *
 * @typedef {object} Ruta
 * @property {Punt[]} punts
 * @property {number} km
 * @property {number} minuts Sense trànsit.
 */

const URL_DE_LES_RUTES = "https://router.project-osrm.org/route/v1/driving/";
const URL_DELS_LLOCS = "https://geocoding-api.open-meteo.com/v1/search";
const URL_DE_LES_ADRECES = "https://nominatim.openstreetmap.org/search";
const TEMPS_DE_LA_RUTA_MS = 15000;
const TEMPS_DE_LA_CERCA_MS = 8000;
// Norma d'ús de Nominatim: com a màxim una petició per segon
const ESPERA_ENTRE_ADRECES_MS = 1100;
const MAXIM_DE_LLOCS = 6;
const PAISOS_DE_LES_ADRECES = "es,ad,fr";

/**
 * @param {unknown} valor
 * @returns {valor is Record<string, unknown>}
 */
const esObjecte = (valor) => typeof valor === "object" && valor !== null && !Array.isArray(valor);

/** @param {unknown} valor */
const esNombre = (valor) => typeof valor === "number" && Number.isFinite(valor);

/**
 * @param {unknown} json Resposta d'OSRM amb la geometria en GeoJSON.
 * @returns {Ruta}
 */
export function rutaDeLOsrm(json) {
  const ruta = esObjecte(json) && Array.isArray(json["routes"]) ? json["routes"][0] : null;
  const geometria = esObjecte(ruta) ? ruta["geometry"] : null;
  const coordenades = esObjecte(geometria) ? geometria["coordinates"] : null;
  if (!esObjecte(ruta) || !Array.isArray(coordenades) || !coordenades.length) {
    throw new RespostaInvalidaError("el servei de rutes");
  }
  const punts = coordenades
    .filter((c) => Array.isArray(c) && esNombre(c[0]) && esNombre(c[1]))
    .map(([lon, lat]) => ({ lat: Number(lat), lon: Number(lon) }));
  return {
    punts,
    km: Number(ruta["distance"] ?? 0) / 1000,
    minuts: Number(ruta["duration"] ?? 0) / 60,
  };
}

/**
 * @param {Record<string, unknown>} lloc
 * @returns {number} Més com més a prop de Catalunya i Andorra.
 */
const proximitat = (lloc) =>
  (lloc["admin1"] === "Catalunya" || lloc["admin1"] === "Catalonia" ? 3 : 0) +
  (lloc["country_code"] === "AD" ? 2 : 0) +
  (lloc["country_code"] === "ES" || lloc["country_code"] === "FR" ? 1 : 0);

/**
 * @param {unknown} json Resposta de la cerca de llocs d'Open-Meteo.
 * @returns {Lloc[]} Primer els de Catalunya i Andorra.
 */
export function llocsDeLOpenMeteo(json) {
  const resultats = esObjecte(json) && Array.isArray(json["results"]) ? json["results"] : [];
  return resultats
    .filter((r) => esObjecte(r) && esNombre(r["latitude"]) && esNombre(r["longitude"]))
    .map((r) => /** @type {Record<string, unknown>} */ (r))
    .sort((a, b) => proximitat(b) - proximitat(a))
    .slice(0, MAXIM_DE_LLOCS)
    .map((r) => ({
      nom: String(r["name"] ?? ""),
      detall: [
        r["admin2"] || r["admin3"],
        r["admin1"],
        r["country_code"] === "ES" ? "" : r["country"],
      ]
        .filter(Boolean)
        .join(", "),
      lat: Number(r["latitude"]),
      lon: Number(r["longitude"]),
    }));
}

/**
 * @param {unknown} json Resposta de la cerca de Nominatim (format jsonv2).
 * @returns {Lloc[]}
 */
export function llocsDeNominatim(json) {
  const resultats = Array.isArray(json) ? json : [];
  return resultats
    .filter((r) => esObjecte(r) && Number.isFinite(Number(r["lat"])) && r["display_name"])
    .slice(0, MAXIM_DE_LLOCS)
    .map((r) => {
      const parts = String(r["display_name"]).split(", ");
      return {
        nom: String(r["name"] || parts[0]),
        detall: parts.slice(1, 4).join(", "),
        lat: Number(r["lat"]),
        lon: Number(r["lon"]),
      };
    });
}

/**
 * @param {Punt} origen
 * @param {Punt} desti
 * @returns {Promise<Ruta>} La ruta més ràpida en cotxe.
 */
export async function calculaRuta(origen, desti) {
  const punts = `${origen.lon},${origen.lat};${desti.lon},${desti.lat}`;
  const adreca = `${URL_DE_LES_RUTES}${punts}?overview=full&geometries=geojson`;
  return rutaDeLOsrm(await llegeixJson(adreca, TEMPS_DE_LA_RUTA_MS));
}

/** Troba pobles i llocs pel nom i, si no n'hi ha cap, adreces. */
export class ServeiDeLlocs {
  /** Moment de l'última petició a Nominatim, per no passar del límit. */
  #ultimaAdreca = 0;

  /**
   * @param {string} text
   * @returns {Promise<Lloc[]>}
   */
  async busca(text) {
    const consulta = new URLSearchParams({ name: text, count: "10", language: "ca" });
    const llocs = llocsDeLOpenMeteo(
      await llegeixJson(`${URL_DELS_LLOCS}?${consulta}`, TEMPS_DE_LA_CERCA_MS),
    );
    return llocs.length ? llocs : this.buscaAdreces(text);
  }

  /**
   * @param {string} text
   * @returns {Promise<Lloc[]>}
   */
  async buscaAdreces(text) {
    const espera = this.#ultimaAdreca + ESPERA_ENTRE_ADRECES_MS - Date.now();
    if (espera > 0) await new Promise((fet) => setTimeout(fet, espera));
    this.#ultimaAdreca = Date.now();
    const consulta = new URLSearchParams({
      q: text,
      format: "jsonv2",
      limit: String(MAXIM_DE_LLOCS),
      countrycodes: PAISOS_DE_LES_ADRECES,
      "accept-language": "ca",
    });
    return llocsDeNominatim(
      await llegeixJson(`${URL_DE_LES_ADRECES}?${consulta}`, TEMPS_DE_LA_CERCA_MS),
    );
  }
}
