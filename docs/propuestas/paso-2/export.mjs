import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { createHash } from "node:crypto";

const source = fileURLToPath(new URL("./", import.meta.url));
const root = fileURLToPath(new URL("../../../", import.meta.url));
const target = join(root, "artifacts/propuesta-paso-2");
await mkdir(join(target, "assets"), { recursive: true });
const assets = [
  [
    "cobalto-barrio.png",
    join(root, "public/media/cobalto-barrio.png"),
    "image/png",
  ],
  [
    "comercios-atlas.png",
    join(root, "public/media/comercios-atlas.png"),
    "image/png",
  ],
  [
    "manrope.woff2",
    join(
      root,
      "node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2",
    ),
    "font/woff2",
  ],
];
for (const name of ["index.html", "proposal.css", "proposal.js", "catalog.js"])
  await copyFile(join(source, name), join(target, name));
for (const [name, path] of assets)
  await copyFile(path, join(target, "assets", name));
let html = await readFile(join(source, "index.html"), "utf8");
let css = await readFile(join(source, "proposal.css"), "utf8");
for (const [name, path, mime] of assets)
  css = css.replaceAll(
    `assets/${name}`,
    `data:${mime};base64,${(await readFile(path)).toString("base64")}`,
  );
const hashes = [];
for (const name of ["catalog.js", "proposal.js"]) {
  const code = (await readFile(join(source, name), "utf8")).replace(
    /<\/script/gi,
    "<\\/script",
  );
  hashes.push(`'sha256-${createHash("sha256").update(code).digest("base64")}'`);
  html = html.replace(
    new RegExp(
      `<script\\b(?=[^>]*src=["']${name.replace(".", "\\.")}["'])[^>]*>[\\s\\S]*?<\\/script>`,
      "i",
    ),
    "",
  );
  html = html.replace("</body>", () => `<script>${code}</script>\n</body>`);
}
html = html.replace(
  /<link\b(?=[^>]*href=["']proposal\.css["'])[^>]*>/i,
  () => `<style>${css}</style>`,
);
html = html.replace(
  /<meta\b(?=[^>]*http-equiv=["']Content-Security-Policy["'])[^>]*>/i,
  () =>
    `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${hashes.join(" ")}; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; base-uri 'none'; object-src 'none'; form-action 'none'">`,
);
await writeFile(join(target, "propuesta.html"), html);
await copyFile(join(source, "PASO-2.md"), join(target, "DETALLE-MEJORAS.md"));
console.log(
  "Bosquejo aislado y versión HTML autocontenida generados en artifacts/propuesta-paso-2. No se modificó src, public ni el build de la app.",
);
