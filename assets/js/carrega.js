/** Ordre de càrrega de les dades i estat que se'n mostra. */

import {
  llegeixElMinisteri,
  llegeixLAnual,
  llegeixLHistoric,
  llegeixLaCopia,
  llegeixLesEstacions,
} from "./dades.js";
import { diaIsoDeLaFecha, textDeLaCopia } from "./dates.js";
import { element, perId } from "./dom.js";
import { calEvitarElMinisteri, recordaElMinisteri } from "./preferencies.js";
import { llegeixEstacions, municipisDe } from "./proximitat.js";
import { marquesDeLaPublicacio, mitjanaCompleta } from "./publicacio.js";

/** @typedef {import("./estat.js").Estat} Estat */
/** @typedef {import("./dades.js").PreusLlegits} PreusLlegits */
/** @typedef {import("./ministeri.js").DocumentEstacions} DocumentEstacions */

/**
 * @typedef {object} Accions
 * @property {() => void} aplicaLAmbit
 * @property {(demanaElGps: boolean) => void} localitza
 * @property {() => void} pinta
 * @property {import("./evolucio.js").Evolucio} evolucio
 * @property {Storage | null} magatzem
 */

/**
 * @param {"live" | "cache" | "off"} estatDeLaFont
 * @param {string} text
 */
function mostraLaFont(estatDeLaFont, text) {
  perId("status").dataset["s"] = estatDeLaFont;
  perId("statusText").textContent = text;
}

export class Carrega {
  /**
   * @param {Estat} estat
   * @param {Accions} accions
   */
  constructor(estat, accions) {
    this.estat = estat;
    this.accions = accions;
  }

  /** @param {DocumentEstacions} document */
  aplicaLesEstacions(document) {
    const { estat } = this;
    estat.estacions = llegeixEstacions(document);
    estat.municipis = municipisDe(estat.estacions);
    const opcions = [...estat.municipis.values()]
      .sort((a, b) => a.nom.localeCompare(b.nom, "ca"))
      .map((municipi) => Object.assign(element("option"), { value: municipi.nom }));
    perId("munis").replaceChildren(...opcions);
  }

  /**
   * @param {PreusLlegits} preus
   * @param {string} origen
   * @returns {boolean} Si hi havia marques reconegudes.
   */
  aplicaLesMarques(preus, origen) {
    const { estat } = this;
    const marques = marquesDeLaPublicacio(preus.marques, origen);
    if (!marques) return false;
    estat.marques = marques;
    estat.mitjana = mitjanaCompleta(preus.catalunya);
    estat.base = { marques, mitjana: estat.mitjana };
    if (estat.ambit === "properes") this.accions.localitza(false);
    return true;
  }

  /** @returns {Promise<boolean>} Si s'han pogut llegir els preus en directe. */
  async provaElMinisteri() {
    const { magatzem } = this.accions;
    if (calEvitarElMinisteri(magatzem, Date.now())) return false;
    try {
      const preus = await llegeixElMinisteri();
      if (!this.aplicaLesMarques(preus, "avui")) return false;
      this.aplicaLesEstacions(preus.estacions);
      recordaElMinisteri(magatzem, null);
      this.estat.diaDelsPreus = diaIsoDeLaFecha(preus.fecha);
      mostraLaFont("live", `Preus en directe del Ministeri · ${preus.fecha.slice(0, 16)}`);
      return true;
    } catch {
      recordaElMinisteri(magatzem, Date.now());
      console.info("El navegador no pot llegir el Ministeri directament; es fa servir preus.json.");
      return false;
    }
  }

  /** @returns {Promise<boolean>} Si s'ha pogut llegir la còpia de preus.json. */
  async provaLaCopia() {
    try {
      const preus = await llegeixLaCopia();
      if (!this.aplicaLesMarques(preus, preus.fecha.slice(0, 10))) return false;
      this.estat.diaDelsPreus = diaIsoDeLaFecha(preus.fecha);
      mostraLaFont("cache", textDeLaCopia(preus.fecha, Date.now()));
      return true;
    } catch {
      console.info("preus.json no disponible; es mostren els preus desats a la pàgina.");
      return false;
    }
  }

  /** Directe del Ministeri; si no, la còpia de GitHub Actions; si no, els preus de la pàgina. */
  async carregaElsPreus() {
    if ((await this.provaElMinisteri()) || (await this.provaLaCopia())) {
      this.accions.pinta();
      return;
    }
    mostraLaFont(
      "off",
      "No s'han pogut carregar els preus d'avui. Es mostren preus de finals de setembre.",
    );
  }

  async carregaLesEstacions() {
    const document = await llegeixLesEstacions();
    if (!document || this.estat.estacions) return;
    this.aplicaLesEstacions(document);
    if (this.estat.base) this.accions.aplicaLAmbit();
  }

  /** @returns {Promise<void>} Quan s'han llegit els dos històrics (encara que no hi siguin). */
  carregaElsHistorics() {
    const historic = llegeixLHistoric().then((dies) => {
      this.estat.historic = dies;
    });
    const anual = llegeixLAnual().then(({ anys, noms }) => {
      this.estat.anual = anys;
      this.estat.nomsAnual = noms;
    });
    return Promise.all([historic, anual]).then(() => undefined);
  }

  /** Ho demana tot alhora i, quan tot ha arribat, pinta la pàgina sencera. */
  async carregaTot() {
    const estacions = this.carregaLesEstacions();
    const historics = this.carregaElsHistorics();
    await this.carregaElsPreus();
    await Promise.all([estacions, historics]);
    const { aplicaLAmbit, evolucio } = this.accions;
    aplicaLAmbit();
    evolucio.pintaMarques();
    evolucio.dibuixaDies(true);
    evolucio.dibuixaAnys(false);
    evolucio.animaElsAnysQuanEsVegin();
  }
}
