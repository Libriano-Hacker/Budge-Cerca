import { expect, test } from "@playwright/test";

test("escena 3D permite pausar, abrir un local y revelar secciones al hacer scroll", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".hero-scene")).toHaveAttribute(
    "data-renderer",
    "webgl",
    { timeout: 20000 },
  );
  await page
    .getByRole("button", { name: "Pausar movimiento de la escena" })
    .click();
  await expect(page.locator(".floating-shop").first()).toHaveCSS(
    "animation-play-state",
    "paused",
  );
  await page.getByRole("button", { name: "Descubrir Pan del Barrio" }).click();
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: "Pan del Barrio" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cerrar ventana" }).click();
  await page
    .getByRole("button", { name: "Activar movimiento de la escena" })
    .click();
  await expect(page.locator(".floating-shop").first()).toHaveCSS(
    "animation-play-state",
    "running",
  );
  await page.locator(".featured-section").scrollIntoViewIfNeeded();
  await expect(page.locator(".featured-section")).toHaveClass(/is-visible/);
  await expect(
    page.getByRole("heading", { name: "Acá pasan cosas buenas." }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      Number(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--page-progress",
        ),
      ),
    ),
  ).toBeGreaterThan(0);
});

test("sin WebGL y con movimiento reducido la interfaz conserva contenido y búsqueda", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    // Simula un dispositivo sin soporte 3D, conservando el contexto 2D.
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: Parameters<typeof original>
    ) {
      if (/webgl/i.test(String(args[0]))) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await page.goto("/");
  await expect(page.locator(".hero-scene")).toHaveAttribute(
    "data-renderer",
    "fallback",
    { timeout: 20000 },
  );
  await expect(page.locator(".scene-fallback")).toBeVisible();
  await expect(page.locator(".floating-shop").first()).toHaveCSS(
    "animation-name",
    "none",
  );
  await page
    .getByRole("textbox", { name: "Buscar comercios", exact: true })
    .fill("panaderias");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await page
    .getByRole("button", { name: "Pan del Barrio", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: "Pan del Barrio" }),
  ).toBeVisible();
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
