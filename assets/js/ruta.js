/**
 * Benzineres de la ruta: tria d'on surts i on vas, i mostra les benzineres de Catalunya i
 * d'Andorra que queden a prop del camí, amb la més barata remarcada.
 */

import { iconaDeCarrega } from "./carregant.js";
import { CercadorDeLlocs } from "./cercador-de-llocs.js";
import { llegeixLesEstacions } from "./dades.js";
import { perId, perIdDeTipus } from "./dom.js";
import { formataDistancia, formataDurada, plural } from "./format.js";
import { NOM_DEL_COMBUSTIBLE } from "./estat.js";
import { MapaDeLaRuta } from "./mapa-de-la-ruta.js";
import { llegeixEstacions } from "./proximitat.js";
import { REGIONS } from "./regio.js";
import {
  benzineresDeLaRuta,
  laMesBarataDeLaRuta,
  llargadaDelRecorregut,
  preparaRecorregut,
} from "./ruta-calculs.js";
import { pintaLaLlistaDeLaRuta, resumDeLaMesBarata } from "./ruta-llista.js";
import { ServeiDeLlocs, calculaRuta } from "./ruta-serveis.js";
import { posicioDelGps } from "./ubicacio.js";

/** @typedef {import("./estat.js").Estat} Estat */
/** @typedef {import("./tipus.js").Estacio} Estacio */
/** @typedef {import("./ruta-serveis.js").Lloc} Lloc */
/** @typedef {import("./ruta-serveis.js").Ruta} Ruta */
/** @typedef {import("./ruta-calculs.js").Recorregut} Recorregut */

/** @returns {Promise<Estacio[]>} Les benzineres de totes les regions: la ruta pot creuar-les. */
async function benzineresDeTotesLesRegions() {
  const regions = Object.values(REGIONS);
  const documents = await Promise.all(regions.map((r) => llegeixLesEstacions(r.directori)));
  return documents.flatMap((document) => (document ? llegeixEstacions(document) : []));
}

export class RutaAmbBenzineres {
  /** @param {Estat} estat */
  constructor(estat) {
    this.estat = estat;
    this.desviacio = perIdDeTipus("rDesviacio", HTMLInputElement);
    this.missatge = perId("rMsg");
    this.mapa = new MapaDeLaRuta(estat);
    /** @type {{ruta: Ruta, recorregut: Recorregut, origen: Lloc, desti: Lloc} | null} */
    this.actual = null;
    /** @type {Promise<Estacio[]> | null} */
    this.estacions = null;
    /** Per descartar una ruta que arriba quan ja se n'ha demanat una altra. */
    this.peticio = 0;
    const servei = new ServeiDeLlocs();
    const cercador = (/** @type {string} */ id) =>
      new CercadorDeLlocs(
        {
          camp: perIdDeTipus(id, HTMLInputElement),
          opcions: perId(`${id}Opcions`),
          servei,
        },
        () => void this.calcula(),
      );
    this.origen = cercador("rOrigen");
    this.desti = cercador("rDesti");
    perId("rAqui").addEventListener("click", () => void this.surtDAqui());
    perId("rInverteix").addEventListener("click", () => this.inverteix());
    this.desviacio.addEventListener("input", () => this.pinta());
    perId("rMes").addEventListener("click", () => this.pinta(true));
  }

  /** @param {string} text */
  avisa(text) {
    this.missatge.replaceChildren(text);
  }

  /** @param {string} text */
  avisaQueEspera(text) {
    this.missatge.replaceChildren(iconaDeCarrega(), text);
  }

  async surtDAqui() {
    if (!("geolocation" in navigator)) {
      this.avisa("Aquest navegador no pot donar la ubicació. Escriu d'on surts.");
      return;
    }
    this.avisaQueEspera("Buscant on ets…");
    try {
      const { lat, lon } = await posicioDelGps();
      this.origen.posa({ nom: "La meva ubicació", detall: "", lat, lon });
      await this.calcula();
    } catch {
      this.avisa("No s'ha pogut saber on ets. Dona permís al navegador o escriu d'on surts.");
    }
  }

  inverteix() {
    const origen = this.origen.triat;
    this.origen.posa(this.desti.triat);
    this.desti.posa(origen);
    void this.calcula();
  }

  /** Demana la ruta quan ja se saben la sortida i la destinació. */
  async calcula() {
    const origen = this.origen.triat;
    const desti = this.desti.triat;
    if (!origen || !desti) {
      this.actual = null;
      perId("rResultat").hidden = true;
      this.avisa(origen ? "Ara tria on vas." : "Tria d'on surts i on vas.");
      return;
    }
    const aquesta = ++this.peticio;
    this.avisaQueEspera("Calculant la ruta…");
    this.estacions ??= benzineresDeTotesLesRegions();
    try {
      const [ruta] = await Promise.all([calculaRuta(origen, desti), this.estacions]);
      if (aquesta !== this.peticio) return;
      this.actual = { ruta, recorregut: preparaRecorregut(ruta.punts), origen, desti };
      this.pinta(false, true);
    } catch {
      if (aquesta !== this.peticio) return;
      this.actual = null;
      perId("rResultat").hidden = true;
      this.avisa("No s'ha pogut calcular la ruta. Torna-ho a provar d'aquí a una estona.");
    }
  }

  /** @param {Estacio} estacio */
  preu(estacio) {
    return estacio[this.estat.combustible] ?? 0;
  }

  /**
   * @param {number} trobades
   * @param {number} desviacio
   * @returns {string} La llargada de la ruta i quantes benzineres hi ha a prop.
   */
  textDelResum(trobades, desviacio) {
    if (!this.actual) return "";
    const { ruta, recorregut } = this.actual;
    const llargada = formataDistancia(llargadaDelRecorregut(recorregut));
    const durada = `Ruta de ${llargada} (${formataDurada(ruta.minuts)}).`;
    const combustible = NOM_DEL_COMBUSTIBLE[this.estat.combustible].toLowerCase();
    const lloc = `a menys de ${formataDistancia(desviacio)} de la ruta`;
    if (!trobades) {
      return `${durada} Cap benzinera amb ${combustible} ${lloc}: augmenta la desviació.`;
    }
    const quantes = `${trobades} ${plural(trobades, "benzinera", "benzineres")}`;
    return `${durada} ${quantes} amb ${combustible} ${lloc}.`;
  }

  /**
   * Torna a buscar les benzineres de la ruta (amb el combustible, el filtre i la desviació
   * actuals) sense tornar a demanar la ruta.
   *
   * @param {boolean} [totes] Si es mostren totes les de la llista.
   * @param {boolean} [esRutaNova] Si cal centrar el mapa a la ruta.
   */
  async pinta(totes = false, esRutaNova = false) {
    const desviacio = Number(this.desviacio.value);
    perId("rDesviacioTxt").textContent = formataDistancia(desviacio);
    if (!this.actual || !this.estacions) return;
    const { ruta, recorregut, origen, desti } = this.actual;
    const preu = (/** @type {Estacio} */ e) => this.preu(e);
    const estacions = (await this.estacions).filter(
      (e) => preu(e) > 0 && !this.estat.excloses.has(e.m),
    );
    const trobades = benzineresDeLaRuta(estacions, recorregut, desviacio);
    const barata = laMesBarataDeLaRuta(trobades, preu);
    this.avisa(this.textDelResum(trobades.length, desviacio));
    perId("rResultat").hidden = false;
    const resum = perId("rBarata");
    resum.hidden = !barata;
    resum.replaceChildren(...(barata ? resumDeLaMesBarata(barata, { origen, desti, preu }) : []));
    const contingut = { trobades, barata, totes, preu };
    pintaLaLlistaDeLaRuta(perId("rLlista"), perId("rMes"), contingut);
    this.mapa.mostra(ruta.punts, trobades, esRutaNova);
  }
}
