import { readFile, writeFile } from "node:fs/promises";
const policy = JSON.parse(
  await readFile(new URL("../security/headers.json", import.meta.url), "utf8"),
);
const lines = [
  "# Generado desde security/headers.json; npm run generate:security",
  "/*",
];
for (const [name, value] of Object.entries(policy)) {
  if (/[\r\n]/.test(name + value))
    throw new Error("Encabezado de seguridad inválido.");
  lines.push(`  ${name}: ${value}`);
}
lines.push(
  "",
  "/sw.js",
  "  Cache-Control: no-store",
  "",
  "/index.html",
  "  Cache-Control: no-cache",
  "",
  "/assets/*",
  "  Cache-Control: public, max-age=31536000, immutable",
  "",
);
await writeFile(
  new URL("../public/_headers", import.meta.url),
  lines.join("\n"),
);
console.log("Encabezados de seguridad Netlify generados.");
