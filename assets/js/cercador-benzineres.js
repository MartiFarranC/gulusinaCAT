/** Camp per buscar i triar una benzinera de tot Catalunya. */

import { buscaBenzineres } from "./cerca-benzineres.js";
import { element, perId, perIdDeTipus, puntDeColor } from "./dom.js";
import { formataDistancia, formataPreu } from "./format.js";
import { colorDe } from "./marques.js";

/** @typedef {import("./estat.js").Estat} Estat */
/** @typedef {import("./tipus.js").Estacio} Estacio */
/** @typedef {import("./cerca-benzineres.js").EstacioTrobada} EstacioTrobada */

/** @param {Estacio} estacio */
const llocDe = (estacio) => [estacio.mun, estacio.adr].filter(Boolean).join(", ");

export class CercadorDeBenzineres {
  /**
   * @param {Estat} estat
   * @param {() => void} enTriar Quan canvia la benzinera triada.
   */
  constructor(estat, enTriar) {
    this.estat = estat;
    this.enTriar = enTriar;
    this.cerca = perIdDeTipus("dCerca", HTMLInputElement);
    this.resultats = perId("dResultats");
    /** @type {Estacio | null} */
    this.triada = null;
    /** Si l'ha triada l'usuari; si no, es tria la més propera quan se sap on és. */
    this.esTriadaAMa = false;
    this.cerca.addEventListener("input", () => this.mostraElsResultats());
  }

  /** @param {Estacio} estacio */
  preu(estacio) {
    return estacio[this.estat.combustible] ?? 0;
  }

  /** @param {string} text */
  busca(text) {
    const { estacions, combustible, ubicacio } = this.estat;
    return buscaBenzineres(estacions ?? [], text, { combustible, punt: ubicacio });
  }

  /** @param {Estacio} estacio */
  tria(estacio) {
    this.triada = estacio;
    this.esTriadaAMa = true;
    this.cerca.value = "";
    this.mostraElsResultats();
    this.pintaLaTriada();
    this.enTriar();
  }

  /** @param {EstacioTrobada} estacio */
  resultat(estacio) {
    const boto = element("button", "diposit-opcio");
    boto.type = "button";
    const distancia = estacio.d === null ? [] : [` · ${formataDistancia(estacio.d)}`];
    boto.append(
      puntDeColor(colorDe(estacio.m)),
      element("strong", null, estacio.nom),
      ` · ${llocDe(estacio)} · ${formataPreu(this.preu(estacio))} €/L`,
      ...distancia,
    );
    boto.addEventListener("click", () => this.tria(estacio));
    const item = element("li");
    item.appendChild(boto);
    return item;
  }

  mostraElsResultats() {
    const text = this.cerca.value.trim();
    this.resultats.hidden = !text;
    if (!text) return;
    const trobades = this.busca(text);
    this.resultats.replaceChildren(
      ...(trobades.length
        ? trobades.map((estacio) => this.resultat(estacio))
        : [element("li", "diposit-cap", "Cap benzinera coincideix amb la cerca.")]),
    );
  }

  pintaLaTriada() {
    const text = perId("dTriada");
    text.hidden = !this.triada;
    if (!this.triada) return;
    const estacio = this.triada;
    const preu = this.preu(estacio);
    const nom = element("strong");
    nom.append(puntDeColor(colorDe(estacio.m)), estacio.nom);
    text.replaceChildren(nom, ` · ${llocDe(estacio)}${preu ? ` · ${formataPreu(preu)} €/L` : ""}`);
  }

  /** Torna a pintar amb el combustible i la ubicació actuals. */
  pinta() {
    if (!this.esTriadaAMa && this.estat.ubicacio) this.triada = this.busca("")[0] ?? null;
    this.mostraElsResultats();
    this.pintaLaTriada();
  }
}
