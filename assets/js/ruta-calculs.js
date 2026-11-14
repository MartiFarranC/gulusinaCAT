/** Benzineres al llarg d'una ruta: quant s'han de desviar i en quin punt del trajecte són. */

const KM_PER_GRAU_DE_LATITUD = 110.574;
const KM_PER_GRAU_DE_LONGITUD_A_L_EQUADOR = 111.32;

/** @typedef {import("./tipus.js").Estacio} Estacio */
/** @typedef {{lat: number, lon: number}} Punt */

/**
 * @typedef {object} Tram Segment de la ruta en quilòmetres sobre un pla local.
 * @property {number} ax
 * @property {number} ay
 * @property {number} dx
 * @property {number} dy
 * @property {number} llargada
 * @property {number} kmInicial Quilòmetres de la ruta fins a l'inici del tram.
 *
 * @typedef {object} Recorregut La ruta preparada per mesurar-hi distàncies.
 * @property {number} kmPerGrauDeLongitud A la latitud mitjana de la ruta.
 * @property {Tram[]} trams
 * @property {{latMin: number, latMax: number, lonMin: number, lonMax: number}} caixa
 *
 * @typedef {object} BenzineraDeLaRuta
 * @property {Estacio} estacio
 * @property {number} desviacio Quilòmetres en línia recta des de la ruta.
 * @property {number} km Quilòmetre de la ruta on queda més a prop.
 */

/**
 * @param {readonly Punt[]} punts Els punts de la ruta en ordre, almenys un.
 * @returns {Recorregut}
 */
export function preparaRecorregut(punts) {
  const lats = punts.map((p) => p.lat);
  const lons = punts.map((p) => p.lon);
  const latMitjana = (Math.min(...lats) + Math.max(...lats)) / 2;
  const kmPerGrauDeLongitud =
    KM_PER_GRAU_DE_LONGITUD_A_L_EQUADOR * Math.cos((latMitjana * Math.PI) / 180);
  const x = (/** @type {Punt} */ p) => p.lon * kmPerGrauDeLongitud;
  const y = (/** @type {Punt} */ p) => p.lat * KM_PER_GRAU_DE_LATITUD;
  /** @type {Tram[]} */
  const trams = [];
  let km = 0;
  const parelles =
    punts.length > 1 ? punts.slice(1).map((b, i) => [punts[i], b]) : [[punts[0], punts[0]]];
  for (const [a, b] of /** @type {[Punt, Punt][]} */ (parelles)) {
    const dx = x(b) - x(a);
    const dy = y(b) - y(a);
    const llargada = Math.hypot(dx, dy);
    trams.push({ ax: x(a), ay: y(a), dx, dy, llargada, kmInicial: km });
    km += llargada;
  }
  const caixa = {
    latMin: Math.min(...lats),
    latMax: Math.max(...lats),
    lonMin: Math.min(...lons),
    lonMax: Math.max(...lons),
  };
  return { kmPerGrauDeLongitud, trams, caixa };
}

/**
 * @param {Recorregut} recorregut
 * @returns {number} Quilòmetres de tota la ruta.
 */
export const llargadaDelRecorregut = (recorregut) => {
  const ultim = recorregut.trams.at(-1);
  return ultim ? ultim.kmInicial + ultim.llargada : 0;
};

/**
 * @param {Punt} punt
 * @param {Recorregut} recorregut
 * @returns {{desviacio: number, km: number}} La distància a la ruta i el quilòmetre del punt
 *   de la ruta més proper.
 */
export function situaALaRuta(punt, recorregut) {
  const px = punt.lon * recorregut.kmPerGrauDeLongitud;
  const py = punt.lat * KM_PER_GRAU_DE_LATITUD;
  let millor = { desviacio: Infinity, km: 0 };
  for (const tram of recorregut.trams) {
    const quadrat = tram.llargada ** 2;
    const t = quadrat
      ? Math.max(0, Math.min(1, ((px - tram.ax) * tram.dx + (py - tram.ay) * tram.dy) / quadrat))
      : 0;
    const desviacio = Math.hypot(tram.ax + t * tram.dx - px, tram.ay + t * tram.dy - py);
    if (desviacio < millor.desviacio) {
      millor = { desviacio, km: tram.kmInicial + t * tram.llargada };
    }
  }
  return millor;
}

/**
 * @param {Punt} punt
 * @param {Recorregut} recorregut
 * @param {number} margeKm
 * @returns {boolean} Si cau dins del rectangle de la ruta ampliat amb el marge.
 */
function esAPropDeLaCaixa(punt, { caixa, kmPerGrauDeLongitud }, margeKm) {
  const margeLat = margeKm / KM_PER_GRAU_DE_LATITUD;
  const margeLon = margeKm / kmPerGrauDeLongitud;
  return (
    punt.lat >= caixa.latMin - margeLat &&
    punt.lat <= caixa.latMax + margeLat &&
    punt.lon >= caixa.lonMin - margeLon &&
    punt.lon <= caixa.lonMax + margeLon
  );
}

/**
 * @param {readonly Estacio[]} estacions
 * @param {Recorregut} recorregut
 * @param {number} desviacioMaxima En quilòmetres.
 * @returns {BenzineraDeLaRuta[]} Les que queden a prou poca distància, en l'ordre del trajecte.
 */
export function benzineresDeLaRuta(estacions, recorregut, desviacioMaxima) {
  return estacions
    .filter((estacio) => esAPropDeLaCaixa(estacio, recorregut, desviacioMaxima))
    .map((estacio) => ({ estacio, ...situaALaRuta(estacio, recorregut) }))
    .filter((trobada) => trobada.desviacio <= desviacioMaxima)
    .sort((a, b) => a.km - b.km);
}

/**
 * @param {readonly BenzineraDeLaRuta[]} trobades En l'ordre del trajecte.
 * @param {(estacio: Estacio) => number} preu
 * @returns {BenzineraDeLaRuta | null} La més barata; si n'hi ha diverses, la primera que es troba.
 */
export function laMesBarataDeLaRuta(trobades, preu) {
  /** @type {BenzineraDeLaRuta | null} */
  let millor = null;
  for (const trobada of trobades) {
    if (!millor || preu(trobada.estacio) < preu(millor.estacio)) millor = trobada;
  }
  return millor;
}
