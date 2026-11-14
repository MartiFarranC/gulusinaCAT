import { expect, obre, prepara, test } from "./entorn.js";

const CORS = { "access-control-allow-origin": "*" };

/** Llocs que coneix el cercador d'Open-Meteo de prova. */
const LLOCS = {
  Reus: { lat: 41.155, lon: 1.107, admin1: "Catalunya", admin2: "Baix Camp", pais: "ES" },
  Encamp: { lat: 42.534, lon: 1.584, admin1: "Encamp", admin2: "", pais: "AD" },
};

// Reus → Tàrrega → Cervera → Guissona → Solsona → Andorra la Vella → Encamp, en línia recta
const RUTA = [
  [1.107, 41.155],
  [1.14, 41.647],
  [1.272, 41.67],
  [1.288, 41.785],
  [1.517, 41.994],
  [1.522, 42.507],
  [1.584, 42.534],
];

/**
 * @param {import("@playwright/test").Page} page
 * @param {{ruta?: "respon" | "falla"}} [opcions]
 */
async function preparaElsServeis(page, { ruta = "respon" } = {}) {
  await page.route(/geocoding-api\.open-meteo\.com/, (peticio) => {
    const nom = new URL(peticio.request().url()).searchParams.get("name") ?? "";
    const lloc = LLOCS[/** @type {keyof typeof LLOCS} */ (nom)];
    const results = lloc
      ? [
          {
            name: nom,
            latitude: lloc.lat,
            longitude: lloc.lon,
            admin1: lloc.admin1,
            admin2: lloc.admin2,
            country_code: lloc.pais,
            country: lloc.pais === "AD" ? "Andorra" : "Espanya",
          },
        ]
      : undefined;
    return peticio.fulfill({ json: { results }, headers: CORS });
  });
  await page.route(/nominatim\.openstreetmap\.org/, (peticio) =>
    peticio.fulfill({
      json: [
        {
          lat: "41.67",
          lon: "1.272",
          name: "Carrer Major, 1",
          display_name: "Carrer Major, 1, Cervera, Segarra, Catalunya, Espanya",
        },
      ],
      headers: CORS,
    }),
  );
  await page.route(/router\.project-osrm\.org/, (peticio) =>
    ruta === "falla"
      ? peticio.fulfill({ status: 500, body: "", headers: CORS })
      : peticio.fulfill({
          json: {
            code: "Ok",
            routes: [
              {
                distance: 215000,
                duration: 9300,
                geometry: { type: "LineString", coordinates: RUTA },
              },
            ],
          },
          headers: CORS,
        }),
  );
}

/**
 * @param {import("@playwright/test").Page} page
 * @param {string} camp
 * @param {string} text
 */
async function tria(page, camp, text) {
  await page.getByLabel(camp, { exact: true }).fill(text);
  await page
    .locator(".diposit-opcio", { hasText: text.split(",")[0] ?? text })
    .first()
    .click();
}

test.describe("benzineres de la ruta", () => {
  test.beforeEach(async ({ page }) => {
    await prepara(page);
  });

  test("de Catalunya a Andorra marca les benzineres del camí i la més barata", async ({ page }) => {
    await preparaElsServeis(page);
    await obre(page);

    await tria(page, "D'on surts", "Reus");
    await expect(page.locator("#rMsg")).toHaveText("Ara tria on vas.");
    await tria(page, "On vas", "Encamp");

    await expect(page.locator("#rMsg")).toContainText("Ruta de");
    await expect(page.locator("#rMsg")).toContainText("(2 h 35 min)");
    await expect(page.locator("#rBarata")).toContainText("1,389 €/L");
    await expect(page.locator("#rBarata")).toContainText("Guissona");
    await expect(page.locator("#rLlista .sti.best")).toContainText("Guissona");
    const llocs = await page.locator("#rLlista .stm span").allTextContents();
    expect(llocs.some((lloc) => lloc.startsWith("Tàrrega"))).toBe(true);
    expect(llocs.some((lloc) => lloc.startsWith("Santa Coloma"))).toBe(true);
    await expect(page.locator("#rLlista .sti")).toHaveCount(15);
    await page.locator("#rMes").click();
    await expect(page.locator("#rLlista .sti", { hasText: "Encamp" }).first()).toBeVisible();
    await expect(page.locator("#rMapaSvg .m-ruta")).toHaveCount(1);
    await expect(page.locator("#rBarata a")).toHaveAttribute("href", /waypoints=41\.785,1\.288/);
  });

  test("la desviació i el combustible canvien les benzineres sense tornar a demanar la ruta", async ({
    page,
  }) => {
    await preparaElsServeis(page);
    await obre(page);
    await tria(page, "D'on surts", "Reus");
    await tria(page, "On vas", "Encamp");
    await expect(page.locator("#rBarata")).toContainText("1,389 €/L");
    const ambDos = await page.locator("#rLlista .sti").count();
    /** @type {string[]} */
    const rutes = [];
    page.on("request", (peticio) => {
      if (peticio.url().includes("osrm")) rutes.push(peticio.url());
    });

    await page.getByLabel("Desviació màxima").fill("0.5");
    await expect(page.locator("#rDesviacioTxt")).toHaveText("0,5 km");
    expect(await page.locator("#rLlista .sti").count()).toBeLessThanOrEqual(ambDos);
    await page.getByRole("button", { name: "Dièsel" }).click();

    await expect(page.locator("#rMsg")).toContainText("amb dièsel a menys de 0,5 km de la ruta");
    await expect(page.locator("#rBarata")).toContainText("1,309 €/L");
    expect(rutes).toEqual([]);
  });

  test("troba una adreça quan no és el nom d'un poble", async ({ page }) => {
    await preparaElsServeis(page);
    await obre(page);

    await page.getByLabel("D'on surts", { exact: true }).fill("Carrer Major, 1, Cervera");

    await expect(page.locator("#rOrigenOpcions")).toContainText(
      "Carrer Major, 1 · 1, Cervera, Segarra",
    );
  });

  test("surt de la ubicació del GPS", async ({ page, context }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: 41.155, longitude: 1.107 });
    await preparaElsServeis(page);
    await obre(page);

    await page.getByRole("button", { name: "Des d'on soc" }).click();
    await expect(page.getByLabel("D'on surts", { exact: true })).toHaveValue("La meva ubicació");
    await tria(page, "On vas", "Encamp");

    await expect(page.locator("#rBarata")).toContainText("Guissona");
  });

  test("avisa si no es pot calcular la ruta", async ({ page }) => {
    await preparaElsServeis(page, { ruta: "falla" });
    await obre(page);

    await tria(page, "D'on surts", "Reus");
    await tria(page, "On vas", "Encamp");

    await expect(page.locator("#rMsg")).toHaveText(
      "No s'ha pogut calcular la ruta. Torna-ho a provar d'aquí a una estona.",
    );
    await expect(page.locator("#rResultat")).toBeHidden();
  });
});
