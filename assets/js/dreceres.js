/** Menú de dreceres a les seccions de la pàgina. */

import { perId } from "./dom.js";

/** Franja del mig de la pantalla on s'ha de trobar una secció perquè compti com a actual. */
const FRANJA_ACTUAL = "-40% 0px -55% 0px";

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

  marcaLaSeccioActual() {
    if (!("IntersectionObserver" in window)) return;
    const observador = new IntersectionObserver(
      (entrades) => {
        const visible = entrades.find((e) => e.isIntersecting);
        if (!visible) return;
        for (const { enllac, objectiu } of this.entrades) {
          if (objectiu === visible.target) enllac.setAttribute("aria-current", "location");
          else enllac.removeAttribute("aria-current");
        }
      },
      { rootMargin: FRANJA_ACTUAL },
    );
    for (const { objectiu } of this.entrades) observador.observe(objectiu);
  }
}
