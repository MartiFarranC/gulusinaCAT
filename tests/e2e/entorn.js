import { readFileSync } from "node:fs";
import { test as base, expect } from "@playwright/test";

const DADES = new URL("./dades/", import.meta.url);
/** @param {string} nom */
const llegeix = (nom) => readFileSync(new URL(nom, DADES));

export const ARA = new Date("2026-09-30T14:00:00+02:00");
export const FITXERS_DE_DADES = ["preus.json", "estacions.json", "historic.json", "anual.json"];
const PNG_BUIT = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

/**
 * Prepara la pàgina perquè no depengui de la xarxa ni del rellotge.
 *
 * @param {import("@playwright/test").Page} page
 * @param {{ministeri?: "falla" | "respon", fitxers?: readonly string[], ara?: Date}} opcions
 *   Si el Ministeri respon amb CORS, quins fitxers de dades existeixen i quina hora és.
 */
export async function prepara(
  page,
  { ministeri = "falla", fitxers = FITXERS_DE_DADES, ara = ARA } = {},
) {
  await page.clock.setFixedTime(ara);
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (ruta) =>
    ruta.fulfill({ body: "", contentType: "text/css" }),
  );
  await page.route(/tile\.openstreetmap\.org/, (ruta) =>
    ruta.fulfill({ body: PNG_BUIT, contentType: "image/png" }),
  );
  await page.route(/sedeaplicaciones\.minetur\.gob\.es/, (ruta) =>
    ministeri === "respon"
      ? ruta.fulfill({
          body: llegeix("ministeri.json"),
          contentType: "application/json",
          headers: { "access-control-allow-origin": "*" },
        })
      : ruta.abort(),
  );
  for (const nom of FITXERS_DE_DADES) {
    await page.route(new RegExp(`/${nom.replace(".", "\\.")}\\?`), (ruta) =>
      fitxers.includes(nom)
        ? ruta.fulfill({ body: llegeix(nom), contentType: "application/json" })
        : ruta.fulfill({ status: 404, body: "" }),
    );
  }
}

/**
 * Obre la pàgina i espera que hagi acabat de carregar i pintar les dades.
 *
 * @param {import("@playwright/test").Page} page
 * @param {{ambMapa?: boolean}} [opcions] Si s'espera que es pinti el mapa.
 */
export async function obre(page, { ambMapa = true } = {}) {
  await page.goto("index.html");
  await expect(page.locator("#chips button").first()).toBeAttached();
  if (ambMapa) await expect(page.locator("#mapSvg circle").first()).toBeAttached();
}

/**
 * Espera que els canvis amb retard (radi, redibuixos) s'hagin aplicat.
 *
 * @param {import("@playwright/test").Page} page
 */
export async function esperaElsRedibuixos(page) {
  await page.evaluate(
    () => new Promise((fet) => setTimeout(() => requestAnimationFrame(() => fet(null)), 250)),
  );
}

/**
 * Resum de tot el que la pàgina mostra, independent de les fonts i de les animacions.
 *
 * @param {import("@playwright/test").Page} page
 */
export function estatDeLaPagina(page) {
  return page.evaluate(() => {
    /** @param {string} sel */
    const $ = (sel) => /** @type {HTMLElement} */ (document.querySelector(sel));
    /** @param {string} sel */
    const text = (sel) => $(sel)?.textContent?.replace(/\s+/g, " ").trim() ?? null;
    /** @param {string} sel */
    const visibles = (sel) =>
      [...document.querySelectorAll(sel)].filter((e) => !e.closest("[hidden]"));
    /** @param {string} sel */
    const textos = (sel) => visibles(sel).map((e) => e.textContent.replace(/\s+/g, " ").trim());
    /** @param {Element} e @param {string} sel */
    const fill = (e, sel) => /** @type {HTMLElement} */ (e.querySelector(sel));
    /** @param {string} sel */
    const filesDeLaTaula = (sel) =>
      [.../** @type {HTMLTableElement} */ ($(sel)).rows].map((r) => r.textContent);
    /** @param {string} sel */
    const visible = (sel) => Boolean($(sel)) && !$(sel).closest("[hidden]");
    return {
      estat: `${$("#status").dataset.s} · ${text("#statusText")}`,
      kicker: text(".kicker"),
      filtre: text("#filtreTxt"),
      totems: visibles(".totem").map((e) => ({
        aria: e.getAttribute("aria-label"),
        meta: fill(e, ".meta").textContent,
        tendencia: fill(e, ".trend").hidden ? null : fill(e, ".trend").textContent,
        rang: fill(e, ".rank").textContent,
        millor: e.classList.contains("best"),
      })),
      comparativa: visible("#compSec") && {
        lead: text("#compLead"),
        simple: $("#compSec").classList.contains("simple"),
        files: visibles(".cr").map(
          (e) => `${e.getAttribute("aria-label")} | ${text(`#${e.id} .cheap`)}`,
        ),
        mesBoto: visible("#compMore") ? text("#compMore") : null,
      },
      calculadora: { tiquets: textos(".ticket"), veredicte: text("#verdict") },
      retol: textos(".tk"),
      evolucio: visible("#evoSec") && {
        lead: text("#evoLead"),
        marques: visibles(".chip").map((e) => `${e.textContent} ${e.getAttribute("aria-pressed")}`),
        nota: text("#chipsNote"),
        dies: visible("#histSec") && {
          aria: $("#chartSvg").getAttribute("aria-label"),
          taula: filesDeLaTaula("#histTable"),
          etiquetes: [...document.querySelectorAll("#chartSvg .lbl")].map((e) => e.textContent),
        },
        anys: visible("#anysSec") && {
          lead: text("#anysLead"),
          aria: $("#anysSvg").getAttribute("aria-label"),
          taula: filesDeLaTaula("#anysTable"),
        },
      },
      mapa: visible("#mapSec") && {
        titol: text("#mapTitol"),
        missatge: text("#nearMsg"),
        ubicacio: visible("#locInfo") ? text("#locInfo") : null,
        radiVisible: visible("#radiRow"),
        visible: visible("#map"),
        punts: document.querySelectorAll("#mapSvg .m-pt").length,
        etiquetes: textos("#mapSvg .m-tag"),
        radi: Boolean($("#mapSvg .m-radi")),
        ubicacioAlMapa: Boolean($("#mapSvg .m-jo")),
      },
      aprop: visible("#aprop") && {
        lead: text("#apropLead"),
        llista: textos("#stList li"),
        mesBoto: visible("#stMore"),
      },
    };
  });
}

/** Test que falla si la pàgina llança algun error de JavaScript. */
export const test = base.extend({
  page: async ({ page }, usa) => {
    /** @type {string[]} */
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await usa(page);
    expect(errors).toEqual([]);
  },
});

export { expect };
