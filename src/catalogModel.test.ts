import { describe, it, expect } from "vitest";
import { validDetails, validDate, argentinaDate } from "./catalogModel";
import { searchSuggestions, qualityIssues } from "./catalogInsights";
import { isAppData, isOpen, filterBusinesses } from "./domain";
import { initialData } from "./data";
import { validRequest } from "./requestModel";
const b = { ...initialData.businesses[0], neighborhood: "Barrio Centro" };
describe("Extended catalog data", () => {
  it("preserves the legacy catalog while validating optional closed schemas", () => {
    expect(isAppData(initialData)).toBe(true);
    expect(
      validDetails({
        services: [{ name: "Corte", price: 0.29 }],
        photos: [{ url: "https://example.com/photo.jpg", alt: "Frente" }],
      }),
    ).toBe(true);
    for (const data of [
      { services: [{ name: "Corte", price: -1 }] },
      { services: [{ name: "Corte", price: 1.234 }] },
      { services: [{ name: "Corte" }, { name: "corté" }] },
      { photos: [{ url: "javascript:alert(1)", alt: "x" }] },
      { features: ["delivery", "delivery"] },
      { review: { date: "2026-02-30", fields: ["hours"] } },
      { unknown: "x" },
    ])
      expect(validDetails(data)).toBe(false);
  });
  it("rejects impossible dates and duplicate or incomplete exceptions", () => {
    expect(validDate("2024-02-29")).toBe(true);
    expect(validDate("2025-02-29")).toBe(false);
    expect(
      validDetails({
        exceptions: [{ date: "2026-12-25", closed: false, periods: [] }],
      }),
    ).toBe(false);
    expect(
      validDetails({
        exceptions: [
          { date: "2026-12-25", closed: true, periods: [] },
          { date: "2026-12-25", closed: true, periods: [] },
        ],
      }),
    ).toBe(false);
  });
  it("offers only real names, rubros and services, including accents", () => {
    const business = {
      ...b,
      details: { services: [{ name: "Reparación de celulares" }] },
    };
    expect(searchSuggestions([business], "reparacion")).toEqual([
      { kind: "Servicio", value: "Reparación de celulares" },
    ]);
    expect(searchSuggestions([business], "inexistente")).toEqual([]);
    expect(searchSuggestions([business], "p")).toEqual([]);
  });
  it("filters by declared services and combines confirmed facilities", () => {
    const list = [
      {
        ...b,
        details: {
          services: [{ name: "Corte infantil" }],
          features: ["appointments" as const, "card" as const],
        },
      },
      { ...b, id: "other" },
    ];
    expect(
      filterBusinesses(list, "infantil", "Todos", {
        features: ["appointments", "card"],
      }),
    ).toHaveLength(1);
    expect(
      filterBusinesses(list, "", "Todos", { features: ["delivery"] }),
    ).toHaveLength(0);
  });
  it("applies Argentina dates, closed holidays and replacement schedules", () => {
    const business = {
      ...b,
      hours: [{ days: [5], opens: "09:00", closes: "20:00" }],
      details: {
        exceptions: [{ date: "2026-11-06", closed: true, periods: [] }],
      },
    };
    expect(argentinaDate(new Date("2026-11-07T01:00:00Z"))).toBe("2026-11-06");
    expect(isOpen(business, new Date("2026-11-06T15:00:00Z"))).toBe(false);
    const special = {
      ...business,
      details: {
        exceptions: [
          {
            date: "2026-11-06",
            closed: false,
            periods: [{ opens: "22:00", closes: "02:00" }],
          },
        ],
      },
    };
    expect(isOpen(special, new Date("2026-11-07T04:00:00Z"))).toBe(true);
    expect(isOpen(special, new Date("2026-11-07T05:00:00Z"))).toBe(false);
  });
  it("does not carry yesterday opening into an explicit closed date", () => {
    const business = {
      ...b,
      hours: [{ days: [5], opens: "22:00", closes: "04:00" }],
      details: {
        exceptions: [{ date: "2026-11-07", closed: true, periods: [] }],
      },
    };
    expect(isOpen(business, new Date("2026-11-07T04:00:00Z"))).toBe(false);
  });
  it("flags stale and possible duplicates without changing the catalog", () => {
    const list = [
      {
        ...b,
        whatsapp: "",
        imageUrl: undefined,
        details: { review: { date: "2026-01-01", fields: ["hours" as const] } },
      },
      { ...b, id: "similar" },
    ];
    const before = JSON.stringify(list);
    const issues = qualityIssues(list, new Date("2026-11-06T12:00:00Z"));
    expect(issues.some((i) => i.kind === "contact")).toBe(true);
    expect(issues.some((i) => i.kind === "stale")).toBe(true);
    expect(issues.some((i) => i.kind === "duplicate")).toBe(true);
    expect(JSON.stringify(list)).toBe(before);
  });
  it("bounds public submissions and keeps correction/new shapes distinct", () => {
    expect(
      validRequest({
        kind: "new",
        neighborhood: "Barrio Centro",
        category: b.category,
        name: "Local",
        address: "Calle 123",
        note: "Información para revisión.",
      }),
    ).toBe(true);
    expect(
      validRequest({
        kind: "correction",
        businessId: b.id,
        neighborhood: "Barrio Centro",
        field: "hours",
        note: "Abre desde las 9 horas.",
      }),
    ).toBe(true);
    expect(
      validRequest({
        kind: "new",
        neighborhood: "Barrio Centro",
        category: b.category,
        name: "Local",
        address: "Calle 123",
        note: "Información para revisión.",
        role: "owner",
      }),
    ).toBe(false);
  });
});
