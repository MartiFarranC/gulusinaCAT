/** Calculadora de quants diners cal demanar a la benzinera per omplir el dipòsit. */

import { dinersPerOmplir, MARGE_DEL_DIPOSIT } from "./diposit.js";
import { element, perId, perIdDeTipus } from "./dom.js";
import { formataDistancia, formataEuros, formataLitres, formataPreu } from "./format.js";
import { NOM_DEL_COMBUSTIBLE, esProperes } from "./estat.js";

/** @typedef {import("./estat.js").Estat} Estat */
/** @typedef {import("./tipus.js").EstacioAmbDistancia} EstacioAmbDistancia */
/** @typedef {import("./preferencies.js").DadesDesadesDelCotxe} DadesDesadesDelCotxe */

/**
 * @typedef {object} AccionsDeLaCalculadora
 * @property {DadesDesadesDelCotxe} cotxe Dades desades l'última vegada.
 * @property {(cotxe: DadesDesadesDelCotxe) => void} desa
 */

/** @param {EstacioAmbDistancia} estacio */
const identificadorDeLEstacio = (estacio) => `${estacio.m}|${estacio.lat}|${estacio.lon}`;

/**
 * Cada dada del cotxe amb el camp, el rang vàlid i el que cal dir si no hi és.
 *
 * @type {ReadonlyArray<{nom: "consum" | "kmQueQueden" | "diposit", minim: number, maxim: number, avis: string}>}
 */
const DADES_DEL_COTXE = [
  {
    nom: "consum",
    minim: 1,
    maxim: 30,
    avis: "Escriu el consum del cotxe (entre 1 i 30 L/100 km).",
  },
  {
    nom: "kmQueQueden",
    minim: 0,
    maxim: 2000,
    avis: "Escriu els quilòmetres d'autonomia que et marca el cotxe.",
  },
  {
    nom: "diposit",
    minim: 5,
    maxim: 200,
    avis: "Escriu la capacitat del dipòsit en litres (entre 5 i 200).",
  },
];

/** @param {HTMLInputElement} camp */
const valorDe = (camp) => (camp.value.trim() === "" ? Number.NaN : Number(camp.value));

export class CalculadoraDelDiposit {
  /**
   * @param {Estat} estat
   * @param {AccionsDeLaCalculadora} accions
   */
  constructor(estat, accions) {
    this.estat = estat;
    this.accions = accions;
    this.consum = perIdDeTipus("dConsum", HTMLInputElement);
    this.km = perIdDeTipus("dKm", HTMLInputElement);
    this.diposit = perIdDeTipus("dDiposit", HTMLInputElement);
    this.benzinera = perIdDeTipus("dBenzinera", HTMLSelectElement);
    /** @type {EstacioAmbDistancia[]} */
    this.opcions = [];
    if (accions.cotxe.consum) this.consum.value = String(accions.cotxe.consum);
    if (accions.cotxe.diposit) this.diposit.value = String(accions.cotxe.diposit);
    for (const camp of [this.consum, this.km, this.diposit, this.benzinera]) {
      camp.addEventListener("input", () => this.calcula());
    }
    for (const camp of [this.consum, this.diposit]) {
      camp.addEventListener("change", () => this.desaElCotxe());
    }
  }

  desaElCotxe() {
    const consum = valorDe(this.consum);
    const diposit = valorDe(this.diposit);
    this.accions.desa({
      ...(consum > 0 && { consum }),
      ...(diposit > 0 && { diposit }),
    });
  }

  /** @param {EstacioAmbDistancia} estacio */
  preu(estacio) {
    return estacio[this.estat.combustible] ?? 0;
  }

  /**
   * Les benzineres properes amb preu, de la més propera a la més llunyana. Manté la triada si
   * encara hi és; si no, tria la més propera, que és on deu ser l'usuari.
   *
   * @param {readonly EstacioAmbDistancia[]} properes
   */
  ompleLesBenzineres(properes) {
    const triada = this.opcions[Number(this.benzinera.value)];
    const clau = triada ? identificadorDeLEstacio(triada) : null;
    this.opcions = properes.filter((e) => this.preu(e) > 0).sort((a, b) => a.d - b.d);
    const combustible = NOM_DEL_COMBUSTIBLE[this.estat.combustible];
    this.benzinera.replaceChildren(
      ...this.opcions.map((estacio, i) => {
        const lloc = [estacio.mun, estacio.adr].filter(Boolean).join(", ");
        const text = `${estacio.nom} · ${lloc} · ${formataPreu(this.preu(estacio))} €/L · ${formataDistancia(estacio.d)}`;
        const opcio = Object.assign(element("option", null, text), { value: String(i) });
        opcio.title = `${combustible} a ${estacio.nom} de ${estacio.mun}`;
        return opcio;
      }),
    );
    const index = this.opcions.findIndex((e) => identificadorDeLEstacio(e) === clau);
    this.benzinera.value = String(Math.max(0, index));
  }

  /** @param {readonly EstacioAmbDistancia[]} properes Les de dins del radi. */
  pinta(properes) {
    const teBenzineres = esProperes(this.estat) && properes.some((e) => this.preu(e) > 0);
    perId("dSenseBenzineres").hidden = teBenzineres;
    this.benzinera.disabled = !teBenzineres;
    this.ompleLesBenzineres(teBenzineres ? properes : []);
    this.calcula();
  }

  /**
   * @param {string} text
   * @returns {false} Per poder sortir de `calcula` amb una sola línia.
   */
  avisa(text) {
    perId("dAvis").textContent = text;
    perId("dResultat").hidden = true;
    return false;
  }

  /** @returns {{consum: number, kmQueQueden: number, diposit: number} | false} */
  dadesDelCotxe() {
    const camps = { consum: this.consum, kmQueQueden: this.km, diposit: this.diposit };
    const dades = { consum: 0, kmQueQueden: 0, diposit: 0 };
    for (const { nom, minim, maxim, avis } of DADES_DEL_COTXE) {
      const valor = valorDe(camps[nom]);
      if (!(valor >= minim && valor <= maxim)) return this.avisa(avis);
      dades[nom] = valor;
    }
    return dades;
  }

  calcula() {
    const estacio = this.opcions[Number(this.benzinera.value)];
    const cotxe = this.dadesDelCotxe();
    if (!cotxe) return;
    if (!estacio) {
      this.avisa("");
      return;
    }
    const carrega = dinersPerOmplir({ ...cotxe, preu: this.preu(estacio) });
    perId("dAvis").textContent = "";
    perId("dResultat").hidden = false;
    perId("dEuros").textContent = carrega.euros > 0 ? `${carrega.euros} €` : "Res";
    perId("dDetall").textContent = this.textDelDetall(carrega, estacio);
  }

  /**
   * @param {import("./diposit.js").Carrega} carrega
   * @param {EstacioAmbDistancia} estacio
   */
  textDelDetall(carrega, estacio) {
    const queden = `Et queden uns ${formataLitres(carrega.litresQueQueden)} i n'hi caben ${formataLitres(carrega.litresQueHiCaben)}.`;
    if (carrega.euros === 0) {
      return `${queden} El dipòsit és gairebé ple: no val la pena posar-hi res.`;
    }
    const marge = Math.round(MARGE_DEL_DIPOSIT * 100);
    return `${queden} A ${formataPreu(this.preu(estacio))} €/L, omplir-lo fins dalt serien ${formataEuros(carrega.eurosFinsAlCapdamunt)}. Com que l'autonomia del cotxe no és exacta, es deixa un ${marge} % del dipòsit de marge i s'arrodoneix cap avall, perquè no vessi.`;
  }
}
