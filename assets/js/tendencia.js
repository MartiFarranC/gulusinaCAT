import { diaAnterior, diaIMes } from "./dates.js";

/** @typedef {import("./tipus.js").Combustible} Combustible */
/** @typedef {import("./tipus.js").DiaHistoric} DiaHistoric */

/**
 * @typedef {object} Tendencia
 * @property {string} text Text sencer, com «▼ 1,2 cèntims des d'ahir».
 * @property {string} curt Només la fletxa i els cèntims, o «=».
 * @property {number} diferencia En cèntims; 0 si és igual.
 */

const CENTIMS_IGUALS = 0.1;

/**
 * Com ha canviat el preu d'una marca des del dia anterior de l'històric que en té dades.
 *
 * @param {{id: string, preu: number}} marca
 * @param {object} context
 * @param {Combustible} context.combustible
 * @param {readonly DiaHistoric[]} context.historic Ordenat per data.
 * @param {string} context.dia Dia dels preus que es mostren (aaaa-mm-dd).
 * @param {string} context.avui Dia d'avui (aaaa-mm-dd).
 * @returns {Tendencia | null}
 */
export function tendencia(marca, { combustible, historic, dia, avui }) {
  const anterior = historic.findLast(
    (d) => d.data < dia && (d.marques[marca.id]?.[combustible] ?? 0) > 0,
  );
  if (!anterior) return null;
  const preuAnterior = /** @type {number} */ (anterior.marques[marca.id]?.[combustible]);
  const diferencia = Math.round((marca.preu - preuAnterior) * 1000) / 10;
  const quan =
    dia === avui && anterior.data === diaAnterior(dia)
      ? "des d'ahir"
      : `des del ${diaIMes(anterior.data)}`;
  if (Math.abs(diferencia) < CENTIMS_IGUALS) {
    return { text: `= Igual ${quan}`, curt: "=", diferencia: 0 };
  }
  const curt = `${diferencia > 0 ? "▲" : "▼"} ${Math.abs(diferencia).toFixed(1).replace(".", ",")}`;
  return { text: `${curt} cèntims ${quan}`, curt, diferencia };
}
