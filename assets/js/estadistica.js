/**
 * @param {readonly number[]} valors
 * @returns {number | null} La mitjana arrodonida a mil·lèsimes, o null si no hi ha valors.
 */
export function mitjana(valors) {
  if (!valors.length) return null;
  return Math.round((valors.reduce((a, b) => a + b, 0) / valors.length) * 1000) / 1000;
}

/**
 * Percentil sense interpolar: el valor de la posició més propera.
 *
 * @param {readonly number[]} valors Almenys un valor.
 * @param {number} quantil Entre 0 i 1.
 */
export function percentil(valors, quantil) {
  const ordenats = [...valors].sort((a, b) => a - b);
  return /** @type {number} */ (ordenats[Math.round(quantil * (ordenats.length - 1))]);
}

/**
 * @template T
 * @param {readonly T[]} elements Almenys un element.
 * @param {(element: T) => number} valor
 * @returns {T} El primer element amb el valor més petit.
 */
export function elMesPetit(elements, valor) {
  return elements.reduce((millor, element) => (valor(element) < valor(millor) ? element : millor));
}
