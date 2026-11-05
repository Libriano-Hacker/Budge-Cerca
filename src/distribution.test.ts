import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import { DOWNLOAD_URL, downloads, safeDownloadLink } from "./distribution";

describe("Distribución móvil y QR", () => {
  it("el PNG se puede decodificar y apunta a la página HTTPS de instalación", () => {
    const png = PNG.sync.read(
      readFileSync(
        new URL("../public/descargas/tu-barrio-cerca-qr.png", import.meta.url),
      ),
    );
    const code = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    expect(code?.data).toBe(DOWNLOAD_URL);
    expect(new URL(code!.data).protocol).toBe("https:");
    expect(new URL(code!.data).pathname).toBe("/descargar");
    expect(code!.data).not.toMatch(/localhost|127\.0\.0\.1/);
  });
  it("no presenta tiendas ni APK inexistentes como descargas disponibles", () => {
    expect(downloads).toEqual({ google: null, apple: null, apk: null });
  });
  it("valida destinos de tiendas y rechaza enlaces inseguros o credenciales", () => {
    expect(
      safeDownloadLink(
        "https://play.google.com/store/apps/details?id=com.tubarriocerca.app",
        "google",
      ),
    ).toContain("play.google.com");
    expect(
      safeDownloadLink("https://play.google.com.ejemplo.com/app", "google"),
    ).toBe(null);
    expect(safeDownloadLink("https://example.com/app", "apple")).toBe(null);
    expect(safeDownloadLink("javascript:alert(1)", "apk")).toBe(null);
    expect(safeDownloadLink("http://example.com/app.apk", "apk")).toBe(null);
    expect(
      safeDownloadLink("https://user:password@example.com/app.apk", "apk"),
    ).toBe(null);
    expect(safeDownloadLink("https://example.com/app.apk", "apk")).toBe(
      "https://example.com/app.apk",
    );
  });
});
