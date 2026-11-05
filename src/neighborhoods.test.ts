import { describe, expect, it } from "vitest";
import { initialData } from "./data";
import { filterBusinesses, isAppData } from "./domain";
import {
  addNeighborhood,
  APP_NAME,
  NEW_CATEGORIES,
  prepareData,
} from "./neighborhoods";

describe("Barrios y actualización de datos guardados", () => {
  it("actualiza la marca anterior y conserva comercios, fotos, promociones y barrio original", () => {
    const legacy = {
      ...initialData,
      neighborhoodEdition: undefined,
      neighborhoods: undefined,
      settings: {
        ...initialData.settings,
        appName: "Budge Cerca",
        neighborhood: "Mi barrio original",
      },
      categories: initialData.categories.filter(
        (c) => !NEW_CATEGORIES.includes(c),
      ),
      businesses: initialData.businesses
        .slice(0, 9)
        .map(({ neighborhood: _neighborhood, ...b }) => ({
          ...b,
          category: b.id === "raices" ? "Belleza" : b.category,
        })),
    };
    expect(isAppData(legacy)).toBe(true);
    const updated = prepareData(legacy);
    expect(updated.settings.appName).toBe(APP_NAME);
    expect(updated.businesses.map((b) => b.id)).toEqual(
      legacy.businesses.map((b) => b.id),
    );
    expect(
      updated.businesses.every((b) => b.neighborhood === "Mi barrio original"),
    ).toBe(true);
    expect(updated.businesses[0].promotion).toBe(
      legacy.businesses[0].promotion,
    );
    expect(updated.categories).toContain("Barberías");
    expect(updated.categories).toContain("Centros de spa");
    expect(updated.businesses.find((b) => b.id === "raices")?.category).toBe(
      "Peluquerías",
    );
    expect(isAppData(updated)).toBe(true);
  });
  it("respeta marcas personalizadas y no vuelve a agregar rubros eliminados después de migrar", () => {
    const custom = {
      ...initialData,
      settings: { ...initialData.settings, appName: "Mi marca" },
      categories: initialData.categories.filter((c) => c !== "Farmacias"),
    };
    const updated = prepareData(custom);
    expect(updated.settings.appName).toBe("Mi marca");
    expect(updated.categories).not.toContain("Farmacias");
    expect(prepareData(updated)).toEqual(updated);
  });
  it("agrega barrios sin duplicarlos por tildes o mayúsculas", () => {
    const added = addNeighborhood(initialData, "  Villa   Centenario  ");
    expect(added.neighborhoods).toContain("Villa Centenario");
    expect(() => addNeighborhood(added, "villa centenario")).toThrow(
      /ya está disponible/,
    );
    expect(() => addNeighborhood(initialData, " ")).toThrow();
    expect(() => addNeighborhood(initialData, "a".repeat(61))).toThrow();
    expect(initialData.neighborhoods).not.toContain("Villa Centenario");
  });
  it("filtra comercios por barrio junto con búsqueda, rubro, favoritos y promociones", () => {
    const bakery = initialData.businesses[0];
    const other = { ...bakery, id: "otra-panaderia", neighborhood: "Banfield" };
    const found = filterBusinesses(
      [bakery, other],
      "PANADERIAS",
      "Panaderías",
      {
        neighborhood: "Banfield",
        promotions: true,
        onlyFavorites: true,
        favorites: [other.id],
      },
    );
    expect(found.map((b) => b.id)).toEqual([other.id]);
    expect(
      filterBusinesses([bakery], "", "Todos", { neighborhood: "Banfield" }),
    ).toEqual([]);
  });
  it("rechaza copias con barrios duplicados o referencias que no pertenecen al catálogo", () => {
    expect(
      isAppData({ ...initialData, neighborhoods: ["Ing.Budge", "ING.BUDGE"] }),
    ).toBe(false);
    expect(isAppData({ ...initialData, neighborhoods: ["Banfield"] })).toBe(
      false,
    );
    expect(
      isAppData({
        ...initialData,
        businesses: [
          { ...initialData.businesses[0], neighborhood: "Otro barrio" },
        ],
      }),
    ).toBe(false);
  });
});
