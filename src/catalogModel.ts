import {
  boundedArray,
  boundedText,
  publicHttpsUrl,
  recordWithKeys,
} from "./securityValidation";

export const FEATURE_LABELS = {
  appointments: "Con turnos",
  delivery: "Con entrega",
  home_service: "A domicilio",
  accessible: "Accesible",
  card: "Tarjeta",
  transfer: "Transferencia",
  cash: "Efectivo",
} as const;
export type FeatureKey = keyof typeof FEATURE_LABELS;
export const REVIEW_LABELS = {
  contact: "Contacto",
  location: "Ubicación",
  hours: "Horarios",
  photos: "Fotos autorizadas",
} as const;
export type ReviewField = keyof typeof REVIEW_LABELS;
export type ServiceItem = {
  name: string;
  description?: string;
  price?: number;
  unit?: string;
  priceNote?: string;
};
export type PhotoItem = { url?: string; assetId?: string; alt: string };
export type SpecialHours = {
  date: string;
  closed: boolean;
  periods: { opens: string; closes: string }[];
  note?: string;
};
export type BusinessDetails = {
  services?: ServiceItem[];
  photos?: PhotoItem[];
  features?: FeatureKey[];
  exceptions?: SpecialHours[];
  review?: { date: string; fields: ReviewField[] };
  publishedAt?: string;
};
const normalizeName = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const time = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(time.getTime()) &&
    time.toISOString().slice(0, 10) === value &&
    value >= "2000-01-01" &&
    value <= "2100-12-31"
  );
}
export function argentinaDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function previousDate(date: string) {
  const time = new Date(`${date}T12:00:00Z`);
  time.setUTCDate(time.getUTCDate() - 1);
  return time.toISOString().slice(0, 10);
}
export function validDetails(value: unknown): value is BusinessDetails {
  if (
    !recordWithKeys(
      value,
      [],
      ["services", "photos", "features", "exceptions", "review", "publishedAt"],
    )
  )
    return false;
  if (value.services !== undefined) {
    if (
      !boundedArray(value.services, 24) ||
      !value.services.every(
        (s) =>
          recordWithKeys(
            s,
            ["name"],
            ["description", "price", "unit", "priceNote"],
          ) &&
          boundedText(s.name, 1, 80) &&
          (s.description === undefined ||
            boundedText(s.description, 0, 180, true)) &&
          (s.price === undefined ||
            (typeof s.price === "number" &&
              Number.isFinite(s.price) &&
              s.price >= 0 &&
              s.price <= 1e9 &&
              Math.abs(Math.round(s.price * 100) - s.price * 100) <
                0.000001)) &&
          (s.unit === undefined || boundedText(s.unit, 0, 35)) &&
          (s.priceNote === undefined || boundedText(s.priceNote, 0, 180, true)),
      )
    )
      return false;
    if (
      new Set(value.services.map((s) => normalizeName((s as ServiceItem).name)))
        .size !== value.services.length
    )
      return false;
  }
  if (
    value.photos !== undefined &&
    (!boundedArray(value.photos, 8) ||
      !value.photos.every(
        (photo) =>
          recordWithKeys(photo, ["alt"], ["url", "assetId"]) &&
          boundedText(photo.alt, 1, 120) &&
          ((publicHttpsUrl(photo.url) && photo.assetId === undefined) ||
            (typeof photo.assetId === "string" &&
              UUID.test(photo.assetId) &&
              photo.url === undefined)),
      ))
  )
    return false;
  if (
    value.features !== undefined &&
    (!boundedArray(value.features, 7) ||
      new Set(value.features).size !== value.features.length ||
      !value.features.every(
        (f) => typeof f === "string" && Object.hasOwn(FEATURE_LABELS, f),
      ))
  )
    return false;
  if (value.exceptions !== undefined) {
    const clock = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (
      !boundedArray(value.exceptions, 64) ||
      !value.exceptions.every(
        (e) =>
          recordWithKeys(e, ["date", "closed", "periods"], ["note"]) &&
          validDate(e.date) &&
          typeof e.closed === "boolean" &&
          boundedArray(e.periods, 4) &&
          (e.closed ? e.periods.length === 0 : e.periods.length > 0) &&
          (e.note === undefined || boundedText(e.note, 0, 160)) &&
          e.periods.every(
            (p) =>
              recordWithKeys(p, ["opens", "closes"]) &&
              typeof p.opens === "string" &&
              clock.test(p.opens) &&
              typeof p.closes === "string" &&
              clock.test(p.closes) &&
              p.opens !== p.closes,
          ),
      )
    )
      return false;
    if (
      new Set(value.exceptions.map((e) => (e as SpecialHours).date)).size !==
      value.exceptions.length
    )
      return false;
  }
  if (
    value.review !== undefined &&
    (!recordWithKeys(value.review, ["date", "fields"]) ||
      !validDate(value.review.date) ||
      value.review.date > argentinaDate() ||
      !boundedArray(value.review.fields, 4, 1) ||
      new Set(value.review.fields).size !== value.review.fields.length ||
      !value.review.fields.every(
        (f) => typeof f === "string" && Object.hasOwn(REVIEW_LABELS, f),
      ))
  )
    return false;
  return (
    value.publishedAt === undefined ||
    (typeof value.publishedAt === "string" &&
      value.publishedAt.length <= 40 &&
      /^\d{4}-\d\d-\d\dT/.test(value.publishedAt) &&
      Number.isFinite(Date.parse(value.publishedAt)))
  );
}
