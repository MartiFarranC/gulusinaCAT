/** Les dues versions de la pàgina: les benzineres de Catalunya i les d'Andorra. */

/**
 * @typedef {object} Regio
 * @property {"catalunya" | "andorra"} id
 * @property {string} nom
 * @property {string} directori On són els fitxers de dades, relatiu a la pàgina.
 * @property {boolean} teMinisteri Si es poden provar els preus en directe del Ministeri.
 * @property {string} font Qui publica les dades, com surt a «Preus oficials del …».
 * @property {string} enllacDeConsulta Web oficial per consultar una benzinera concreta.
 */

/** @type {Readonly<Record<Regio["id"], Regio>>} */
export const REGIONS = {
  catalunya: {
    id: "catalunya",
    nom: "Catalunya",
    directori: "",
    teMinisteri: true,
    font: "Ministeri",
    enllacDeConsulta: "https://geoportalgasolineras.es",
  },
  andorra: {
    id: "andorra",
    nom: "Andorra",
    directori: "andorra/",
    teMinisteri: false,
    font: "Govern d'Andorra",
    enllacDeConsulta: "https://sig.govern.ad/IPE/PreusCarburants",
  },
};

const PARAMETRE_DE_LA_REGIO = "zona";

/**
 * @param {string | null | undefined} id
 * @returns {Regio | null}
 */
const regioDe = (id) => (id === "andorra" || id === "catalunya" ? REGIONS[id] : null);

/**
 * L'adreça mana (és el que fa el botó i el que es comparteix); si no en diu res, la que es va
 * triar l'última vegada; si tampoc, Catalunya.
 *
 * @param {string} cerca La part `?…` de l'adreça.
 * @param {string | null} desada
 * @returns {Regio}
 */
export function regioTriada(cerca, desada) {
  const delParametre = new URLSearchParams(cerca).get(PARAMETRE_DE_LA_REGIO);
  return regioDe(delParametre) ?? regioDe(desada) ?? REGIONS.catalunya;
}
