/** Rètols de les quatre marques més barates, amb els dígits que giren. */

import { iconaDeCarrega } from "./carregant.js";
import { dins, element, enllacExtern, urlDeLaRuta } from "./dom.js";
import { formataCentims, formataDistancia, formataPreu, ordinal } from "./format.js";

/** @typedef {import("./tipus.js").Marca} Marca */
/** @typedef {import("./tendencia.js").Tendencia} Tendencia */

const NOMBRE_DE_RETOLS = 4;
const ALCADA_DIGIT_EM = 1.15;
const RETARD_ENTRADA_MS = 450;
const RETARD_ENTRE_RETOLS_MS = 110;

const PLANTILLA = `<div class="brand"><span class="bn"><i class="bd"></i><span></span></span><span class="rank"></span></div>
  <div class="board"><div class="badge" aria-hidden="true">Més barata</div><div class="digits" aria-hidden="true"></div><span class="eur">€/L</span></div>
  <p class="meta"></p><p class="trend" hidden></p><p class="lloc" hidden></p>`;

/**
 * @param {HTMLElement} retol
 * @param {string} text Preu formatat, com «1,459».
 */
function posaDigits(retol, text) {
  const digits = dins(retol, ".digits");
  if (!digits.children.length) {
    for (const caracter of text) {
      if (!/\d/.test(caracter)) {
        digits.appendChild(element("span", "sep", caracter));
        continue;
      }
      const columna = element("div", "col");
      for (let d = 0; d < 10; d++) columna.appendChild(element("span", null, d));
      digits.appendChild(columna);
    }
  }
  [...text].forEach((caracter, i) => {
    const node = digits.children[i];
    if (node instanceof HTMLElement && /\d/.test(caracter)) {
      node.style.transform = `translateY(-${Number(caracter) * ALCADA_DIGIT_EM}em)`;
    }
  });
}

/**
 * @param {HTMLElement} retol
 * @param {Marca} marca
 * @param {boolean} movimentReduit
 */
function canviaDeMarca(retol, marca, movimentReduit) {
  retol.dataset["id"] = marca.id;
  dins(retol, ".bn span").textContent = marca.nom;
  dins(retol, ".bn .bd").style.background = marca.color;
  if (movimentReduit || !retol.classList.contains("in")) return;
  retol.classList.remove("swap");
  void retol.offsetWidth;
  retol.classList.add("swap");
}

/**
 * @typedef {object} LlocDeLesMarques Per trobar la benzinera més propera de cada marca.
 * @property {boolean} hiHaEstacions Si hi ha les dades de cada benzinera.
 * @property {boolean} teUbicacio
 * @property {"cap" | "buscant" | "fallada"} peticio Del GPS.
 * @property {(marca: Marca) => import("./tipus.js").EstacioAmbDistancia | null} mesPropera
 * @property {() => void} demana Demana la ubicació del GPS.
 *
 * @typedef {object} OpcionsDelsTotems
 * @property {(marca: Marca) => number} preu Del combustible triat.
 * @property {(marca: Marca) => Tendencia | null} tendencia
 * @property {LlocDeLesMarques} lloc
 */

/**
 * @param {LlocDeLesMarques} lloc
 * @returns {Array<Node | string>} El botó per demanar la ubicació, o l'espera, o l'avís si ha fallat.
 */
function sensUbicacio(lloc) {
  if (lloc.peticio === "buscant") return [iconaDeCarrega(), " Buscant on ets…"];
  const boto = element("button", "enllac-boto", "Troba la més propera");
  boto.type = "button";
  boto.addEventListener("click", lloc.demana);
  const avis = lloc.peticio === "fallada" ? [" · No s'ha pogut saber on ets."] : [];
  return [boto, ...avis];
}

/**
 * La benzinera de la marca més propera a l'usuari, amb l'enllaç per arribar-hi.
 *
 * @param {HTMLElement} retol
 * @param {Marca} marca
 * @param {LlocDeLesMarques} lloc
 */
function pintaElLloc(retol, marca, lloc) {
  const text = dins(retol, ".lloc");
  const estacio = lloc.teUbicacio ? lloc.mesPropera(marca) : null;
  text.hidden = !lloc.hiHaEstacions || (lloc.teUbicacio && !estacio);
  if (text.hidden) return;
  if (!estacio) {
    text.replaceChildren(...sensUbicacio(lloc));
    return;
  }
  const ruta = enllacExtern("Com arribar ↗", urlDeLaRuta(estacio.lat, estacio.lon));
  ruta.setAttribute("aria-label", `Com arribar a ${estacio.nom} de ${estacio.mun}`);
  text.replaceChildren(`Més propera: ${estacio.mun} · ${formataDistancia(estacio.d)} · `, ruta);
}

export class Totems {
  /**
   * @param {HTMLElement} contenidor
   * @param {boolean} movimentReduit
   */
  constructor(contenidor, movimentReduit) {
    this.movimentReduit = movimentReduit;
    this.retols = Array.from({ length: NOMBRE_DE_RETOLS }, (_, i) => {
      const retol = element("article", "totem");
      retol.id = `t-${i}`;
      retol.innerHTML = PLANTILLA;
      contenidor.appendChild(retol);
      return retol;
    });
  }

  /** Fa entrar els rètols un darrere l'altre, quan ja es veuen. */
  entra() {
    this.retols.forEach((retol, i) => {
      const retard = this.movimentReduit ? 0 : RETARD_ENTRADA_MS + i * RETARD_ENTRE_RETOLS_MS;
      setTimeout(() => retol.classList.add("in"), retard);
    });
  }

  /**
   * @param {HTMLElement} retol
   * @param {Marca} marca
   * @param {{posicio: number, minim: number, opcions: OpcionsDelsTotems}} context
   */
  pintaRetol(retol, marca, { posicio, minim, opcions }) {
    const preu = opcions.preu(marca);
    if (retol.dataset["id"] !== marca.id) canviaDeMarca(retol, marca, this.movimentReduit);
    posaDigits(retol, formataPreu(preu));
    dins(retol, ".rank").textContent = ordinal(posicio);
    dins(retol, ".meta").textContent =
      posicio === 1
        ? `La més barata · ${marca.data}`
        : `+${formataCentims(preu - minim)} cèntims/L · ${marca.data}`;
    const canvi = opcions.tendencia(marca);
    const text = dins(retol, ".trend");
    text.hidden = !canvi;
    text.textContent = canvi ? canvi.text : "";
    retol.setAttribute(
      "aria-label",
      `${posicio}a més barata: ${marca.nom}, ${formataPreu(preu)} euros el litre`,
    );
    retol.classList.toggle("best", posicio === 1);
    pintaElLloc(retol, marca, opcions.lloc);
  }

  /**
   * @param {readonly Marca[]} marques Les més barates, ordenades.
   * @param {OpcionsDelsTotems} opcions
   */
  pinta(marques, opcions) {
    const minim = marques[0] ? opcions.preu(marques[0]) : 0;
    this.retols.forEach((retol, i) => {
      const marca = marques[i];
      retol.hidden = !marca;
      if (marca) this.pintaRetol(retol, marca, { posicio: i + 1, minim, opcions });
    });
  }
}
