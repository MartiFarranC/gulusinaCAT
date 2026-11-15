/** Mapa a pantalla completa amb la ruta, la sortida, la destinació i les benzineres del camí. */

import { elementSvg, perId } from "./dom.js";
import { formataDistancia } from "./format.js";
import { MapaDeBenzineres, aPixels } from "./mapa-base.js";
import { vistaALaZonaLliure } from "./mapa-calculs.js";

/** @typedef {import("./estat.js").Estat} Estat */
/** @typedef {import("./tipus.js").Estacio} Estacio */
/** @typedef {import("./mapa-base.js").Marc} Marc */
/** @typedef {import("./mapa-calculs.js").Rectangle} Rectangle */
/** @typedef {import("./ruta-calculs.js").BenzineraDeLaRuta} BenzineraDeLaRuta */
/** @typedef {{lat: number, lon: number}} Punt */

/** Píxels mínims entre dos punts de la línia de la ruta: no cal dibuixar-ne més. */
const SEPARACIO_MINIMA_PX = 1.5;
/** Abans de triar res, es veuen Catalunya i Andorra senceres. */
const CATALUNYA_I_ANDORRA = [
  { lat: 40.52, lon: 0.16 },
  { lat: 42.86, lon: 3.33 },
];
/** Si el panell ocupa més d'aquesta part de l'amplada, és a dalt (mòbil) i no al costat. */
const PANELL_AL_COSTAT = 0.6;
const MIDA_MINIMA_PX = 120;

export class MapaDeLaRuta {
  /**
   * @param {Estat} estat
   * @param {HTMLElement} panell El que tapa una part del mapa.
   */
  constructor(estat, panell) {
    this.panell = panell;
    /** @type {Punt[]} */
    this.punts = [];
    /** @type {{origen: Punt | null, desti: Punt | null}} */
    this.extrems = { origen: null, desti: null };
    /** @type {Map<Estacio, BenzineraDeLaRuta>} */
    this.situacions = new Map();
    const elements = {
      caixa: perId("rMapa"),
      rajoles: perId("rMapaRajoles"),
      svg: /** @type {SVGElement} */ (/** @type {unknown} */ (perId("rMapaSvg"))),
      fitxa: perId("rMapaFitxa"),
      botons: { apropa: perId("rMapaIn"), allunya: perId("rMapaOut"), centra: perId("rMapaFit") },
    };
    this.base = new MapaDeBenzineres(estat, elements, {
      sota: (marc) => this.dibuixaLaRuta(marc),
      sobre: (marc) => this.dibuixaElsExtrems(marc),
      encaixa: (ample, alt) => this.vistaQueEncaixa(ample, alt),
      detall: (estacio) => this.detall(estacio),
    });
  }

  /**
   * @param {number} ample
   * @param {number} alt
   * @returns {Rectangle} La part del mapa que no tapa el panell.
   */
  zonaLliure(ample, alt) {
    const caixa = this.base.elements.caixa.getBoundingClientRect();
    const panell = this.panell.getBoundingClientRect();
    if (panell.width < ample * PANELL_AL_COSTAT) {
      const esquerra = Math.min(panell.right - caixa.left, ample - MIDA_MINIMA_PX);
      return { esquerra, dalt: 0, ample: ample - esquerra, alt };
    }
    const dalt = Math.min(panell.bottom - caixa.top, alt - MIDA_MINIMA_PX);
    return { esquerra: 0, dalt, ample, alt: alt - dalt };
  }

  /**
   * @param {number} ample
   * @param {number} alt
   */
  vistaQueEncaixa(ample, alt) {
    const { origen, desti } = this.extrems;
    const extrems = [origen, desti].filter((p) => p !== null);
    const punts = this.punts.length ? this.punts : extrems;
    const aEncaixar = punts.length > 1 ? punts : [...punts, ...CATALUNYA_I_ANDORRA];
    return vistaALaZonaLliure(aEncaixar, { ample, alt }, this.zonaLliure(ample, alt));
  }

  /** @param {Estacio} estacio */
  detall(estacio) {
    const situacio = this.situacions.get(estacio);
    if (!situacio) return null;
    return `Al km ${Math.round(situacio.km)} del trajecte, a ${formataDistancia(situacio.desviacio)} de la ruta`;
  }

  /** @param {Marc} marc */
  dibuixaLaRuta(marc) {
    if (!this.punts.length) return;
    let cami = "";
    let anterior = { x: -Infinity, y: -Infinity };
    for (const punt of this.punts) {
      const [x, y] = aPixels(marc, punt);
      if (Math.hypot(x - anterior.x, y - anterior.y) < SEPARACIO_MINIMA_PX) continue;
      cami += `${cami ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
      anterior = { x, y };
    }
    const { svg } = this.base.elements;
    elementSvg("path", { d: cami, class: "m-ruta-vora" }, svg);
    elementSvg("path", { d: cami, class: "m-ruta" }, svg);
  }

  /** @param {Marc} marc */
  dibuixaElsExtrems(marc) {
    const { origen, desti } = this.extrems;
    for (const [punt, classe] of /** @type {const} */ ([
      [origen, "m-sortida"],
      [desti, "m-desti"],
    ])) {
      if (!punt) continue;
      const [x, y] = aPixels(marc, punt);
      elementSvg("circle", { cx: x, cy: y, r: 8, class: classe }, this.base.elements.svg);
    }
  }

  /** Torna a centrar el mapa i el dibuixa. */
  centra() {
    this.base.encaixa();
    requestAnimationFrame(() => this.base.dibuixa());
  }

  /**
   * La sortida i la destinació triades, encara sense ruta.
   *
   * @param {Punt | null} origen
   * @param {Punt | null} desti
   */
  posaElsExtrems(origen, desti) {
    this.extrems = { origen, desti };
    this.punts = [];
    this.situacions = new Map();
    this.base.posaPunts([]);
    this.centra();
  }

  /**
   * @param {{punts: Punt[], origen: Punt, desti: Punt}} ruta
   * @param {readonly BenzineraDeLaRuta[]} trobades Les benzineres que es mostren.
   * @param {boolean} esRutaNova Si cal tornar a centrar el mapa.
   */
  mostra({ punts, origen, desti }, trobades, esRutaNova) {
    this.punts = punts;
    this.extrems = { origen, desti };
    this.situacions = new Map(trobades.map((t) => [t.estacio, t]));
    this.base.posaPunts(trobades.map((t) => t.estacio));
    if (esRutaNova) this.base.encaixa();
    requestAnimationFrame(() => this.base.dibuixa());
  }
}
