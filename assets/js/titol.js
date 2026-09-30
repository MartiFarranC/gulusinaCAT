import { element } from "./dom.js";

const RETARD_PER_LLETRA_MS = 28;

/**
 * Omple el títol amb una lletra per element perquè cada una pugi des de sota.
 *
 * @param {HTMLElement} titol
 * @param {string} text
 */
export function animaElTitol(titol, text) {
  let lletra = 0;
  text.split(" ").forEach((paraula, i) => {
    if (i) {
      titol.appendChild(document.createTextNode(" "));
      lletra += 2;
    }
    const contenidor = element("span", "w");
    contenidor.setAttribute("aria-hidden", "true");
    for (const caracter of paraula) {
      const span = element("span", null, caracter);
      span.style.animationDelay = `${lletra++ * RETARD_PER_LLETRA_MS}ms`;
      contenidor.appendChild(span);
    }
    titol.appendChild(contenidor);
  });
}
