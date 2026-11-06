import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { chromium, expect } from "@playwright/test";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const base = "http://127.0.0.1:4300";
const screenshots = join(root, "docs/propuestas/paso-2/pantallas");
await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const errors = [];
const remote = [];
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (
      /^https?:/.test(request.url()) &&
      new URL(request.url()).origin !== base
    )
      remote.push(request.url());
  });
  await page.goto(base);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState("networkidle");
  assert.equal(await page.locator(".idea-card").count(), 14);
  assert.equal(await page.locator("#usuarios select").count(), 1);
  assert.doesNotMatch(
    await page.locator("body").innerText(),
    /Ing\.?\s*Budge/i,
  );
  const ids = await page.evaluate(() =>
    window.TBC_IDEAS.map((idea) => idea.id),
  );
  assert.deepEqual(
    ids,
    Array.from({ length: 14 }, (_, i) => String(i + 1).padStart(2, "0")),
  );
  const frame = await page.evaluate(() => ({
    card: document.querySelector(".result-shop").getBoundingClientRect().bottom,
    nav: document.querySelector(".phone-bottom").getBoundingClientRect().top,
    phones: [...document.querySelectorAll(".phone")].map((phone) => ({
      content: phone.scrollHeight,
      visible: phone.clientHeight,
    })),
  }));
  assert(frame.card <= frame.nav);
  assert(frame.phones.every((phone) => phone.content <= phone.visible));
  await page.getByRole("tab", { name: /Elegir mejoras/ }).click();
  for (const id of ["01", "07"])
    await page
      .locator(`[data-idea-card="${id}"]`)
      .getByRole("button", { name: "Me interesa", exact: true })
      .click();
  await page
    .locator('[data-idea-card="09"]')
    .getByRole("button", { name: "Por ahora no", exact: true })
    .click();
  await expect(page.locator("#selection-count")).toHaveText("2");
  await page.reload();
  await expect(page.locator("#selection-count")).toHaveText("2");
  await page.locator('[data-idea-filter="P1"]').click();
  assert.equal(await page.locator(".idea-card:visible").count(), 5);
  await page.locator('[data-idea-filter="todas"]').click();
  await page
    .locator('[data-idea-card="02"]')
    .getByRole("button", { name: "Ver detalle" })
    .click();
  await page
    .locator("#idea-dialog")
    .getByRole("button", { name: "Me interesa", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#selection-count")).toHaveText("3");
  await page.locator("#copy-selection").click();
  assert.match(await page.locator("#selection-text").inputValue(), /01\./);
  assert.match(await page.locator("#selection-text").inputValue(), /09\./);
  await page.getByRole("tab", { name: /Revisar y publicar/ }).click();
  const name = "<img src=x onerror=alert(1)>";
  await page.locator("#preview-name-input").fill(name);
  await expect(page.locator("#preview-name")).toHaveText(name);
  assert.equal(await page.locator("#preview-name img").count(), 0);
  await page.locator("#preview-name-input").fill("Corte Urbano");
  await page.locator("#preview-neighborhood-select").selectOption("Banfield");
  await expect(page.locator("#preview-neighborhood")).toHaveText("Banfield");
  await page
    .locator("#preview-neighborhood-select")
    .selectOption("Barrio Centro");
  await page.locator('[data-action="publish"]').click();
  await expect(page.locator("#action-dialog")).toContainText(
    "No cambia el catálogo",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: /Experiencia del vecino/ }).click();
  await page.locator('.phone-detail [data-action="appointment"]').click();
  await page.getByRole("button", { name: "Ver solicitud (demo)" }).click();
  await expect(page.locator("#action-dialog")).toContainText(
    "No se envió ningún mensaje",
  );
  await page.keyboard.press("Escape");
  await page.locator('.coupon-card [data-action="coupon"]').click();
  await expect(page.locator("#action-dialog")).toContainText(
    "SIN CÓDIGO VÁLIDO",
  );
  await page.keyboard.press("Escape");
  await page.locator("[data-alerts]").click();
  await expect(page.locator("[data-alerts]")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("[data-alerts]").click();
  await page.evaluate(() => {
    document.getElementById("toast").hidden = true;
  });
  for (const [screen, selector, file] of [
    ["usuarios", "#users-capture", "usuarios.png"],
    ["resumen", "#summary-capture", "dashboard.png"],
    ["publicar", "#publish-capture", "publicacion.png"],
  ]) {
    await page.locator(`.review-tabs [data-screen="${screen}"]`).click();
    await page.locator(selector).screenshot({ path: join(screenshots, file) });
  }
  await context.close();
  for (const width of [360, 412]) {
    const mobile = await browser.newContext({
      viewport: { width, height: 950 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    const phone = await mobile.newPage();
    await phone.goto(base);
    for (const screen of ["usuarios", "resumen", "publicar", "lista"]) {
      await phone.locator(`.review-tabs [data-screen="${screen}"]`).click();
      const dimensions = await phone.evaluate(() => ({
        width: innerWidth,
        content: document.documentElement.scrollWidth,
      }));
      assert(
        dimensions.content <= dimensions.width,
        `Desbordamiento en ${screen}/${width}: ${JSON.stringify(dimensions)}`,
      );
    }
    await mobile.close();
  }
  const offline = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const file = await offline.newPage();
  file.on("pageerror", (error) => errors.push(error.message));
  file.on("request", (request) => {
    if (
      /^https?:/.test(request.url()) &&
      new URL(request.url()).origin !== base
    )
      remote.push(request.url());
  });
  // El navegador administrado no permite file://; comprobamos el documento por HTTP local.
  await file.goto(`${base}/propuesta.html`);
  await file.waitForLoadState("networkidle");
  await offline.setOffline(true);
  await expect(file.locator(".idea-card")).toHaveCount(14);
  await file.getByRole("tab", { name: /Resumen del creador/ }).click();
  await expect(file.locator("#summary-capture")).toBeVisible();
  const source = await file
    .locator(".phone-hero")
    .evaluate((element) => getComputedStyle(element).backgroundImage);
  assert.match(source, /data:image\/png;base64/);
  await offline.close();
  assert.deepEqual(errors, []);
  assert.deepEqual(remote, []);
  await writeFile(
    join(root, "artifacts/propuesta-paso-2/verificacion.json"),
    JSON.stringify(
      {
        ideas: 14,
        referenceScreens: 4,
        decisionsPersist: true,
        simulationDoesNotPublish: true,
        selfContainedWithoutExternalResources: true,
        worksOfflineAfterDocumentLoad: true,
        directFileNavigation: "not tested: managed browser blocks file scheme",
        testedWidths: [360, 412, 1440],
        externalRequests: 0,
        runtimeErrors: 0,
        productionChanged: false,
      },
      null,
      2,
    ),
  );
  console.log(
    "Propuesta verificada: 14 ideas, 4 pantallas, selección persistente, sin publicación/red externa, HTML offline, 360/412/1440 px.",
  );
} finally {
  await browser.close();
}
