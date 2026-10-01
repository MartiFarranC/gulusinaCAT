import { expect, obre, prepara, test } from "./entorn.js";

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
