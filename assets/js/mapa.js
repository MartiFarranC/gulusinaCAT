/** Mapa de les benzineres fet a mà amb les rajoles d'OpenStreetMap (sense cap llibreria). */

import { elementSvg, perId } from "./dom.js";
import { elMesPetit } from "./estadistica.js";
import { MIDA_RAJOLA, metresPerPixel, projecta, vistaQueEncaixa, zoomPerAlRadi } from "./geo.js";
import { esDinsDelMapa, limitaElZoom, triaEtiquetes, zoomDeLesRajoles } from "./mapa-calculs.js";
import { colorDe } from "./marques.js";
import { formataPreu } from "./format.js";
import { esProperes } from "./estat.js";
import { activaElsGestos, obreLaFitxa } from "./mapa-interaccio.js";

/** @typedef {import("./estat.js").Estat} Estat */
/** @typedef {import("./tipus.js").Estacio} Estacio */

/**
 * @typedef {object} Vista
 * @property {number} zoom Pot ser fraccionari.
 * @property {{lat: number, lon: number} | null} centre
 * @property {string} clau Àmbit que es va encaixar l'última vegada.
 * @property {Estacio[]} punts
 * @property {Estacio | null} barata
 * @property {boolean} aProp
 *
 * @typedef {object} Marc Vista projectada a la mida actual del mapa.
 * @property {number} ample
 * @property {number} alt
 * @property {number} zoom
 * @property {number} origenX Píxel del món a la cantonada de dalt a l'esquerra.
 * @property {number} origenY
 */

const ZOOM_DE_PUNTS_GRANS = 13;
const FORMA_ETIQUETA =
  "M-24,-30h48a4,4 0 0 1 4,4v14a4,4 0 0 1 -4,4h-18l-6,7l-6,-7h-18a4,4 0 0 1 -4,-4v-14a4,4 0 0 1 4,-4z";

/**
 * @param {Marc} marc
 * @param {{lat: number, lon: number}} punt
 * @returns {[number, number]}
 */
const aPixels = (marc, punt) => {
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

export class Mapa {
  /** @param {Estat} estat */
  constructor(estat) {
    this.estat = estat;
    /** @type {Vista} */
    this.vista = { zoom: 10, centre: null, clau: "", punts: [], barata: null, aProp: false };
    this.caixa = perId("map");
    this.rajoles = perId("mapTiles");
    this.svg = perId("mapSvg");
    this.fitxa = perId("mapPop");
    const mapa = { caixa: this.caixa, vista: this.vista, fitxa: this.fitxa };
    activaElsGestos(mapa, { dibuixa: () => this.dibuixa(), encaixa: () => this.encaixa() });
    addEventListener("resize", () => {
      if (!perId("mapSec").hidden) this.dibuixa();
    });
  }

  /** @param {Estacio} estacio */
  preu(estacio) {
    return /** @type {number} */ (estacio[this.estat.combustible]);
  }

  /** @returns {Marc | null} */
  marcActual() {
    const ample = this.caixa.clientWidth;
    const alt = this.caixa.clientHeight;
    const { centre, zoom } = this.vista;
    if (!ample || !alt || !centre) return null;
    const punt = projecta(centre.lat, centre.lon, zoom);
    return { ample, alt, zoom, origenX: punt.x - ample / 2, origenY: punt.y - alt / 2 };
  }

  encaixa() {
    const ample = this.caixa.clientWidth || 600;
    const alt = this.caixa.clientHeight || 400;
    const { ubicacio, radi } = this.estat;
    if (this.vista.aProp && ubicacio) {
      this.vista.zoom = limitaElZoom(zoomPerAlRadi(ubicacio.lat, radi, Math.min(ample, alt)));
      this.vista.centre = { lat: ubicacio.lat, lon: ubicacio.lon };
      return;
    }
    const { zoom, centre } = vistaQueEncaixa(this.vista.punts, ample, alt);
    this.vista.zoom = limitaElZoom(zoom);
    this.vista.centre = centre;
  }

  /**
   * @param {SVGElement} element
   * @param {Estacio} estacio
   * @param {[number, number]} posicio
   */
  obreEnTocar(element, estacio, posicio) {
    element.addEventListener("click", (e) => {
      e.stopPropagation();
      obreLaFitxa({ estat: this.estat, caixa: this.caixa, fitxa: this.fitxa }, estacio, posicio);
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
    const grup = elementSvg("g", { class: classe, transform: transformacio }, this.svg);
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
      this.obreEnTocar(elementSvg("circle", atributs, this.svg), estacio, posicio);
    }
  }

  /** @param {Marc} marc */
  dibuixaElRadi(marc) {
    const { ubicacio } = this.estat;
    if (!this.vista.aProp || !ubicacio) return;
    const [x, y] = aPixels(marc, ubicacio);
    const radi = (this.estat.radi * 1000) / metresPerPixel(ubicacio.lat, marc.zoom);
    elementSvg("circle", { cx: x, cy: y, r: radi, class: "m-radi" }, this.svg);
  }

  /** @param {Marc} marc */
  dibuixaLaUbicacio(marc) {
    const { ubicacio } = this.estat;
    if (!ubicacio) return;
    const [x, y] = aPixels(marc, ubicacio);
    elementSvg("circle", { cx: x, cy: y, r: 16, class: "m-jo-halo" }, this.svg);
    elementSvg("circle", { cx: x, cy: y, r: 7, class: "m-jo" }, this.svg);
  }

  dibuixa() {
    const marc = this.marcActual();
    if (!marc) return;
    posaLesRajoles(this.rajoles, marc);
    this.svg.setAttribute("viewBox", `0 0 ${marc.ample} ${marc.alt}`);
    this.svg.replaceChildren();
    this.dibuixaElRadi(marc);
    const ordenades = [...this.vista.punts].sort((a, b) => this.preu(a) - this.preu(b));
    const ambEtiqueta = triaEtiquetes(ordenades, (e) => aPixels(marc, e), marc);
    this.dibuixaPunts(marc, new Set(ambEtiqueta));
    this.dibuixaLaUbicacio(marc);
    // La més barata, a sobre de tot
    for (const estacio of ambEtiqueta.reverse()) this.dibuixaEtiqueta(marc, estacio);
  }

  /**
   * Totes les gasolineres: tot Catalunya. Les més properes: la ubicació i el radi.
   *
   * @param {readonly Estacio[]} properes Les de dins del radi.
   */
  pinta(properes) {
    const { estat, vista } = this;
    const aProp = esProperes(estat);
    const origen = estat.estacions ? (aProp ? properes : estat.estacions) : [];
    const punts = origen.filter((e) => this.preu(e) > 0 && !estat.excloses.has(e.m));
    perId("mapSec").hidden = !punts.length && estat.ambit !== "properes";
    this.caixa.hidden = perId("mapNota").hidden = !punts.length;
    perId("mapTitol").textContent = aProp
      ? "Mapa de les benzineres properes"
      : "Mapa de les benzineres";
    if (!punts.length) return;
    Object.assign(vista, { aProp, punts, barata: elMesPetit(punts, (e) => this.preu(e)) });
    const { ubicacio } = estat;
    const clau = aProp && ubicacio ? `${ubicacio.lat},${ubicacio.lon},${estat.radi}` : "tot";
    if (clau !== vista.clau) {
      vista.clau = clau;
      this.encaixa();
    }
    this.fitxa.hidden = true;
    requestAnimationFrame(() => this.dibuixa());
  }
}
