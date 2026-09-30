/**
 * Tipus de dades compartits per tota la pàgina.
 *
 * @typedef {"g95" | "dsl"} Combustible
 *
 * @typedef {object} EstacioMesBarata
 * @property {number} preu
 * @property {string} municipi
 * @property {number | null} lat
 * @property {number | null} lon
 *
 * @typedef {object} Marca Preus mitjans d'una marca en un àmbit.
 * @property {string} id
 * @property {string} nom
 * @property {string} color
 * @property {number | null} g95
 * @property {number | null} dsl
 * @property {number} [n] Nombre de benzineres.
 * @property {Partial<Record<Combustible, [number, number]>> | null} [rang] Franja del 10 al 90 %.
 * @property {Partial<Record<Combustible, EstacioMesBarata>> | null} [barata]
 * @property {string} data Text sobre l'origen de la dada.
 *
 * @typedef {object} Mitjana Mitjana de totes les benzineres d'un àmbit.
 * @property {number | null} g95
 * @property {number | null} dsl
 * @property {number} n
 *
 * @typedef {object} Estacio
 * @property {string} m Identificador de la marca.
 * @property {string} nom Nom de la marca.
 * @property {number} lat
 * @property {number} lon
 * @property {number | null} g95
 * @property {number | null} dsl
 * @property {string} mun
 * @property {string} adr
 *
 * @typedef {Estacio & {d: number}} EstacioAmbDistancia
 *
 * @typedef {object} Municipi
 * @property {string} nom
 * @property {number} lat
 * @property {number} lon
 *
 * @typedef {object} Ubicacio
 * @property {number} lat
 * @property {number} lon
 * @property {string} nom
 * @property {boolean} [gps]
 * @property {number} [prec] Precisió en metres.
 *
 * @typedef {Partial<Record<Combustible, number | null>>} PreusMarca
 *
 * @typedef {object} DiaHistoric
 * @property {string} data Dia en format aaaa-mm-dd.
 * @property {Record<string, PreusMarca>} marques
 *
 * @typedef {object} AnyHistoric
 * @property {number} any
 * @property {number} mesos Mesos amb dades.
 * @property {Record<string, PreusMarca>} preus
 */

export {};
