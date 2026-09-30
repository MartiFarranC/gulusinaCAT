/** Quina secció de la pàgina es considera la que s'està llegint. */

/**
 * La secció actual és l'última que ja ha passat la línia de lectura. Quan s'arriba al final de
 * la pàgina és l'última, encara que sigui tan curta que no arribi mai a la línia.
 *
 * @param {ReadonlyArray<number | null>} posicions Dalt de cada secció respecte a la finestra;
 *   null si està amagada.
 * @param {{linia: number, esAlFinal: boolean}} lectura Alçada de la línia de lectura i si ja
 *   no es pot baixar més.
 * @returns {number} L'índex de la secció, o -1 si no n'hi ha cap de visible.
 */
export function indexDeLaSeccioActual(posicions, { linia, esAlFinal }) {
  const visibles = posicions.flatMap((dalt, index) => (dalt === null ? [] : [{ dalt, index }]));
  if (!visibles.length) return -1;
  if (esAlFinal) return /** @type {{index: number}} */ (visibles.at(-1)).index;
  const passades = visibles.filter(({ dalt }) => dalt <= linia);
  return (passades.at(-1) ?? /** @type {{index: number}} */ (visibles[0])).index;
}
