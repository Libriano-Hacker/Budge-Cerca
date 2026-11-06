const CACHE = "budge-cerca-v7-security";
const DOCUMENTS = new Set(["/", "/descargar"]);
const PRECACHE = [
  "/",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.webmanifest",
];
function cacheableUrl(url) {
  return (
    url.origin === self.location.origin &&
    !url.search &&
    (DOCUMENTS.has(url.pathname) ||
      /^\/assets\/[\w.-]+\.(?:js|css|woff2?)$/.test(url.pathname) ||
      /^\/media\/[\w.-]+\.(?:png|jpe?g|webp|svg)$/.test(url.pathname) ||
      /^\/icon-(?:180|192|512)\.png$/.test(url.pathname) ||
      url.pathname === "/manifest.webmanifest" ||
      /^\/descargas\/tu-barrio-cerca-qr\.(?:png|svg)$/.test(url.pathname))
  );
}
function cacheableResponse(response) {
  return (
    response.status === 200 &&
    !response.redirected &&
    ["basic", "default"].includes(response.type) &&
    !/(?:no-store|private)/i.test(response.headers.get("cache-control") || "")
  );
}
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      for (const path of PRECACHE) {
        const response = await fetch(path, { cache: "reload" });
        if (!cacheableResponse(response))
          throw new Error("No se almacena una respuesta protegida o fallida.");
        await cache.put(path, response);
      }
      await self.skipWaiting();
    })(),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith("budge-cerca-") && key !== CACHE)
          await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || !cacheableUrl(url)) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(event.request);
        if (cacheableResponse(response)) {
          const copy = response.clone();
          event.waitUntil(cache.put(event.request, copy));
        } else {
          // Un logout, una denegación o una política privada no conserva copias viejas.
          await cache.delete(event.request);
        }
        return response;
      } catch {
        return (
          (await cache.match(event.request)) ||
          (event.request.mode === "navigate" && DOCUMENTS.has(url.pathname)
            ? await cache.match("/")
            : undefined) ||
          Response.error()
        );
      }
    })(),
  );
});
