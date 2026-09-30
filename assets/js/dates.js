/** Dates en el format del Ministeri (dd/mm/aaaa hh:mm) i en ISO (aaaa-mm-dd). */

const HORES_PER_DIA = 24;
const MS_PER_HORA = 36e5;

/**
 * @param {string | undefined} fecha Data del Ministeri, com «30/09/2026 12:00:00».
 * @returns {string | null} El dia en format aaaa-mm-dd.
 */
export function diaIsoDeLaFecha(fecha) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(fecha ?? "");
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/** @param {string} diaIso */
export function diaIMes(diaIso) {
  const [, mes, dia] = diaIso.split("-");
  return `${Number(dia)}/${Number(mes)}`;
}

/** @param {string} diaIso */
export function diaAnterior(diaIso) {
  const data = new Date(`${diaIso}T00:00:00Z`);
  data.setUTCDate(data.getUTCDate() - 1);
  return data.toISOString().slice(0, 10);
}

/**
 * @param {Date} data
 * @returns {string} El dia local en format aaaa-mm-dd.
 */
export function diaIsoLocal(data) {
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${dia}`;
}

/**
 * Text d'estat per a la còpia de preus, amb un avís si fa més d'un dia que no s'actualitza.
 *
 * @param {string} fecha Data del Ministeri de la còpia.
 * @param {number} ara Mil·lisegons des de l'època.
 */
export function textDeLaCopia(fecha, ara) {
  const dia = diaIsoDeLaFecha(fecha);
  const hora = /(\d{1,2}):(\d{2})/.exec(fecha.slice(10));
  const hhmm = hora ? `${hora[1]?.padStart(2, "0")}:${hora[2]}` : "12:00";
  const hores = dia ? (ara - new Date(`${dia}T${hhmm}:00`).getTime()) / MS_PER_HORA : 0;
  if (hores > HORES_PER_DIA) {
    const dies = Math.floor(hores / HORES_PER_DIA);
    return `Últimes dades oficials: ${fecha.slice(0, 16)} (fa ${dies} ${dies === 1 ? "dia" : "dies"}). Els preus d'avui poden ser diferents.`;
  }
  return `Preus oficials del Ministeri del ${fecha.slice(0, 16)} · s'actualitzen cada mitja hora`;
}
