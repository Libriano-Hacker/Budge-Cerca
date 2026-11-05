import { expect, test } from "@playwright/test";

test("la página de instalación muestra un QR válido y estados reales de las tiendas", async ({
  page,
}) => {
  await page.goto("/descargar");
  await expect(
    page.getByRole("heading", { name: /Todo tu barrio\. En tu bolsillo\./ }),
  ).toBeVisible();
  const qr = page.getByRole("img", { name: /Código QR para abrir https:/ });
  await expect(qr).toBeVisible();
  await page.waitForFunction(
    () =>
      (document.querySelector(".qr-frame img") as HTMLImageElement)
        ?.naturalWidth === 1024,
  );
  await expect(
    page.getByRole("link", { name: "Abrir Google Play" }),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Abrir App Store" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("link", { name: "Descargar APK" })).toHaveCount(
    0,
  );
  await expect(
    page.getByText("App Store / TestFlight pendientes"),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Descargar QR", exact: true }),
  ).toHaveAttribute("href", "/descargas/tu-barrio-cerca-qr.png");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Explorar comercios", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Buscar comercios", exact: true }),
  ).toBeVisible();
});
