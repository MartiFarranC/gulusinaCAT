/** La més barata de la ruta i la llista de totes les benzineres que hi queden a prop. */

import { element, enllacExtern, puntDeColor, urlDeLaRutaAmbParada } from "./dom.js";
import { formataDistancia, formataPreu } from "./format.js";
import { colorDe } from "./marques.js";

/** @typedef {import("./tipus.js").Estacio} Estacio */
/** @typedef {import("./ruta-calculs.js").BenzineraDeLaRuta} BenzineraDeLaRuta */
/** @typedef {{lat: number, lon: number}} Punt */

const BENZINERES_VISIBLES = 15;
/** Per sota d'aquesta distància, la benzinera és a la mateixa carretera. */
const A_TOCAR_KM = 0.1;

/** @param {Estacio} estacio */
const llocDe = (estacio) => [estacio.mun, estacio.adr].filter(Boolean).join(" · ");

/** @param {BenzineraDeLaRuta} trobada */
const onEs = ({ km, desviacio }) =>
  `Al km ${Math.round(km)}, ${desviacio < A_TOCAR_KM ? "a tocar" : `a ${formataDistancia(desviacio)}`} de la ruta`;

/** @param {Estacio} estacio */
function nomAmbColor(estacio) {
  const nom = element("b");
  nom.append(puntDeColor(colorDe(estacio.m)), estacio.nom);
  return nom;
}

/**
 * @param {BenzineraDeLaRuta} barata
 * @param {{origen: Punt, desti: Punt, preu: (estacio: Estacio) => number}} context
 * @returns {HTMLElement[]}
 */
export function resumDeLaMesBarata(barata, { origen, desti, preu }) {
  const { estacio } = barata;
  const preuDeLaBarata = element("p", "diposit-euros", "La més barata de la ruta");
  preuDeLaBarata.append(element("strong", null, `${formataPreu(preu(estacio))} €/L`));
  const detall = element("p", "diposit-detall");
  const ruta = enllacExtern("Ruta amb parada ↗", urlDeLaRutaAmbParada(origen, desti, estacio));
  ruta.setAttribute("aria-label", `Ruta amb parada a ${estacio.nom} de ${estacio.mun}`);
  detall.append(nomAmbColor(estacio), ` · ${llocDe(estacio)}. ${onEs(barata)}. `, ruta);
  return [preuDeLaBarata, detall];
}

/**
 * @param {BenzineraDeLaRuta} trobada
 * @param {number} preu
 * @param {boolean} esLaMesBarata
 */
function elementDeLaLlista(trobada, preu, esLaMesBarata) {
  const { estacio } = trobada;
  const item = element("li", esLaMesBarata ? "sti best" : "sti");
  const dades = element("div", "stm");
  const situacio = element("span", "ruta-situacio", onEs(trobada));
  dades.append(nomAmbColor(estacio), element("span", null, llocDe(estacio)), situacio);
  item.append(element("span", "stp", formataPreu(preu)), dades);
  return item;
}

/**
 * @param {HTMLElement} llista
 * @param {HTMLElement} boto Per mostrar-les totes.
 * @param {object} contingut
 * @param {readonly BenzineraDeLaRuta[]} contingut.trobades En l'ordre del trajecte.
 * @param {BenzineraDeLaRuta | null} contingut.barata
 * @param {boolean} contingut.totes
 * @param {(estacio: Estacio) => number} contingut.preu
 */
export function pintaLaLlistaDeLaRuta(llista, boto, { trobades, barata, totes, preu }) {
  const visibles = totes ? trobades : trobades.slice(0, BENZINERES_VISIBLES);
  llista.replaceChildren(
    ...visibles.map((t) => elementDeLaLlista(t, preu(t.estacio), t === barata)),
  );
  boto.hidden = visibles.length === trobades.length;
  boto.textContent = `Mostra-les totes (${trobades.length})`;
}
