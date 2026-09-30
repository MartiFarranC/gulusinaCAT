/** Utilitats petites per crear i trobar elements de la pàgina. */

export const SVG_NS = "http://www.w3.org/2000/svg";

export class ElementNoTrobatError extends Error {
  /** @param {string} descripcio */
  constructor(descripcio) {
    super(`La pàgina no té l'element ${descripcio}`);
    this.name = "ElementNoTrobatError";
  }
}

/**
 * @param {string} id
 * @returns {HTMLElement}
 * @throws {ElementNoTrobatError}
 */
export function perId(id) {
  const trobat = document.getElementById(id);
  if (!trobat) throw new ElementNoTrobatError(`#${id}`);
  return trobat;
}

/**
 * @template {Element} T
 * @param {string} id
 * @param {new () => T} tipus
 * @returns {T}
 * @throws {ElementNoTrobatError}
 */
export function perIdDeTipus(id, tipus) {
  const trobat = document.getElementById(id);
  if (!(trobat instanceof tipus)) throw new ElementNoTrobatError(`#${id} del tipus esperat`);
  return trobat;
}

/**
 * @param {ParentNode} pare
 * @param {string} selector
 * @returns {HTMLElement}
 * @throws {ElementNoTrobatError}
 */
export function dins(pare, selector) {
  const trobat = pare.querySelector(selector);
  if (!(trobat instanceof HTMLElement)) throw new ElementNoTrobatError(selector);
  return trobat;
}

/**
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} etiqueta
 * @param {string | null} [classe]
 * @param {string | number | null} [text]
 * @returns {HTMLElementTagNameMap[K]}
 */
export function element(etiqueta, classe = null, text = null) {
  const nou = document.createElement(etiqueta);
  if (classe) nou.className = classe;
  if (text !== null) nou.textContent = String(text);
  return nou;
}

/** @param {string} color */
export function puntDeColor(color) {
  const punt = element("i", "bd");
  punt.style.background = color;
  return punt;
}

/**
 * @param {string} etiqueta
 * @param {Record<string, string | number>} atributs
 * @param {Element} [pare]
 * @returns {SVGElement}
 */
export function elementSvg(etiqueta, atributs, pare) {
  const nou = /** @type {SVGElement} */ (document.createElementNS(SVG_NS, etiqueta));
  for (const [nom, valor] of Object.entries(atributs)) nou.setAttribute(nom, String(valor));
  pare?.appendChild(nou);
  return nou;
}

/**
 * @param {string} text
 * @param {string} adreca
 * @returns {HTMLAnchorElement} Un enllaç que s'obre en una pestanya nova.
 */
export function enllacExtern(text, adreca) {
  const enllac = element("a", null, text);
  enllac.href = adreca;
  enllac.target = "_blank";
  enllac.rel = "noopener";
  return enllac;
}

/**
 * @param {number | null} lat
 * @param {number | null} lon
 */
export const urlDelMapa = (lat, lon) =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;

/**
 * @param {number} lat
 * @param {number} lon
 */
export const urlDeLaRuta = (lat, lon) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;

/**
 * Marca quin botó d'un grup està premut.
 *
 * @param {Iterable<Element>} botons
 * @param {(boto: HTMLElement) => boolean} esPremut
 */
export function marcaPremut(botons, esPremut) {
  for (const boto of botons) {
    if (boto instanceof HTMLElement) boto.setAttribute("aria-pressed", String(esPremut(boto)));
  }
}
