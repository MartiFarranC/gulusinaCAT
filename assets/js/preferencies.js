/**
 * Preferències desades al navegador. Si el navegador no deixa desar res (navegació privada,
 * dades bloquejades), la pàgina funciona igual amb els valors per defecte.
 */

const CLAU_MARQUES_EXCLOSES = "marques-excloses";
const CLAU_MINISTERI = "ministeri-no-disponible";
const HORES_SENSE_PROVAR_EL_MINISTERI = 6;
const MS_PER_HORA = 3600e3;

/**
 * @param {Storage | null} magatzem
 * @returns {Set<string>} Les marques que l'usuari va treure amb el filtre.
 */
export function llegeixMarquesExcloses(magatzem) {
  try {
    const desades = JSON.parse(magatzem?.getItem(CLAU_MARQUES_EXCLOSES) || "[]");
    return new Set(Array.isArray(desades) ? desades.map(String) : []);
  } catch {
    return new Set();
  }
}

/**
 * Es desen les excloses (no les triades) perquè les marques noves surtin marcades.
 *
 * @param {Storage | null} magatzem
 * @param {ReadonlySet<string>} excloses
 */
export function desaMarquesExcloses(magatzem, excloses) {
  try {
    magatzem?.setItem(CLAU_MARQUES_EXCLOSES, JSON.stringify([...excloses]));
  } catch {
    // Sense poder desar, el filtre només dura fins que es tanca la pàgina.
  }
}

/**
 * @param {Storage | null} magatzem
 * @param {number} ara Mil·lisegons des de l'època.
 * @returns {boolean} Si fa poc que el navegador no ha pogut llegir el Ministeri.
 */
export function calEvitarElMinisteri(magatzem, ara) {
  try {
    const darrereFallada = Number(magatzem?.getItem(CLAU_MINISTERI)) || 0;
    return ara - darrereFallada < HORES_SENSE_PROVAR_EL_MINISTERI * MS_PER_HORA;
  } catch {
    return false;
  }
}

/**
 * @param {Storage | null} magatzem
 * @param {number | null} fallada Quan ha fallat la lectura del Ministeri, o null si ha anat bé.
 */
export function recordaElMinisteri(magatzem, fallada) {
  try {
    if (fallada === null) magatzem?.removeItem(CLAU_MINISTERI);
    else magatzem?.setItem(CLAU_MINISTERI, String(fallada));
  } catch {
    // Sense poder desar, es tornarà a provar el Ministeri la pròxima vegada.
  }
}

/** @returns {Storage | null} El localStorage, o null si el navegador no el deixa fer servir. */
export function magatzemDelNavegador() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const CLAU_COTXE = "dades-del-cotxe";

/**
 * @typedef {object} DadesDesadesDelCotxe
 * @property {number} [consum] Litres als 100 km.
 * @property {number} [diposit] Capacitat en litres.
 */

/**
 * @param {Storage | null} magatzem
 * @returns {DadesDesadesDelCotxe} El consum i el dipòsit que l'usuari va escriure l'última vegada.
 */
export function llegeixElCotxe(magatzem) {
  try {
    const desat = JSON.parse(magatzem?.getItem(CLAU_COTXE) || "{}");
    /** @type {DadesDesadesDelCotxe} */
    const cotxe = {};
    if (Number(desat?.consum) > 0) cotxe.consum = Number(desat.consum);
    if (Number(desat?.diposit) > 0) cotxe.diposit = Number(desat.diposit);
    return cotxe;
  } catch {
    return {};
  }
}

/**
 * @param {Storage | null} magatzem
 * @param {DadesDesadesDelCotxe} cotxe
 */
export function desaElCotxe(magatzem, cotxe) {
  try {
    magatzem?.setItem(CLAU_COTXE, JSON.stringify(cotxe));
  } catch {
    // Sense poder desar, caldrà tornar a escriure les dades del cotxe.
  }
}
