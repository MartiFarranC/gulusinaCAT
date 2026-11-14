/** Fitxa de cada benzinera i gestos del mapa: botons, arrossegar i doble clic. */

import { element, enllacExtern, puntDeColor, urlDeLaRuta } from "./dom.js";
import { formataPreu } from "./format.js";
import { desprojecta, projecta } from "./geo.js";
import { limitaElZoom } from "./mapa-calculs.js";
import { colorDe } from "./marques.js";

/** @typedef {import("./estat.js").Estat} Estat */
/** @typedef {import("./tipus.js").Estacio} Estacio */
/** @typedef {import("./mapa-base.js").Vista} Vista */

const MARGE_FITXA_PX = 8;
const SEPARACIO_FITXA_PX = 14;
const MOVIMENT_MINIM_PX = 4;
const NO_ARROSSEGUEN = ".map-ctl,.map-pop,.map-attr,.m-tag,.m-pt";

/**
 * @param {Estat} estat
 * @param {Estacio} estacio
 * @param {string | null} detall Sobre la distància, si n'hi ha.
 * @returns {HTMLElement[]} Nom, preu, adreça, distància i enllaç per arribar-hi.
 */
function contingutDeLaFitxa(estat, estacio, detall) {
  const nom = element("b");
  nom.append(puntDeColor(colorDe(estacio.m)), estacio.nom);
  const preu = /** @type {number} */ (estacio[estat.combustible]);
  const adreca = [estacio.mun, estacio.adr].filter(Boolean).join(" · ");
  const lluny = detall ? [element("span", null, detall)] : [];
  return [
    nom,
    element("span", "mp-preu", `${formataPreu(preu)} €/L`),
    element("span", null, adreca),
    ...lluny,
    enllacExtern("Com arribar ↗", urlDeLaRuta(estacio.lat, estacio.lon)),
  ];
}

/**
 * @param {object} mapa
 * @param {Estat} mapa.estat
 * @param {HTMLElement} mapa.caixa
 * @param {HTMLElement} mapa.fitxa
 * @param {(estacio: Estacio) => string | null} mapa.detall
 * @param {Estacio} estacio
 * @param {[number, number]} posicio Píxels de la benzinera dins del mapa.
 */
export function obreLaFitxa({ estat, caixa, fitxa, detall }, estacio, [x, y]) {
  fitxa.replaceChildren(...contingutDeLaFitxa(estat, estacio, detall(estacio)));
  fitxa.hidden = false;
  const ample = fitxa.offsetWidth;
  const alt = fitxa.offsetHeight;
  const esquerra = Math.min(caixa.clientWidth - ample - MARGE_FITXA_PX, x - ample / 2);
  fitxa.style.left = `${Math.max(MARGE_FITXA_PX, esquerra)}px`;
  const aSobre = y - alt - SEPARACIO_FITXA_PX;
  const aSota = Math.min(caixa.clientHeight - alt - MARGE_FITXA_PX, y + SEPARACIO_FITXA_PX);
  fitxa.style.top = `${aSobre > MARGE_FITXA_PX ? aSobre : aSota}px`;
}

/** Arrossegar per moure el mapa. Un toc sense moure'l tanca la fitxa. */
class Arrossegament {
  /**
   * @param {{caixa: HTMLElement, vista: Vista, fitxa: HTMLElement}} mapa
   * @param {() => void} dibuixa
   */
  constructor({ caixa, vista, fitxa }, dibuixa) {
    this.caixa = caixa;
    this.vista = vista;
    this.fitxa = fitxa;
    this.dibuixa = dibuixa;
    /** @type {{x: number, y: number, centreX: number, centreY: number} | null} */
    this.inici = null;
    this.haMogut = false;
    this.hiHaDibuixPendent = false;
    caixa.addEventListener("pointerdown", (e) => this.comenca(e));
    caixa.addEventListener("pointermove", (e) => this.mou(e));
    caixa.addEventListener("pointerup", () => this.acaba());
    caixa.addEventListener("pointercancel", () => this.acaba());
  }

  /** @param {PointerEvent} e */
  comenca(e) {
    const { centre, zoom } = this.vista;
    if (!centre || (e.target instanceof Element && e.target.closest(NO_ARROSSEGUEN))) return;
    const punt = projecta(centre.lat, centre.lon, zoom);
    this.inici = { x: e.clientX, y: e.clientY, centreX: punt.x, centreY: punt.y };
    this.haMogut = false;
    this.caixa.setPointerCapture(e.pointerId);
  }

  /** @param {PointerEvent} e */
  mou(e) {
    if (!this.inici) return;
    const dx = e.clientX - this.inici.x;
    const dy = e.clientY - this.inici.y;
    if (!this.haMogut && Math.hypot(dx, dy) < MOVIMENT_MINIM_PX) return;
    this.haMogut = true;
    this.caixa.classList.add("arrossega");
    this.vista.centre = desprojecta(
      this.inici.centreX - dx,
      this.inici.centreY - dy,
      this.vista.zoom,
    );
    if (this.hiHaDibuixPendent) return;
    this.hiHaDibuixPendent = true;
    requestAnimationFrame(() => {
      this.hiHaDibuixPendent = false;
      this.dibuixa();
    });
  }

  acaba() {
    if (this.inici && !this.haMogut) this.fitxa.hidden = true;
    this.inici = null;
    this.caixa.classList.remove("arrossega");
  }
}

/**
 * @param {object} mapa
 * @param {HTMLElement} mapa.caixa
 * @param {Vista} mapa.vista
 * @param {HTMLElement} mapa.fitxa
 * @param {{apropa: HTMLElement, allunya: HTMLElement, centra: HTMLElement}} mapa.botons
 * @param {{dibuixa: () => void, encaixa: () => void}} accions
 */
export function activaElsGestos(mapa, { dibuixa, encaixa }) {
  const { caixa, vista, fitxa, botons } = mapa;
  const redibuixa = () => {
    fitxa.hidden = true;
    dibuixa();
  };
  const apropa = (/** @type {number} */ nivells) => {
    vista.zoom = limitaElZoom(vista.zoom + nivells);
    redibuixa();
  };
  botons.apropa.addEventListener("click", () => apropa(1));
  botons.allunya.addEventListener("click", () => apropa(-1));
  botons.centra.addEventListener("click", () => {
    encaixa();
    redibuixa();
  });
  caixa.addEventListener("dblclick", (e) => {
    if (!(e.target instanceof Element && e.target.closest(".map-ctl,.map-pop"))) apropa(1);
  });
  new Arrossegament(mapa, dibuixa);
}
