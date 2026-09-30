/** Menú de dreceres a les seccions de la pàgina. */

import { perId } from "./dom.js";
import { indexDeLaSeccioActual } from "./seccio-actual.js";

/** Part de l'alçada de la finestra on hi ha la línia de lectura. */
const LINIA_DE_LECTURA = 0.4;
/** Píxels de marge per considerar que ja s'ha arribat al final de la pàgina. */
const MARGE_DEL_FINAL_PX = 2;

export class Dreceres {
  constructor() {
    this.menu = perId("dreceres");
    this.boto = perId("dreceresBoto");
    /** @type {Array<{enllac: HTMLAnchorElement, objectiu: HTMLElement}>} */
    this.entrades = [...this.menu.querySelectorAll("a")].map((enllac) => ({
      enllac,
      objectiu: perId(enllac.hash.slice(1)),
    }));
    this.boto.addEventListener("click", () => this.obre(!this.menu.classList.contains("obert")));
    this.menu.addEventListener("click", (e) => {
      if (e.target instanceof HTMLAnchorElement) this.obre(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.obre(false);
    });
    this.amagaLesSeccionsAmagades();
    this.marcaLaSeccioActual();
  }

  /** @param {boolean} obert Només té efecte en pantalles estretes, on el menú es desplega. */
  obre(obert) {
    this.menu.classList.toggle("obert", obert);
    this.boto.setAttribute("aria-expanded", String(obert));
  }

  /** Les seccions es mostren i s'amaguen segons les dades: el menú les segueix. */
  amagaLesSeccionsAmagades() {
    const actualitza = () => {
      for (const { enllac, objectiu } of this.entrades) {
        /** @type {HTMLElement} */ (enllac.parentElement).hidden = objectiu.hidden;
      }
    };
    const observador = new MutationObserver(actualitza);
    for (const { objectiu } of this.entrades) {
      observador.observe(objectiu, { attributes: true, attributeFilter: ["hidden"] });
    }
    actualitza();
  }

  /** Marca al menú la secció que s'està llegint. */
  marcaLaSeccio() {
    const posicions = this.entrades.map(({ objectiu }) =>
      objectiu.hidden ? null : objectiu.getBoundingClientRect().top,
    );
    const final = document.documentElement.scrollHeight - MARGE_DEL_FINAL_PX;
    const lectura = {
      linia: innerHeight * LINIA_DE_LECTURA,
      esAlFinal: scrollY + innerHeight >= final,
    };
    const actual = indexDeLaSeccioActual(posicions, lectura);
    this.entrades.forEach(({ enllac }, index) => {
      if (index === actual) enllac.setAttribute("aria-current", "location");
      else enllac.removeAttribute("aria-current");
    });
  }

  /** Torna a marcar la secció en baixar, en canviar la mida i quan una secció apareix. */
  marcaLaSeccioActual() {
    let hiHaUnCalculPendent = false;
    const demana = () => {
      if (hiHaUnCalculPendent) return;
      hiHaUnCalculPendent = true;
      requestAnimationFrame(() => {
        hiHaUnCalculPendent = false;
        this.marcaLaSeccio();
      });
    };
    addEventListener("scroll", demana, { passive: true });
    addEventListener("resize", demana);
    new MutationObserver(demana).observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["hidden"],
    });
    demana();
  }
}
