/** Els textos i el selector de la pàgina que depenen de la regió triada. */

import { perId } from "./dom.js";
import { deLloc } from "./format.js";

/** @typedef {import("./regio.js").Regio} Regio */

/**
 * Posa el nom de la regió als textos fixos, deixa visibles només els seus i marca el botó.
 *
 * @param {Regio} regio
 */
export function mostraLaRegio(regio) {
  document.title = `On omplo el dipòsit? · Preus de benzineres a ${regio.nom}`;
  for (const text of document.querySelectorAll("[data-nom-de-la-regio]")) {
    text.textContent = regio.nom;
  }
  for (const text of document.querySelectorAll("[data-de-la-regio]")) {
    text.textContent = deLloc(regio.nom);
  }
  for (const bloc of document.querySelectorAll("[data-nomes-a]")) {
    if (bloc instanceof HTMLElement) bloc.hidden = bloc.dataset["nomesA"] !== regio.id;
  }
  for (const enllac of document.querySelectorAll("#regio a")) {
    if (!(enllac instanceof HTMLAnchorElement)) continue;
    const esLaTriada = enllac.dataset["regio"] === regio.id;
    if (esLaTriada) enllac.setAttribute("aria-current", "page");
    else enllac.removeAttribute("aria-current");
  }
  perId("statusText").textContent = `Demanant els preus d'avui al ${regio.font}…`;
}
