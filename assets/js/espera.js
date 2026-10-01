/** Esperes que no poden deixar la pàgina penjada. */

/**
 * Espera una promesa, però no més del límit. No falla mai: si la promesa falla, també s'acaba.
 *
 * @param {Promise<unknown>} promesa
 * @param {number} limitMs
 * @returns {Promise<boolean>} Si la promesa ha acabat bé abans del límit.
 */
export function esperaSensePassarDe(promesa, limitMs) {
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let rellotge;
  const limit = new Promise((fet) => {
    rellotge = setTimeout(() => fet(false), limitMs);
  });
  const acabada = promesa.then(
    () => true,
    () => false,
  );
  return Promise.race([acabada, limit]).finally(() => clearTimeout(rellotge));
}
