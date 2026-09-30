/** Punt d'entrada de la pàgina: crea l'estat i les parts, i carrega les dades. */

import { CalculadoraDelDiposit } from "./calculadora-diposit.js";
import { Comparativa } from "./comparativa.js";
import { Carrega } from "./carrega.js";
import { diaIsoLocal } from "./dates.js";
import { Dreceres } from "./dreceres.js";
import { marcaPremut, perId } from "./dom.js";
import { creaEstat, esProperes, marquesOrdenades, preuDe, textDelKicker } from "./estat.js";
import { Evolucio } from "./evolucio.js";
import { Filtre } from "./filtre.js";
import { Mapa } from "./mapa.js";
import { ALTRES } from "./marques.js";
import {
  desaElCotxe,
  desaMarquesExcloses,
  llegeixElCotxe,
  llegeixMarquesExcloses,
  magatzemDelNavegador,
} from "./preferencies.js";
import { Properes } from "./properes.js";
import { agregaPerMarca, estacionsDinsDelRadi } from "./proximitat.js";
import { pintaElRetol } from "./retol.js";
import { tendencia } from "./tendencia.js";
import { animaElTitol } from "./titol.js";
import { Totems } from "./totems.js";
import { PanellDUbicacio } from "./ubicacio.js";

/** @typedef {import("./tipus.js").Marca} Marca */

const RETARD_DEL_PRIMER_PINTAT_MS = 700;
const RETARD_DE_LA_CARREGA_MS = 1000;
const RETARD_EN_CANVIAR_DE_MIDA_MS = 150;
const TOTEMS = 4;

const magatzem = magatzemDelNavegador();
const estat = creaEstat({
  movimentReduit: matchMedia("(prefers-reduced-motion: reduce)").matches,
  excloses: llegeixMarquesExcloses(magatzem),
});

const kicker = perId("kicker");
const totems = new Totems(perId("totems"), estat.movimentReduit);
const comparativa = new Comparativa(estat, pinta);
const evolucio = new Evolucio(estat);
const filtre = new Filtre(estat, {
  enCanviar: aplicaLAmbit,
  desa: (excloses) => desaMarquesExcloses(magatzem, excloses),
});
const panell = new PanellDUbicacio(estat, aplicaLAmbit);
const properes = new Properes(estat, aplicaLAmbit);
const mapa = new Mapa(estat);
const diposit = new CalculadoraDelDiposit(estat, {
  cotxe: llegeixElCotxe(magatzem),
  desa: (cotxe) => desaElCotxe(magatzem, cotxe),
});

/** @param {Marca} marca */
function tendenciaDe(marca) {
  if (!estat.diaDelsPreus || !estat.historic.length || esProperes(estat)) return null;
  const context = {
    combustible: estat.combustible,
    historic: estat.historic,
    dia: estat.diaDelsPreus,
    avui: diaIsoLocal(new Date()),
  };
  return tendencia({ id: marca.id, preu: preuDe(estat, marca) }, context);
}

/** Torna a pintar tot el que depèn de les marques de l'àmbit actual. */
function pinta() {
  const ordenades = marquesOrdenades(estat);
  const reals = ordenades.filter((m) => m.id !== ALTRES);
  kicker.classList.toggle("buit", !reals.length);
  if (!reals.length) {
    kicker.textContent =
      "Cap de les marques triades té preu per a aquest combustible. Canvia el filtre de marques.";
  } else if (/^Cap de/.test(kicker.textContent ?? "")) kicker.textContent = textDelKicker(estat);
  filtre.pinta();
  totems.pinta(reals.slice(0, TOTEMS), { preu: (m) => preuDe(estat, m), tendencia: tendenciaDe });
  comparativa.pinta(ordenades);
  pintaElRetol(estat, reals, tendenciaDe);
}

/** @param {number} quantes Benzineres dins del radi. */
function missatgeDelRadi(quantes) {
  const { ubicacio } = estat;
  if (estat.ambit !== "properes" || !ubicacio || !estat.estacions) return;
  const lloc = `a menys de ${estat.radi} km de ${ubicacio.nom}`;
  panell.missatge(
    quantes
      ? `${quantes} ${quantes === 1 ? "benzinera" : "benzineres"} ${lloc}.`
      : `No hi ha cap benzinera ${lloc}. Augmenta el radi.`,
  );
}

/** Calcula les marques de l'àmbit triat (tot Catalunya o les properes) i torna a pintar. */
function aplicaLAmbit() {
  const aProp = estat.ambit === "properes";
  panell.mostra(aProp);
  const { ubicacio } = estat;
  const dins =
    aProp && ubicacio && estat.estacions
      ? estacionsDinsDelRadi(estat.estacions, ubicacio, estat.radi)
      : [];
  if (dins.length && estat.base) {
    const { marques, mitjana } = agregaPerMarca(dins, estat.radi);
    estat.marques = marques;
    estat.mitjana = (mitjana.g95 ?? 0) > 0 || (mitjana.dsl ?? 0) > 0 ? mitjana : null;
  } else if (estat.base) {
    estat.marques = estat.base.marques;
    estat.mitjana = estat.base.mitjana;
  }
  missatgeDelRadi(dins.length);
  const ambit = esProperes(estat)
    ? `totes les benzineres a menys de ${estat.radi} km`
    : "totes les benzineres de Catalunya";
  perId("compLead").textContent =
    `De més barata a més cara. El punt és el preu mitjà de cada marca i la franja grisa, on hi ha 8 de cada 10 de les seves benzineres. La línia discontínua és la mitjana de ${ambit}.`;
  perId("evoLead").textContent =
    `Tria les marques que vols comparar als gràfics${esProperes(estat) ? " (les dades històriques són de tot Catalunya)" : ""}. Passa el dit o el ratolí per sobre per veure'n els valors.`;
  kicker.textContent = textDelKicker(estat);
  pinta();
  pintaLesProperes(dins);
}

/**
 * Les parts que depenen de les benzineres de dins del radi.
 *
 * @param {import("./tipus.js").EstacioAmbDistancia[]} dins
 */
function pintaLesProperes(dins) {
  properes.pinta(dins);
  mapa.pinta(dins);
  diposit.pinta(dins);
  panell.portaAlPanellSiCal();
}

const carrega = new Carrega(estat, {
  aplicaLAmbit,
  localitza: (demanaElGps) => panell.localitza(demanaElGps),
  pinta,
  evolucio,
  magatzem,
});

function activaElCombustible() {
  const pastilla = /** @type {HTMLElement} */ (document.querySelector(".pill"));
  const botons = document.querySelectorAll(".toggle button");
  const mouLaPastilla = (/** @type {HTMLElement} */ boto) => {
    pastilla.style.width = `${boto.offsetWidth}px`;
    pastilla.style.transform = `translateX(${boto.offsetLeft - 5}px)`;
  };
  for (const boto of botons) {
    boto.addEventListener("click", () => {
      const triat = /** @type {HTMLElement} */ (boto);
      marcaPremut(botons, (b) => b === triat);
      mouLaPastilla(triat);
      estat.combustible = triat.dataset["fuel"] === "dsl" ? "dsl" : "g95";
      aplicaLAmbit();
      evolucio.dibuixa(true);
    });
  }
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let espera;
  addEventListener("resize", () => {
    mouLaPastilla(
      /** @type {HTMLElement} */ (document.querySelector('.toggle [aria-pressed="true"]')),
    );
    clearTimeout(espera);
    espera = setTimeout(() => evolucio.dibuixa(false), RETARD_EN_CANVIAR_DE_MIDA_MS);
  });
  const primer = /** @type {HTMLElement} */ (botons[0]);
  void document.fonts.ready.then(() => mouLaPastilla(primer));
  mouLaPastilla(primer);
}

new Dreceres();
animaElTitol(perId("title"), "On omplo el dipòsit?");
activaElCombustible();
setTimeout(pinta, estat.movimentReduit ? 0 : RETARD_DEL_PRIMER_PINTAT_MS);
void carrega.carregaTot(estat.movimentReduit ? 0 : RETARD_DE_LA_CARREGA_MS);
