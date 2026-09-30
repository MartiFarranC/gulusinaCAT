/** Com han anat els preus: marques triades, últims 30 dies i últims deu anys. */

import { element, marcaPremut, perId, perIdDeTipus, puntDeColor } from "./dom.js";
import { diaIMes } from "./dates.js";
import { formataAmbSigne } from "./format.js";
import { dibuixaGrafic } from "./grafic.js";
import { extremsIMig, totsOAlterns } from "./grafic-calculs.js";
import { ALTRES, CATALUNYA, NOMS, colorDe } from "./marques.js";
import { NOM_DEL_COMBUSTIBLE, marquesReals } from "./estat.js";

/** @typedef {import("./estat.js").Estat} Estat */
/** @typedef {import("./grafic.js").Serie} Serie */
/** @typedef {import("./tipus.js").AnyHistoric} AnyHistoric */

const MAXIM_DE_MARQUES = 5;
const MARQUES_TRIADES_D_INICI = 4;
const BENZINERES_PER_SER_PRINCIPAL = 10;
const DIES_DEL_GRAFIC = 30;
const MESOS_PER_ANY = 12;
/** @type {Serie} */
const SERIE_CATALUNYA = { id: CATALUNYA, nom: "Catalunya", color: "#8B949E", discontinua: true };

/**
 * @param {Estat} estat
 * @param {string} id
 */
function nomDe(estat, id) {
  return estat.marques.find((m) => m.id === id)?.nom || estat.nomsAnual[id] || NOMS[id] || id;
}

/**
 * Primer les marques d'avui (de més barata a més cara), després les que només són a l'històric.
 *
 * @param {Estat} estat
 */
function marquesAmbDades(estat) {
  const ids = new Set(marquesReals(estat).map((m) => m.id));
  const historiques = [
    ...estat.historic.flatMap((dia) => Object.keys(dia.marques)),
    ...estat.anual.flatMap((any) => Object.keys(any.preus)),
  ];
  for (const id of historiques) if (id !== CATALUNYA && id !== ALTRES) ids.add(id);
  return [...ids];
}

/**
 * @param {Estat} estat
 * @param {"preu" | "dif"} mode
 * @param {number} anyInicial
 */
function textosDelsAnys(estat, mode, anyInicial) {
  const combustible = NOM_DEL_COMBUSTIBLE[estat.combustible];
  if (mode === "dif") {
    return {
      lead: "Quants cèntims per litre ha estat cada marca per sobre (+) o per sota (−) de la mitjana de totes les benzineres de Catalunya, any per any. Com més avall, més barata.",
      descripcio: `${combustible}: diferència en cèntims de cada marca respecte a la mitjana de Catalunya, any per any des del ${anyInicial}. Les dades són a la taula de sota.`,
      taula: `${combustible} (cèntims respecte a Catalunya)`,
    };
  }
  return {
    lead: "Preu mitjà de cada any, en €/litre, a partir d'un dia per mes de l'històric del Ministeri. L'any en curs compta fins ara.",
    descripcio: `${combustible}: preu mitjà de cada any des del ${anyInicial}, per marca i per a tot Catalunya. Les dades són a la taula de sota.`,
    taula: `${combustible} (€/L)`,
  };
}

/**
 * @param {Estat} estat
 * @param {AnyHistoric} any
 * @param {readonly Serie[]} series
 * @param {number} anyActual
 */
function puntDeLAny(estat, any, series, anyActual) {
  const esDiferencia = estat.modeAnys === "dif";
  const preu = (/** @type {string} */ id) => {
    const valor = any.preus[id]?.[estat.combustible] ?? 0;
    return valor > 0 ? valor : null;
  };
  const mitjana = preu(CATALUNYA);
  const esParcial = any.any === anyActual || any.mesos < MESOS_PER_ANY;
  const mesos = `${any.mesos} ${any.mesos === 1 ? "mes" : "mesos"}`;
  const valor = (/** @type {string} */ id) => {
    const v = preu(id);
    if (!esDiferencia) return v;
    return v !== null && mitjana !== null ? Math.round((v - mitjana) * 1000) / 10 : null;
  };
  return {
    eix: String(any.any),
    fila: esParcial ? `${any.any}*` : String(any.any),
    capcalera: esParcial
      ? `${any.any} · ${any.any === anyActual ? "fins ara" : "dades parcials"} (${mesos})`
      : `${any.any} · mitjana de l'any`,
    valors: Object.fromEntries(series.map((s) => [s.id, valor(s.id)])),
  };
}

/**
 * @param {Estat} estat
 * @param {import("./tipus.js").DiaHistoric} dia
 * @param {readonly Serie[]} series
 */
function puntDelDia(estat, dia, series) {
  const preu = (/** @type {string} */ id) => {
    const valor = dia.marques[id]?.[estat.combustible] ?? 0;
    return valor > 0 ? valor : null;
  };
  return {
    eix: diaIMes(dia.data),
    fila: diaIMes(dia.data),
    capcalera: new Date(`${dia.data}T12:00:00Z`).toLocaleDateString("ca-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    }),
    valors: Object.fromEntries(series.map((s) => [s.id, preu(s.id)])),
  };
}

/** @type {Partial<import("./grafic.js").OpcionsDelGrafic>} */
const OPCIONS_DE_LA_DIFERENCIA = {
  formataValor: (v) => `${formataAmbSigne(v)} c`,
  formataEix: (v) => formataAmbSigne(v, Number.isInteger(Math.round(v * 100) / 100) ? 0 : 1),
  ampladaMinima: 2,
  ambZero: true,
};

export class Evolucio {
  /** @param {Estat} estat */
  constructor(estat) {
    this.estat = estat;
    this.seccio = perId("evoSec");
    this.dies = perId("histSec");
    this.anys = perId("anysSec");
    const botonsDelMode = document.querySelectorAll("#anysMode button");
    for (const boto of botonsDelMode) {
      boto.addEventListener("click", () => {
        marcaPremut(botonsDelMode, (b) => b === boto);
        const mode = /** @type {HTMLElement} */ (boto).dataset["mode"];
        estat.modeAnys = mode === "dif" ? "dif" : "preu";
        this.dibuixaAnys(true);
      });
    }
  }

  /** @returns {Serie[]} La mitjana de Catalunya i les marques triades. */
  series() {
    const serieDe = (/** @type {string} */ id) => ({
      id,
      nom: nomDe(this.estat, id),
      color: colorDe(id),
    });
    return [SERIE_CATALUNYA, ...(this.estat.triades ?? []).map(serieDe)];
  }

  actualitzaLaSeccio() {
    this.seccio.hidden = this.dies.hidden && this.anys.hidden;
  }

  /** @param {boolean} animat */
  dibuixaDies(animat) {
    const { estat } = this;
    const historic = estat.historic.slice(-DIES_DEL_GRAFIC);
    this.dies.hidden = historic.length < 2;
    this.actualitzaLaSeccio();
    if (this.dies.hidden) return;
    const combustible = NOM_DEL_COMBUSTIBLE[estat.combustible];
    const series = this.series();
    dibuixaGrafic({
      svg: perIdDeTipus("chartSvg", SVGSVGElement),
      tooltip: perId("tip"),
      taula: perIdDeTipus("histTable", HTMLTableElement),
      animat,
      movimentReduit: estat.movimentReduit,
      series,
      columna: "Dia",
      titolDeLaTaula: `${combustible} (€/L)`,
      descripcio: `${combustible}: preu mitjà de cada dia els últims ${historic.length} dies per a ${series.map((s) => s.nom).join(", ")}. Les dades són a la taula de sota.`,
      punts: historic.map((dia) => puntDelDia(estat, dia, series)),
      marquesDeLEix: extremsIMig,
    });
  }

  /** @param {boolean} animat */
  dibuixaAnys(animat) {
    const { estat } = this;
    this.anys.hidden = estat.anual.length < 2;
    this.actualitzaLaSeccio();
    if (this.anys.hidden) return;
    const primer = /** @type {AnyHistoric} */ (estat.anual[0]).any;
    const textos = textosDelsAnys(estat, estat.modeAnys, primer);
    const series = this.series();
    const anyActual = new Date().getFullYear();
    perId("anysLead").textContent = textos.lead;
    dibuixaGrafic({
      svg: perIdDeTipus("anysSvg", SVGSVGElement),
      tooltip: perId("anysTip"),
      taula: perIdDeTipus("anysTable", HTMLTableElement),
      animat,
      movimentReduit: estat.movimentReduit,
      series,
      columna: "Any",
      titolDeLaTaula: textos.taula,
      descripcio: textos.descripcio,
      punts: estat.anual.map((any) => puntDeLAny(estat, any, series, anyActual)),
      marquesDeLEix: totsOAlterns,
      ...(estat.modeAnys === "dif" ? OPCIONS_DE_LA_DIFERENCIA : {}),
    });
  }

  /** @param {boolean} animat */
  dibuixa(animat) {
    this.dibuixaDies(animat);
    this.dibuixaAnys(animat);
  }

  /** @param {string} id */
  commutaMarca(id) {
    const triades = this.estat.triades ?? [];
    if (triades.includes(id)) this.estat.triades = triades.filter((t) => t !== id);
    else if (triades.length < MAXIM_DE_MARQUES) this.estat.triades = [...triades, id];
    else return;
    this.pintaMarques();
    this.dibuixa(true);
  }

  /**
   * @param {string} id
   * @param {string[]} triades
   */
  botoDeMarca(id, triades) {
    const esTriada = triades.includes(id);
    const boto = element("button", "chip");
    boto.type = "button";
    boto.setAttribute("aria-pressed", String(esTriada));
    if (!esTriada && triades.length >= MAXIM_DE_MARQUES) {
      boto.setAttribute("aria-disabled", "true");
      boto.title = `Com a màxim ${MAXIM_DE_MARQUES} marques`;
    }
    boto.append(puntDeColor(colorDe(id)), nomDe(this.estat, id));
    boto.onclick = () => this.commutaMarca(id);
    return boto;
  }

  /** @param {number} amagades Marques que no es mostren si no es demanen totes. */
  botoDeMesMarques(amagades) {
    const totes = this.estat.totesLesMarquesAlsGrafics;
    const boto = element(
      "button",
      "chip chip-mes",
      totes ? "Menys marques" : `+ ${amagades} marques més`,
    );
    boto.type = "button";
    boto.onclick = () => {
      this.estat.totesLesMarquesAlsGrafics = !totes;
      this.pintaMarques();
    };
    return boto;
  }

  /** Les marques amb més benzineres i les triades; la resta, amb el botó de més marques. */
  pintaMarques() {
    const { estat } = this;
    const ids = marquesAmbDades(estat);
    const triades = (estat.triades ??= ids.slice(0, MARQUES_TRIADES_D_INICI));
    const benzineres = (/** @type {string} */ id) => estat.marques.find((m) => m.id === id)?.n || 0;
    const principals = ids.filter(
      (id) => triades.includes(id) || benzineres(id) >= BENZINERES_PER_SER_PRINCIPAL,
    );
    const amagades = ids.length - principals.length;
    const visibles = estat.totesLesMarquesAlsGrafics ? ids : principals;
    const contenidor = perId("chips");
    contenidor.replaceChildren(...visibles.map((id) => this.botoDeMarca(id, triades)));
    if (amagades > 0) contenidor.appendChild(this.botoDeMesMarques(amagades));
    perId("chipsNote").textContent =
      `${triades.length} de ${MAXIM_DE_MARQUES} marques triades. La línia discontínua és la mitjana de Catalunya.`;
  }

  /** El gràfic de deu anys es dibuixa amb animació quan apareix a la pantalla. */
  animaElsAnysQuanEsVegin() {
    if (this.anys.hidden || !("IntersectionObserver" in window)) return;
    const observador = new IntersectionObserver(
      (entrades) => {
        if (!entrades.some((e) => e.isIntersecting)) return;
        observador.disconnect();
        this.dibuixaAnys(true);
      },
      { threshold: 0.35 },
    );
    observador.observe(this.anys);
  }
}
