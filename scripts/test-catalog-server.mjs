// Local browser-test fixture only. No production function imports this module.
import { createServer as createVite } from "vite";
import { createServer } from "node:http";
if (process.env.TBC_TEST_FIXTURE !== "1" || process.env.NETLIFY)
  throw new Error("Test fixture is restricted to explicit local test runs.");
const vite = await createVite({
  configFile: false,
  server: { middlewareMode: true },
  appType: "custom",
});
const { catalogFixture, OWNER } = await vite.ssrLoadModule(
  "/tests/support/catalogFixture.ts",
);
const { createApi } = await vite.ssrLoadModule("/server/handler.ts");
const { initialData } = await vite.ssrLoadModule("/src/data.ts");
const fixture = await catalogFixture("http://127.0.0.1:4190");
const sample = {
  ...initialData.businesses[0],
  id: "sample-business",
  name: "Panadería de prueba",
  neighborhood: "Barrio Centro",
  whatsapp: "",
  details: {
    services: [
      { name: "Pan integral", price: 3500, priceNote: "Precio por kilo" },
    ],
    features: ["delivery", "cash"],
    photos: [
      {
        url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600",
        alt: "Pan de prueba",
      },
    ],
    review: {
      date: new Date().toISOString().slice(0, 10),
      fields: ["hours", "location"],
    },
    exceptions: [
      { date: "2026-12-25", closed: true, periods: [], note: "Feriado" },
    ],
  },
};
await fixture.deps.repo.rpc(
  "tbc_save_draft",
  { p_business: sample, p_expected: 0, p_actor: OWNER },
  "service",
);
await fixture.deps.repo.rpc(
  "tbc_publish",
  { p_id: sample.id, p_expected: 1, p_actor: OWNER },
  "service",
);
const handle = createApi(fixture.deps);
createServer(async (req, res) => {
  try {
    const chunks = [];
    let size = 0;
    for await (const part of req) {
      size += part.length;
      if (size > 6_000_000) {
        res.writeHead(413);
        res.end();
        return;
      }
      chunks.push(part);
    }
    const body = Buffer.concat(chunks);
    const request = new Request(`http://127.0.0.1:4190${req.url}`, {
      method: req.method,
      headers: req.headers,
      ...(body.length ? { body } : {}),
    });
    // Challenge time follows real time in browser tests.
    fixture.deps.now = () => Date.now();
    const response = await handle(request, { ip: req.socket.remoteAddress });
    res.writeHead(
      response.status,
      Object.fromEntries(response.headers.entries()),
    );
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ code: "TEST_ERROR", message: "Test fixture failed." }),
    );
  }
}).listen(8889, "127.0.0.1", () =>
  process.stdout.write("Local catalog test API ready on 8889\n"),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    await fixture.db.close();
    await vite.close();
    process.exit(0);
  });
