import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { initialData } from "../src/data";
async function admin(page: Page) {
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
}
test.beforeEach(async ({ page }) => {
  await page.goto("/");
});
test("búsqueda, ficha, promoción, favoritos y contacto del creador", async ({
  page,
}) => {
  await expect(
    page.getByRole("heading", { name: /Tu barrio\. Todo cerca\./ }),
  ).toBeVisible();
  const contact = page.locator(".header-contact");
  await expect(contact).toHaveAttribute(
    "href",
    /https:\/\/wa.me\/5491150186306/,
  );
  await page
    .getByRole("textbox", { name: "Buscar comercios", exact: true })
    .fill("peluqueria");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByText("1 comercio encontrado")).toBeVisible();
  await page
    .getByRole("button", { name: "Raíces · Peluquería", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Raíces · Peluquería" }),
  ).toBeVisible();
  await expect(
    dialog.locator('.detail-actions [aria-disabled="true"]'),
  ).toHaveText("WhatsApp");
  await dialog.getByRole("button", { name: "Guardar en favoritos" }).click();
  await dialog.getByRole("button", { name: "Cerrar ventana" }).click();
  await page
    .getByRole("navigation", { name: /Accesos móviles|Navegación principal/ })
    .filter({ visible: true })
    .getByRole("button", { name: /^(Mis favoritos|Favoritos)$/ })
    .click();
  await expect(page.getByText("1 comercio encontrado")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Raíces · Peluquería", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "Quitar Raíces · Peluquería en favoritos",
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("navigation", { name: /Accesos móviles|Navegación principal/ })
    .filter({ visible: true })
    .getByRole("button", { name: /^(Promociones|Promos)$/ })
    .click();
  await expect(page.getByText("4 comercios encontrados")).toBeVisible();
  await page
    .getByRole("button", { name: "Pan del Barrio", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByText("Llevá 12 facturas y pagá 10. De lunes a viernes."),
  ).toBeVisible();
});
test("GPS autorizado genera distancias y origen para el recorrido", async ({
  context,
  page,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: -34.72, longitude: -58.455 });
  await page.getByRole("button", { name: "Usar mi ubicación" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Ubicación activada" }),
  ).toBeVisible();
  await expect(page.locator(".distance").first()).toContainText(/m|km/);
  await page
    .getByRole("button", { name: "Pan del Barrio", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("dialog").getByRole("link", { name: "Cómo llegar" }),
  ).toHaveAttribute("href", /origin=-34.72%2C-58.455/);
});
test("GPS denegado mantiene el buscador utilizable", async ({ page }) => {
  await page.evaluate(() => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (
          _success: unknown,
          error: (e: { code: number }) => void,
        ) => error({ code: 1 }),
      },
    });
  });
  await page.getByRole("button", { name: "Usar mi ubicación" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "No se autorizó el GPS" }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Buscar comercios", exact: true })
    .fill("tornillo");
  await expect(page.getByText("1 comercio encontrado")).toBeVisible();
});
test("dashboard cambia marca, agrega rubro y comercio, conserva y elimina datos", async ({
  page,
}) => {
  await admin(page);
  await page.getByRole("tab", { name: "Mi barrio" }).click();
  await page
    .getByLabel("Nombre del barrio", { exact: true })
    .fill("Villa Prueba");
  await page
    .getByLabel("Nombre de la aplicación", { exact: true })
    .fill("Mi Barrio Cerca");
  await page.getByRole("button", { name: "Guardar mi barrio" }).click();
  await expect(page).toHaveTitle("Mi Barrio Cerca · Villa Prueba");
  await page.getByRole("tab", { name: "Rubros" }).click();
  await page.getByLabel("Nombre del nuevo rubro").fill("Farmacias");
  await page.getByRole("button", { name: "Agregar rubro" }).click();
  await page
    .getByRole("button", { name: "Agregar comercio", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nombre del comercio").fill("Farmacia de Prueba");
  await dialog.getByLabel("Rubro").selectOption("Farmacias");
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
    .getByRole("textbox", { name: "Buscar comercios", exact: true })
    .fill("Farmacia de Prueba");
  await expect(page.getByText("1 comercio encontrado")).toBeVisible();
  await expect(page.getByText("Villa Prueba").first()).toBeVisible();
  await page
    .getByRole("button", { name: "Farmacia de Prueba", exact: true })
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
    .getByRole("button", { name: "Editar Farmacia de Prueba", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Nombre del comercio")
    .fill("Farmacia Editada");
  await page
    .getByRole("button", { name: "Guardar comercio", exact: true })
    .click();
  await expect(
    page.getByText("Farmacia Editada", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Eliminar Farmacia Editada", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Eliminar comercio", exact: true })
    .click();
  await expect(page.getByText("Farmacia Editada", { exact: true })).toHaveCount(
    0,
  );
});
test("sin resultados y diseño sin desborde horizontal", async ({ page }) => {
  await expect(page.locator("body")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("textbox", { name: "Buscar comercios", exact: true })
    .fill("xyz-sin-resultados");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "No encontramos comercios con estos filtros",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Limpiar", exact: true }).click();
  await expect(page.getByText("9 comercios encontrados")).toBeVisible();
});

test("mapa informa fallas de conexión y sus marcadores abren fichas", async ({
  page,
}) => {
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.abort(),
  );
  await page.getByRole("button", { name: "Mapa", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Mapa de comercios" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "No pudimos cargar el fondo del mapa" }),
  ).toBeVisible();
  await page.locator('.business-marker[title="Ver Pan del Barrio"]').click();
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: "Pan del Barrio" }),
  ).toBeVisible();
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
    settings: { ...initialData.settings, neighborhood: "Barrio Importado" },
  };
  await input.setInputFiles({
    name: "copia.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(data)),
  });
  await expect(
    page.getByRole("dialog").getByText("9 comercios", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Reemplazar datos" })
    .click();
  await page.reload();
  await expect(page).toHaveTitle("Budge Cerca · Barrio Importado");
});

test("PWA conserva el buscador después de recargar sin conexión", async ({
  page,
  context,
}) => {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Buscar comercios", exact: true }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await page
    .getByRole("textbox", { name: "Buscar comercios", exact: true })
    .fill("tornillo");
  await expect(page.getByText("1 comercio encontrado")).toBeVisible();
  await page.getByRole("button", { name: "El Tornillo", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: "El Tornillo" }),
  ).toBeVisible();
});
