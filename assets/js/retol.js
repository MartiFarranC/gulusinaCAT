/** Rètol de carretera amb els preus de totes les marques, que llisca. */

import { element, perId } from "./dom.js";
import { formataPreu } from "./format.js";
import { NOM_DEL_COMBUSTIBLE, preuDe } from "./estat.js";

/** @typedef {import("./tipus.js").Marca} Marca */
/** @typedef {import("./estat.js").Estat} Estat */
/** @typedef {import("./tendencia.js").Tendencia} Tendencia */

const SEGONS_MINIMS = 30;
const SEGONS_PER_MARCA = 5;

/**
 * @param {Estat} estat
 * @param {Marca} marca
 * @param {Tendencia | null} canvi
 */
function elementDeMarca(estat, marca, canvi) {
  const item = element("div", "tk");
  const color = element("span", "sw");
  color.style.background = marca.color;
  item.append(
    color,
    element("b", null, marca.nom),
    element("span", "t", NOM_DEL_COMBUSTIBLE[estat.combustible]),
    element("span", "p", formataPreu(preuDe(estat, marca))),
  );
  if (canvi) item.appendChild(element("span", "t", canvi.curt));
  return item;
}

/**
 * @param {Estat} estat
 * @param {readonly Marca[]} marques
 * @param {(marca: Marca) => Tendencia | null} tendencia
 */
export function pintaElRetol(estat, marques, tendencia) {
  const pista = perId("track");
  pista.replaceChildren();
  // Amb dues còpies seguides, el rètol pot lliscar sense fi
  const copies = estat.movimentReduit ? 1 : 2;
  for (let copia = 0; copia < copies; copia++) {
    const grup = element("div");
    grup.style.display = "flex";
    if (estat.movimentReduit) {
      grup.style.flexWrap = "wrap";
      grup.style.justifyContent = "center";
      grup.style.rowGap = "8px";
    }
    for (const marca of marques) grup.appendChild(elementDeMarca(estat, marca, tendencia(marca)));
    pista.appendChild(grup);
  }
  pista.style.animationDuration = `${Math.max(SEGONS_MINIMS, marques.length * SEGONS_PER_MARCA)}s`;
}
