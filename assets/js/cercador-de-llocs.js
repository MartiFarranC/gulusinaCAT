/** Camp per buscar un lloc o una adreça amb els suggeriments a sota. */

import { element } from "./dom.js";

/** @typedef {import("./ruta-serveis.js").Lloc} Lloc */
/** @typedef {import("./ruta-serveis.js").ServeiDeLlocs} ServeiDeLlocs */

const ESPERA_EN_ESCRIURE_MS = 400;
const LLETRES_MINIMES = 3;

export class CercadorDeLlocs {
  /**
   * @param {object} parts
   * @param {HTMLInputElement} parts.camp
   * @param {HTMLElement} parts.opcions Llista on surten els suggeriments.
   * @param {ServeiDeLlocs} parts.servei
   * @param {(lloc: Lloc | null) => void} enTriar Quan es tria un lloc o se n'esborra el triat.
   */
  constructor({ camp, opcions, servei }, enTriar) {
    this.camp = camp;
    this.opcions = opcions;
    this.servei = servei;
    this.enTriar = enTriar;
    /** @type {Lloc | null} */
    this.triat = null;
    /** Per descartar les respostes d'una cerca que ja no és l'última. */
    this.cerca = 0;
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    this.espera = undefined;
    camp.addEventListener("input", () => this.enEscriure());
    camp.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.opcions.hidden = true;
    });
  }

  /**
   * Posa un lloc com a triat sense buscar-lo.
   *
   * @param {Lloc | null} lloc
   */
  posa(lloc) {
    this.triat = lloc;
    this.camp.value = lloc?.nom ?? "";
    this.opcions.hidden = true;
  }

  enEscriure() {
    if (this.triat) {
      this.triat = null;
      this.enTriar(null);
    }
    clearTimeout(this.espera);
    const text = this.camp.value.trim();
    if (text.length < LLETRES_MINIMES) {
      this.opcions.hidden = true;
      return;
    }
    this.espera = setTimeout(() => void this.busca(text), ESPERA_EN_ESCRIURE_MS);
  }

  /** @param {string} text */
  async busca(text) {
    const aquesta = ++this.cerca;
    /** @type {HTMLElement[]} */
    let elements;
    try {
      const llocs = await this.servei.busca(text);
      elements = llocs.length
        ? llocs.map((lloc) => this.opcio(lloc))
        : [element("li", "diposit-cap", "Cap lloc coincideix amb la cerca.")];
    } catch {
      elements = [element("li", "diposit-cap", "No s'ha pogut buscar. Torna-ho a provar.")];
    }
    if (aquesta !== this.cerca) return;
    this.opcions.replaceChildren(...elements);
    this.opcions.hidden = false;
  }

  /** @param {Lloc} lloc */
  opcio(lloc) {
    const boto = element("button", "diposit-opcio");
    boto.type = "button";
    boto.append(element("strong", null, lloc.nom), lloc.detall ? ` · ${lloc.detall}` : "");
    boto.addEventListener("click", () => {
      this.posa(lloc);
      this.enTriar(lloc);
    });
    const item = element("li");
    item.appendChild(boto);
    return item;
  }
}
