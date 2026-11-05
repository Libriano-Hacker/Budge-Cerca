import QRCode from "qrcode";
import { mkdir, writeFile, readFile } from "node:fs/promises";
const config = JSON.parse(
  await readFile(new URL("../app.config.json", import.meta.url), "utf8"),
);
import { fileURLToPath } from "node:url";

const base = new URL(config.publicUrl);
if (
  base.protocol !== "https:" ||
  base.username ||
  base.password ||
  /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(base.hostname)
)
  throw new Error(
    "El QR requiere una URL pública HTTPS, sin credenciales ni localhost.",
  );
const target = new URL("/descargar", base).href;
const dir = new URL("../public/descargas/", import.meta.url);
await mkdir(dir, { recursive: true });
await QRCode.toFile(
  fileURLToPath(new URL("tu-barrio-cerca-qr.png", dir)),
  target,
  {
    width: 1024,
    margin: 4,
    errorCorrectionLevel: "M",
    color: { dark: "#081426", light: "#ffffff" },
  },
);
await writeFile(
  new URL("tu-barrio-cerca-qr.svg", dir),
  await QRCode.toString(target, {
    type: "svg",
    margin: 4,
    errorCorrectionLevel: "M",
    color: { dark: "#081426", light: "#ffffff" },
  }),
);
await writeFile(
  new URL("destino.json", dir),
  JSON.stringify(
    {
      url: target,
      purpose:
        "Página de instalación; requiere publicación y acceso público al sitio.",
    },
    null,
    2,
  ) + "\n",
);
console.log(`QR generado y listo para activar al publicar: ${target}`);
