import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { initialData } from "../src/data";
import { DEFAULT_NEIGHBORHOOD } from "../src/neighborhoods";
async function admin(page: Page) {
  if (await page.getByRole("button", { name: "Abrir menú" }).isVisible()) {
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await page
      .getByRole("navigation", { name: "Menú móvil", exact: true })
      .getByRole("button", { name: "Dashboard demo" })
      .click();
  } else {
    await page
      .getByRole("button", { name: "Dashboard demo", exact: true })
      .click();
  }
}
async function addNeighborhood(page: Page, name: string) {
  await page.getByLabel("Nombre del nuevo barrio").fill(name);
  await page
    .getByRole("button", { name: "Agregar barrio", exact: true })
    .click();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});
test("dashboard cambia marca, agrega rubro y comercio, conserva y elimina datos", async ({
  page,
}) => {
  await admin(page);
  await page.getByRole("tab", { name: "Barrios", exact: true }).click();
  await page.getByLabel("Nombre del nuevo barrio").fill("Villa Prueba");
  await page
    .getByRole("button", { name: "Agregar barrio", exact: true })
    .click();
  await page.getByRole("tab", { name: "Mi barrio" }).click();
  await page
    .getByLabel("Barrio inicial", { exact: true })
    .selectOption("Villa Prueba");
  await page
    .getByLabel("Nombre de la aplicación", { exact: true })
    .fill("Mi Barrio Cerca");
  await page.getByRole("button", { name: "Guardar mi barrio" }).click();
  await expect(page).toHaveTitle("Mi Barrio Cerca · Villa Prueba");
  await page.getByRole("tab", { name: "Rubros" }).click();
  await page.getByLabel("Nombre del nuevo rubro").fill("Jugueterías");
  await page.getByRole("button", { name: "Agregar rubro" }).click();
  await page
    .getByRole("button", { name: "Agregar comercio", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nombre del comercio").fill("Juguetería de Prueba");
  await dialog.getByLabel("Rubro").selectOption("Jugueterías");
  await dialog
    .getByLabel("Descripción")
    .fill("Atención de prueba para validar el directorio.");
  await dialog.getByLabel("Dirección").fill("Calle de Prueba 123");
  await dialog
    .getByLabel("WhatsApp", { exact: true })
    .fill("+54 9 11 1234 5678");
  await dialog.getByLabel("Latitud").fill("-34.721");
  await dialog.getByLabel("Longitud").fill("-58.454");
  await dialog
    .getByLabel("Promoción (opcional)")
    .fill("20% en productos de prueba hasta el domingo.");
  await dialog
    .getByRole("button", { name: "Agregar comercio", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await page
    .getByRole("combobox", { name: "Buscar comercios", exact: true })
    .fill("Juguetería de Prueba");
  await expect(page.getByText("1 comercio encontrado")).toBeVisible();
  await expect(
    page.getByLabel("Seleccionar barrio", { exact: true }),
  ).toHaveValue("Villa Prueba");
  await page
    .getByRole("button", { name: "Juguetería de Prueba", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("link", { name: "WhatsApp", exact: true }),
  ).toHaveAttribute("href", /wa.me\/5491112345678/);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cerrar ventana" })
    .click();
  await admin(page);
  await page
    .getByRole("button", { name: "Editar Juguetería de Prueba", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Nombre del comercio")
    .fill("Juguetería Editada");
  await page
    .getByRole("button", { name: "Guardar comercio", exact: true })
    .click();
  await expect(
    page.getByText("Juguetería Editada", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Eliminar Juguetería Editada", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Eliminar comercio", exact: true })
    .click();
  await expect(
    page.getByText("Juguetería Editada", { exact: true }),
  ).toHaveCount(0);
});

test("importación valida la copia antes de reemplazar el catálogo", async ({
  page,
}) => {
  await admin(page);
  const input = page.getByLabel("Importar copia de seguridad");
  await input.setInputFiles({
    name: "incorrecto.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":1}'),
  });
  await expect(page.getByRole("alert")).toContainText("no es una copia válida");
  const data = {
    ...initialData,
    neighborhoods: [...initialData.neighborhoods!, "Barrio Importado"],
    settings: { ...initialData.settings, neighborhood: "Barrio Importado" },
  };
  await input.setInputFiles({
    name: "copia.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(data)),
  });
  await expect(
    page.getByRole("dialog").getByText("11 comercios", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Reemplazar datos" })
    .click();
  await page.reload();
  await expect(page).toHaveTitle("Tu Barrio Cerca · Barrio Importado");
});

test("el dashboard agrega barrios y asigna comercios sin mover los existentes", async ({
  page,
}) => {
  await page.goto("/");
  await admin(page);
  await page.getByRole("tab", { name: "Barrios", exact: true }).click();
  await addNeighborhood(page, "Villa Centenario");
  await addNeighborhood(page, "villa centenario");
  await expect(page.getByRole("alert")).toContainText("ya está disponible");
  await page.getByRole("tab", { name: "Comercios", exact: true }).click();
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
  await page
    .getByLabel("Seleccionar barrio", { exact: true })
    .selectOption("Villa Centenario");
  await expect(page.getByText("1 comercio encontrado")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Corte Urbano · Barbería", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByLabel("Seleccionar barrio", { exact: true }),
  ).toHaveValue("Villa Centenario");
  await page
    .getByLabel("Seleccionar barrio", { exact: true })
    .selectOption(DEFAULT_NEIGHBORHOOD);
  await expect(page.getByText("10 comercios encontrados")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Corte Urbano · Barbería", exact: true }),
  ).toHaveCount(0);
});

test("el dashboard elimina barrios vacíos y recupera la selección si se quita el elegido", async ({
  page,
}) => {
  await page.goto("/");
  await admin(page);
  await page.getByRole("tab", { name: "Barrios", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: `Eliminar barrio ${DEFAULT_NEIGHBORHOOD}`,
      exact: true,
    }),
  ).toBeDisabled();
  await addNeighborhood(page, "Zona temporal");
  await page.getByRole("button", { name: "Ir al inicio" }).click();
  await page
    .getByLabel("Seleccionar barrio", { exact: true })
    .selectOption("Zona temporal");
  await expect(page.getByText("0 comercios encontrados")).toBeVisible();
  await admin(page);
  await page.getByRole("tab", { name: "Barrios", exact: true }).click();
  await page
    .getByRole("button", { name: "Eliminar barrio Zona temporal", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Eliminar barrio Zona temporal",
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Eliminar barrio Banfield", exact: true })
    .click();
  await page.getByRole("button", { name: "Ir al inicio" }).click();
  await expect(
    page.getByLabel("Seleccionar barrio", { exact: true }),
  ).toHaveValue(DEFAULT_NEIGHBORHOOD);
  await page.reload();
  const selector = page.getByLabel("Seleccionar barrio", { exact: true });
  expect(await selector.locator("option").allTextContents()).not.toContain(
    "Zona temporal",
  );
  expect(await selector.locator("option").allTextContents()).not.toContain(
    "Banfield",
  );
  await expect(page.getByText("11 comercios encontrados")).toBeVisible();
});

test("dashboard guarda una foto propia y conserva una imagen si falla el enlace", async ({
  page,
}) => {
  const photo = "https://example.com/storefront.png";
  await page.route(photo, (route) =>
    route.fulfill({ path: "public/icon-192.png", contentType: "image/png" }),
  );
  await page.goto("/");
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
    .getByRole("button", { name: "Editar Pan del Barrio", exact: true })
    .click();
  await page.getByLabel("Foto del comercio", { exact: true }).fill(photo);
  await page
    .getByRole("button", { name: "Guardar comercio", exact: true })
    .click();
  await page.getByRole("button", { name: "Ir al inicio" }).click();
  const image = page.locator(".shop-1 .business-photo img");
  await expect(image).toHaveAttribute("src", photo);
  await expect(image).toBeVisible();
  await page.waitForFunction(
    () =>
      (document.querySelector(".shop-1 img") as HTMLImageElement)
        ?.naturalWidth === 192,
  );
  await page.unroute(photo);
  await page.route(photo, (route) => route.abort());
  await page.reload();
  await expect(page.locator(".shop-1 .business-photo")).toHaveAttribute(
    "aria-label",
    "Imagen ilustrativa de Panaderías",
  );
  await expect(page.locator(".shop-1 .business-photo img")).toHaveCount(0);
});
