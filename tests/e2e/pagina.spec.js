import { readFileSync } from "node:fs";

import { esperaElsRedibuixos, estatDeLaPagina, expect, obre, prepara, test } from "./entorn.js";

/**
 * @param {import("@playwright/test").Page} page
 * @param {string} nom
 */
async function comparaAmbLaInstantania(page, nom) {
  await esperaElsRedibuixos(page);
  const estat = await estatDeLaPagina(page);
  expect(`${JSON.stringify(estat, null, 2)}\n`).toMatchSnapshot(`${nom}.json`);
}

test.describe("origen dels preus", () => {
  test("fa servir la còpia de GitHub Actions si el Ministeri no respon", async ({ page }) => {
    await prepara(page, { ministeri: "falla" });

    await obre(page);

    await comparaAmbLaInstantania(page, "copia");
    const evitaElMinisteri = await page.evaluate(() =>
      localStorage.getItem("ministeri-no-disponible"),
    );
    expect(evitaElMinisteri).not.toBeNull();
  });

  test("llegeix els preus en directe si el Ministeri respon", async ({ page }) => {
    await prepara(page, { ministeri: "respon" });

    await obre(page);

    await comparaAmbLaInstantania(page, "directe");
  });

  test("mostra els preus desats a la pàgina si no hi ha cap dada", async ({ page }) => {
    await prepara(page, { fitxers: [] });

    await obre(page, { ambMapa: false });

    await comparaAmbLaInstantania(page, "sense-dades");
  });

  test("avisa si la còpia té més d'un dia", async ({ page }) => {
    await prepara(page, { ara: new Date("2026-10-03T14:00:00+02:00") });

    await obre(page);

    await expect(page.locator("#statusText")).toHaveText(
      "Últimes dades oficials: 30/09/2026 12:00 (fa 3 dies). Els preus d'avui poden ser diferents.",
    );
  });
});

test("mostra la gota que s'omple mentre carrega els preus", async ({ page }) => {
  await prepara(page);
  /** @type {import("@playwright/test").Route[]} */
  const pendents = [];
  await page.route(/\/preus\.json\?/, (ruta) => {
    pendents.push(ruta);
  });
  await page.goto("index.html");
  const gota = page.locator("#status .carregant");

  await expect(gota).toBeVisible();
  await expect.poll(() => pendents.length).toBe(1);
  await pendents[0]?.fulfill({ path: new URL("./dades/preus.json", import.meta.url).pathname });

  await expect(page.locator("#status")).toHaveAttribute("data-s", "cache");
  await expect(gota).toBeHidden();
});

test.describe("controls", () => {
  test.beforeEach(async ({ page }) => {
    await prepara(page);
    await obre(page);
  });

  test("canvia al dièsel", async ({ page }) => {
    await page.getByRole("button", { name: "Dièsel" }).click();

    await comparaAmbLaInstantania(page, "diesel");
  });

  test("deixa fora les marques desmarcades al filtre i ho recorda", async ({ page }) => {
    await page.locator("#filtreBtn").click();
    await page.getByRole("checkbox", { name: /bonÀrea/ }).uncheck();
    await page.getByRole("checkbox", { name: /Plenergy/ }).uncheck();

    await comparaAmbLaInstantania(page, "filtre");
    await page.reload();
    await expect(page.locator("#filtreTxt")).toHaveText("Marques: 6 de 8");
  });

  test("compara els anys respecte a Catalunya", async ({ page }) => {
    await page.getByRole("button", { name: "Respecte a Catalunya" }).click();

    await comparaAmbLaInstantania(page, "anys-diferencia");
  });

  test("el títol dels anys diu quants anys hi ha si encara no n'hi ha cinc", async ({ page }) => {
    const anual = JSON.parse(readFileSync(new URL("./dades/anual.json", import.meta.url), "utf-8"));
    anual.anys = anual.anys.slice(-3);
    await page.route(/\/anual\.json\?/, (ruta) => ruta.fulfill({ json: anual }));

    await page.reload();
    await expect(page.locator("#chips button").first()).toBeAttached();

    await expect(page.locator("#anysTitol")).toHaveText("Últims tres anys");
    await expect(page.locator("#anysTable tbody tr")).toHaveCount(3);
  });

  test("afegeix i treu marques dels gràfics", async ({ page }) => {
    await page.locator(".chip", { hasText: "Esclatoil" }).click();
    await page.locator(".chip", { hasText: "marques més" }).click();
    await page.locator(".chip", { hasText: "Repsol" }).click();
    await page.locator(".chip", { hasText: "Moeve" }).click();

    await comparaAmbLaInstantania(page, "marques-dels-grafics");
  });
});

test("la comparativa mostra les deu primeres marques i la resta amb el botó", async ({ page }) => {
  const preus = JSON.parse(readFileSync(new URL("./dades/preus.json", import.meta.url), "utf-8"));
  const repsol = preus.marques.repsol;
  for (let i = 1; i <= 6; i++) {
    preus.marques[`marca-${i}`] = { ...repsol, nom: `Marca ${i}`, g95: repsol.g95 + i / 100 };
  }
  await prepara(page);
  await page.route(/\/preus\.json\?/, (ruta) => ruta.fulfill({ json: preus }));
  await obre(page);
  const files = page.locator("#comp .cr:visible");
  const boto = page.locator("#compMore");

  await expect(files).toHaveCount(10);
  await expect(boto).toHaveText("Mostra les 4 marques restants");

  await boto.click();
  await expect(files).toHaveCount(14);
  await expect(boto).toHaveText("Mostra'n menys");

  await boto.click();
  await expect(files).toHaveCount(10);
});

test.describe("benzineres properes", () => {
  test("busca a prop d'un municipi", async ({ page }) => {
    await prepara(page);
    await obre(page);

    await page.getByRole("button", { name: "Les més properes" }).click();
    await page.getByPlaceholder("Escriu un municipi").fill("reus");
    await page.getByPlaceholder("Escriu un municipi").press("Enter");

    await comparaAmbLaInstantania(page, "municipi");
  });

  test("canvia el radi i l'ordre de la llista", async ({ page }) => {
    await prepara(page);
    await obre(page);
    await page.getByRole("button", { name: "Les més properes" }).click();
    await page.getByPlaceholder("Escriu un municipi").fill("Lleida");
    await page.getByPlaceholder("Escriu un municipi").press("Enter");

    await page.getByLabel("Radi").fill("100");
    await esperaElsRedibuixos(page);
    await page.getByRole("button", { name: "Més a prop" }).click();

    await comparaAmbLaInstantania(page, "radi-i-ordre");
  });

  test("avisa si el municipi no té benzineres", async ({ page }) => {
    await prepara(page);
    await obre(page);

    await page.getByPlaceholder("Escriu un municipi").fill("Andorra");
    await page.getByPlaceholder("Escriu un municipi").press("Enter");

    await expect(page.locator("#nearMsg")).toHaveText(
      "No trobo «Andorra» entre els municipis amb benzinera. Tria'n un de la llista.",
    );
  });

  test("fa servir la ubicació del GPS", async ({ page, context }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: 41.39, longitude: 2.17, accuracy: 30 });
    await prepara(page);
    await obre(page);

    await page.getByRole("button", { name: "Les més properes" }).click();
    await expect(page.locator("#locInfo")).toBeVisible();

    await comparaAmbLaInstantania(page, "gps");
  });

  test("proposa escriure un municipi si no hi ha permís per al GPS", async ({ page }) => {
    await prepara(page);
    await obre(page);

    await page.getByRole("button", { name: "Fes servir la meva ubicació" }).click();

    await expect(page.locator("#nearMsg")).toHaveText(
      "No has donat permís per fer servir la ubicació. Pots escriure un municipi.",
    );
  });
});

test.describe("quant hi he de posar", () => {
  test.beforeEach(async ({ page }) => {
    await prepara(page);
    await obre(page);
  });

  test("demana activar les més properes per triar la benzinera", async ({ page }) => {
    await expect(page.locator("#dSenseBenzineres")).toBeVisible();
    await expect(page.locator("#dBenzinera")).toBeDisabled();
  });

  test("calcula els diners amb marge i arrodonits a 5 € a la benzinera més propera", async ({
    page,
  }) => {
    await page.getByPlaceholder("Escriu un municipi").fill("Reus");
    await page.getByPlaceholder("Escriu un municipi").press("Enter");

    await page.locator("#dKm").fill("100");

    // 50 L − 6 L que queden − 2,5 L de marge = 41,5 L × 1,659 €/L = 68,85 € → 65 €
    await expect(page.locator("#dBenzinera option:checked")).toContainText("Repsol");
    await expect(page.locator("#dEuros")).toHaveText("65 €");
    await expect(page.locator("#dDetall")).toContainText("n'hi caben 44,0 L");
  });

  test("diu que no cal posar-hi res si el dipòsit és gairebé ple", async ({ page }) => {
    await page.getByPlaceholder("Escriu un municipi").fill("Reus");
    await page.getByPlaceholder("Escriu un municipi").press("Enter");

    await page.locator("#dKm").fill("800");

    await expect(page.locator("#dEuros")).toHaveText("Res");
  });

  test("recorda el consum i el dipòsit del cotxe", async ({ page }) => {
    await page.locator("#dConsum").fill("5.5");
    await page.locator("#dDiposit").fill("42");
    await page.locator("#dDiposit").blur();

    await page.reload();

    await expect(page.locator("#dConsum")).toHaveValue("5.5");
    await expect(page.locator("#dDiposit")).toHaveValue("42");
  });
});

test.describe("menú de dreceres", () => {
  test.beforeEach(async ({ page }) => {
    await prepara(page);
    await obre(page);
  });

  test("en pantalles estretes s'obre amb el botó i es tanca en triar una secció", async ({
    page,
  }) => {
    const menu = page.getByRole("navigation", { name: "Dreceres" });
    await expect(menu).toBeHidden();

    await page.getByRole("button", { name: "Menú" }).click();
    await menu.getByRole("link", { name: "Totes les marques" }).click();

    await expect(menu).toBeHidden();
    await expect(page.locator("#compSec")).toBeInViewport();
  });

  test("només mostra les benzineres properes quan la secció es veu", async ({ page }) => {
    const properes = page.locator("#dreceres a[href='#aprop']");
    await expect(properes).toBeHidden();

    await page.getByPlaceholder("Escriu un municipi").fill("Reus");
    await page.getByPlaceholder("Escriu un municipi").press("Enter");
    await page.getByRole("button", { name: "Menú" }).click();

    await expect(properes).toBeVisible();
  });

  test("en pantalles amples és fix i marca la secció on ets", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.getByRole("button", { name: "Menú" })).toBeHidden();
    const menu = page.getByRole("navigation", { name: "Dreceres" });

    await menu.getByRole("link", { name: "Evolució dels preus" }).click();

    await expect(menu.getByRole("link", { name: "Evolució dels preus" })).toHaveAttribute(
      "aria-current",
      "location",
    );
  });

  test("marca l'última secció en arribar al final de la pàgina", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const ultima = page.locator("#dreceres a[href='#dipositSec']");

    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));

    await expect(ultima).toHaveAttribute("aria-current", "location");
    await expect(page.locator("#dreceres a[aria-current]")).toHaveCount(1);
  });

  for (const { ample, alt } of [
    { ample: 390, alt: 800 },
    { ample: 1440, alt: 900 },
  ]) {
    test(`queda centrat verticalment en una pantalla de ${ample} px`, async ({ page }) => {
      await page.setViewportSize({ width: ample, height: alt });
      await page.locator("#compSec").scrollIntoViewIfNeeded();
      if (await page.getByRole("button", { name: "Menú" }).isVisible()) {
        await page.getByRole("button", { name: "Menú" }).click();
      }

      await expect(async () => {
        const caixa = await page.locator(".dreceres-panel").boundingBox();
        expect(Math.abs((caixa?.y ?? 0) + (caixa?.height ?? 0) / 2 - alt / 2)).toBeLessThan(2);
      }).toPass();
    });
  }
});

test.describe("la més propera de cada marca", () => {
  test("amb el GPS, cada rètol diu on és la més propera i com arribar-hi", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: 41.39, longitude: 2.17 });
    await prepara(page);
    await obre(page);
    const lloc = page.locator("#t-0 .lloc");

    await lloc.getByRole("button", { name: "Troba la més propera" }).click();

    await expect(lloc).toContainText(/^Més propera: .+ · .+ km · Com arribar ↗$/);
    await expect(lloc.getByRole("link")).toHaveAttribute("href", /google\.com\/maps\/dir\//);
    await expect(page.getByRole("button", { name: "Totes les gasolineres" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("sense permís per al GPS ho avisa i deixa tornar-ho a provar", async ({ page }) => {
    await prepara(page);
    await obre(page);
    const lloc = page.locator("#t-0 .lloc");

    await lloc.getByRole("button", { name: "Troba la més propera" }).click();

    await expect(lloc).toContainText("No s'ha pogut saber on ets.");
    await expect(lloc.getByRole("button", { name: "Troba la més propera" })).toBeVisible();
  });

  test("amb un municipi triat ja surt la més propera a tots els rètols", async ({ page }) => {
    await prepara(page);
    await obre(page);

    await page.getByPlaceholder("Escriu un municipi").fill("Reus");
    await page.getByPlaceholder("Escriu un municipi").press("Enter");

    await expect(page.locator(".totem:visible .lloc")).toHaveCount(
      await page.locator(".totem:visible").count(),
    );
    await expect(page.locator("#t-0 .lloc")).toContainText("Més propera: ");
  });
});
