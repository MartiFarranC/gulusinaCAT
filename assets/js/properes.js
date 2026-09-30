/** Llista de les benzineres més barates a prop de la ubicació. */

import { element, enllacExtern, marcaPremut, perId, puntDeColor, urlDelMapa } from "./dom.js";
import { elMesPetit } from "./estadistica.js";
import { formataDistancia, formataPreu, plural } from "./format.js";
import { colorDe } from "./marques.js";
import { BENZINERES_PROPERES_PER_PAGINA, NOM_DEL_COMBUSTIBLE, esProperes } from "./estat.js";

/** @typedef {import("./estat.js").Estat} Estat */
/** @typedef {import("./tipus.js").EstacioAmbDistancia} EstacioAmbDistancia */

/**
 * @param {EstacioAmbDistancia} estacio
 * @param {number} preu
 * @param {boolean} esLaMesBarata
 */
function elementDeLaLlista(estacio, preu, esLaMesBarata) {
  const item = element("li", esLaMesBarata ? "sti best" : "sti");
  const nom = element("b");
  nom.append(puntDeColor(colorDe(estacio.m)), estacio.nom);
  const dades = element("div", "stm");
  dades.append(nom, element("span", null, [estacio.mun, estacio.adr].filter(Boolean).join(" · ")));
  const distancia = element("span", "std", formataDistancia(estacio.d));
  const mapa = enllacExtern("Mapa ↗", urlDelMapa(estacio.lat, estacio.lon));
  mapa.setAttribute("aria-label", `Veure ${estacio.nom} de ${estacio.mun} al mapa`);
  distancia.append(mapa);
  item.append(element("span", "stp", formataPreu(preu)), dades, distancia);
  return item;
}

export class Properes {
  /**
   * @param {Estat} estat
   * @param {() => void} aplicaLAmbit Torna a calcular i pintar l'àmbit.
   */
  constructor(estat, aplicaLAmbit) {
    this.estat = estat;
    this.seccio = perId("aprop");
    this.mesBoto = perId("stMore");
    const botonsDOrdre = document.querySelectorAll("#aOrdre button");
    for (const boto of botonsDOrdre) {
      boto.addEventListener("click", () => {
        marcaPremut(botonsDOrdre, (b) => b === boto);
        estat.ordre = /** @type {HTMLElement} */ (boto).dataset["o"] === "dist" ? "dist" : "preu";
        aplicaLAmbit();
      });
    }
    this.mesBoto.addEventListener("click", () => {
      estat.mostrades += BENZINERES_PROPERES_PER_PAGINA;
      aplicaLAmbit();
    });
  }

  /** @param {EstacioAmbDistancia} estacio */
  preu(estacio) {
    return /** @type {number} */ (estacio[this.estat.combustible]);
  }

  /** @param {readonly EstacioAmbDistancia[]} properes */
  ordenades(properes) {
    const ambPreu = properes.filter((e) => this.preu(e) > 0 && !this.estat.excloses.has(e.m));
    if (this.estat.ordre === "dist") return ambPreu.sort((a, b) => a.d - b.d);
    return ambPreu.sort((a, b) => this.preu(a) - this.preu(b) || a.d - b.d);
  }

  /**
   * @param {readonly EstacioAmbDistancia[]} llista
   * @param {EstacioAmbDistancia} barata
   */
  textDeLaLlista(llista, barata) {
    const { estat } = this;
    const quantes = `${llista.length} ${plural(llista.length, "benzinera", "benzineres")}`;
    const combustible = NOM_DEL_COMBUSTIBLE[estat.combustible].toLowerCase();
    return `${quantes} amb ${combustible} a menys de ${estat.radi} km de ${estat.ubicacio?.nom}. La més barata és ${barata.nom} de ${barata.mun}, a ${formataPreu(this.preu(barata))} €/L i ${formataDistancia(barata.d)}.`;
  }

  /** @param {readonly EstacioAmbDistancia[]} properes Les de dins del radi. */
  pinta(properes) {
    const llista = this.ordenades(properes);
    this.seccio.hidden = !esProperes(this.estat) || !llista.length;
    if (this.seccio.hidden) return;
    const barata = elMesPetit(llista, (e) => this.preu(e));
    perId("apropLead").textContent = this.textDeLaLlista(llista, barata);
    const visibles = llista.slice(0, this.estat.mostrades);
    perId("stList").replaceChildren(
      ...visibles.map((e) => elementDeLaLlista(e, this.preu(e), e === barata)),
    );
    this.mesBoto.hidden = llista.length <= this.estat.mostrades;
  }
}
