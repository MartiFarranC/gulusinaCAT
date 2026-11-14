/** Mapa de totes les benzineres de la regió, o de les properes amb la ubicació i el radi. */

import { elementSvg, perId } from "./dom.js";
import { formataDistancia } from "./format.js";
import { distancia, metresPerPixel, vistaQueEncaixa, zoomPerAlRadi } from "./geo.js";
import { esProperes } from "./estat.js";
import { MapaDeBenzineres, aPixels } from "./mapa-base.js";

/** @typedef {import("./estat.js").Estat} Estat */
/** @typedef {import("./tipus.js").Estacio} Estacio */
/** @typedef {import("./mapa-base.js").Marc} Marc */

export class Mapa {
  /** @param {Estat} estat */
  constructor(estat) {
    this.estat = estat;
    this.caixa = perId("map");
    /** Àmbit que es va encaixar l'última vegada. */
    this.clau = "";
    this.aProp = false;
    const elements = {
      caixa: this.caixa,
      rajoles: perId("mapTiles"),
      svg: /** @type {SVGElement} */ (/** @type {unknown} */ (perId("mapSvg"))),
      fitxa: perId("mapPop"),
      botons: { apropa: perId("mapIn"), allunya: perId("mapOut"), centra: perId("mapFit") },
    };
    this.base = new MapaDeBenzineres(estat, elements, {
      sota: (marc) => this.dibuixaElRadi(marc),
      sobre: (marc) => this.dibuixaLaUbicacio(marc),
      encaixa: (ample, alt) => this.vistaDeLAmbit(ample, alt),
      detall: (estacio) => this.distanciaALaUbicacio(estacio),
    });
  }

  /**
   * @param {number} ample
   * @param {number} alt
   * @returns {{zoom: number, centre: {lat: number, lon: number}} | null}
   */
  vistaDeLAmbit(ample, alt) {
    const { ubicacio, radi } = this.estat;
    if (this.aProp && ubicacio) {
      const centre = { lat: ubicacio.lat, lon: ubicacio.lon };
      return { zoom: zoomPerAlRadi(ubicacio.lat, radi, Math.min(ample, alt)), centre };
    }
    const { punts } = this.base.vista;
    return punts.length ? vistaQueEncaixa(punts, ample, alt) : null;
  }

  /** @param {Estacio} estacio */
  distanciaALaUbicacio(estacio) {
    const { ubicacio } = this.estat;
    if (!ubicacio) return null;
    const lloc = ubicacio.gps ? "de tu" : `de ${ubicacio.nom}`;
    return `A ${formataDistancia(distancia(ubicacio, estacio))} ${lloc}`;
  }

  /** @param {Marc} marc */
  dibuixaElRadi(marc) {
    const { ubicacio } = this.estat;
    if (!this.aProp || !ubicacio) return;
    const [x, y] = aPixels(marc, ubicacio);
    const radi = (this.estat.radi * 1000) / metresPerPixel(ubicacio.lat, marc.zoom);
    elementSvg("circle", { cx: x, cy: y, r: radi, class: "m-radi" }, this.base.elements.svg);
  }

  /** @param {Marc} marc */
  dibuixaLaUbicacio(marc) {
    const { ubicacio } = this.estat;
    if (!ubicacio) return;
    const [x, y] = aPixels(marc, ubicacio);
    const { svg } = this.base.elements;
    elementSvg("circle", { cx: x, cy: y, r: 16, class: "m-jo-halo" }, svg);
    elementSvg("circle", { cx: x, cy: y, r: 7, class: "m-jo" }, svg);
  }

  /**
   * Totes les benzineres: tota la regió. Les més properes: la ubicació i el radi.
   *
   * @param {readonly Estacio[]} properes Les de dins del radi.
   */
  pinta(properes) {
    const { estat } = this;
    const aProp = esProperes(estat);
    const origen = estat.estacions ? (aProp ? properes : estat.estacions) : [];
    const punts = origen.filter((e) => this.base.preu(e) > 0 && !estat.excloses.has(e.m));
    perId("mapSec").hidden = !punts.length && estat.ambit !== "properes";
    this.caixa.hidden = perId("mapNota").hidden = !punts.length;
    perId("mapTitol").textContent = aProp
      ? "Mapa de les benzineres properes"
      : "Mapa de les benzineres";
    if (!punts.length) return;
    this.aProp = aProp;
    this.base.posaPunts(punts);
    const { ubicacio } = estat;
    const clau = aProp && ubicacio ? `${ubicacio.lat},${ubicacio.lon},${estat.radi}` : "tot";
    if (clau !== this.clau) {
      this.clau = clau;
      this.base.encaixa();
    }
    requestAnimationFrame(() => this.base.dibuixa());
  }
}
