import { test, expect } from "@playwright/test";
test.describe.configure({ mode: "serial" });
test("searches actual services and displays confirmed details", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Catálogo del barrio · datos publicados"),
  ).toBeVisible();
  const input = page.getByRole("combobox", {
    name: "Buscar comercios",
    exact: true,
  });
  await input.fill("integr");
  await expect(
    page.getByRole("option", { name: /Pan integral/ }),
  ).toBeVisible();
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(
    page.getByRole("button", { name: "Con entrega", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Ver Panadería de prueba", exact: true })
    .last()
    .click();
  const modal = page.getByRole("dialog");
  await expect(
    modal.getByRole("heading", { name: "Servicios y productos" }),
  ).toBeVisible();
  await expect(modal.getByText("Pan integral", { exact: true })).toBeVisible();
  await expect(modal.getByText("Precio por kilo")).toBeVisible();
  await expect(modal.getByText("Feriado", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "artifacts/catalogo-publico-desktop.png",
    fullPage: false,
  });
});
test("moderates a request into a private draft then explicitly publishes it", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Catálogo del barrio · datos publicados"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Quiero sumar mi comercio" }).click();
  let modal = page.getByRole("dialog");
  await modal
    .getByLabel("Nombre del comercio", { exact: true })
    .fill("Barbería del Paseo");
  await modal
    .getByLabel("Dirección", { exact: true })
    .fill("Calle del Paseo 123");
  await modal
    .getByLabel("Contanos qué ofrece el comercio")
    .fill("Barbería familiar con cortes y cuidado de barba.");
  await modal.getByRole("checkbox").check();
  await page.waitForTimeout(2200);
  await modal.getByRole("button", { name: "Enviar para revisión" }).click();
  await expect(
    modal.getByRole("heading", { name: "Solicitud recibida" }),
  ).toBeVisible();
  await modal.getByRole("button", { name: "Volver al catálogo" }).click();
  await page.goto("/gestion");
  await page.getByLabel("Correo del administrador").fill("owner@example.test");
  await page.getByLabel("Contraseña", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /Información que da confianza/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Solicitudes", exact: true }).click();
  await page
    .getByRole("button", { name: "Revisar y preparar borrador" })
    .click();
  modal = page.getByRole("dialog");
  await modal
    .getByLabel("Descripción *", { exact: true })
    .fill("Cortes y afeitado con atención personalizada.");
  await modal.getByLabel(/Latitud/).fill("-34.61");
  await modal.getByLabel(/Longitud/).fill("-58.44");
  await modal
    .getByRole("button", { name: "Aprobar y guardar borrador" })
    .click();
  await expect(modal).toHaveCount(0);
  const publicContext = await browser.newContext();
  const publicPage = await publicContext.newPage();
  await publicPage.goto("http://127.0.0.1:4190/");
  await expect(
    publicPage.getByText("Catálogo del barrio · datos publicados"),
  ).toBeVisible();
  await expect(
    publicPage.getByRole("button", { name: "Ver Barbería del Paseo" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Comercios", exact: true }).click();
  const row = page.locator("article").filter({ hasText: "Barbería del Paseo" });
  await expect(row.getByText("Borrador privado")).toBeVisible();
  await row.getByRole("button", { name: "Vista previa" }).click();
  await page.getByRole("button", { name: "Publicar esta versión" }).click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await publicPage.reload();
  await expect(
    publicPage.getByRole("button", {
      name: "Ver Barbería del Paseo",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Calidad de datos", exact: true })
    .click();
  await expect(
    page.getByText("Falta el WhatsApp del comercio").first(),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/catalogo-dashboard-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "artifacts/catalogo-dashboard-movil.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.body.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  await page.context().clearCookies();
  await page.getByRole("button", { name: "Recargar", exact: true }).click();
  await expect(page.getByLabel("Correo del administrador")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Calidad de datos", exact: true }),
  ).toHaveCount(0);
  await publicContext.close();
});

test("mobile users can tap service suggestions and inspect the expanded profile", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4190/");
  await expect(
    page.getByText("Catálogo del barrio · datos publicados"),
  ).toBeVisible();
  const input = page.getByRole("combobox", {
    name: "Buscar comercios",
    exact: true,
  });
  await input.tap();
  await input.fill("integr");
  await page.getByRole("option", { name: /Pan integral/ }).tap();
  await expect(input).toHaveValue("Pan integral");
  await page
    .getByRole("button", { name: "Ver Panadería de prueba", exact: true })
    .last()
    .tap();
  const modal = page.getByRole("dialog");
  await modal
    .getByRole("heading", { name: "Servicios y productos" })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: "artifacts/catalogo-ficha-movil.png" });
  expect(
    await page.evaluate(
      () => document.body.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  await context.close();
});
