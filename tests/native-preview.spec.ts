import { expect, test } from "@playwright/test";

test("la compilación de usuarios excluye el dashboard y permite buscar y guardar favoritos", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Dashboard demo", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Administrar demo", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await expect(
    page
      .getByRole("navigation", { name: "Menú móvil", exact: true })
      .getByRole("button", { name: "Dashboard demo", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Cerrar menú" }).click();
  await page
    .getByRole("textbox", { name: "Buscar comercios", exact: true })
    .fill("barberias");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByText("1 comercio encontrado")).toBeVisible();
  await page
    .getByRole("button", {
      name: "Guardar Corte Urbano · Barbería en favoritos",
    })
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "Quitar Corte Urbano · Barbería en favoritos",
    }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    await page.evaluate(
      async () => (await navigator.serviceWorker.getRegistrations()).length,
    ),
  ).toBe(0);
});

test("el paquete de usuarios muestra instrucciones de instalación sin inventar enlaces de tiendas", async ({
  page,
}) => {
  await page.goto("/descargar");
  await expect(
    page.getByRole("heading", { name: /Todo tu barrio\. En tu bolsillo\./ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Abrir App Store" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("link", { name: "Abrir Google Play" }),
  ).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Desde Safari" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Desde Chrome" })).toBeVisible();
});
