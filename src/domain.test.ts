import { describe, expect, it } from "vitest";
import { initialData } from "./data";
import {
  directionsUrl,
  distanceKm,
  filterBusinesses,
  isAppData,
  isOpen,
  validWhatsapp,
  whatsappUrl,
  validPhotoUrl,
} from "./domain";

describe("Fotos de comercios y compatibilidad", () => {
  it("acepta HTTPS y rechaza esquemas locales o credenciales en la URL", () => {
    expect(validPhotoUrl("https://example.com/local.jpg")).toBe(true);
    expect(validPhotoUrl("http://example.com/local.jpg")).toBe(false);
    expect(validPhotoUrl("javascript:alert(1)")).toBe(false);
    expect(validPhotoUrl("https://usuario:clave@example.com/local.jpg")).toBe(
      false,
    );
  });
  it("conserva copias anteriores y valida el nuevo campo opcional de foto", () => {
    expect(isAppData(initialData)).toBe(true);
    expect(
      isAppData({
        ...initialData,
        businesses: [
          {
            ...initialData.businesses[0],
            imageUrl: "https://example.com/local.jpg",
          },
        ],
      }),
    ).toBe(true);
    expect(
      isAppData({
        ...initialData,
        businesses: [
          { ...initialData.businesses[0], imageUrl: "javascript:alert(1)" },
        ],
      }),
    ).toBe(false);
  });
});

describe("Búsqueda de comercios", () => {
  it("encuentra nombres y rubros sin exigir tildes o mayúsculas", () => {
    expect(
      filterBusinesses(initialData.businesses, " PELUQUERIA ", "Todos").map(
        (b) => b.id,
      ),
    ).toEqual(["raices"]);
    expect(
      filterBusinesses(initialData.businesses, "PANADERIAS", "Todos").map(
        (b) => b.id,
      ),
    ).toEqual(["pan-del-barrio"]);
  });
  it("combina rubro, promociones y favoritos", () => {
    expect(
      filterBusinesses(initialData.businesses, "", "Gastronomía", {
        promotions: true,
        onlyFavorites: true,
        favorites: ["la-esquina"],
      }).map((b) => b.id),
    ).toEqual(["la-esquina"]);
    expect(
      filterBusinesses(initialData.businesses, "", "Moda", {
        promotions: true,
      }),
    ).toEqual([]);
  });
  it("ordena por distancia real desde el GPS sin alterar el catálogo", () => {
    const originalIds = initialData.businesses.map((b) => b.id);
    const target = initialData.businesses.find((b) => b.id === "taller-sur")!;
    expect(
      filterBusinesses(initialData.businesses, "", "Todos", {
        origin: target.coordinates,
      })[0].id,
    ).toBe("taller-sur");
    expect(initialData.businesses.map((b) => b.id)).toEqual(originalIds);
    expect(distanceKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(
      111.195,
      2,
    );
  });
});
describe("Horarios en Argentina", () => {
  const b = {
    ...initialData.businesses[0],
    hours: [
      { days: [1], opens: "09:00", closes: "13:00" },
      { days: [1], opens: "16:00", closes: "20:00" },
    ],
  };
  it("respeta la apertura, el cierre y el horario cortado", () => {
    expect(isOpen(b, new Date("2026-10-26T12:00:00Z"))).toBe(true);
    expect(isOpen(b, new Date("2026-10-26T16:00:00Z"))).toBe(false);
    expect(isOpen(b, new Date("2026-10-26T19:00:00Z"))).toBe(true);
    expect(isOpen(b, new Date("2026-10-26T23:00:00Z"))).toBe(false);
  });
  it("continúa correctamente las franjas que cruzan medianoche", () => {
    const night = {
      ...b,
      hours: [{ days: [0], opens: "19:00", closes: "00:30" }],
    };
    expect(isOpen(night, new Date("2026-10-26T03:15:00Z"))).toBe(true);
    expect(isOpen(night, new Date("2026-10-26T03:30:00Z"))).toBe(false);
    expect(isOpen(night, new Date("2026-10-27T03:15:00Z"))).toBe(false);
  });
});
describe("Contacto, recorridos y copias", () => {
  it("crea enlaces internacionales válidos y codifica el mensaje", () => {
    expect(whatsappUrl("+54 9 11 5018-6306", "¡Hola barrio!")).toBe(
      `https://wa.me/5491150186306?text=${encodeURIComponent("¡Hola barrio!")}`,
    );
    expect(whatsappUrl("", "Hola")).toBe(null);
    expect(validWhatsapp("abc5491150186306")).toBe(false);
    expect(validWhatsapp("00000000")).toBe(false);
  });
  it("envía el punto de partida solo cuando se autorizó el GPS", () => {
    const withGps = new URL(
      directionsUrl(initialData.businesses[0], { lat: -34.72, lng: -58.45 }),
    );
    expect(withGps.searchParams.get("origin")).toBe("-34.72,-58.45");
    expect(withGps.searchParams.get("travelmode")).toBe("walking");
    expect(
      new URL(directionsUrl(initialData.businesses[0], null)).searchParams.has(
        "origin",
      ),
    ).toBe(false);
  });
  it("rechaza copias dañadas, IDs duplicados y coordenadas o días inválidos", () => {
    expect(isAppData(initialData)).toBe(true);
    expect(
      isAppData({
        ...initialData,
        businesses: [...initialData.businesses, initialData.businesses[0]],
      }),
    ).toBe(false);
    expect(
      isAppData({
        ...initialData,
        businesses: [
          { ...initialData.businesses[0], coordinates: { lat: 120, lng: 0 } },
        ],
      }),
    ).toBe(false);
    expect(
      isAppData({
        ...initialData,
        businesses: [{ ...initialData.businesses[0], category: "Inexistente" }],
      }),
    ).toBe(false);
    expect(
      isAppData({
        ...initialData,
        businesses: [
          {
            ...initialData.businesses[0],
            hours: [{ days: [7], opens: "10:00", closes: "20:00" }],
          },
        ],
      }),
    ).toBe(false);
    expect(
      isAppData({
        ...initialData,
        businesses: [
          {
            ...initialData.businesses[0],
            hours: [{ days: [1], opens: "25:00", closes: "20:00" }],
          },
        ],
      }),
    ).toBe(false);
    expect(isAppData({ version: 1, settings: null, categories: [] })).toBe(
      false,
    );
  });
});
