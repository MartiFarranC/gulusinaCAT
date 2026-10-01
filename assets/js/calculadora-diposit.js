/** Calculadora de quants diners cal demanar a la benzinera per omplir el dipòsit. */

import { dinersPerOmplir, MARGE_DEL_DIPOSIT } from "./diposit.js";
import { CercadorDeBenzineres } from "./cercador-benzineres.js";
import { perId, perIdDeTipus } from "./dom.js";
import { formataEuros, formataLitres, formataPreu } from "./format.js";
import { NOM_DEL_COMBUSTIBLE } from "./estat.js";

/** @typedef {import("./estat.js").Estat} Estat */
/** @typedef {import("./tipus.js").Estacio} Estacio */
/** @typedef {import("./preferencies.js").DadesDesadesDelCotxe} DadesDesadesDelCotxe */

/**
 * @typedef {object} AccionsDeLaCalculadora
 * @property {DadesDesadesDelCotxe} cotxe Dades desades l'última vegada.
 * @property {(cotxe: DadesDesadesDelCotxe) => void} desa
 */

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
    this.cercador = new CercadorDeBenzineres(estat, () => this.calcula());
    if (accions.cotxe.consum) this.consum.value = String(accions.cotxe.consum);
    if (accions.cotxe.diposit) this.diposit.value = String(accions.cotxe.diposit);
    for (const camp of [this.consum, this.km, this.diposit]) {
      camp.addEventListener("input", () => this.calcula());
    }
    for (const camp of [this.consum, this.diposit]) {
      camp.addEventListener("change", () => this.desaElCotxe());
    }
    perId("dreceraDiposit").addEventListener("click", (e) => {
      // Sense el salt de l'enllaç, que trauria el cursor del camp
      e.preventDefault();
      this.enfoca();
    });
  }

  /** Porta a la calculadora i deixa el cursor a l'autonomia, que és el que canvia cada vegada. */
  enfoca() {
    const moviment = this.estat.movimentReduit ? "auto" : "smooth";
    perId("dipositSec").scrollIntoView({ behavior: moviment, block: "start" });
    this.km.focus({ preventScroll: true });
  }

  desaElCotxe() {
    const consum = valorDe(this.consum);
    const diposit = valorDe(this.diposit);
    this.accions.desa({
      ...(consum > 0 && { consum }),
      ...(diposit > 0 && { diposit }),
    });
  }

  /** @param {Estacio} estacio */
  preu(estacio) {
    return estacio[this.estat.combustible] ?? 0;
  }

  /** Torna a calcular amb el combustible, la ubicació i les dades de les benzineres actuals. */
  pinta() {
    this.cercador.pinta();
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

  /** @returns {Estacio | false} La benzinera triada, si en té preu; si no, ho avisa. */
  benzineraTriada() {
    const estacio = this.cercador.triada;
    if (!this.estat.estacions) return this.avisa("Encara no hi ha les dades de cada benzinera.");
    if (!estacio) return this.avisa("Busca i tria la benzinera on ets.");
    if (this.preu(estacio)) return estacio;
    const combustible = NOM_DEL_COMBUSTIBLE[this.estat.combustible].toLowerCase();
    return this.avisa(`${estacio.nom} de ${estacio.mun} no té ${combustible}. Tria'n una altra.`);
  }

  calcula() {
    const cotxe = this.dadesDelCotxe();
    const estacio = cotxe && this.benzineraTriada();
    if (!cotxe || !estacio) return;
    const carrega = dinersPerOmplir({ ...cotxe, preu: this.preu(estacio) });
    perId("dAvis").textContent = "";
    perId("dResultat").hidden = false;
    perId("dEuros").textContent = carrega.euros > 0 ? `${carrega.euros} €` : "Res";
    perId("dDetall").textContent = this.textDelDetall(carrega, estacio);
  }

  /**
   * @param {import("./diposit.js").Carrega} carrega
   * @param {Estacio} estacio
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
