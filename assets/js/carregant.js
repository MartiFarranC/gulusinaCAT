/** Animació de càrrega amb la gota del logo, que es va omplint. */

import { element } from "./dom.js";

/** La mateixa gota que assets/icones/logo.svg, retallada al seu contorn. */
const GOTA = "M32 8C26 17 15 28.5 15 40a17 17 0 0 0 34 0C49 28.5 38 17 32 8Z";

/** @returns {HTMLSpanElement} Una gota que s'omple, per posar al costat d'un text d'espera. */
export function iconaDeCarrega() {
  const icona = element("span", "carregant");
  icona.setAttribute("aria-hidden", "true");
  icona.innerHTML = `<svg viewBox="13 6 38 53"><path class="carregant-vora" d="${GOTA}" /><path class="carregant-ple" d="${GOTA}" /></svg>`;
  return icona;
}
