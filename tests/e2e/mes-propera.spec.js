import { expect, obre, prepara, test } from "./entorn.js";

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
