import { describe, expect, it } from "vitest";
import { initialData } from "./data";
import { isAppData, validPhotoUrl, validWhatsapp, whatsappUrl } from "./domain";
import { DATA_LIMITS, publicHttpsUrl } from "./securityValidation";

const business = initialData.businesses[0];
const copyWith = (patch: Record<string, unknown>) => ({
  ...initialData,
  businesses: [{ ...business, ...patch }],
});

describe("Frontera de confianza de copias JSON", () => {
  it("conserva las copias anteriores y datos Unicode completos", () => {
    const {
      neighborhoods: _n,
      neighborhoodEdition: _e,
      ...legacy
    } = initialData;
    expect(isAppData(legacy)).toBe(true);
    expect(isAppData(copyWith({ name: "Café 😀", initials: "😀C" }))).toBe(
      true,
    );
  });

  it.each([
    ["nombre de comercio vacío", { name: "   " }],
    ["nombre demasiado largo", { name: "a".repeat(71) }],
    ["descripción demasiado larga", { description: "a".repeat(451) }],
    ["dirección demasiado larga", { address: "a".repeat(121) }],
    ["promoción demasiado larga", { promotion: "a".repeat(301) }],
    ["WhatsApp ejecutable", { whatsapp: "javascript:alert(1)" }],
    ["WhatsApp con más de 15 dígitos", { whatsapp: "1234567890123456" }],
    ["identificador con HTML", { id: "<img src=x onerror=alert(1)>" }],
    ["sustituto Unicode aislado", { name: "Negocio \ud800" }],
    ["carácter de control", { address: "Calle\u0000 oculta" }],
    ["clase de color inesperada", { color: 'blue onclick="alert(1)"' }],
    ["URL de imagen en red local", { imageUrl: "https://127.0.0.1/private" }],
    [
      "días duplicados",
      { hours: [{ days: [1, 1], opens: "09:00", closes: "18:00" }] },
    ],
    [
      "demasiadas franjas",
      {
        hours: Array.from(
          { length: DATA_LIMITS.schedules + 1 },
          () => business.hours[0],
        ),
      },
    ],
    ["coordenada infinita", { coordinates: { lat: Infinity, lng: 0 } }],
    ["coordenada NaN", { coordinates: { lat: 0, lng: NaN } }],
    [
      "campo adicional anidado",
      { coordinates: { ...business.coordinates, constructor: {} } },
    ],
  ])("rechaza %s", (_label, patch) => {
    expect(isAppData(copyWith(patch))).toBe(false);
  });

  it("rechaza claves de prototipo sin modificar Object.prototype", () => {
    const poisoned = JSON.parse(
      JSON.stringify(initialData).replace(
        '"version":1',
        '"version":1,"__proto__":{"polluted":true}',
      ),
    );
    expect(Object.hasOwn(poisoned, "__proto__")).toBe(true);
    expect(isAppData(poisoned)).toBe(false);
    expect(Object.hasOwn(Object.prototype, "polluted")).toBe(false);
    expect(
      isAppData({
        ...initialData,
        settings: {
          ...initialData.settings,
          constructor: { prototype: { polluted: true } },
        },
      }),
    ).toBe(false);
  });

  it("no toma campos heredados ni invoca getters del objeto recibido", () => {
    expect(isAppData(Object.create(initialData))).toBe(false);
    let calls = 0;
    const withGetter = { ...initialData };
    Object.defineProperty(withGetter, "settings", {
      enumerable: true,
      get: () => {
        calls++;
        throw new Error("No debe ejecutarse");
      },
    });
    expect(isAppData(withGetter)).toBe(false);
    expect(calls).toBe(0);
  });

  it("limita catálogos y campos globales y rechaza estructuras ajenas al esquema", () => {
    expect(
      isAppData({
        ...initialData,
        settings: { ...initialData.settings, appName: "a".repeat(36) },
      }),
    ).toBe(false);
    expect(
      isAppData({
        ...initialData,
        settings: { ...initialData.settings, ownerWhatsapp: "<script>" },
      }),
    ).toBe(false);
    expect(
      isAppData({
        ...initialData,
        settings: { ...initialData.settings, intro: "a".repeat(261) },
      }),
    ).toBe(false);
    expect(
      isAppData({
        ...initialData,
        categories: Array.from(
          { length: DATA_LIMITS.categories + 1 },
          (_, i) => `Rubro ${i}`,
        ),
      }),
    ).toBe(false);
    expect(
      isAppData({
        ...initialData,
        neighborhoods: Array.from(
          { length: DATA_LIMITS.neighborhoods + 1 },
          (_, i) => `Barrio ${i}`,
        ),
      }),
    ).toBe(false);
    expect(
      isAppData({
        ...initialData,
        businesses: Array.from(
          { length: DATA_LIMITS.businesses + 1 },
          (_, i) => ({ ...business, id: `negocio-${i}` }),
        ),
      }),
    ).toBe(false);
    expect(isAppData({ ...initialData, neighborhoodEdition: 99 })).toBe(false);
    expect(
      isAppData({ ...initialData, categories: ["Panaderías", "panaderias"] }),
    ).toBe(false);
    expect(isAppData({ ...initialData, categories: ["TODOS"] })).toBe(false);
    expect(isAppData({ ...initialData, settings: [] })).toBe(false);
    const sparse = new Array(2);
    sparse[0] = business;
    expect(isAppData({ ...initialData, businesses: sparse })).toBe(false);
    expect(
      isAppData({
        ...initialData,
        neighborhoods: undefined,
        businesses: Array.from(
          { length: DATA_LIMITS.neighborhoods },
          (_, i) => ({
            ...business,
            id: `negocio-${i}`,
            neighborhood: `Zona ${i}`,
          }),
        ),
      }),
    ).toBe(false);
  });
});

describe("URLs y mensajes del directorio", () => {
  it.each([
    "https://localhost/image.jpg",
    "https://localhost./image.jpg",
    "https://a.localhost/image.jpg",
    "https://router.local/image.jpg",
    "https://router.home.arpa/image.jpg",
    "https://127.1/image.jpg",
    "https://2130706433/image.jpg",
    "https://0x7f000001/image.jpg",
    "https://192.168.0.1/image.jpg",
    "https://[::1]/image.jpg",
    "https://[::ffff:127.0.0.1]/image.jpg",
    "https://example.com:8443/image.jpg",
    "https://example.com\n/image.jpg",
    "data:image/svg+xml,<svg onload=alert(1)></svg>",
    "javascript:alert(1)",
    "https://user:password@example.com/image.jpg",
  ])("rechaza el destino %s", (url) => {
    expect(publicHttpsUrl(url)).toBe(false);
    expect(validPhotoUrl(url)).toBe(false);
  });

  it("permite imágenes de dominio público HTTPS sin credenciales", () => {
    expect(
      publicHttpsUrl("https://images.example.com/foto%20local.webp?v=2"),
    ).toBe(true);
    expect(publicHttpsUrl("https://images.example.com:443/foto.jpg")).toBe(
      true,
    );
    expect(publicHttpsUrl("https://xn--caf-dma.com.ar/foto.jpg")).toBe(true);
  });

  it("rechaza mensajes malformados sin lanzar URIError", () => {
    expect(() => whatsappUrl("5491150186306", "Hola \ud800")).not.toThrow();
    expect(whatsappUrl("5491150186306", "Hola \ud800")).toBe(null);
    expect(whatsappUrl("5491150186306", "a".repeat(2001))).toBe(null);
    expect(whatsappUrl("5491150186306", "Hola 😀")).toContain(
      "Hola%20%F0%9F%98%80",
    );
    expect(validWhatsapp("+54\n9 11 5018 6306")).toBe(false);
  });
});
