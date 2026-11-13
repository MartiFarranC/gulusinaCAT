import { expect, obre, prepara, test } from "./entorn.js";

const ANDORRA = "index.html?zona=andorra";

test.describe("versió d'Andorra", () => {
  test("el botó obre les benzineres d'Andorra amb el seu mapa", async ({ page }) => {
    await prepara(page, { ministeri: "respon" });
    await obre(page);

    await page.getByRole("link", { name: "Andorra" }).click();
    await expect(page.locator("#pantallaDeCarrega")).toHaveCount(0);
    await expect(page.locator("#mapSvg circle").first()).toBeAttached();

    await expect(page).toHaveTitle("On omplo el dipòsit? · Preus de benzineres a Andorra");
    await expect(page.getByRole("link", { name: "Andorra" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.locator(".sub")).toContainText("benzineres d'Andorra");
    await expect(page.locator("#statusText")).toHaveText(
      "Preus oficials del Govern d'Andorra del 30/09/2026 12:00 · s'actualitzen cada mitja hora",
    );
    await expect(page.locator("#t-0")).toHaveAttribute(
      "aria-label",
      "1a més barata: TotalEnergies, 1,415 euros el litre",
    );
    // Les benzineres amb l'etiqueta del preu no es dibuixen també com a punt
    const punts = await page.locator("#mapSvg .m-pt").count();
    const etiquetes = await page.locator("#mapSvg .m-tag").count();
    expect(punts + etiquetes).toBe(54);
    await expect(page.locator('footer [data-nomes-a="andorra"]')).toBeVisible();
    await expect(page.locator('footer [data-nomes-a="catalunya"]')).toBeHidden();
  });

  test("no demana els preus al Ministeri", async ({ page }) => {
    await prepara(page, { ministeri: "respon" });
    /** @type {string[]} */
    const peticions = [];
    page.on("request", (peticio) => peticions.push(peticio.url()));

    await obre(page, { adreca: ANDORRA });

    expect(peticions.filter((url) => url.includes("minetur"))).toEqual([]);
    expect(peticions.some((url) => url.includes("/andorra/preus.json"))).toBe(true);
  });

  test("recorda Andorra en tornar a obrir la pàgina i torna a Catalunya amb el botó", async ({
    page,
  }) => {
    await prepara(page);
    await obre(page, { adreca: ANDORRA });

    await obre(page);
    await expect(page.locator(".sub")).toContainText("Andorra");

    await page.getByRole("link", { name: "Catalunya" }).click();
    await expect(page.locator("#pantallaDeCarrega")).toHaveCount(0);
    await expect(page.locator(".sub")).toContainText("Catalunya");
    await expect(page.locator("#t-0")).not.toHaveAttribute("aria-label", /TotalEnergies/);
  });

  test("busca a prop d'un poble d'Andorra", async ({ page }) => {
    await prepara(page);
    await obre(page, { adreca: ANDORRA });

    await page.getByRole("button", { name: "Les més properes" }).click();
    await page.getByPlaceholder("Escriu un municipi").fill("Encamp");
    await page.getByPlaceholder("Escriu un municipi").press("Enter");
    await page.getByLabel("Radi").fill("5");

    await expect(page.locator("#nearMsg")).toContainText("a menys de 5 km de Encamp");
    await expect(page.locator("#compLead")).toContainText("totes les benzineres a menys de 5 km");
  });

  test("sense dades d'Andorra no mostra els preus de reserva de Catalunya", async ({ page }) => {
    await prepara(page, { fitxers: [] });

    await page.goto(ANDORRA);
    await expect(page.locator("#pantallaDeCarrega")).toHaveCount(0);

    await expect(page.locator("#statusText")).toHaveText(
      "No s'han pogut carregar els preus d'Andorra. Torna-ho a provar d'aquí a una estona.",
    );
    await expect(page.locator(".totem:visible")).toHaveCount(0);
  });
});
