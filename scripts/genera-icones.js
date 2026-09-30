/**
 * Genera les icones PNG i la imatge per compartir a partir de assets/icones/logo.svg, amb el
 * Chromium de Playwright. S'executa a mà quan canvia el logo: npm run icones
 */

import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const ICONES = new URL("../assets/icones/", import.meta.url);
const LOGO = readFileSync(new URL("logo.svg", ICONES), "utf-8");
const FONS = "#0F1114";

/** Mida de cada icona quadrada i el fitxer on es desa. */
const QUADRADES = [
  { mida: 180, fitxer: "apple-touch-icon.png" },
  { mida: 192, fitxer: "icona-192.png" },
  { mida: 512, fitxer: "icona-512.png" },
];

const COMPARTIR = `<body style="margin:0;width:1200px;height:630px;background:${FONS};display:flex;align-items:center;gap:56px;padding:0 96px;box-sizing:border-box;font-family:system-ui,sans-serif">
  <div style="width:260px;height:260px;flex:none">${LOGO}</div>
  <div>
    <div style="color:#EEF1F4;font-size:84px;font-weight:900;line-height:1.02;letter-spacing:-2px">On omplo el dipòsit?</div>
    <div style="color:#8B949E;font-size:34px;margin-top:22px;line-height:1.3">Preus de les benzineres de Catalunya, marca per marca, amb les dades oficials del Ministeri.</div>
  </div>
</body>`;

/**
 * @param {import("@playwright/test").Page} pagina
 * @param {string} html
 * @param {{ample: number, alt: number, fitxer: string}} sortida
 */
async function captura(pagina, html, { ample, alt, fitxer }) {
  await pagina.setViewportSize({ width: ample, height: alt });
  await pagina.setContent(html);
  await pagina.screenshot({ path: new URL(fitxer, ICONES).pathname });
}

const navegador = await chromium.launch();
try {
  const pagina = await navegador.newPage();
  for (const { mida, fitxer } of QUADRADES) {
    const html = `<body style="margin:0"><div style="width:${mida}px;height:${mida}px">${LOGO.replace('rx="14"', 'rx="0"')}</div></body>`;
    await captura(pagina, html, { ample: mida, alt: mida, fitxer });
  }
  await captura(pagina, COMPARTIR, { ample: 1200, alt: 630, fitxer: "compartir.png" });
} finally {
  await navegador.close();
}
