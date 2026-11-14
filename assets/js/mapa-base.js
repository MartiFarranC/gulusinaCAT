/**
 * Mapa de benzineres fet a mà amb les rajoles d'OpenStreetMap (sense cap llibreria): rajoles,
 * gestos, punts i etiquetes de preu. Cada mapa de la pàgina hi afegeix les seves capes.
 */

import { elementSvg } from "./dom.js";
import { elMesPetit } from "./estadistica.js";
import { formataPreu } from "./format.js";
import { MIDA_RAJOLA, projecta } from "./geo.js";
import { esDinsDelMapa, limitaElZoom, triaEtiquetes, zoomDeLesRajoles } from "./mapa-calculs.js";
import { activaElsGestos, obreLaFitxa } from "./mapa-interaccio.js";
import { colorDe } from "./marques.js";

/** @typedef {import("./estat.js").Estat} Estat */
/** @typedef {import("./tipus.js").Estacio} Estacio */
/** @typedef {{lat: number, lon: number}} Punt */

/**
 * @typedef {object} Vista
 * @property {number} zoom Pot ser fraccionari.
 * @property {Punt | null} centre
 * @property {Estacio[]} punts
 * @property {Estacio | null} barata
 *
 * @typedef {object} Marc Vista projectada a la mida actual del mapa.
 * @property {number} ample
 * @property {number} alt
 * @property {number} zoom
 * @property {number} origenX Píxel del món a la cantonada de dalt a l'esquerra.
 * @property {number} origenY
 *
 * @typedef {object} ElementsDelMapa
 * @property {HTMLElement} caixa
 * @property {HTMLElement} rajoles
 * @property {SVGElement} svg
 * @property {HTMLElement} fitxa
 * @property {{apropa: HTMLElement, allunya: HTMLElement, centra: HTMLElement}} botons
 *
 * @typedef {object} CapesDelMapa El que cada mapa hi afegeix.
 * @property {(marc: Marc) => void} sota Es dibuixa abans de les benzineres.
 * @property {(marc: Marc) => void} sobre Es dibuixa entre els punts i les etiquetes.
 * @property {(ample: number, alt: number) => {zoom: number, centre: Punt} | null} encaixa
 *   La vista en centrar el mapa, per a la mida que té.
 * @property {(estacio: Estacio) => string | null} detall Línia de la fitxa sobre la distància.
 */

const ZOOM_DE_PUNTS_GRANS = 13;
const FORMA_ETIQUETA =
  "M-24,-30h48a4,4 0 0 1 4,4v14a4,4 0 0 1 -4,4h-18l-6,7l-6,-7h-18a4,4 0 0 1 -4,-4v-14a4,4 0 0 1 4,-4z";

/**
 * @param {Marc} marc
 * @param {Punt} punt
 * @returns {[number, number]}
 */
export const aPixels = (marc, punt) => {
  const p = projecta(punt.lat, punt.lon, marc.zoom);
  return [p.x - marc.origenX, p.y - marc.origenY];
};

/**
 * @param {HTMLElement} capa
 * @param {string} clau Zoom, columna i fila de la rajola.
 * @param {string} adreca
 * @returns {HTMLImageElement} La rajola que ja hi era o una de nova.
 */
function rajolaDe(capa, clau, adreca) {
  const existent = capa.querySelector(`[data-k="${clau}"]`);
  if (existent instanceof HTMLImageElement) return existent;
  const rajola = new Image();
  rajola.alt = "";
  rajola.decoding = "async";
  rajola.dataset["k"] = clau;
  rajola.src = adreca;
  capa.appendChild(rajola);
  return rajola;
}

/**
 * Rajoles del nivell de zoom enter, escalades si el zoom és fraccionari. Es reaprofiten les que
 * ja hi són i només es demanen les noves.
 *
 * @param {HTMLElement} capa
 * @param {Marc} marc
 */
function posaLesRajoles(capa, marc) {
  const zoom = zoomDeLesRajoles(marc.zoom);
  const mida = MIDA_RAJOLA * 2 ** (marc.zoom - zoom);
  const perCostat = 2 ** zoom;
  const necessaries = new Set();
  const { origenX: ox, origenY: oy } = marc;
  for (let tx = Math.floor(ox / mida); tx <= Math.floor((ox + marc.ample) / mida); tx++) {
    for (let ty = Math.floor(oy / mida); ty <= Math.floor((oy + marc.alt) / mida); ty++) {
      if (ty < 0 || ty >= perCostat) continue;
      const clau = `${zoom}/${tx}/${ty}`;
      necessaries.add(clau);
      const columna = ((tx % perCostat) + perCostat) % perCostat;
      const rajola = rajolaDe(
        capa,
        clau,
        `https://tile.openstreetmap.org/${zoom}/${columna}/${ty}.png`,
      );
      rajola.style.width = rajola.style.height = `${mida + 0.5}px`;
      rajola.style.transform = `translate(${(tx * mida - ox).toFixed(1)}px,${(ty * mida - oy).toFixed(1)}px)`;
    }
  }
  for (const rajola of [...capa.children]) {
    if (!necessaries.has(/** @type {HTMLElement} */ (rajola).dataset["k"])) rajola.remove();
  }
}

export class MapaDeBenzineres {
  /**
   * @param {Estat} estat
   * @param {ElementsDelMapa} elements
   * @param {CapesDelMapa} capes
   */
  constructor(estat, elements, capes) {
    this.estat = estat;
    this.elements = elements;
    this.capes = capes;
    /** @type {Vista} */
    this.vista = { zoom: 10, centre: null, punts: [], barata: null };
    const { caixa, fitxa, botons } = elements;
    const mapa = { caixa, vista: this.vista, fitxa, botons };
    activaElsGestos(mapa, { dibuixa: () => this.dibuixa(), encaixa: () => this.encaixa() });
    addEventListener("resize", () => {
      if (caixa.offsetParent) this.dibuixa();
    });
  }

  /** @param {Estacio} estacio */
  preu(estacio) {
    return /** @type {number} */ (estacio[this.estat.combustible]);
  }

  /** @returns {Marc | null} */
  marcActual() {
    const { caixa } = this.elements;
    const ample = caixa.clientWidth;
    const alt = caixa.clientHeight;
    const { centre, zoom } = this.vista;
    if (!ample || !alt || !centre) return null;
    const punt = projecta(centre.lat, centre.lon, zoom);
    return { ample, alt, zoom, origenX: punt.x - ample / 2, origenY: punt.y - alt / 2 };
  }

  /** Centra el mapa com demana la capa. */
  encaixa() {
    const { caixa } = this.elements;
    const vista = this.capes.encaixa(caixa.clientWidth || 600, caixa.clientHeight || 400);
    if (!vista) return;
    this.vista.zoom = limitaElZoom(vista.zoom);
    this.vista.centre = vista.centre;
  }

  /**
   * Benzineres que es mostren; la més barata surt remarcada. No redibuixa.
   *
   * @param {Estacio[]} punts Amb preu del combustible triat.
   */
  posaPunts(punts) {
    this.vista.punts = punts;
    this.vista.barata = punts.length ? elMesPetit(punts, (e) => this.preu(e)) : null;
    this.elements.fitxa.hidden = true;
  }

  /**
   * @param {SVGElement} element
   * @param {Estacio} estacio
   * @param {[number, number]} posicio
   */
  obreEnTocar(element, estacio, posicio) {
    element.addEventListener("click", (e) => {
      e.stopPropagation();
      const { caixa, fitxa } = this.elements;
      const mapa = { estat: this.estat, caixa, fitxa, detall: this.capes.detall };
      obreLaFitxa(mapa, estacio, posicio);
    });
  }

  /**
   * @param {Marc} marc
   * @param {Estacio} estacio
   */
  dibuixaEtiqueta(marc, estacio) {
    const posicio = aPixels(marc, estacio);
    const [x, y] = posicio;
    if (!esDinsDelMapa(x, y, marc, 40)) return;
    const classe = estacio === this.vista.barata ? "m-tag best" : "m-tag";
    const transformacio = `translate(${x.toFixed(1)},${y.toFixed(1)})`;
    const grup = elementSvg("g", { class: classe, transform: transformacio }, this.elements.svg);
    elementSvg("path", { d: FORMA_ETIQUETA }, grup);
    elementSvg("circle", { cx: -18, cy: -19, r: 4, fill: colorDe(estacio.m) }, grup);
    const text = elementSvg("text", { x: 5, y: -15, "text-anchor": "middle" }, grup);
    text.textContent = formataPreu(this.preu(estacio));
    this.obreEnTocar(grup, estacio, posicio);
  }

  /**
   * @param {Marc} marc
   * @param {Set<Estacio>} ambEtiqueta
   */
  dibuixaPunts(marc, ambEtiqueta) {
    const radi = marc.zoom >= ZOOM_DE_PUNTS_GRANS ? 7 : 5.5;
    for (const estacio of this.vista.punts) {
      if (ambEtiqueta.has(estacio)) continue;
      const posicio = aPixels(marc, estacio);
      const [x, y] = posicio;
      if (!esDinsDelMapa(x, y, marc, 20)) continue;
      const classe = estacio === this.vista.barata ? "m-pt best" : "m-pt";
      const atributs = { cx: x, cy: y, r: radi, fill: colorDe(estacio.m), class: classe };
      this.obreEnTocar(elementSvg("circle", atributs, this.elements.svg), estacio, posicio);
    }
  }

  dibuixa() {
    const marc = this.marcActual();
    if (!marc) return;
    const { rajoles, svg } = this.elements;
    posaLesRajoles(rajoles, marc);
    svg.setAttribute("viewBox", `0 0 ${marc.ample} ${marc.alt}`);
    svg.replaceChildren();
    this.capes.sota(marc);
    const ordenades = [...this.vista.punts].sort((a, b) => this.preu(a) - this.preu(b));
    const ambEtiqueta = triaEtiquetes(ordenades, (e) => aPixels(marc, e), marc);
    this.dibuixaPunts(marc, new Set(ambEtiqueta));
    this.capes.sobre(marc);
    // La més barata, a sobre de tot
    for (const estacio of ambEtiqueta.reverse()) this.dibuixaEtiqueta(marc, estacio);
  }
}
