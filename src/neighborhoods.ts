import type { AppData } from "./domain";
import { normalize } from "./domain";

export const APP_NAME = "Tu Barrio Cerca";
export const NEIGHBORHOOD_KEY = "tu-barrio-cerca:selected-neighborhood";
export const DEFAULT_NEIGHBORHOODS = [
  "Ing.Budge",
  "Villa Fiorito",
  "Lomas de Zamora",
  "Banfield",
  "Temperley",
];
export const NEW_CATEGORIES = [
  "Barberías",
  "Centros de spa",
  "Peluquerías",
  "Estética y uñas",
  "Farmacias",
  "Veterinarias",
  "Pet shops",
  "Gimnasios",
  "Ópticas",
  "Odontología",
  "Lavanderías",
  "Librerías y fotocopias",
  "Tecnología y celulares",
  "Electricistas",
  "Plomería",
  "Cerrajerías",
  "Florerías",
  "Verdulerías",
  "Carnicerías",
  "Heladerías",
  "Rotiserías",
  "Pizzerías",
  "Aguateros",
  "Chapa y pintura",
];

function uniqueNames(values: string[]) {
  const seen = new Set<string>();
  return values
    .map((v) => v.trim())
    .filter((v) => {
      const key = normalize(v);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
export function getNeighborhoods(data: AppData) {
  return uniqueNames([
    ...(data.neighborhoods ?? []),
    data.settings.neighborhood,
    ...data.businesses.flatMap((b) => (b.neighborhood ? [b.neighborhood] : [])),
  ]);
}
// Mantiene las claves anteriores para conservar comercios, favoritos y copias.
export function prepareData(data: AppData): AppData {
  const upgrade = data.neighborhoodEdition !== 1;
  const neighborhoods = uniqueNames([
    ...getNeighborhoods(data),
    ...(upgrade ? DEFAULT_NEIGHBORHOODS : []),
  ]);
  const canonical = (name: string) =>
    neighborhoods.find((n) => normalize(n) === normalize(name))!;
  const categories = uniqueNames([
    ...data.categories,
    ...(upgrade ? NEW_CATEGORIES : []),
  ]);
  return {
    ...data,
    neighborhoodEdition: 1,
    neighborhoods,
    categories,
    settings: {
      ...data.settings,
      appName:
        normalize(data.settings.appName) === "budge cerca"
          ? APP_NAME
          : data.settings.appName,
      neighborhood: canonical(data.settings.neighborhood),
    },
    businesses: data.businesses.map((b) => ({
      ...b,
      category:
        upgrade &&
        b.id === "raices" &&
        b.name === "Raíces · Peluquería" &&
        b.category === "Belleza"
          ? categories.find((c) => normalize(c) === "peluquerias")!
          : b.category,
      neighborhood: canonical(b.neighborhood || data.settings.neighborhood),
    })),
  };
}

export function addNeighborhood(data: AppData, name: string): AppData {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed || trimmed.length > 60)
    throw new Error("Escribí un barrio de entre 1 y 60 caracteres.");
  if (getNeighborhoods(data).some((n) => normalize(n) === normalize(trimmed)))
    throw new Error(
      "Ese barrio ya está disponible. Podés seleccionarlo en las solapas.",
    );
  return { ...data, neighborhoods: [...getNeighborhoods(data), trimmed] };
}
