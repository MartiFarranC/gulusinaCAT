/** Gràfic de línies en SVG amb etiquetes al final, creu, tooltip i taula de dades. */

import { element, elementSvg } from "./dom.js";
import { formataPreu } from "./format.js";
import { eixRodo, separaEtiquetes, valorDe } from "./grafic-calculs.js";
import { COLOR_DEL_FONS, activaElTooltip } from "./grafic-tooltip.js";

/**
 * @typedef {object} Serie
 * @property {string} id
 * @property {string} nom
 * @property {string} color
 * @property {boolean} [discontinua]
 *
 * @typedef {object} PuntDelGrafic
 * @property {string} eix Text a l'eix horitzontal.
 * @property {string} capcalera Títol del tooltip.
 * @property {string} fila Primera columna de la taula.
 * @property {Record<string, number | null>} valors Valor de cada sèrie.
 *
 * @typedef {object} OpcionsDelGrafic
 * @property {SVGSVGElement} svg
 * @property {HTMLElement} tooltip
 * @property {HTMLTableElement} taula
 * @property {PuntDelGrafic[]} punts
 * @property {Serie[]} series
 * @property {boolean} animat
 * @property {boolean} movimentReduit
 * @property {string} descripcio Etiqueta accessible del gràfic.
 * @property {string} titolDeLaTaula
 * @property {string} columna Nom de la primera columna de la taula.
 * @property {(longitud: number, esEstret: boolean) => number[]} marquesDeLEix Punts amb text.
 * @property {(valor: number) => string} [formataValor]
 * @property {(valor: number) => string} [formataEix]
 * @property {number} [ampladaMinima] De l'eix vertical.
 * @property {boolean} [ambZero] Si es destaca la línia del zero.
 *
 * @typedef {object} Mides
 * @property {number} ample
 * @property {number} alt
 * @property {{dalt: number, dreta: number, baix: number, esquerra: number}} marge
 * @property {boolean} esEstret
 * @property {(i: number) => number} x
 * @property {(valor: number) => number} y
 */

const AMPLE_MINIM = 280;
const AMPLE_ESTRET = 520;
const RADI_PUNT = 4;
const RETARD_ENTRE_LINIES_MS = 90;

/**
 * @param {OpcionsDelGrafic} o
 * @returns {Mides & {eix: import("./grafic-calculs.js").Eix}}
 */
function midesDe(o) {
  const contenidor = /** @type {HTMLElement} */ (o.svg.parentNode);
  const ample = Math.max(AMPLE_MINIM, Math.round(contenidor.clientWidth - 12));
  const esEstret = ample < AMPLE_ESTRET;
  const alt = esEstret ? 230 : 290;
  const marge = { dalt: 14, dreta: esEstret ? 78 : 96, baix: 26, esquerra: 44 };
  const valors = o.punts
    .flatMap((p) => o.series.map((s) => valorDe(p, s)))
    .filter((v) => v !== null);
  const eix = eixRodo(valors, o.ampladaMinima ?? 0.02);
  const pasX = (ample - marge.esquerra - marge.dreta) / (o.punts.length - 1);
  return {
    ample,
    alt,
    marge,
    esEstret,
    eix,
    x: (i) => marge.esquerra + i * pasX,
    y: (valor) =>
      marge.dalt +
      ((eix.maxim - valor) / (eix.maxim - eix.minim)) * (alt - marge.dalt - marge.baix),
  };
}

/**
 * Línies horitzontals de la quadrícula amb el valor a l'esquerra.
 *
 * @param {OpcionsDelGrafic} o
 * @param {Mides & {eix: import("./grafic-calculs.js").Eix}} m
 */
function dibuixaLEixVertical(o, m) {
  const formataEix = o.formataEix ?? ((v) => v.toFixed(2).replace(".", ","));
  const { esquerra, dreta } = m.marge;
  for (let k = 0; k <= m.eix.divisions; k++) {
    const valor = m.eix.minim + m.eix.pas * k;
    const y = m.y(valor);
    const classe = o.ambZero && Math.abs(valor) < 1e-9 ? "grid zero" : "grid";
    elementSvg(
      "line",
      { x1: esquerra, x2: m.ample - dreta + 8, y1: y, y2: y, class: classe },
      o.svg,
    );
    const text = { x: esquerra - 6, y: y + 4, "text-anchor": "end", class: "ax" };
    elementSvg("text", text, o.svg).textContent = formataEix(valor);
  }
}

/**
 * @param {OpcionsDelGrafic} o
 * @param {Mides} m
 */
function dibuixaLEixHoritzontal(o, m) {
  const ultim = o.punts.length - 1;
  for (const i of o.marquesDeLEix(o.punts.length, m.esEstret)) {
    const ancoratge = i === 0 ? "start" : i === ultim ? "end" : "middle";
    const text = { x: m.x(i), y: m.alt - 8, "text-anchor": ancoratge, class: "ax" };
    elementSvg("text", text, o.svg).textContent = /** @type {PuntDelGrafic} */ (o.punts[i]).eix;
  }
}

/**
 * @param {OpcionsDelGrafic} o
 * @param {SVGElement} linia
 * @param {Serie} serie
 * @param {number} ordre
 */
function animaLaLinia(o, linia, serie, ordre) {
  if (!o.animat || o.movimentReduit) return;
  linia.style.animationDelay = `${ordre * RETARD_ENTRE_LINIES_MS}ms`;
  if (serie.discontinua) {
    linia.classList.add("fadein");
    return;
  }
  const longitud = Math.ceil(/** @type {SVGPathElement} */ (linia).getTotalLength());
  linia.style.strokeDasharray = String(longitud);
  linia.style.setProperty("--len", String(longitud));
  linia.classList.add("draw");
}

/**
 * @param {OpcionsDelGrafic} o
 * @param {Mides} m
 * @param {Serie} serie
 * @returns {{cami: string, final: [number, number] | null}} El traçat i l'últim punt amb valor.
 */
function camiDeLaSerie(o, m, serie) {
  let cami = "";
  let esContinua = false;
  /** @type {[number, number] | null} */
  let final = null;
  o.punts.forEach((punt, i) => {
    const valor = valorDe(punt, serie);
    if (valor === null) {
      esContinua = false;
      return;
    }
    cami += `${esContinua ? "L" : "M"}${m.x(i).toFixed(1)} ${m.y(valor).toFixed(1)}`;
    esContinua = true;
    final = [m.x(i), m.y(valor)];
  });
  return { cami, final };
}

/**
 * @param {OpcionsDelGrafic} o
 * @param {Mides} m
 * @returns {Array<{serie: Serie, x: number, y: number}>} El punt final de cada línia.
 */
function dibuixaLinies(o, m) {
  /** @type {Array<{serie: Serie, x: number, y: number}>} */
  const finals = [];
  o.series.forEach((serie, ordre) => {
    const { cami, final } = camiDeLaSerie(o, m, serie);
    if (!final) return;
    const [x, y] = final;
    const classe = serie.discontinua ? "ln dash" : "ln";
    const linia = elementSvg("path", { d: cami, class: classe, stroke: serie.color }, o.svg);
    animaLaLinia(o, linia, serie, ordre);
    const punt = { cx: x, cy: y, r: RADI_PUNT, fill: serie.color, stroke: COLOR_DEL_FONS };
    elementSvg("circle", { ...punt, "stroke-width": 2 }, o.svg);
    finals.push({ serie, x, y });
  });
  return finals;
}

/**
 * @param {OpcionsDelGrafic} o
 * @param {Mides} m
 * @param {Array<{serie: Serie, x: number, y: number}>} finals
 */
function dibuixaEtiquetes(o, m, finals) {
  for (const final of separaEtiquetes(finals, m.alt - m.marge.baix)) {
    const classe = final.serie.discontinua ? "lbl lbl-cat" : "lbl";
    elementSvg(
      "text",
      { x: final.x + 9, y: final.etiquetaY + 4, class: classe },
      o.svg,
    ).textContent = final.serie.nom;
  }
}

/** @param {OpcionsDelGrafic} o */
function ompleLaTaula(o) {
  const formata = o.formataValor ?? formataPreu;
  const { taula } = o;
  taula.replaceChildren();
  taula.createCaption().textContent = o.titolDeLaTaula;
  const capcalera = taula.createTHead().insertRow();
  for (const text of [o.columna, ...o.series.map((s) => s.nom)]) {
    capcalera.appendChild(element("th", null, text));
  }
  const cos = taula.createTBody();
  for (const punt of [...o.punts].reverse()) {
    const fila = cos.insertRow();
    fila.insertCell().textContent = punt.fila;
    for (const serie of o.series) {
      const valor = valorDe(punt, serie);
      fila.insertCell().textContent = valor !== null ? formata(valor) : "–";
    }
  }
}

/**
 * Dibuixa el gràfic de nou (també quan canvia la mida de la pàgina).
 *
 * @param {OpcionsDelGrafic} o
 */
export function dibuixaGrafic(o) {
  const mides = midesDe(o);
  o.svg.setAttribute("viewBox", `0 0 ${mides.ample} ${mides.alt}`);
  o.svg.replaceChildren();
  o.tooltip.hidden = true;
  o.svg.setAttribute("aria-label", o.descripcio);
  dibuixaLEixVertical(o, mides);
  dibuixaLEixHoritzontal(o, mides);
  dibuixaEtiquetes(o, mides, dibuixaLinies(o, mides));
  activaElTooltip(o, mides);
  ompleLaTaula(o);
}
