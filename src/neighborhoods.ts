import type { AppData } from "./domain";
import { normalize } from "./domain";
import { boundedText, DATA_LIMITS } from "./securityValidation";

export const APP_NAME = "Tu Barrio Cerca";
export const APP_SLOGAN = "Conectá con lo que te rodea.";
export const DEFAULT_NEIGHBORHOOD = "Barrio Centro";
export const NEIGHBORHOOD_KEY = "tu-barrio-cerca:selected-neighborhood";
export const DEFAULT_NEIGHBORHOODS = [
  DEFAULT_NEIGHBORHOOD,
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
function migrateNeighborhoodName(name: string) {
  const key = normalize(name).replace(/[.\s]/g, "");
  return ["ingbudge", "ingenierobudge"].includes(key)
    ? DEFAULT_NEIGHBORHOOD
    : name.trim();
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
  const upgrade = data.neighborhoodEdition === undefined;
  const migrated = {
    ...data,
    neighborhoods: data.neighborhoods?.map(migrateNeighborhoodName),
    settings: {
      ...data.settings,
      neighborhood: migrateNeighborhoodName(data.settings.neighborhood),
    },
    businesses: data.businesses.map((business) => ({
      ...business,
      neighborhood: migrateNeighborhoodName(
        business.neighborhood || data.settings.neighborhood,
      ),
    })),
  };
  const neighborhoods = uniqueNames([
    ...getNeighborhoods(migrated),
    ...(upgrade ? DEFAULT_NEIGHBORHOODS : []),
  ]).slice(0, DATA_LIMITS.neighborhoods);
  const canonical = (name: string) =>
    neighborhoods.find((n) => normalize(n) === normalize(name))!;
  const categories = uniqueNames([
    ...data.categories,
    ...(upgrade ? NEW_CATEGORIES : []),
  ]).slice(0, DATA_LIMITS.categories);
  return {
    ...data,
    neighborhoodEdition: 2,
    neighborhoods,
    categories,
    settings: {
      ...data.settings,
      appName:
        normalize(data.settings.appName) === "budge cerca"
          ? APP_NAME
          : data.settings.appName,
      neighborhood: canonical(migrated.settings.neighborhood),
    },
    businesses: migrated.businesses.map((b) => ({
      ...b,
      category:
        upgrade &&
        b.id === "raices" &&
        b.name === "Raíces · Peluquería" &&
        b.category === "Belleza"
          ? categories.find((c) => normalize(c) === "peluquerias") || b.category
          : b.category,
      neighborhood: canonical(b.neighborhood),
    })),
  };
}

export function addNeighborhood(data: AppData, name: string): AppData {
  if (!boundedText(name, 1, DATA_LIMITS.neighborhoodName))
    throw new Error(
      "Escribí un barrio de entre 1 y 60 caracteres, sin controles ocultos.",
    );
  const trimmed = migrateNeighborhoodName(name.trim().replace(/\s+/g, " "));
  if (!trimmed || trimmed.length > DATA_LIMITS.neighborhoodName)
    throw new Error("Escribí un barrio de entre 1 y 60 caracteres.");
  if (getNeighborhoods(data).some((n) => normalize(n) === normalize(trimmed)))
    throw new Error("Ese barrio ya está disponible en el selector.");
  if (getNeighborhoods(data).length >= DATA_LIMITS.neighborhoods)
    throw new Error(
      `Podés configurar hasta ${DATA_LIMITS.neighborhoods} barrios.`,
    );
  return { ...data, neighborhoods: [...getNeighborhoods(data), trimmed] };
}

export function removeNeighborhood(data: AppData, name: string): AppData {
  const neighborhoods = getNeighborhoods(data);
  if (!neighborhoods.includes(name))
    throw new Error("Ese barrio no está disponible.");
  if (neighborhoods.length === 1)
    throw new Error("Conservá al menos un barrio disponible.");
  if (
    data.businesses.some(
      (business) =>
        (business.neighborhood || data.settings.neighborhood) === name,
    )
  ) {
    throw new Error(
      "Reasigná los comercios de este barrio antes de eliminarlo.",
    );
  }
  const remaining = neighborhoods.filter(
    (neighborhood) => neighborhood !== name,
  );
  return {
    ...data,
    neighborhoods: remaining,
    settings: {
      ...data.settings,
      neighborhood:
        data.settings.neighborhood === name
          ? remaining[0]
          : data.settings.neighborhood,
    },
  };
}
