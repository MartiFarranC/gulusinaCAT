/** Quant costa omplir el dipòsit a les quatre marques més barates. */

import { dins, element, perId, perIdDeTipus } from "./dom.js";
import { formataEuros } from "./format.js";
import { marquesReals, nomDeLaReferencia, preuDe } from "./estat.js";

/** @typedef {import("./tipus.js").Marca} Marca */
/** @typedef {import("./estat.js").Estat} Estat */

const NOMBRE_DE_TIQUETS = 4;
const DURADA_COMPTADOR_MS = 700;
const EUROS_IGUALS = 0.005;
const SETMANES_PER_ANY = 52;

/**
 * Fa pujar o baixar l'import fins al nou valor.
 *
 * @param {HTMLElement} caixa
 * @param {number} fins
 * @param {boolean} movimentReduit
 */
function compta(caixa, fins, movimentReduit) {
  const des = parseFloat(caixa.dataset["v"] || "0");
  caixa.dataset["v"] = String(fins);
  if (movimentReduit) {
    caixa.textContent = formataEuros(fins);
    return;
  }
  const inici = performance.now();
  const pas = (/** @type {number} */ ara) => {
    const progres = Math.min(1, (ara - inici) / DURADA_COMPTADOR_MS);
    const suau = 1 - Math.pow(1 - progres, 3);
    caixa.textContent = formataEuros(des + (fins - des) * suau);
    if (progres < 1) requestAnimationFrame(pas);
  };
  pas(inici);
}

/**
 * @param {number} diferencia Euros que es paguen de menys (positiu) o de més (negatiu).
 * @returns {[string, string]} La quantitat i la comparació, com ["3,20 €", "menys que"].
 */
function comparacio(diferencia) {
  if (Math.abs(diferencia) < EUROS_IGUALS) return ["el mateix", "que"];
  return [formataEuros(Math.abs(diferencia)), diferencia > 0 ? "menys que" : "més que"];
}

/** @param {string} text */
const destacat = (text) => element("strong", null, text);

/**
 * @param {Estat} estat
 * @param {HTMLElement} veredicte
 * @param {{marques: Marca[], litres: number, mitjana: number}} dades
 */
function veredicteAmbMitjana(estat, veredicte, { marques, litres, mitjana }) {
  const [millor] = /** @type {[Marca]} */ (marques);
  const gran = [...marques].sort((a, b) => (b.n || 0) - (a.n || 0))[0];
  const estalvi = (mitjana - preuDe(estat, millor)) * litres;
  const [quantitat, com] = comparacio(estalvi);
  veredicte.append(
    `Amb ${litres} litres, a `,
    destacat(millor.nom),
    ` pagues `,
    destacat(quantitat),
    ` ${com} la mitjana de ${nomDeLaReferencia(estat)}`,
  );
  if (gran && gran.id !== millor.id && (gran.n ?? 0) > 1) {
    const [q, c] = comparacio((preuDe(estat, gran) - preuDe(estat, millor)) * litres);
    veredicte.append(` i ${q} ${c} a ${gran.nom}, la marca amb més benzineres`);
  }
  const anual = formataEuros(Math.abs(estalvi) * SETMANES_PER_ANY);
  if (estalvi > EUROS_IGUALS) {
    veredicte.append(`. En un any omplint cada setmana, t'estalvies uns ${anual}.`);
  } else if (estalvi < -EUROS_IGUALS) {
    veredicte.append(`. En un any omplint cada setmana, són uns ${anual} més.`);
  } else veredicte.append(".");
}

/**
 * @param {Estat} estat
 * @param {HTMLElement} veredicte
 * @param {{marques: Marca[], litres: number}} dades
 */
function veredicteSenseMitjana(estat, veredicte, { marques, litres }) {
  const millor = /** @type {Marca} */ (marques[0]);
  const pitjor = /** @type {Marca} */ (marques.at(-1));
  const estalvi = (preuDe(estat, pitjor) - preuDe(estat, millor)) * litres;
  veredicte.append(
    `Amb ${litres} litres, anar a `,
    destacat(millor.nom),
    ` en lloc de ${pitjor.nom} et deixa `,
    destacat(formataEuros(estalvi)),
    ` a la butxaca. En un any omplint cada setmana, són uns ${formataEuros(estalvi * SETMANES_PER_ANY)}.`,
  );
}

/**
 * @param {number} diferencia Euros respecte a la referència (positiu: es paga menys).
 * @param {boolean} teMitjana Si la referència és la mitjana o la marca més cara.
 */
function textDeLEstalvi(diferencia, teMitjana) {
  if (!teMitjana) return `T'estalvies ${formataEuros(diferencia)}`;
  if (Math.abs(diferencia) < EUROS_IGUALS) return "Igual que la mitjana";
  return diferencia > 0
    ? `${formataEuros(diferencia)} menys que la mitjana`
    : `${formataEuros(-diferencia)} més que la mitjana`;
}

export class Calculadora {
  /** @param {Estat} estat */
  constructor(estat) {
    this.estat = estat;
    this.litres = perIdDeTipus("l", HTMLInputElement);
    this.tiquets = Array.from({ length: NOMBRE_DE_TIQUETS }, (_, i) => {
      const tiquet = element("div", "ticket");
      tiquet.id = `b-${i}`;
      tiquet.innerHTML = `<div class="n"><i class="bd"></i><span></span></div><div class="tot">0 €</div><div class="save"></div>`;
      perId("bill").appendChild(tiquet);
      return tiquet;
    });
    this.litres.addEventListener("input", () => this.pinta());
  }

  /**
   * @param {HTMLElement} tiquet
   * @param {Marca} marca
   * @param {{litres: number, referencia: number, teMitjana: boolean}} dades
   */
  pintaTiquet(tiquet, marca, { litres, referencia, teMitjana }) {
    const total = preuDe(this.estat, marca) * litres;
    tiquet.hidden = false;
    dins(tiquet, ".n span").textContent = marca.nom;
    dins(tiquet, ".bd").style.background = marca.color;
    compta(dins(tiquet, ".tot"), total, this.estat.movimentReduit);
    dins(tiquet, ".save").textContent = textDeLEstalvi(referencia - total, teMitjana);
  }

  pinta() {
    const { estat } = this;
    const marques = marquesReals(estat);
    const litres = Number(this.litres.value);
    const mitjana = estat.mitjana?.[estat.combustible] ?? null;
    perId("lv").textContent = `${litres} L`;
    this.tiquets.forEach((tiquet, i) => {
      const marca = marques[i];
      tiquet.hidden = !marca;
      if (!marca) return;
      const referencia = (mitjana ?? preuDe(estat, /** @type {Marca} */ (marques.at(-1)))) * litres;
      this.pintaTiquet(tiquet, marca, { litres, referencia, teMitjana: Boolean(mitjana) });
      tiquet.classList.toggle("best", i === 0);
    });
    const veredicte = perId("verdict");
    veredicte.replaceChildren();
    if (!marques.length) return;
    if (mitjana) veredicteAmbMitjana(estat, veredicte, { marques, litres, mitjana });
    else veredicteSenseMitjana(estat, veredicte, { marques, litres });
  }
}
