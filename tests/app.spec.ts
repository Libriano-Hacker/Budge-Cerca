import { expect, test } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
});
test("búsqueda, ficha, promoción, favoritos y contacto del creador", async ({
  page,
}) => {
  await expect(
    page.getByRole("heading", { name: "Conectá con lo que te rodea." }),
  ).toBeVisible();
  const contact = page.locator(".header-contact");
  await expect(contact).toHaveAttribute(
    "href",
    /https:\/\/wa.me\/5491150186306/,
  );
  await page
    .getByRole("combobox", { name: "Buscar comercios", exact: true })
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
    .getByRole("combobox", { name: "Buscar comercios", exact: true })
    .fill("tornillo");
  await expect(page.getByText("1 comercio encontrado")).toBeVisible();
});
test("sin resultados y diseño sin desborde horizontal", async ({ page }) => {
  await expect(page.locator("body")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("combobox", { name: "Buscar comercios", exact: true })
    .fill("xyz-sin-resultados");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "No encontramos comercios con estos filtros",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Limpiar", exact: true }).click();
  await expect(page.getByText("11 comercios encontrados")).toBeVisible();
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
    page.getByRole("combobox", { name: "Buscar comercios", exact: true }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await page
    .getByRole("combobox", { name: "Buscar comercios", exact: true })
    .fill("tornillo");
  await expect(page.getByText("1 comercio encontrado")).toBeVisible();
  await page.getByRole("button", { name: "El Tornillo", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: "El Tornillo" }),
  ).toBeVisible();
});
