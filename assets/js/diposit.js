/** Quants diners cal posar per omplir el dipòsit sense passar-se. */

/** Part del dipòsit que es deixa buida perquè l'autonomia que marca el cotxe no és exacta. */
export const MARGE_DEL_DIPOSIT = 0.05;
/** Els diners es demanen en múltiples d'aquesta quantitat, arrodonint cap avall. */
const EUROS_PER_ARRODONIR = 5;

/**
 * @typedef {object} DadesDelCotxe
 * @property {number} consum Litres als 100 km.
 * @property {number} kmQueQueden Autonomia que marca el cotxe.
 * @property {number} diposit Capacitat en litres.
 * @property {number} preu Euros per litre a la benzinera.
 *
 * @typedef {object} Carrega
 * @property {number} litresQueQueden Estimats a partir de l'autonomia.
 * @property {number} litresQueHiCaben Fins a omplir-lo del tot.
 * @property {number} euros A posar: amb el marge i arrodonits cap avall.
 * @property {number} eurosFinsAlCapdamunt Sense marge ni arrodoniment.
 */

/**
 * @param {DadesDelCotxe} dades Valors positius; els km que queden poden ser 0.
 * @returns {Carrega}
 */
export function dinersPerOmplir({ consum, kmQueQueden, diposit, preu }) {
  const litresQueQueden = Math.min(diposit, (kmQueQueden * consum) / 100);
  const litresQueHiCaben = diposit - litresQueQueden;
  const litresSegurs = Math.max(0, litresQueHiCaben - diposit * MARGE_DEL_DIPOSIT);
  const euros = Math.floor((litresSegurs * preu) / EUROS_PER_ARRODONIR) * EUROS_PER_ARRODONIR;
  return {
    litresQueQueden,
    litresQueHiCaben,
    euros,
    eurosFinsAlCapdamunt: litresQueHiCaben * preu,
  };
}
