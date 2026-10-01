/** Cerca de benzineres per marca, municipi o adreça. */

import { distancia } from "./geo.js";
import { normalitza } from "./marques.js";

/** @typedef {import("./tipus.js").Estacio} Estacio */
/** @typedef {import("./tipus.js").Combustible} Combustible */
/** @typedef {Estacio & {d: number | null}} EstacioTrobada Amb la distància, si se sap on és l'usuari. */

export const MAXIM_DE_RESULTATS = 8;

/**
 * Les benzineres que venen el combustible i on surten totes les paraules del text (a la marca,
 * al municipi o a l'adreça, sense tenir en compte accents ni majúscules). Si se sap on és
 * l'usuari, de la més propera a la més llunyana; si no, per municipi.
 *
 * @param {readonly Estacio[]} estacions
 * @param {string} text Sense text i sense ubicació no torna res.
 * @param {{combustible: Combustible, punt: {lat: number, lon: number} | null}} context
 * @returns {EstacioTrobada[]} Com a màxim MAXIM_DE_RESULTATS.
 */
export function buscaBenzineres(estacions, text, { combustible, punt }) {
  const paraules = normalitza(text).split(" ").filter(Boolean);
  if (!paraules.length && !punt) return [];
  const trobades = estacions
    .filter((e) => (e[combustible] ?? 0) > 0)
    .filter((e) => {
      const descripcio = normalitza(`${e.nom} ${e.mun} ${e.adr}`);
      return paraules.every((paraula) => descripcio.includes(paraula));
    })
    .map((e) => ({ ...e, d: punt ? distancia(punt, e) : null }));
  const ordre = punt
    ? (/** @type {EstacioTrobada} */ a, /** @type {EstacioTrobada} */ b) =>
        Number(a.d) - Number(b.d)
    : (/** @type {EstacioTrobada} */ a, /** @type {EstacioTrobada} */ b) =>
        a.mun.localeCompare(b.mun, "ca") || a.nom.localeCompare(b.nom, "ca");
  return trobades.sort(ordre).slice(0, MAXIM_DE_RESULTATS);
}
