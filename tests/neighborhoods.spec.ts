import { expect, test } from "@playwright/test";
import { initialData } from "../src/data";
import { NEIGHBORHOOD_KEY } from "../src/neighborhoods";
import { STORAGE_KEY } from "../src/domain";

test("marca nueva, selector y solapas conservan el barrio elegido y filtran los locales", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Tu Barrio Cerca · Ing.Budge");
  await expect(
    page.getByRole("button", { name: "Ir al inicio" }),
  ).toContainText("Tu Barrio Cerca");
  await page
    .getByLabel("Seleccionar barrio", { exact: true })
    .selectOption("Banfield");
  await expect(page.getByText("0 comercios encontrados")).toBeVisible();
  await expect(page.locator(".business-card")).toHaveCount(0);
  await expect(page.locator(".floating-shop")).toHaveCount(0);
  await expect(
    page
      .getByRole("navigation", { name: "Barrios disponibles" })
      .getByRole("button", { name: "Banfield", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(
    page.getByLabel("Seleccionar barrio", { exact: true }),
  ).toHaveValue("Banfield");
  await page
    .getByRole("navigation", { name: "Barrios disponibles" })
    .getByRole("button", { name: "Ing.Budge", exact: true })
    .click();
  await expect(page.getByText("11 comercios encontrados")).toBeVisible();
  for (const category of ["Barberías", "Centros de spa", "Peluquerías"]) {
    await page.getByRole("button", { name: category, exact: true }).click();
    await expect(page.getByText("1 comercio encontrado")).toBeVisible();
    await expect(page.locator(".business-card")).toHaveCount(1);
  }
});

test("agregar barrio y asignarle un comercio no mueve los comercios existentes", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Agregar barrio", exact: true })
    .click();
  await page.getByLabel("Nombre del nuevo barrio").fill("Villa Centenario");
  await page
    .getByRole("button", { name: "Guardar barrio", exact: true })
    .click();
  await expect(
    page.getByLabel("Seleccionar barrio", { exact: true }),
  ).toHaveValue("Villa Centenario");
  await page
    .getByRole("button", { name: "Agregar barrio", exact: true })
    .click();
  await page.getByLabel("Nombre del nuevo barrio").fill("villa centenario");
  await page
    .getByRole("button", { name: "Guardar barrio", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("ya está disponible");
  await page
    .getByRole("button", { name: "Agregar barrio", exact: true })
    .click();
  if (await page.getByRole("button", { name: "Abrir menú" }).isVisible()) {
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await page
      .getByRole("navigation", { name: "Menú móvil", exact: true })
      .getByRole("button", { name: "Dashboard demo" })
      .click();
  } else
    await page
      .getByRole("button", { name: "Dashboard demo", exact: true })
      .click();
  await page
    .getByRole("button", {
      name: "Editar Corte Urbano · Barbería",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Barrio del comercio", { exact: true })
    .selectOption("Villa Centenario");
  await page
    .getByRole("button", { name: "Guardar comercio", exact: true })
    .click();
  await page.getByRole("button", { name: "Ir al inicio" }).click();
  await expect(page.getByText("1 comercio encontrado")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Corte Urbano · Barbería", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByLabel("Seleccionar barrio", { exact: true }),
  ).toHaveValue("Villa Centenario");
  await page
    .getByRole("navigation", { name: "Barrios disponibles" })
    .getByRole("button", { name: "Ing.Budge", exact: true })
    .click();
  await expect(page.getByText("10 comercios encontrados")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Corte Urbano · Barbería", exact: true }),
  ).toHaveCount(0);
});

test("datos y favoritos anteriores conservan su contenido al actualizar el nombre", async ({
  page,
}) => {
  const legacy = {
    ...initialData,
    neighborhoods: undefined,
    neighborhoodEdition: undefined,
    settings: { ...initialData.settings, appName: "Budge Cerca" },
    businesses: initialData.businesses
      .slice(0, 9)
      .map(({ neighborhood: _neighborhood, ...b }) => b),
  };
  await page.goto("/");
  await page.evaluate(
    ({ data, key, selectionKey }) => {
      localStorage.setItem(key, JSON.stringify(data));
      localStorage.setItem(
        "budge-cerca:favorites",
        JSON.stringify(["pan-del-barrio"]),
      );
      localStorage.removeItem(selectionKey);
    },
    { data: legacy, key: STORAGE_KEY, selectionKey: NEIGHBORHOOD_KEY },
  );
  await page.reload();
  await expect(page).toHaveTitle("Tu Barrio Cerca · Ing.Budge");
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
