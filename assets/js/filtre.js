/** Filtre per triar quines marques es comparen. */

import { element, perId, perIdDeTipus, puntDeColor } from "./dom.js";
import { ALTRES, colorDe, normalitza } from "./marques.js";

/** @typedef {import("./estat.js").Estat} Estat */
/** @typedef {{id: string, nom: string, color: string, n?: number}} MarcaDelFiltre */

/**
 * @param {Estat} estat
 * @returns {MarcaDelFiltre[]} Totes les marques de Catalunya (també les que només tenen
 *   benzineres a estacions.json), per ordre alfabètic i amb les independents al final.
 */
function totesLesMarques(estat) {
  /** @type {MarcaDelFiltre[]} */
  const marques = [...(estat.base?.marques ?? estat.marques)];
  const conegudes = new Set(marques.map((m) => m.id));
  /** @type {Map<string, MarcaDelFiltre & {n: number}>} */
  const noves = new Map();
  for (const estacio of estat.estacions ?? []) {
    if (conegudes.has(estacio.m)) continue;
    const marca = noves.get(estacio.m) ?? {
      id: estacio.m,
      nom: estacio.nom,
      color: colorDe(estacio.m),
      n: 0,
    };
    marca.n++;
    noves.set(estacio.m, marca);
  }
  marques.push(...noves.values());
  return marques.sort((a, b) =>
    a.id === ALTRES ? 1 : b.id === ALTRES ? -1 : a.nom.localeCompare(b.nom, "ca"),
  );
}

/**
 * @typedef {object} AccionsDelFiltre
 * @property {() => void} enCanviar Quan canvien les marques excloses.
 * @property {(excloses: ReadonlySet<string>) => void} desa
 */

export class Filtre {
  /**
   * @param {Estat} estat
   * @param {AccionsDelFiltre} accions
   */
  constructor(estat, accions) {
    this.estat = estat;
    this.accions = accions;
    this.panell = perId("filtre");
    this.boto = perId("filtreBtn");
    this.cerca = perIdDeTipus("filtreCerca", HTMLInputElement);
    this.llista = perId("filtreLlista");
    this.boto.addEventListener("click", () => this.obreOTanca());
    this.cerca.addEventListener("input", () => this.pinta());
    perId("filtreTotes").addEventListener("click", () => this.marcaLesQueCoincideixen(true));
    perId("filtreCap").addEventListener("click", () => this.marcaLesQueCoincideixen(false));
  }

  obreOTanca() {
    const obre = this.panell.hidden;
    this.panell.hidden = !obre;
    this.boto.setAttribute("aria-expanded", String(obre));
    this.pinta();
    if (obre) this.cerca.focus({ preventScroll: true });
  }

  coincideixen() {
    const text = normalitza(this.cerca.value);
    return totesLesMarques(this.estat).filter((m) => !text || normalitza(m.nom).includes(text));
  }

  /** @param {boolean} esTriades */
  marcaLesQueCoincideixen(esTriades) {
    for (const marca of this.coincideixen()) {
      if (esTriades) this.estat.excloses.delete(marca.id);
      else this.estat.excloses.add(marca.id);
    }
    this.aplica();
  }

  aplica() {
    this.accions.desa(this.estat.excloses);
    this.accions.enCanviar();
  }

  /** @param {MarcaDelFiltre} marca */
  opcio(marca) {
    const { excloses } = this.estat;
    const casella = element("input");
    casella.type = "checkbox";
    casella.checked = !excloses.has(marca.id);
    casella.onchange = () => {
      if (casella.checked) excloses.delete(marca.id);
      else excloses.add(marca.id);
      this.aplica();
    };
    const etiqueta = element("label", "fm");
    const benzineres = element("span", "fc", marca.n ? String(marca.n) : "");
    etiqueta.append(
      casella,
      puntDeColor(marca.color),
      element("span", "fn", marca.nom),
      benzineres,
    );
    return etiqueta;
  }

  pinta() {
    const totes = totesLesMarques(this.estat);
    const triades = totes.filter((m) => !this.estat.excloses.has(m.id)).length;
    perId("filtreTxt").textContent =
      triades === totes.length ? "Marques: totes" : `Marques: ${triades} de ${totes.length}`;
    this.boto.classList.toggle("actiu", triades < totes.length);
    if (this.panell.hidden) return;
    const opcions = this.coincideixen().map((marca) => this.opcio(marca));
    this.llista.replaceChildren(...opcions);
    if (!opcions.length) {
      this.llista.appendChild(element("p", "filtre-nota", "Cap marca coincideix amb la cerca."));
    }
  }
}
