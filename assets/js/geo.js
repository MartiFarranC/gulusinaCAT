/** Càlculs geogràfics i de la projecció del mapa (Web Mercator). */

const DIAMETRE_TERRA_KM = 12742;
const METRES_PER_PIXEL_A_L_EQUADOR = 156543.03;
export const MIDA_RAJOLA = 256;
const LIMITS_CATALUNYA = { latMin: 40, latMax: 43.5, lonMin: -0.5, lonMax: 3.6 };

/** @typedef {{lat: number, lon: number}} Punt */

/** @param {number} graus */
const radians = (graus) => (graus * Math.PI) / 180;

/**
 * @param {Punt} a
 * @param {Punt} b
 * @returns {number} Distància en quilòmetres (fórmula del semiversinus).
 */
export function distancia(a, b) {
  const dLat = radians(b.lat - a.lat);
  const dLon = radians(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLon / 2) ** 2;
  return DIAMETRE_TERRA_KM * Math.asin(Math.sqrt(h));
}

/**
 * Descarta les coordenades impossibles (el Ministeri en té algunes a 0,0).
 *
 * @param {number | null} lat
 * @param {number | null} lon
 */
export function esDinsDeCatalunya(lat, lon) {
  const { latMin, latMax, lonMin, lonMax } = LIMITS_CATALUNYA;
  return (
    lat !== null && lon !== null && lat > latMin && lat < latMax && lon > lonMin && lon < lonMax
  );
}

/**
 * @param {number} lat
 * @param {number} lon
 * @param {number} zoom
 * @returns {{x: number, y: number}} Píxels del món sencer a aquest zoom.
 */
export function projecta(lat, lon, zoom) {
  const mida = MIDA_RAJOLA * 2 ** zoom;
  const sinus = Math.sin(radians(lat));
  return {
    x: ((lon + 180) / 360) * mida,
    y: (0.5 - Math.log((1 + sinus) / (1 - sinus)) / (4 * Math.PI)) * mida,
  };
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} zoom
 * @returns {Punt}
 */
export function desprojecta(x, y, zoom) {
  const mida = MIDA_RAJOLA * 2 ** zoom;
  return {
    lat: (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / mida))) * 180) / Math.PI,
    lon: (x / mida) * 360 - 180,
  };
}

/**
 * @param {number} lat
 * @param {number} zoom
 */
export const metresPerPixel = (lat, zoom) =>
  (METRES_PER_PIXEL_A_L_EQUADOR * Math.cos(radians(lat))) / 2 ** zoom;

/**
 * @param {number} lat Latitud del centre.
 * @param {number} radiKm
 * @param {number} costatPx Costat més curt del mapa.
 * @returns {number} Zoom perquè el cercle del radi ocupi el 92 % del costat.
 */
export const zoomPerAlRadi = (lat, radiKm, costatPx) =>
  Math.log2(
    (METRES_PER_PIXEL_A_L_EQUADOR * Math.cos(radians(lat)) * costatPx * 0.92) / (radiKm * 2000),
  );

/**
 * @param {readonly Punt[]} punts Almenys un punt.
 * @param {number} ample
 * @param {number} alt
 * @returns {{zoom: number, centre: Punt}} La vista que encaixa tots els punts al 90 % del mapa.
 */
export function vistaQueEncaixa(punts, ample, alt) {
  const lats = punts.map((p) => p.lat);
  const lons = punts.map((p) => p.lon);
  const a = projecta(Math.max(...lats), Math.min(...lons), 0);
  const b = projecta(Math.min(...lats), Math.max(...lons), 0);
  const zoom = Math.log2(
    Math.min((ample * 0.9) / (b.x - a.x || 1e-6), (alt * 0.9) / (b.y - a.y || 1e-6)),
  );
  return { zoom, centre: desprojecta((a.x + b.x) / 2, (a.y + b.y) / 2, 0) };
}
