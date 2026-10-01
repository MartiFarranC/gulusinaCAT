import { expect, obre, prepara, test } from "./entorn.js";

test.describe("quant hi he de posar", () => {
  test.beforeEach(async ({ page }) => {
    await prepara(page);
    await obre(page);
  });

  test("sense ubicació, es busca la benzinera i es calcula amb el seu preu", async ({ page }) => {
    await expect(page.locator("#dAvis")).toHaveText(
      "Escriu els quilòmetres d'autonomia que et marca el cotxe.",
    );
    await page.locator("#dKm").fill("100");
    await expect(page.locator("#dAvis")).toHaveText("Busca i tria la benzinera on ets.");

    await page.getByPlaceholder("Busca per marca, municipi o adreça").fill("plenergy blanes");
    const resultats = page.locator("#dResultats button");
    await expect(resultats).toHaveCount(1);
    await resultats.first().click();

    // 50 L − 6 L que queden − 2,5 L de marge = 41,5 L × 1,379 €/L = 57,23 € → 55 €
    await expect(page.locator("#dTriada")).toContainText("Plenergy (Plenoil) · Blanes");
    await expect(page.locator("#dEuros")).toHaveText("55 €");
    await expect(page.locator("#dResultats")).toBeHidden();
  });

  test("diu si la cerca no troba cap benzinera", async ({ page }) => {
    await page.getByPlaceholder("Busca per marca, municipi o adreça").fill("xyz");

    await expect(page.locator("#dResultats")).toHaveText("Cap benzinera coincideix amb la cerca.");
  });

  test("calcula els diners amb marge i arrodonits a 5 € a la benzinera més propera", async ({
    page,
  }) => {
    await page.getByPlaceholder("Escriu un municipi").fill("Reus");
    await page.getByPlaceholder("Escriu un municipi").press("Enter");

    await page.locator("#dKm").fill("100");

    // 50 L − 6 L que queden − 2,5 L de marge = 41,5 L × 1,659 €/L = 68,85 € → 65 €
    await expect(page.locator("#dTriada")).toContainText("Repsol · Reus");
    await expect(page.locator("#dEuros")).toHaveText("65 €");
    await expect(page.locator("#dDetall")).toContainText("n'hi caben 44,0 L");
  });

  test("diu que no cal posar-hi res si el dipòsit és gairebé ple", async ({ page }) => {
    await page.getByPlaceholder("Escriu un municipi").fill("Reus");
    await page.getByPlaceholder("Escriu un municipi").press("Enter");

    await page.locator("#dKm").fill("800");

    await expect(page.locator("#dEuros")).toHaveText("Res");
  });

  test("el botó «Quant hi poso?» porta a la calculadora amb el cursor a l'autonomia", async ({
    page,
  }) => {
    await page.getByRole("link", { name: "Quant hi poso?" }).click();

    await expect(page.locator("#dipositSec")).toBeInViewport();
    await expect(page.locator("#dKm")).toBeFocused();
  });

  test("l'adreça amb #dipositSec obre la pàgina a la calculadora", async ({ page }) => {
    await page.goto("index.html#dipositSec");

    await expect(page.locator("#dKm")).toBeFocused();
    await expect(page.locator("#dipositSec")).toBeInViewport();
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
