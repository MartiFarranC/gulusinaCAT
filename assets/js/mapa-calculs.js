/** Càlculs del mapa que no depenen del navegador. */

import { desprojecta, projecta, vistaQueEncaixa } from "./geo.js";

const ZOOM_MINIM = 6;
const ZOOM_MAXIM = 17;
const MAXIM_D_ETIQUETES = 10;
const MARGE_FORA_DEL_MAPA_PX = 40;
const MIG_AMPLE_ETIQUETA_PX = 30;
const ALT_ETIQUETA_PX = 34;

/**
 * @typedef {object} Caixa
 * @property {number} esquerra
 * @property {number} dreta
 * @property {number} dalt
 * @property {number} baix
 */

/**
 * @param {Caixa} a
 * @param {Caixa} b
 */
const esTrepitgen = (a, b) =>
  a.esquerra < b.dreta && a.dreta > b.esquerra && a.dalt < b.baix && a.baix > b.dalt;

/**
 * Tria quines benzineres porten l'etiqueta del preu: les deu més barates que es veuen, llevat de
 * les que trepitjarien l'etiqueta d'una de més barata (aquestes es queden com a punt).
 *
 * @template T
 * @param {readonly T[]} ordenades De més barata a més cara.
 * @param {(element: T) => [number, number]} posicio Píxels dins del mapa.
 * @param {{ample: number, alt: number}} mapa
 * @returns {T[]}
 */
export function triaEtiquetes(ordenades, posicio, { ample, alt }) {
  const marge = MARGE_FORA_DEL_MAPA_PX;
  /** @type {Caixa[]} */
  const caixes = [];
  /** @type {T[]} */
  const triades = [];
  let candidates = 0;
  for (const element of ordenades) {
    const [x, y] = posicio(element);
    if (x < -marge || y < -marge || x > ample + marge || y > alt + marge) continue;
    if (++candidates > MAXIM_D_ETIQUETES) break;
    const caixa = {
      esquerra: x - MIG_AMPLE_ETIQUETA_PX,
      dreta: x + MIG_AMPLE_ETIQUETA_PX,
      dalt: y - ALT_ETIQUETA_PX,
      baix: y,
    };
    if (caixes.some((altra) => esTrepitgen(caixa, altra))) continue;
    caixes.push(caixa);
    triades.push(element);
  }
  return triades;
}

/**
 * @param {number} x
 * @param {number} y
 * @param {{ample: number, alt: number}} mapa
 * @param {number} marge
 */
export const esDinsDelMapa = (x, y, { ample, alt }, marge) =>
  x > -marge && y > -marge && x < ample + marge && y < alt + marge;

/**
 * @param {number} zoom
 * @returns {number} El zoom dins dels nivells que tenen rajoles.
 */
export const limitaElZoom = (zoom) => Math.max(ZOOM_MINIM, Math.min(ZOOM_MAXIM, zoom));

/**
 * @param {number} zoom
 * @returns {number} El nivell enter de les rajoles que es fan servir per a aquest zoom.
 */
export const zoomDeLesRajoles = (zoom) => Math.min(ZOOM_MAXIM, Math.round(zoom));

/**
 * @typedef {object} Rectangle En píxels dins del mapa.
 * @property {number} esquerra
 * @property {number} dalt
 * @property {number} ample
 * @property {number} alt
 */

/**
 * La vista que encaixa els punts a la part del mapa que no queda tapada (per un panell).
 *
 * @param {readonly {lat: number, lon: number}[]} punts Almenys un punt.
 * @param {{ample: number, alt: number}} mapa
 * @param {Rectangle} lliure
 * @returns {{zoom: number, centre: {lat: number, lon: number}}}
 */
export function vistaALaZonaLliure(punts, mapa, lliure) {
  const vista = vistaQueEncaixa(punts, lliure.ample, lliure.alt);
  const zoom = limitaElZoom(vista.zoom);
  const centre = projecta(vista.centre.lat, vista.centre.lon, zoom);
  const desplacamentX = lliure.esquerra + lliure.ample / 2 - mapa.ample / 2;
  const desplacamentY = lliure.dalt + lliure.alt / 2 - mapa.alt / 2;
  return { zoom, centre: desprojecta(centre.x - desplacamentX, centre.y - desplacamentY, zoom) };
}
