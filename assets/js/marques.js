/**
 * Marques de benzineres: colors, noms i la mateixa classificació dels rètols que fa el paquet
 * gulusinacat (per quan el navegador llegeix el Ministeri directament).
 */

export const ALTRES = "altres";
export const CATALUNYA = "catalunya";
const MINIM_ESTACIONS_PER_MARCA = 3;

/** Colors de referència de les cadenes conegudes. */
const COLORS = {
  bonarea: "#5DA92E",
  esclatoil: "#E4312B",
  petrocat: "#1C6FB8",
  repsol: "#F07D00",
  campsa: "#C8102E",
  moeve: "#00A19A",
  galp: "#FF6A13",
  bp: "#2E9E44",
  shell: "#F2C500",
  petronor: "#B5121B",
  avia: "#D52B1E",
  ballenoil: "#1FA3DC",
  plenoil: "#E6B800",
  petroprix: "#7A3FC4",
  petromiralles: "#0F8A6A",
  meroil: "#8A6D3B",
  autonet: "#8D8F93",
  staroil: "#3D5AFE",
  gasexpress: "#EC407A",
  valcarce: "#4E7D32",
  q8: "#1E4FA0",
  tamoil: "#E0701B",
  eni: "#F5C400",
  lowcostfuel: "#5C9E3A",
  petrolisind: "#8C6BB1",
  carrefour: "#0055A5",
  alcampo: "#E2001A",
  eroski: "#D71920",
  leclerc: "#005BAB",
  altres: "#6B7280",
};
const PALETA = [
  "#8E7CC3",
  "#4FB3BF",
  "#C98F5A",
  "#9CCC65",
  "#E57373",
  "#64B5F6",
  "#F06292",
  "#A1887F",
];

/** @type {readonly [id: string, nom: string, patro: RegExp][]} */
const CONEGUDES = [
  ["bonarea", "bonÀrea", /\bBON ?AREA\b/],
  ["esclatoil", "Esclatoil", /\bESCLAT ?OIL\b/],
  ["petrocat", "Petrocat", /\bPETROCAT\b/],
  ["repsol", "Repsol", /\bREPSOL\b/],
  ["campsa", "Campsa", /\bCAMPSA\b/],
  ["moeve", "Moeve (Cepsa)", /\b(MOEVE|CEPSA)\b/],
  ["galp", "Galp", /\bGALP\b/],
  ["bp", "BP", /\bBP\b/],
  ["shell", "Shell", /\bSHELL\b/],
  ["petronor", "Petronor", /\bPETRONOR\b/],
  ["avia", "Avia", /\bAVIA\b/],
  ["ballenoil", "Ballenoil", /\bBALLENOIL\b/],
  ["plenoil", "Plenergy (Plenoil)", /\b(PLENOIL|PLENERGY)\b/],
  ["petroprix", "Petroprix", /\bPETROPRIX\b/],
  ["petromiralles", "Petromiralles", /\bPETRO ?MIRALLES\b/],
  ["meroil", "Meroil", /\bMEROIL\b/],
  ["autonet", "Autonet & Oil", /\bAUTONET/],
  ["lowcostfuel", "Low Cost Fuel", /\bLOW ?COST ?FUEL\b/],
  ["petrolisind", "Petrolis Independents", /\bPETROLIS INDEPENDENTS\b/],
  ["q8", "Q8", /\bQ8\b/],
  ["tamoil", "Tamoil", /\bTAMOIL\b/],
  ["eni", "Eni", /\bENI\b/],
  ["staroil", "Star Oil", /\bSTAR ?OIL\b/],
  ["gasexpress", "GasExpress", /\bGAS ?EXPRESS\b/],
  ["valcarce", "Valcarce", /\bVALCARCE\b/],
  ["carrefour", "Carrefour", /\bCARREFOUR\b/],
  ["alcampo", "Alcampo", /\bALCAMPO\b/],
  ["eroski", "Eroski", /\bEROSKI\b/],
  ["leclerc", "E.Leclerc", /\bLECLERC\b/],
];
const ROTULS_GENERICS =
  /^(|SIN ROTULO|SENSE ROTUL|NO ROTULO|SIN MARCA|GASOLINERA|ESTACION DE SERVICIO|E ?S|ES|BLANCA|INDEPENDIENTE|(N|NO|NUM)?( ?\d+)+)$/;
const PREFIX_DESCONEGUDA = "?";

/** @type {Readonly<Record<string, string>>} */
export const NOMS = {
  ...Object.fromEntries(CONEGUDES.map(([id, nom]) => [id, nom])),
  [ALTRES]: "Independents i altres",
  [CATALUNYA]: "Catalunya",
};

/**
 * @param {string} id
 * @returns {string} El color de la marca; les desconegudes en reben un de fix a partir del nom.
 */
export function colorDe(id) {
  const conegut = /** @type {Record<string, string>} */ (COLORS)[id];
  if (conegut) return conegut;
  const suma = [...id].reduce((total, lletra) => total + lletra.charCodeAt(0), 0);
  return /** @type {string} */ (PALETA[suma % PALETA.length]);
}

/**
 * @param {string | null | undefined} text
 * @returns {string} En majúscules, sense accents ni signes de puntuació.
 */
export function normalitza(text) {
  return (text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

/**
 * @param {string} rotul
 * @returns {string} Només la inicial en majúscula a les paraules amb vocals (les sigles es queden).
 */
export function nomLlegible(rotul) {
  return rotul
    .split(/\s+/)
    .map((paraula) =>
      /[AEIOUÀÈÉÍÒÓÚaeiouàèéíòóú]/.test(paraula)
        ? (paraula[0]?.toUpperCase() ?? "") + paraula.slice(1).toLowerCase()
        : paraula,
    )
    .join(" ");
}

/** @param {string} rotul */
function identificadorDelRotul(rotul) {
  const normalitzat = normalitza(rotul);
  const coneguda = CONEGUDES.find(([, , patro]) => patro.test(normalitzat));
  if (coneguda) return coneguda[0];
  return ROTULS_GENERICS.test(normalitzat) ? null : PREFIX_DESCONEGUDA + normalitzat;
}

/**
 * Assigna una marca a cada ròtul. Les desconegudes amb prou benzineres són una marca pròpia;
 * la resta, i les conegudes amb poques benzineres, van a «altres».
 *
 * @param {readonly string[]} rotuls
 * @returns {{ids: string[], noms: Record<string, string>}} La marca de cada ròtul i els noms.
 */
export function classificaRotuls(rotuls) {
  const claus = rotuls.map(identificadorDelRotul);
  /** @type {Map<string, number>} */
  const compte = new Map();
  for (const clau of claus) if (clau) compte.set(clau, (compte.get(clau) ?? 0) + 1);
  const teProuEstacions = (/** @type {string} */ clau) =>
    (compte.get(clau) ?? 0) >= MINIM_ESTACIONS_PER_MARCA;
  const noms = { ...NOMS };
  const ids = claus.map((clau, i) => {
    if (!clau || !teProuEstacions(clau)) return ALTRES;
    if (!clau.startsWith(PREFIX_DESCONEGUDA)) return clau;
    const id = clau
      .slice(1)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    noms[id] ??= nomLlegible(String(rotuls[i]).trim());
    return id;
  });
  return { ids, noms };
}
