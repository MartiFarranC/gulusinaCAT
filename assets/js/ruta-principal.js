/** Punt d'entrada de la pàgina de la ruta: el mapa a pantalla completa i el panell. */

import { marcaPremut } from "./dom.js";
import { creaEstat } from "./estat.js";
import { llegeixMarquesExcloses, magatzemDelNavegador } from "./preferencies.js";
import { REGIONS } from "./regio.js";
import { RutaAmbBenzineres } from "./ruta.js";

const estat = creaEstat({
  movimentReduit: matchMedia("(prefers-reduced-motion: reduce)").matches,
  // Les mateixes marques que s'han tret al filtre de la pàgina de preus
  excloses: llegeixMarquesExcloses(magatzemDelNavegador()),
  // La ruta fa servir les benzineres de totes les regions
  regio: REGIONS.catalunya,
});
const ruta = new RutaAmbBenzineres(estat);

const botons = document.querySelectorAll("#rCombustible button");
for (const boto of botons) {
  boto.addEventListener("click", () => {
    const triat = /** @type {HTMLElement} */ (boto);
    marcaPremut(botons, (b) => b === triat);
    estat.combustible = triat.dataset["fuel"] === "dsl" ? "dsl" : "g95";
    void ruta.pinta();
  });
}
