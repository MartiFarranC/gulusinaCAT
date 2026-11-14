/** Mapa amb la ruta, la sortida, la destinació i les benzineres que queden a prop. */

import { elementSvg, perId } from "./dom.js";
import { formataDistancia } from "./format.js";
import { vistaQueEncaixa } from "./geo.js";
import { MapaDeBenzineres, aPixels } from "./mapa-base.js";

/** @typedef {import("./estat.js").Estat} Estat */
/** @typedef {import("./tipus.js").Estacio} Estacio */
/** @typedef {import("./mapa-base.js").Marc} Marc */
/** @typedef {import("./ruta-calculs.js").BenzineraDeLaRuta} BenzineraDeLaRuta */
/** @typedef {{lat: number, lon: number}} Punt */

/** Píxels mínims entre dos punts de la línia de la ruta: no cal dibuixar-ne més. */
const SEPARACIO_MINIMA_PX = 1.5;

export class MapaDeLaRuta {
  /** @param {Estat} estat */
  constructor(estat) {
    /** @type {Punt[]} */
    this.punts = [];
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
      encaixa: (ample, alt) => (this.punts.length ? vistaQueEncaixa(this.punts, ample, alt) : null),
      detall: (estacio) => this.detall(estacio),
    });
  }

  /** @param {Estacio} estacio */
  detall(estacio) {
    const situacio = this.situacions.get(estacio);
    if (!situacio) return null;
    return `Al km ${Math.round(situacio.km)} del trajecte, a ${formataDistancia(situacio.desviacio)} de la ruta`;
  }

  /** @param {Marc} marc */
  dibuixaLaRuta(marc) {
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
    const extrems = [
      { punt: this.punts[0], classe: "m-sortida" },
      { punt: this.punts.at(-1), classe: "m-desti" },
    ];
    for (const { punt, classe } of extrems) {
      if (!punt) continue;
      const [x, y] = aPixels(marc, punt);
      elementSvg("circle", { cx: x, cy: y, r: 8, class: classe }, this.base.elements.svg);
    }
  }

  /**
   * @param {Punt[]} punts De la ruta, en ordre.
   * @param {readonly BenzineraDeLaRuta[]} trobades Les benzineres que es mostren.
   * @param {boolean} esRutaNova Si cal tornar a centrar el mapa.
   */
  mostra(punts, trobades, esRutaNova) {
    this.punts = punts;
    this.situacions = new Map(trobades.map((t) => [t.estacio, t]));
    this.base.posaPunts(trobades.map((t) => t.estacio));
    if (esRutaNova) this.base.encaixa();
    requestAnimationFrame(() => this.base.dibuixa());
  }
}
