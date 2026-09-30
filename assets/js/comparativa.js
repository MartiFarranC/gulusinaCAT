/** Totes les marques, amb el preu mitjà i la franja de preus, respecte a la mitjana. */

import { dins, element, enllacExtern, perId, urlDelMapa } from "./dom.js";
import { formataCentims, formataPreu, plural } from "./format.js";
import { ALTRES } from "./marques.js";
import {
  MARQUES_VISIBLES_A_LA_COMPARATIVA,
  esProperes,
  nomDeLaReferencia,
  preuDe,
} from "./estat.js";

/** @typedef {import("./tipus.js").Marca} Marca */
/** @typedef {import("./estat.js").Estat} Estat */

const PLANTILLA_FILA = `<b class="cn"><span class="rk"></span><i class="bd"></i><span class="nm"></span></b><div class="ctrack"><span class="band"></span><span class="cat"></span><span class="pt"></span></div><span class="cv"></span><p class="cheap"></p>`;
const DURADA_REORDENACIO_MS = 750;
const PAS_DE_L_EIX = 50;
const MARGE_ETIQUETA_PX = 8;
const DIFERENCIA_IGUAL = 0.0005;

/**
 * Mou les files al nou ordre i les anima des d'on eren (tècnica FLIP).
 *
 * @param {HTMLElement} contenidor
 * @param {readonly HTMLElement[]} files
 * @param {boolean} movimentReduit
 */
function reordena(contenidor, files, movimentReduit) {
  const abans = new Map(files.map((fila) => [fila, fila.getBoundingClientRect()]));
  for (const fila of files) contenidor.appendChild(fila);
  if (movimentReduit) return;
  for (const fila of files) {
    const origen = /** @type {DOMRect} */ (abans.get(fila));
    const desti = fila.getBoundingClientRect();
    const dx = origen.left - desti.left;
    const dy = origen.top - desti.top;
    if (!dx && !dy) continue;
    fila.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: "none" }], {
      duration: DURADA_REORDENACIO_MS,
      easing: "cubic-bezier(.16,1,.3,1)",
    });
  }
}

/**
 * @param {HTMLElement} contenidor
 * @param {Marca} marca
 */
function filaDe(contenidor, marca) {
  const existent = document.getElementById(`k-${marca.id}`);
  if (existent) return existent;
  const fila = element("div", "cr");
  fila.id = `k-${marca.id}`;
  if (marca.id === ALTRES) fila.classList.add("grup");
  fila.innerHTML = PLANTILLA_FILA;
  dins(fila, ".bd").style.background = marca.color;
  dins(fila, ".nm").textContent = marca.nom;
  contenidor.appendChild(fila);
  return fila;
}

/**
 * @typedef {object} Escala
 * @property {number} baix
 * @property {number} alt
 * @property {number | null} mitjana De totes les benzineres de l'àmbit.
 * @property {(valor: number) => string} posicio Percentatge de l'eix on va un preu.
 * @property {(diferencia: number) => string} amplada Percentatge de l'eix que ocupa una franja.
 */

/**
 * @param {Estat} estat
 * @param {readonly Marca[]} marques
 * @param {number | null} mitjana
 * @returns {Escala}
 */
function escalaDe(estat, marques, mitjana) {
  const combustible = estat.combustible;
  const franges = marques.flatMap((m) => m.rang?.[combustible] ?? []);
  const valors = [
    ...(mitjana ? [mitjana] : []),
    ...marques.map((m) => preuDe(estat, m)),
    ...franges,
  ];
  const baix = Math.floor(Math.min(...valors) * PAS_DE_L_EIX) / PAS_DE_L_EIX;
  const alt = Math.ceil(Math.max(...valors) * PAS_DE_L_EIX) / PAS_DE_L_EIX;
  const amplada = (/** @type {number} */ diferencia) =>
    `${((diferencia / (alt - baix || 1)) * 100).toFixed(2)}%`;
  return { baix, alt, mitjana, amplada, posicio: (valor) => amplada(valor - baix) };
}

/**
 * Etiquetes de l'eix: els extrems i la mitjana. Amaga els extrems si trepitgen la mitjana.
 *
 * @param {Estat} estat
 * @param {Escala} escala
 * @param {number} mitjana
 */
function pintaLEix(estat, { baix, alt, posicio }, mitjana) {
  const eix = perId("cscale");
  const extrem = (/** @type {number} */ valor, /** @type {string} */ esquerra) => {
    const span = element("span", null, valor.toFixed(2).replace(".", ","));
    span.style.left = esquerra;
    return span;
  };
  const deBaix = extrem(baix, "0%");
  const deDalt = extrem(alt, "100%");
  deDalt.style.translate = "-100% 0";
  const referencia = `${esProperes(estat) ? "Zona" : "Catalunya"} ${formataPreu(mitjana)}`;
  const deLaMitjana = element("span", "cl", referencia);
  deLaMitjana.style.left = posicio(mitjana);
  eix.replaceChildren(deBaix, deDalt, deLaMitjana);
  const ample = eix.clientWidth;
  const centre = ((mitjana - baix) / (alt - baix)) * ample;
  const meitat = deLaMitjana.offsetWidth / 2 + MARGE_ETIQUETA_PX;
  deBaix.hidden = centre - meitat < deBaix.offsetWidth;
  deDalt.hidden = centre + meitat > ample - deDalt.offsetWidth;
}

/**
 * @param {Estat} estat
 * @param {HTMLElement} valor
 * @param {Marca} marca
 * @param {number} mitjana
 * @returns {string} La descripció de la diferència per a l'etiqueta accessible.
 */
function pintaLaDiferencia(estat, valor, marca, mitjana) {
  const diferencia = preuDe(estat, marca) - mitjana;
  const esIgual = Math.abs(diferencia) < DIFERENCIA_IGUAL;
  const centims = formataCentims(Math.abs(diferencia));
  valor.appendChild(
    element(
      "small",
      null,
      esIgual
        ? "= mitjana"
        : `${diferencia < 0 ? "−" : "+"}${centims} c ${diferencia < 0 ? "per sota" : "per sobre"}`,
    ),
  );
  const quant = esIgual
    ? "igual que"
    : `${centims} cèntims ${diferencia < 0 ? "per sota de" : "per sobre de"}`;
  return `, ${quant} la mitjana de ${nomDeLaReferencia(estat)}`;
}

/**
 * @param {Estat} estat
 * @param {HTMLElement} fila
 * @param {Marca} marca
 */
function pintaLaMesBarata(estat, fila, marca) {
  const text = dins(fila, ".cheap");
  text.replaceChildren();
  if (marca.n) text.append(`${marca.n} ${plural(marca.n, "benzinera", "benzineres")}`);
  const barata = marca.barata?.[estat.combustible];
  if (!barata?.preu) return;
  text.append(" · La més barata: ", element("strong", null, `${formataPreu(barata.preu)} €`));
  if (barata.municipi) text.append(` a ${barata.municipi}`);
  if (barata.lat && barata.lon) {
    text.append(" · ", enllacExtern("Veure al mapa ↗", urlDelMapa(barata.lat, barata.lon)));
  }
}

/**
 * @param {Estat} estat
 * @param {HTMLElement} fila
 * @param {Marca} marca
 * @param {Escala} escala
 */
function pintaLaFila(estat, fila, marca, { posicio, amplada, mitjana }) {
  const franja = dins(fila, ".band");
  const rang = marca.rang?.[estat.combustible];
  franja.style.visibility = rang ? "visible" : "hidden";
  if (rang) {
    const [baix, alt] = rang;
    franja.style.left = posicio(baix);
    franja.style.width = amplada(alt - baix);
  }
  if (mitjana) dins(fila, ".cat").style.left = posicio(mitjana);
  dins(fila, ".pt").style.left = posicio(preuDe(estat, marca));
  const valor = dins(fila, ".cv");
  valor.replaceChildren(element("strong", null, formataPreu(preuDe(estat, marca))));
  let descripcio = `${marca.nom}: ${formataPreu(preuDe(estat, marca))} euros el litre`;
  if (mitjana) descripcio += pintaLaDiferencia(estat, valor, marca, mitjana);
  fila.setAttribute("aria-label", descripcio);
  pintaLaMesBarata(estat, fila, marca);
}

export class Comparativa {
  /**
   * @param {Estat} estat
   * @param {() => void} redibuixa Torna a pintar la pàgina.
   */
  constructor(estat, redibuixa) {
    this.estat = estat;
    this.seccio = perId("compSec");
    this.contenidor = perId("comp");
    this.mesBoto = perId("compMore");
    this.mesBoto.addEventListener("click", () => {
      estat.totesLesMarquesALaComparativa = !estat.totesLesMarquesALaComparativa;
      redibuixa();
      if (!estat.totesLesMarquesALaComparativa) this.seccio.scrollIntoView({ block: "start" });
    });
  }

  /** @param {readonly Marca[]} marques */
  mostraNomesLesPrimeres(marques) {
    const sobren = marques.length - MARQUES_VISIBLES_A_LA_COMPARATIVA;
    const totes = this.estat.totesLesMarquesALaComparativa;
    marques.forEach((marca, i) => {
      perId(`k-${marca.id}`).hidden = !totes && i >= MARQUES_VISIBLES_A_LA_COMPARATIVA;
    });
    this.mesBoto.hidden = sobren <= 0;
    this.mesBoto.textContent = totes ? "Mostra'n menys" : `Mostra les ${sobren} marques restants`;
  }

  /**
   * Crea les files que falten, treu les que sobren i les posa en ordre.
   *
   * @param {readonly Marca[]} marques
   */
  ordenaLesFiles(marques) {
    const files = marques.map((marca) => filaDe(this.contenidor, marca));
    for (const fila of [...this.contenidor.children]) {
      if (!files.includes(/** @type {HTMLElement} */ (fila))) fila.remove();
    }
    reordena(this.contenidor, files, this.estat.movimentReduit);
    return files;
  }

  /** @param {readonly Marca[]} marques Ordenades de més barata a més cara. */
  pinta(marques) {
    const { estat } = this;
    const mitjana = estat.mitjana?.[estat.combustible] ?? null;
    this.seccio.hidden = !marques.length;
    if (!marques.length) return;
    this.seccio.classList.toggle("simple", !mitjana);
    const files = this.ordenaLesFiles(marques);
    const escala = escalaDe(estat, marques, mitjana);
    if (mitjana) pintaLEix(estat, escala, mitjana);
    else perId("cscale").replaceChildren();
    this.mostraNomesLesPrimeres(marques);
    let rang = 0;
    marques.forEach((marca, i) => {
      const fila = /** @type {HTMLElement} */ (files[i]);
      const esGrup = marca.id === ALTRES;
      if (!esGrup) rang++;
      fila.classList.toggle("best", !esGrup && rang === 1);
      dins(fila, ".rk").textContent = esGrup ? "" : String(rang);
      pintaLaFila(estat, fila, marca, escala);
    });
  }
}
