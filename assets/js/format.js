/** Formats de números per mostrar a la pàgina, a la manera catalana. */

const ORDINALS = ["r", "n", "r", "t"];

/** @param {number} preu Euros per litre. */
export const formataPreu = (preu) => preu.toFixed(3).replace(".", ",");

/** @param {number} euros */
export const formataEuros = (euros) =>
  `${euros.toLocaleString("ca-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

/** @param {number} euros Diferència en euros, que es mostra en cèntims. */
export const formataCentims = (euros) => (euros * 100).toFixed(1).replace(".", ",");

/** @param {number} quilometres */
export const formataDistancia = (quilometres) =>
  `${quilometres < 10 ? quilometres.toFixed(1).replace(".", ",") : Math.round(quilometres)} km`;

/**
 * @param {number} valor
 * @param {number} [decimals]
 * @returns {string} El valor amb el signe + o − davant (res si és zero).
 */
export const formataAmbSigne = (valor, decimals = 1) => {
  const signe = valor > 0 ? "+" : valor < 0 ? "−" : "";
  return signe + Math.abs(valor).toFixed(decimals).replace(".", ",");
};

/**
 * @param {number} posicio De l'1 al 4.
 * @returns {string} L'ordinal abreujat: 1r, 2n, 3r, 4t.
 */
export const ordinal = (posicio) => `${posicio}${ORDINALS[posicio - 1] ?? "è"}`;

/**
 * @param {number} quantitat
 * @param {string} singular
 * @param {string} formaPlural
 */
export const plural = (quantitat, singular, formaPlural) =>
  quantitat === 1 ? singular : formaPlural;
