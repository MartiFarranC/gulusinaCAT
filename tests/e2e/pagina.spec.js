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
    const evitaElMinisteri = await page.evaluate(() => localStorage.getItem("ministeri-no-disponible"));
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

  test("afegeix i treu marques dels gràfics", async ({ page }) => {
    await page.locator(".chip", { hasText: "Esclatoil" }).click();
    await page.locator(".chip", { hasText: "marques més" }).click();
    await page.locator(".chip", { hasText: "Repsol" }).click();
    await page.locator(".chip", { hasText: "Moeve" }).click();

    await comparaAmbLaInstantania(page, "marques-dels-grafics");
  });
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
