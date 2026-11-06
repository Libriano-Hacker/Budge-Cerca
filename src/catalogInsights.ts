import type { Business } from "./domain";
import { normalize, distanceKm } from "./domain";
import { argentinaDate } from "./catalogModel";
export type Suggestion = {
  value: string;
  kind: "Comercio" | "Rubro" | "Servicio";
};
export function searchSuggestions(
  businesses: Business[],
  query: string,
): Suggestion[] {
  const term = normalize(query);
  if (term.length < 2) return [];
  const choices = new Map<string, Suggestion>();
  for (const b of businesses) {
    for (const suggestion of [
      { value: b.name, kind: "Comercio" as const },
      { value: b.category, kind: "Rubro" as const },
      ...(b.details?.services || []).map((s) => ({
        value: s.name,
        kind: "Servicio" as const,
      })),
    ]) {
      const key = normalize(suggestion.value);
      if (key.includes(term) && !choices.has(key)) choices.set(key, suggestion);
    }
  }
  return [...choices.values()]
    .sort(
      (a, b) =>
        Number(normalize(b.value).startsWith(term)) -
          Number(normalize(a.value).startsWith(term)) ||
        a.value.localeCompare(b.value, "es"),
    )
    .slice(0, 7);
}
export type QualityIssue = {
  businessId: string;
  businessName: string;
  neighborhood: string;
  kind: "contact" | "location" | "hours" | "photos" | "stale" | "duplicate";
  message: string;
  relatedId?: string;
};
export function qualityIssues(
  businesses: Business[],
  date = new Date(),
): QualityIssue[] {
  const result: QualityIssue[] = [];
  const today = argentinaDate(date);
  const cutoff = new Date(`${today}T12:00:00Z`).getTime() - 90 * 86400000;
  const names = new Map<string, Business[]>();
  for (const b of businesses) {
    const add = (
      kind: QualityIssue["kind"],
      message: string,
      relatedId?: string,
    ) =>
      result.push({
        businessId: b.id,
        businessName: b.name,
        neighborhood: b.neighborhood || "",
        kind,
        message,
        relatedId,
      });
    const reviewed = new Set(b.details?.review?.fields || []);
    if (!b.whatsapp) add("contact", "Falta el WhatsApp del comercio");
    else if (!reviewed.has("contact")) add("contact", "Contacto por confirmar");
    if (!reviewed.has("location")) add("location", "Ubicación por confirmar");
    if (!b.hours.length) add("hours", "Faltan horarios semanales");
    else if (!reviewed.has("hours")) add("hours", "Horarios por confirmar");
    if (!b.imageUrl && !b.details?.photos?.length)
      add("photos", "Falta una foto propia autorizada");
    if (
      b.details?.review &&
      new Date(`${b.details.review.date}T12:00:00Z`).getTime() < cutoff
    )
      add("stale", "La revisión tiene más de 90 días");
    const key = `${normalize(b.neighborhood || "")}|${normalize(b.name)}`;
    for (const previous of names.get(key) || [])
      if (distanceKm(b.coordinates, previous.coordinates) < 0.15)
        add("duplicate", `Posible duplicado de ${previous.name}`, previous.id);
    names.set(key, [...(names.get(key) || []), b]);
  }
  return result;
}

export const QUALITY_LABELS = {
  contact: "Contacto",
  location: "Ubicación",
  hours: "Horarios",
  photos: "Fotos",
  stale: "Revisión antigua",
  duplicate: "Posible duplicado",
} as const;
