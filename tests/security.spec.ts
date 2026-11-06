import { expect, test } from "@playwright/test";
import { initialData } from "../src/data";
import { STORAGE_KEY } from "../src/domain";
import { DATA_LIMITS } from "../src/securityValidation";

function directives(policy: string) {
  return Object.fromEntries(
    policy
      .split(";")
      .filter((part) => part.trim())
      .map((part) => {
        const [name, ...values] = part.trim().split(/\s+/);
        return [name, values];
      }),
  ) as Record<string, string[]>;
}

test("la versión pública entrega cabeceras de seguridad y una CSP efectiva", async ({
  page,
}) => {
  const response = await page.goto("/");
  expect(response?.ok()).toBe(true);
  const headers = response!.headers();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("no-referrer");
  expect(headers["permissions-policy"]).toMatch(/geolocation\s*=\s*\(self\)/);
  expect(headers["permissions-policy"]).toMatch(/camera\s*=\s*\(\)/);
  expect(headers["permissions-policy"]).toMatch(/microphone\s*=\s*\(\)/);
  const csp = directives(headers["content-security-policy"] || "");
  expect(csp["script-src"]).toEqual(["'self'"]);
  expect(csp["frame-ancestors"]).toEqual(["'none'"]);
  expect(csp["object-src"]).toEqual(["'none'"]);
  expect(csp["base-uri"]).toEqual(["'none'"]);
  expect(csp["form-action"]).toEqual(["'none'"]);
  expect(csp["connect-src"]).toContain("'self'");
  expect(csp["connect-src"]).not.toContain("*");
  const meta = page.locator('meta[http-equiv="Content-Security-Policy"]');
  await expect(meta).toHaveCount(1);
  const embedded = directives((await meta.getAttribute("content")) || "");
  expect(embedded["script-src"]).toEqual(["'self'"]);
  expect(embedded["object-src"]).toEqual(["'none'"]);
});

test("query, hash y una etiqueta local de administrador no habilitan gestión en producción", async ({
  page,
  request,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("role", "admin");
    localStorage.setItem("admin", "true");
  });
  await page.goto("/?view=dashboard&admin=true#dashboard");
  await expect(
    page.getByRole("heading", { name: "Conectá con lo que te rodea." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Dashboard demo", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Administrar demo", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Agregar barrio", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Agregar comercio", exact: true }),
  ).toHaveCount(0);
  const toggle = page.getByRole("button", { name: "Abrir menú", exact: true });
  if (await toggle.isVisible()) {
    await toggle.click();
    await expect(
      page
        .getByRole("navigation", { name: "Menú móvil" })
        .getByRole("button", { name: "Dashboard demo", exact: true }),
    ).toHaveCount(0);
  }
  const entry = await page
    .locator('script[type="module"][src]')
    .getAttribute("src");
  expect(entry).toBeTruthy();
  const bundle = await request.get(entry!);
  expect(bundle.ok()).toBe(true);
  const javascript = await bundle.text();
  expect(javascript).not.toContain("ESPACIO DEL CREADOR");
  expect(javascript).not.toContain("Administrá los barrios disponibles");
  expect(javascript).not.toContain("Guardar comercio");
});

test("React y Leaflet muestran entradas con HTML como texto sin ejecutar ni crear nodos", async ({
  page,
}) => {
  const name = '<img src=x onerror="globalThis.__storedXss=1">';
  const description = "<script>globalThis.__storedXss=1</script>";
  const data = {
    ...initialData,
    settings: { ...initialData.settings, intro: description },
    businesses: [
      {
        ...initialData.businesses[0],
        id: "security-xss",
        name,
        description,
        featured: false,
        initials: "<svg>",
      },
    ],
  };
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: STORAGE_KEY, value: data },
  );
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.abort(),
  );
  await page.goto("/");
  await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  await expect(page.locator(".hero-copy > p")).toHaveText(description);
  await expect(
    page.locator("img[onerror], svg[onload], script:not([src])"),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() => Reflect.get(window, "__storedXss")),
  ).toBeUndefined();
  await page.getByRole("button", { name: "Mapa", exact: true }).click();
  const marker = page.locator(".business-marker").first();
  await expect(marker.locator(".map-marker-label")).toHaveText("<svg>");
  await expect(marker.locator("svg")).toHaveCount(0);
  await marker.hover();
  await expect(page.locator(".leaflet-tooltip")).toHaveText(name);
  await expect(
    page.locator(".leaflet-tooltip img, .leaflet-tooltip script"),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() => Reflect.get(window, "__storedXss")),
  ).toBeUndefined();
});

test("un rubro que coincide con una propiedad heredada no rompe las tarjetas", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const data = {
    ...initialData,
    categories: ["constructor"],
    businesses: [
      {
        ...initialData.businesses[0],
        category: "constructor",
        featured: false,
      },
    ],
  };
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: STORAGE_KEY, value: data },
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Conectá con lo que te rodea." }),
  ).toBeVisible();
  await expect(page.getByText("1 comercio encontrado")).toBeVisible();
  await page
    .getByRole("combobox", { name: "Filtrar por rubro", exact: true })
    .selectOption("constructor");
  await expect(
    page.getByRole("button", { name: "Pan del Barrio", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("favoritos conserva identificadores largos válidos y limpia referencias antiguas al guardar", async ({
  page,
}) => {
  const business = {
    ...initialData.businesses[0],
    id: "x".repeat(DATA_LIMITS.businessId),
    featured: false,
  };
  const data = { ...initialData, businesses: [business] };
  await page.goto("/");
  await page.evaluate(
    ({ key, data, id }) => {
      localStorage.setItem(key, JSON.stringify(data));
      localStorage.setItem("budge-cerca:favorites", JSON.stringify([id]));
    },
    { key: STORAGE_KEY, data, id: business.id },
  );
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "Quitar Pan del Barrio en favoritos",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.evaluate((count) => {
    localStorage.setItem(
      "budge-cerca:favorites",
      JSON.stringify(Array.from({ length: count }, (_, i) => `retirado-${i}`)),
    );
  }, DATA_LIMITS.favorites);
  await page.reload();
  await page
    .getByRole("button", {
      name: "Guardar Pan del Barrio en favoritos",
      exact: true,
    })
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "Quitar Pan del Barrio en favoritos",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("budge-cerca:favorites") || "[]"),
    ),
  ).toEqual([business.id]);
});

const invalidStorageCases = [
  { name: "JSON malformado", value: "{invalid-json" },
  {
    name: "un tipo incorrecto",
    value: JSON.stringify({
      ...initialData,
      settings: { ...initialData.settings, appName: { nested: "unexpected" } },
    }),
  },
  {
    name: "JSON válido que supera el límite",
    value:
      " ".repeat(DATA_LIMITS.serializedChars + 1) + JSON.stringify(initialData),
  },
];
for (const example of invalidStorageCases) {
  test(`el catálogo guardado rechaza ${example.name} y mantiene el buscador disponible`, async ({
    page,
  }) => {
    await page.addInitScript(
      ({ key, value }) => localStorage.setItem(key, value),
      { key: STORAGE_KEY, value: example.value },
    );
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Conectá con lo que te rodea." }),
    ).toBeVisible();
    await expect(page.getByRole("alert")).toBeVisible();
    await page
      .getByRole("textbox", { name: "Buscar comercios", exact: true })
      .fill("tornillo");
    await expect(page.getByText("1 comercio encontrado")).toBeVisible();
    expect(
      await page.evaluate(
        ({ key, value }) => localStorage.getItem(key) === value,
        { key: STORAGE_KEY, value: example.value },
      ),
    ).toBe(true);
  });
}

test("CSP bloquea scripts inline y conexiones a un origen no autorizado", async ({
  page,
}) => {
  let externalRequests = 0;
  await page.route("https://not-permitted.example/**", (route) => {
    externalRequests++;
    return route.abort();
  });
  await page.goto("/");
  await page.evaluate(async () => {
    const violations: string[] = [];
    Reflect.set(window, "__securityViolations", violations);
    document.addEventListener("securitypolicyviolation", (event) =>
      violations.push(event.effectiveDirective),
    );
    const injected = document.createElement("script");
    injected.textContent = "globalThis.__inlineSecurityCanary = 1";
    document.body.appendChild(injected);
    await fetch("https://not-permitted.example/security-canary").catch(
      () => undefined,
    );
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => Reflect.get(window, "__securityViolations") as string[],
      ),
    )
    .toContain("script-src-elem");
  await expect
    .poll(() =>
      page.evaluate(
        () => Reflect.get(window, "__securityViolations") as string[],
      ),
    )
    .toContain("connect-src");
  expect(
    await page.evaluate(() => Reflect.get(window, "__inlineSecurityCanary")),
  ).toBeUndefined();
  expect(externalRequests).toBe(0);
});

test("service worker no conserva API ni respuestas privadas y no las recupera sin red", async ({
  page,
  context,
}) => {
  const api = "**/api/security-cache-canary";
  const privateAsset = "**/media/security-private-canary.png";
  await context.route(api, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "Cache-Control": "public, max-age=3600" },
      body: '{"canary":"public-api-response"}',
    }),
  );
  await context.route(privateAsset, (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/png",
      headers: { "Cache-Control": "private, no-store" },
      body: "test-only-private-response",
    }),
  );
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  expect(
    await page.evaluate(async () =>
      (await fetch("/api/security-cache-canary")).json(),
    ),
  ).toEqual({ canary: "public-api-response" });
  expect(
    await page.evaluate(async () =>
      (await fetch("/media/security-private-canary.png")).text(),
    ),
  ).toBe("test-only-private-response");
  const paths = await page.evaluate(async () =>
    (
      await Promise.all(
        (await caches.keys()).map(async (name) =>
          (await (await caches.open(name)).keys()).map(
            (request) => new URL(request.url).pathname,
          ),
        ),
      )
    ).flat(),
  );
  expect(paths).not.toContain("/api/security-cache-canary");
  expect(paths).not.toContain("/media/security-private-canary.png");
  await context.unroute(api);
  await context.unroute(privateAsset);
  await context.setOffline(true);
  expect(
    await page.evaluate(async () =>
      fetch("/api/security-cache-canary").then(
        () => false,
        () => true,
      ),
    ),
  ).toBe(true);
  expect(
    await page.evaluate(async () =>
      fetch("/media/security-private-canary.png").then(
        () => false,
        () => true,
      ),
    ),
  ).toBe(true);
});
