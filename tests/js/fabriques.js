/** Dades de prova per als tests unitaris. */

/** @typedef {import("../../assets/js/tipus.js").Estacio} Estacio */

/**
 * @param {Partial<Estacio>} [camps]
 * @returns {Estacio}
 */
export const estacio = (camps = {}) => ({
  m: "repsol",
  nom: "Repsol",
  lat: 41.155,
  lon: 1.107,
  g95: 1.5,
  dsl: 1.4,
  mun: "Reus",
  adr: "Carrer Major, 1",
  ...camps,
});
