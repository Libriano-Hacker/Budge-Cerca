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
};
export const STORAGE_KEY = "budge-cerca:data:v1";
export function validPhotoUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
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
    /^\+?[\d\s()-]+$/.test(value) && /^[1-9]\d{7,14}$/.test(phoneDigits(value))
  );
}
export function whatsappUrl(value: string, message: string) {
  return validWhatsapp(value)
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
  return business.hours.some((schedule) => {
    const start = minutes(schedule.opens),
      end = minutes(schedule.closes);
    return end > start
      ? schedule.days.includes(day) && now >= start && now < end
      : (schedule.days.includes(day) && now >= start) ||
          (schedule.days.includes((day + 6) % 7) && now < end);
  });
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
  } = {},
) {
  const term = normalize(query);
  const results = businesses.filter(
    (b) =>
      (!term ||
        normalize(
          `${b.name} ${b.category} ${b.description} ${b.address}`,
        ).includes(term)) &&
      (category === "Todos" || b.category === category) &&
      (!options.promotions || Boolean(b.promotion.trim())) &&
      (!options.onlyFavorites || options.favorites?.includes(b.id)) &&
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
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;
export function isAppData(value: unknown): value is AppData {
  if (
    !isObject(value) ||
    value.version !== 1 ||
    !isObject(value.settings) ||
    !Array.isArray(value.categories) ||
    !Array.isArray(value.businesses)
  )
    return false;
  const s = value.settings;
  return (
    ["appName", "neighborhood", "ownerWhatsapp", "intro"].every(
      (k) => typeof s[k] === "string",
    ) &&
    value.categories.every(
      (c) => typeof c === "string" && c.trim().length > 0 && c !== "Todos",
    ) &&
    new Set(value.categories).size === value.categories.length &&
    new Set(value.businesses.map((b) => (isObject(b) ? b.id : null))).size ===
      value.businesses.length &&
    value.businesses.every(
      (b) =>
        isObject(b) &&
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
        ].every((k) => typeof b[k] === "string") &&
        Boolean(b.id) &&
        Boolean(b.name) &&
        (b.imageUrl === undefined ||
          (typeof b.imageUrl === "string" &&
            (!b.imageUrl || validPhotoUrl(b.imageUrl)))) &&
        (value.categories as unknown[]).includes(b.category) &&
        typeof b.featured === "boolean" &&
        isObject(b.coordinates) &&
        typeof b.coordinates.lat === "number" &&
        Number.isFinite(b.coordinates.lat) &&
        Math.abs(b.coordinates.lat) <= 90 &&
        typeof b.coordinates.lng === "number" &&
        Number.isFinite(b.coordinates.lng) &&
        Math.abs(b.coordinates.lng) <= 180 &&
        Array.isArray(b.hours) &&
        b.hours.every(
          (h) =>
            isObject(h) &&
            Array.isArray(h.days) &&
            h.days.length > 0 &&
            h.days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6) &&
            typeof h.opens === "string" &&
            /^([01]\d|2[0-3]):[0-5]\d$/.test(h.opens) &&
            typeof h.closes === "string" &&
            /^([01]\d|2[0-3]):[0-5]\d$/.test(h.closes) &&
            h.opens !== h.closes,
        ),
    )
  );
}
