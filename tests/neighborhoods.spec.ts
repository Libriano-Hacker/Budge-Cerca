import { expect, test } from "@playwright/test";
import { initialData } from "../src/data";
import { DEFAULT_NEIGHBORHOOD, NEIGHBORHOOD_KEY } from "../src/neighborhoods";
import { STORAGE_KEY } from "../src/domain";

test("solo el desplegable permite elegir barrios y conserva la selección sin pestañas ni altas públicas", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle(`Tu Barrio Cerca · ${DEFAULT_NEIGHBORHOOD}`);
  await expect(
    page.getByRole("heading", { name: "Conectá con lo que te rodea." }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Barrios disponibles" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Agregar barrio", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("¿En qué barrio estás?", { exact: true }),
  ).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(/Ing\.?\s*Budge/i);
  await page
    .getByLabel("Seleccionar barrio", { exact: true })
    .selectOption("Banfield");
  await expect(page.getByText("0 comercios encontrados")).toBeVisible();
  await expect(page.locator(".business-card")).toHaveCount(0);
  await expect(page.locator(".floating-shop")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByLabel("Seleccionar barrio", { exact: true }),
  ).toHaveValue("Banfield");
  await page
    .getByLabel("Seleccionar barrio", { exact: true })
    .selectOption(DEFAULT_NEIGHBORHOOD);
  await expect(page.getByText("11 comercios encontrados")).toBeVisible();
  for (const category of ["Barberías", "Centros de spa", "Peluquerías"]) {
    await page.getByRole("button", { name: category, exact: true }).click();
    await expect(page.getByText("1 comercio encontrado")).toBeVisible();
    await expect(page.locator(".business-card")).toHaveCount(1);
  }
});

test("retira el nombre anterior de datos guardados y conserva comercios y favoritos", async ({
  page,
}) => {
  const legacy = {
    ...initialData,
    neighborhoods: ["Ing.Budge", "Banfield"],
    neighborhoodEdition: 1,
    settings: {
      ...initialData.settings,
      appName: "Budge Cerca",
      neighborhood: "Ing.Budge",
    },
    businesses: initialData.businesses
      .slice(0, 9)
      .map((business) => ({ ...business, neighborhood: "Ing.Budge" })),
  };
  await page.goto("/");
  await page.evaluate(
    ({ data, key, selectionKey }) => {
      localStorage.setItem(key, JSON.stringify(data));
      localStorage.setItem(
        "budge-cerca:favorites",
        JSON.stringify(["pan-del-barrio"]),
      );
      localStorage.setItem(selectionKey, "Ing.Budge");
    },
    { data: legacy, key: STORAGE_KEY, selectionKey: NEIGHBORHOOD_KEY },
  );
  await page.reload();
  await expect(page).toHaveTitle(`Tu Barrio Cerca · ${DEFAULT_NEIGHBORHOOD}`);
  await expect(page.locator("body")).not.toContainText(/Ing\.?\s*Budge/i);
  await expect(
    page.getByLabel("Seleccionar barrio", { exact: true }),
  ).not.toContainText("Ing.Budge");
  await expect(page.getByText("9 comercios encontrados")).toBeVisible();
  await expect(
    page
      .getByRole("button", { name: "Quitar Pan del Barrio en favoritos" })
      .first(),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Filtrar por rubro")).toContainText(
    "Centros de spa",
  );
});
