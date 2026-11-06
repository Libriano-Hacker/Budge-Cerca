import {
  boundedArray,
  boundedText,
  DATA_LIMITS,
  publicHttpsUrl,
  recordWithKeys,
  wellFormedUnicode,
} from "./securityValidation";
import { argentinaDate, previousDate, validDetails } from "./catalogModel";
import type { BusinessDetails, FeatureKey } from "./catalogModel";

export type Coordinates = { lat: number; lng: number };
export type Hours = { days: number[]; opens: string; closes: string };
export type Business = {
  id: string;
  name: string;
  category: string;
  description: string;
  address: string;
  whatsapp: string;
  hours: Hours[];
  coordinates: Coordinates;
  featured: boolean;
  promotion: string;
  color: string;
  initials: string;
  imageUrl?: string;
  neighborhood?: string;
  details?: BusinessDetails;
};
export type Settings = {
  appName: string;
  neighborhood: string;
  ownerWhatsapp: string;
  intro: string;
};
export type AppData = {
  version: 1;
  settings: Settings;
  categories: string[];
  businesses: Business[];
  neighborhoods?: string[];
  neighborhoodEdition?: 1 | 2;
};
export const STORAGE_KEY = "budge-cerca:data:v1";
export function validPhotoUrl(value: string) {
  return publicHttpsUrl(value);
}
export const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
export const phoneDigits = (value: string) => value.replace(/\D/g, "");
export function validWhatsapp(value: string) {
  return (
    boundedText(value, 1, 25) &&
    /^\+?[\d\s()-]+$/.test(value) &&
    /^[1-9]\d{7,14}$/.test(phoneDigits(value))
  );
}
export function whatsappUrl(value: string, message: string) {
  return validWhatsapp(value) &&
    typeof message === "string" &&
    message.length <= 2000 &&
    wellFormedUnicode(message)
    ? `https://wa.me/${phoneDigits(value)}?text=${encodeURIComponent(message)}`
    : null;
}
export function distanceKm(a: Coordinates, b: Coordinates) {
  const rad = (n: number) => (n * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) *
      Math.cos(rad(b.lat)) *
      Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - Math.min(h, 1)));
}
export function distanceLabel(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}
export function directionsUrl(business: Business, origin: Coordinates | null) {
  const query = new URLSearchParams({
    api: "1",
    destination: `${business.coordinates.lat},${business.coordinates.lng}`,
    travelmode: "walking",
  });
  if (origin) query.set("origin", `${origin.lat},${origin.lng}`);
  return `https://www.google.com/maps/dir/?${query}`;
}
const minutes = (value: string) => {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
};
export function isOpen(business: Business, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Argentina/Buenos_Aires",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (key: string) => parts.find((p) => p.type === key)?.value || "";
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    part("weekday"),
  );
  const now = Number(part("hour")) * 60 + Number(part("minute"));
  const today = argentinaDate(date);
  const special = business.details?.exceptions?.find((e) => e.date === today);
  if (special?.closed) return false;
  const periods = special
    ? special.periods
    : business.hours.filter((h) => h.days.includes(day));
  if (
    periods.some((h) =>
      h.closes > h.opens
        ? now >= minutes(h.opens) && now < minutes(h.closes)
        : now >= minutes(h.opens),
    )
  )
    return true;
  if (special) return false;
  const yesterdaySpecial = business.details?.exceptions?.find(
    (e) => e.date === previousDate(today),
  );
  const prior = yesterdaySpecial
    ? yesterdaySpecial.closed
      ? []
      : yesterdaySpecial.periods
    : business.hours.filter((h) => h.days.includes((day + 6) % 7));
  return prior.some((h) => h.closes < h.opens && now < minutes(h.closes));
}
export function filterBusinesses(
  businesses: Business[],
  query: string,
  category: string,
  options: {
    promotions?: boolean;
    favorites?: string[];
    onlyFavorites?: boolean;
    open?: boolean;
    origin?: Coordinates | null;
    neighborhood?: string;
    features?: FeatureKey[];
  } = {},
) {
  const term = normalize(query);
  const results = businesses.filter(
    (b) =>
      (!options.neighborhood || b.neighborhood === options.neighborhood) &&
      (!term ||
        normalize(
          `${b.name} ${b.category} ${b.description} ${b.address} ${(b.details?.services || []).map((s) => `${s.name} ${s.description || ""}`).join(" ")}`,
        ).includes(term)) &&
      (category === "Todos" || b.category === category) &&
      (!options.promotions || Boolean(b.promotion.trim())) &&
      (!options.onlyFavorites || options.favorites?.includes(b.id)) &&
      (!options.features?.length ||
        options.features.every((feature) =>
          b.details?.features?.includes(feature),
        )) &&
      (!options.open || isOpen(b)),
  );
  return options.origin
    ? results.sort(
        (a, b) =>
          distanceKm(options.origin!, a.coordinates) -
          distanceKm(options.origin!, b.coordinates),
      )
    : results;
}
const validPhone = (value: unknown) =>
  boundedText(value, 0, 25) && (!value.trim() || validWhatsapp(value));
const colors = new Set(["sand", "sage", "rose", "blue", "lilac", "peach"]);
const clock = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isAppData(value: unknown): value is AppData {
  if (
    !recordWithKeys(
      value,
      ["version", "settings", "categories", "businesses"],
      ["neighborhoods", "neighborhoodEdition"],
    ) ||
    value.version !== 1 ||
    (value.neighborhoodEdition !== undefined &&
      value.neighborhoodEdition !== 1 &&
      value.neighborhoodEdition !== 2) ||
    !recordWithKeys(value.settings, [
      "appName",
      "neighborhood",
      "ownerWhatsapp",
      "intro",
    ]) ||
    !boundedArray(value.categories, DATA_LIMITS.categories) ||
    !boundedArray(value.businesses, DATA_LIMITS.businesses)
  )
    return false;

  const settings = value.settings;
  if (
    !boundedText(settings.appName, 1, 35) ||
    !boundedText(settings.neighborhood, 1, 60) ||
    !validPhone(settings.ownerWhatsapp) ||
    !boundedText(settings.intro, 1, 260, true)
  )
    return false;

  const categories = value.categories;
  if (
    !categories.every(
      (category) =>
        boundedText(category, 1, 50) && normalize(category) !== "todos",
    ) ||
    new Set(categories.map((category) => normalize(category as string)))
      .size !== categories.length
  )
    return false;

  if (
    value.neighborhoods !== undefined &&
    (!boundedArray(value.neighborhoods, DATA_LIMITS.neighborhoods, 1) ||
      !value.neighborhoods.every((name) => boundedText(name, 1, 60)) ||
      new Set(value.neighborhoods.map((name) => normalize(name as string)))
        .size !== value.neighborhoods.length ||
      !value.neighborhoods.includes(settings.neighborhood))
  )
    return false;

  const ids = new Set<string>();
  const inferredNeighborhoods = new Set([normalize(settings.neighborhood)]);
  return value.businesses.every((business) => {
    if (
      !recordWithKeys(
        business,
        [
          "id",
          "name",
          "category",
          "description",
          "address",
          "whatsapp",
          "promotion",
          "color",
          "initials",
          "featured",
          "coordinates",
          "hours",
        ],
        ["imageUrl", "neighborhood", "details"],
      ) ||
      !boundedText(business.id, 1, DATA_LIMITS.businessId) ||
      !/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(business.id) ||
      ids.has(business.id) ||
      !boundedText(business.name, 1, 70) ||
      !boundedText(business.category, 1, 50) ||
      !categories.includes(business.category) ||
      !boundedText(business.description, 1, 450, true) ||
      !boundedText(business.address, 1, 120) ||
      !validPhone(business.whatsapp) ||
      !boundedText(business.promotion, 0, 300, true) ||
      !boundedText(business.color, 1, 16) ||
      !colors.has(business.color) ||
      !boundedText(business.initials, 0, 8) ||
      typeof business.featured !== "boolean" ||
      (business.neighborhood !== undefined &&
        (!boundedText(business.neighborhood, 1, 60) ||
          (value.neighborhoods !== undefined &&
            !(value.neighborhoods as unknown[]).includes(
              business.neighborhood,
            )))) ||
      (business.imageUrl !== undefined &&
        business.imageUrl !== "" &&
        !publicHttpsUrl(business.imageUrl)) ||
      !recordWithKeys(business.coordinates, ["lat", "lng"]) ||
      typeof business.coordinates.lat !== "number" ||
      !Number.isFinite(business.coordinates.lat) ||
      Math.abs(business.coordinates.lat) > 90 ||
      typeof business.coordinates.lng !== "number" ||
      !Number.isFinite(business.coordinates.lng) ||
      Math.abs(business.coordinates.lng) > 180 ||
      !boundedArray(business.hours, DATA_LIMITS.schedules) ||
      (business.details !== undefined && !validDetails(business.details))
    )
      return false;

    inferredNeighborhoods.add(
      normalize((business.neighborhood || settings.neighborhood) as string),
    );
    if (inferredNeighborhoods.size > DATA_LIMITS.neighborhoods) return false;
    ids.add(business.id);
    return business.hours.every(
      (schedule) =>
        recordWithKeys(schedule, ["days", "opens", "closes"]) &&
        boundedArray(schedule.days, 7, 1) &&
        new Set(schedule.days).size === schedule.days.length &&
        schedule.days.every(
          (day) =>
            typeof day === "number" &&
            Number.isInteger(day) &&
            day >= 0 &&
            day <= 6,
        ) &&
        typeof schedule.opens === "string" &&
        clock.test(schedule.opens) &&
        typeof schedule.closes === "string" &&
        clock.test(schedule.closes) &&
        schedule.opens !== schedule.closes,
    );
  });
}
