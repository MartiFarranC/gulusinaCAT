/** Creu i tooltip dels gràfics de línies, amb el ratolí, el dit o les fletxes del teclat. */

import { element, elementSvg } from "./dom.js";
import { formataPreu } from "./format.js";
import { valorDe } from "./grafic-calculs.js";

/** @typedef {import("./grafic.js").OpcionsDelGrafic} OpcionsDelGrafic */
/** @typedef {import("./grafic.js").PuntDelGrafic} PuntDelGrafic */
/** @typedef {import("./grafic.js").Serie} Serie */
/** @typedef {import("./grafic.js").Mides} Mides */

/** Color del fons dels gràfics, per a la vora dels punts. */
export const COLOR_DEL_FONS = "#0b0b0b";
/** @type {Readonly<Record<string, number>>} */
const PAS_DE_LA_TECLA = { ArrowLeft: -1, ArrowRight: 1 };

/**
 * @param {OpcionsDelGrafic} o
 * @param {PuntDelGrafic} punt
 */
function ompleElTooltip(o, punt) {
  const formata = o.formataValor ?? formataPreu;
  o.tooltip.replaceChildren(element("div", "d", punt.capcalera));
  const ambValor = o.series.filter((s) => valorDe(punt, s) !== null);
  const valor = (/** @type {Serie} */ s) => /** @type {number} */ (valorDe(punt, s));
  for (const serie of ambValor.sort((a, b) => valor(a) - valor(b))) {
    const color = element("span", serie.discontinua ? "k kd" : "k");
    color.style.background = serie.color;
    const fila = element("div", "r");
    fila.append(color, element("b", null, formata(valor(serie))), element("span", null, serie.nom));
    o.tooltip.appendChild(fila);
  }
}

/**
 * @typedef {object} Cursor Creu vertical i un punt per sèrie que segueixen el punter.
 * @property {SVGElement} creu
 * @property {SVGElement[]} punts
 */

/**
 * @param {OpcionsDelGrafic} o
 * @param {Mides} m
 * @returns {Cursor}
 */
function creaCursor(o, m) {
  const oculta = { visibility: "hidden" };
  const linia = { y1: m.marge.dalt, y2: m.alt - m.marge.baix, class: "cross" };
  return {
    creu: elementSvg("line", { ...linia, ...oculta }, o.svg),
    punts: o.series.map((serie) => {
      const punt = { r: 4.5, fill: serie.color, stroke: COLOR_DEL_FONS, "stroke-width": 2 };
      return elementSvg("circle", { ...punt, ...oculta }, o.svg);
    }),
  };
}

/**
 * @param {OpcionsDelGrafic} o
 * @param {Mides} m
 * @param {Cursor} cursor
 * @param {number} i
 */
function mostraElPunt(o, m, cursor, i) {
  const punt = /** @type {PuntDelGrafic} */ (o.punts[i]);
  const x = String(m.x(i));
  cursor.creu.setAttribute("x1", x);
  cursor.creu.setAttribute("x2", x);
  cursor.creu.setAttribute("visibility", "visible");
  o.series.forEach((serie, s) => {
    const valor = valorDe(punt, serie);
    const cercle = /** @type {SVGElement} */ (cursor.punts[s]);
    cercle.setAttribute("visibility", valor === null ? "hidden" : "visible");
    if (valor === null) return;
    cercle.setAttribute("cx", x);
    cercle.setAttribute("cy", String(m.y(valor)));
  });
  ompleElTooltip(o, punt);
  o.tooltip.hidden = false;
  const ampleDelContenidor = /** @type {HTMLElement} */ (o.svg.parentNode).clientWidth;
  const px = m.x(i) * (o.svg.getBoundingClientRect().width / m.ample) + 6;
  const ample = o.tooltip.offsetWidth;
  const esquerra = px + 12 + ample < ampleDelContenidor ? px + 12 : px - 12 - ample;
  o.tooltip.style.left = `${Math.max(4, Math.min(ampleDelContenidor - ample - 4, esquerra))}px`;
}

/**
 * @param {OpcionsDelGrafic} o
 * @param {Cursor} cursor
 */
function amagaElPunt(o, cursor) {
  cursor.creu.setAttribute("visibility", "hidden");
  for (const punt of cursor.punts) punt.setAttribute("visibility", "hidden");
  o.tooltip.hidden = true;
}

/**
 * @param {OpcionsDelGrafic} o
 * @param {Mides} m
 * @param {PointerEvent} esdeveniment
 * @returns {number} El punt més proper al punter.
 */
function indexDelPunter(o, m, esdeveniment) {
  const caixa = o.svg.getBoundingClientRect();
  const x = ((esdeveniment.clientX - caixa.left) * m.ample) / caixa.width;
  const ultim = o.punts.length - 1;
  const pas = (m.ample - m.marge.esquerra - m.marge.dreta) / ultim;
  return Math.max(0, Math.min(ultim, Math.round((x - m.marge.esquerra) / pas)));
}

/**
 * Creu i tooltip amb el ratolí, el dit o les fletxes del teclat.
 *
 * @param {OpcionsDelGrafic} o
 * @param {Mides} m
 */
export function activaElTooltip(o, m) {
  const { svg } = o;
  const ultim = o.punts.length - 1;
  const cursor = creaCursor(o, m);
  /** @type {number | null} */
  let actual = null;
  const mostra = (/** @type {number} */ i) => {
    actual = i;
    mostraElPunt(o, m, cursor, i);
  };
  const amaga = () => {
    actual = null;
    amagaElPunt(o, cursor);
  };
  svg.onpointermove = (e) => mostra(indexDelPunter(o, m, e));
  svg.onpointerdown = (e) => {
    svg.classList.remove("kb");
    mostra(indexDelPunter(o, m, e));
  };
  svg.onpointerleave = (e) => e.pointerType === "mouse" && amaga();
  svg.onblur = amaga;
  svg.onfocus = () => mostra(actual ?? ultim);
  svg.onkeydown = (e) => {
    svg.classList.add("kb");
    if (e.key === "Escape") amaga();
    const pas = PAS_DE_LA_TECLA[e.key];
    if (pas === undefined) return;
    e.preventDefault();
    mostra(Math.max(0, Math.min(ultim, (actual ?? ultim) + pas)));
  };
}
