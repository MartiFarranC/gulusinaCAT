/** Panell d'ubicació: interruptor d'àmbit, GPS, municipi i radi. */

import {
  SVG_NS,
  element,
  elementSvg,
  enllacExtern,
  marcaPremut,
  perId,
  perIdDeTipus,
  urlDelMapa,
} from "./dom.js";
import { formataDistancia } from "./format.js";
import { distancia } from "./geo.js";
import { buscaMunicipi, municipiMesProper, nomDeLaUbicacio } from "./proximitat.js";
import { BENZINERES_PROPERES_PER_PAGINA } from "./estat.js";

/** @typedef {import("./estat.js").Estat} Estat */
/** @typedef {import("./tipus.js").Ubicacio} Ubicacio */

const ICONA_UBICACIO =
  "M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z";
const OPCIONS_DEL_GPS = { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 };
const PERMIS_DENEGAT = 1;
const RETARD_DEL_RADI_MS = 150;
const PRECISIO_EN_METRES_FINS = 1000;
const DISTANCIA_PER_SER_AL_MUNICIPI_KM = 3;

/** @param {number} valor */
const coordenada = (valor) => valor.toFixed(4).replace(".", ",");

/** @param {Ubicacio} ubicacio */
const coordenades = (ubicacio) => ` · ${coordenada(ubicacio.lat)}, ${coordenada(ubicacio.lon)}`;

/**
 * @param {Estat} estat
 * @param {Ubicacio} ubicacio
 * @param {HTMLElement} text
 */
function descriuElGps(estat, ubicacio, text) {
  const municipi = municipiMesProper(ubicacio, estat.municipis);
  text.append("La teva ubicació: ");
  if (municipi) {
    const onEs =
      municipi.d < DISTANCIA_PER_SER_AL_MUNICIPI_KM
        ? "a "
        : `a ${formataDistancia(municipi.d)} de `;
    text.append(onEs, element("strong", null, municipi.nom));
  }
  text.append(element("span", "lc", coordenades(ubicacio)));
  if (ubicacio.prec) {
    const precisio =
      ubicacio.prec < PRECISIO_EN_METRES_FINS
        ? `${Math.round(ubicacio.prec)} m`
        : formataDistancia(ubicacio.prec / 1000);
    text.append(element("span", "lc", ` · precisió ±${precisio}`));
  }
  ubicacio.nom = nomDeLaUbicacio(municipi);
}

function iconaDeLaUbicacio() {
  const icona = document.createElementNS(SVG_NS, "svg");
  icona.setAttribute("viewBox", "0 0 24 24");
  icona.setAttribute("class", "pin");
  icona.setAttribute("aria-hidden", "true");
  elementSvg("path", { d: ICONA_UBICACIO }, icona);
  return icona;
}

export class PanellDUbicacio {
  /**
   * @param {Estat} estat
   * @param {() => void} aplicaLAmbit Torna a calcular i pintar l'àmbit.
   */
  constructor(estat, aplicaLAmbit) {
    this.estat = estat;
    this.aplicaLAmbit = aplicaLAmbit;
    this.panell = perId("near");
    this.municipi = perIdDeTipus("muni", HTMLInputElement);
    this.radi = perIdDeTipus("radi", HTMLInputElement);
    this.botonsDAmbit = document.querySelectorAll("#scope button");
    this.calPortarAlPanell = false;
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    this.esperaDelRadi = undefined;
    this.escoltaElsControls();
  }

  escoltaElsControls() {
    for (const boto of this.botonsDAmbit) {
      boto.addEventListener("click", () => this.triaLAmbit(/** @type {HTMLElement} */ (boto)));
    }
    perId("gps").addEventListener("click", () => {
      this.marcaLAmbit("properes");
      this.estat.ubicacio = null;
      this.municipi.value = "";
      this.localitza(true);
    });
    this.municipi.addEventListener("change", () => this.triaElMunicipiIActiva());
    this.municipi.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      this.triaElMunicipiIActiva();
    });
    this.radi.addEventListener("input", () => this.canviaElRadi());
  }

  /** @param {HTMLElement} boto */
  triaLAmbit(boto) {
    this.marcaLAmbit(boto.dataset["scope"] === "properes" ? "properes" : "totes");
    if (this.estat.ambit !== "properes") return this.aplicaLAmbit();
    perId("mapSec").hidden = false;
    this.calPortarAlPanell = true;
    this.localitza(true);
    this.portaAlPanell();
  }

  canviaElRadi() {
    this.estat.radi = Number(this.radi.value);
    perId("radiv").textContent = `${this.estat.radi} km`;
    clearTimeout(this.esperaDelRadi);
    this.esperaDelRadi = setTimeout(this.aplicaLAmbit, RETARD_DEL_RADI_MS);
  }

  /** @param {string} [text] */
  missatge(text) {
    perId("nearMsg").textContent = text || "";
  }

  mostraLaUbicacio() {
    const text = perId("locInfo");
    const { ubicacio } = this.estat;
    text.replaceChildren();
    text.hidden = this.estat.ambit !== "properes" || !ubicacio;
    if (!ubicacio || text.hidden) return;
    text.appendChild(iconaDeLaUbicacio());
    if (ubicacio.gps) descriuElGps(this.estat, ubicacio, text);
    else {
      const nom = element("strong", null, ubicacio.nom);
      text.append("Ubicació triada: ", nom, element("span", "lc", coordenades(ubicacio)));
    }
    text.append(" · ", enllacExtern("Veure al mapa ↗", urlDelMapa(ubicacio.lat, ubicacio.lon)));
  }

  portaAlPanell() {
    const moviment = this.estat.movimentReduit ? "auto" : "smooth";
    this.panell.scrollIntoView({ behavior: moviment, block: "start" });
  }

  /** Quan arriba la ubicació, el contingut de sobre canvia d'alçada: es torna a portar al panell. */
  portaAlPanellSiCal() {
    if (!this.calPortarAlPanell || this.estat.ambit !== "properes") return;
    this.calPortarAlPanell = false;
    requestAnimationFrame(() => this.portaAlPanell());
  }

  /** @param {GeolocationPosition} posicio */
  enArribarLaPosicio({ coords }) {
    const { latitude: lat, longitude: lon, accuracy: prec } = coords;
    const ubicacio = { lat, lon, nom: "la teva ubicació", gps: true, prec };
    this.estat.ubicacio = ubicacio;
    const distancies = (this.estat.estacions ?? []).map((e) => distancia(ubicacio, e));
    const mesPropera = Math.min(...distancies);
    this.aplicaLAmbit();
    if (mesPropera <= this.estat.radi) return;
    this.missatge(
      `La benzinera més propera és a ${formataDistancia(mesPropera)}. Les dades són només de Catalunya: augmenta el radi o escriu un municipi.`,
    );
  }

  /** @param {GeolocationPositionError} error */
  enFallarElGps(error) {
    this.missatge(
      error.code === PERMIS_DENEGAT
        ? "No has donat permís per fer servir la ubicació. Pots escriure un municipi."
        : "No s'ha pogut obtenir la ubicació. Escriu un municipi.",
    );
    this.aplicaLAmbit();
    this.municipi.focus();
  }

  /**
   * Demana el GPS (el navegador mostra el permís) i, si no, deixa escriure un municipi.
   *
   * @param {boolean} demanaElGps
   */
  localitza(demanaElGps) {
    const calElGps = !this.estat.ubicacio && demanaElGps;
    if (!this.estat.estacions) {
      this.missatge(
        "Encara no hi ha les dades de cada benzinera. Es mostren les de tot Catalunya; torna-ho a provar d'aquí a una estona.",
      );
    } else if (calElGps && !("geolocation" in navigator)) {
      this.missatge("Aquest navegador no pot donar la ubicació. Escriu un municipi.");
    } else if (calElGps) {
      this.missatge("Demanant la teva ubicació…");
      navigator.geolocation.getCurrentPosition(
        (posicio) => this.enArribarLaPosicio(posicio),
        (error) => this.enFallarElGps(error),
        OPCIONS_DEL_GPS,
      );
      return;
    }
    this.aplicaLAmbit();
  }

  /** @param {"totes" | "properes"} ambit */
  marcaLAmbit(ambit) {
    this.estat.ambit = ambit;
    this.estat.mostrades = BENZINERES_PROPERES_PER_PAGINA;
    marcaPremut(this.botonsDAmbit, (boto) => boto.dataset["scope"] === ambit);
  }

  triaElMunicipi() {
    const text = this.municipi.value.trim();
    if (!text) return;
    const trobat = buscaMunicipi(text, this.estat.municipis);
    if (!trobat) {
      this.missatge(
        `No trobo «${text}» entre els municipis amb benzinera. Tria'n un de la llista.`,
      );
      return;
    }
    this.municipi.value = trobat.nom;
    this.estat.ubicacio = { lat: trobat.lat, lon: trobat.lon, nom: trobat.nom };
    this.estat.mostrades = BENZINERES_PROPERES_PER_PAGINA;
    this.aplicaLAmbit();
  }

  triaElMunicipiIActiva() {
    if (this.municipi.value.trim()) this.marcaLAmbit("properes");
    this.triaElMunicipi();
  }

  /** @param {boolean} esProperes Si l'àmbit és el de les properes. */
  mostra(esProperes) {
    this.panell.hidden = false;
    perId("radiRow").hidden = !esProperes;
    if (!esProperes) {
      this.missatge(
        "Fes servir la teva ubicació o escriu un municipi per veure només les benzineres properes.",
      );
    }
    this.mostraLaUbicacio();
  }
}
