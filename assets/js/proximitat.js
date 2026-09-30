/** Benzineres i municipis a prop d'una ubicació. */

import { elMesPetit, mitjana, percentil } from "./estadistica.js";
import { distancia, esDinsDeCatalunya } from "./geo.js";
import { colorDe, NOMS, normalitza } from "./marques.js";

/** @typedef {import("./tipus.js").Combustible} Combustible */
/** @typedef {import("./tipus.js").Estacio} Estacio */
/** @typedef {import("./tipus.js").EstacioAmbDistancia} EstacioAmbDistancia */
/** @typedef {import("./tipus.js").Marca} Marca */
/** @typedef {import("./tipus.js").Mitjana} Mitjana */
/** @typedef {import("./tipus.js").Municipi} Municipi */
/** @typedef {import("./ministeri.js").DocumentEstacions} DocumentEstacions */

/** @type {readonly Combustible[]} */
const COMBUSTIBLES = ["g95", "dsl"];
const DISTANCIA_PER_SER_AL_MUNICIPI_KM = 3;

/**
 * @param {DocumentEstacions} document Fitxer estacions.json o el resum del Ministeri.
 * @returns {Estacio[]} Les benzineres amb coordenades dins de Catalunya.
 */
export function llegeixEstacions(document) {
  const noms = document.marques ?? {};
  return document.e
    .map(([m, lat, lon, g95, dsl, mun, adr]) => ({
      m,
      nom: noms[m] || NOMS[m] || m,
      lat: /** @type {number} */ (lat),
      lon: /** @type {number} */ (lon),
      g95: g95 || null,
      dsl: dsl || null,
      mun: mun || "",
      adr: adr || "",
    }))
    .filter((estacio) => esDinsDeCatalunya(estacio.lat, estacio.lon));
}

/**
 * @param {readonly Estacio[]} estacions
 * @returns {Map<string, Municipi>} Cada municipi, amb el centre de les seves benzineres, per nom
 *   normalitzat.
 */
export function municipisDe(estacions) {
  /** @type {Map<string, {nom: string, lat: number, lon: number, n: number}>} */
  const sumes = new Map();
  for (const estacio of estacions) {
    if (!estacio.mun) continue;
    const clau = normalitza(estacio.mun);
    const suma = sumes.get(clau) ?? { nom: estacio.mun, lat: 0, lon: 0, n: 0 };
    suma.lat += estacio.lat;
    suma.lon += estacio.lon;
    suma.n++;
    sumes.set(clau, suma);
  }
  return new Map(
    [...sumes].map(([clau, s]) => [clau, { nom: s.nom, lat: s.lat / s.n, lon: s.lon / s.n }]),
  );
}

/**
 * @param {string} text El que ha escrit l'usuari.
 * @param {ReadonlyMap<string, Municipi>} municipis
 * @returns {Municipi | null} El municipi amb aquest nom o l'únic que comença així.
 */
export function buscaMunicipi(text, municipis) {
  const clau = normalitza(text);
  const exacte = municipis.get(clau);
  if (exacte) return exacte;
  const candidats = [...municipis].filter(([nom]) => nom.startsWith(clau));
  return candidats.length === 1 ? (candidats[0]?.[1] ?? null) : null;
}

/**
 * @param {{lat: number, lon: number}} punt
 * @param {ReadonlyMap<string, Municipi>} municipis
 * @returns {{nom: string, d: number} | null} El municipi amb benzinera més proper i la distància.
 */
export function municipiMesProper(punt, municipis) {
  if (!municipis.size) return null;
  const mes = elMesPetit([...municipis.values()], (m) => distancia(punt, m));
  return { nom: mes.nom, d: distancia(punt, mes) };
}

/**
 * @param {{nom: string, d: number} | null} municipi El més proper a la ubicació del GPS.
 * @returns {string} Com es fa referència a la ubicació del GPS als textos.
 */
export function nomDeLaUbicacio(municipi) {
  if (!municipi) return "la teva ubicació";
  return municipi.d < DISTANCIA_PER_SER_AL_MUNICIPI_KM
    ? `la teva ubicació (${municipi.nom})`
    : `la teva ubicació (a prop de ${municipi.nom})`;
}

/**
 * @param {readonly Estacio[]} estacions
 * @param {{lat: number, lon: number}} centre
 * @param {number} radiKm
 * @returns {EstacioAmbDistancia[]}
 */
export function estacionsDinsDelRadi(estacions, centre, radiKm) {
  return estacions
    .map((estacio) => ({ ...estacio, d: distancia(centre, estacio) }))
    .filter((estacio) => estacio.d <= radiKm);
}

/**
 * @param {string} id
 * @param {{nom: string, g95: Estacio[], dsl: Estacio[]}} grup
 * @param {number} radiKm
 * @returns {Marca}
 */
function marcaDelGrup(id, grup, radiKm) {
  const n = Math.max(grup.g95.length, grup.dsl.length);
  /** @type {Marca & {rang: object, barata: object}} */
  const marca = {
    id,
    nom: grup.nom,
    color: colorDe(id),
    g95: null,
    dsl: null,
    n,
    rang: {},
    barata: {},
    data: "",
  };
  for (const combustible of COMBUSTIBLES) {
    const preu = (/** @type {Estacio} */ e) => /** @type {number} */ (e[combustible]);
    const valors = grup[combustible].map(preu);
    marca[combustible] = mitjana(valors);
    if (!valors.length) continue;
    marca.rang[combustible] = [percentil(valors, 0.1), percentil(valors, 0.9)];
    const barata = elMesPetit(grup[combustible], preu);
    marca.barata[combustible] = {
      preu: preu(barata),
      municipi: barata.mun,
      lat: barata.lat,
      lon: barata.lon,
    };
  }
  marca.data = `${n} a menys de ${radiKm} km`;
  return marca;
}

/**
 * Mitjanes per marca de les benzineres de dins del radi, en el mateix format que les de tot
 * Catalunya.
 *
 * @param {readonly Estacio[]} estacions
 * @param {number} radiKm
 * @returns {{marques: Marca[], mitjana: Mitjana}}
 */
export function agregaPerMarca(estacions, radiKm) {
  /** @type {Map<string, {nom: string, g95: Estacio[], dsl: Estacio[]}>} */
  const grups = new Map();
  /** @type {Record<Combustible, number[]>} */
  const tots = { g95: [], dsl: [] };
  for (const estacio of estacions) {
    const grup = grups.get(estacio.m) ?? { nom: estacio.nom, g95: [], dsl: [] };
    grups.set(estacio.m, grup);
    for (const combustible of COMBUSTIBLES) {
      const preu = estacio[combustible];
      if (!preu) continue;
      grup[combustible].push(estacio);
      tots[combustible].push(preu);
    }
  }
  return {
    marques: [...grups].map(([id, grup]) => marcaDelGrup(id, grup, radiKm)),
    mitjana: { g95: mitjana(tots.g95), dsl: mitjana(tots.dsl), n: estacions.length },
  };
}
