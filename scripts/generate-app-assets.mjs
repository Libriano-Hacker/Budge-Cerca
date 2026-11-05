import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import sharp from "sharp";

execFileSync(
  process.execPath,
  [
    "node_modules/@capacitor/assets/bin/capacitor-assets",
    "generate",
    "--assetPath",
    "resources",
    "--android",
    "--ios",
    "--iconBackgroundColor",
    "#081426",
    "--splashBackgroundColor",
    "#081426",
  ],
  { stdio: "inherit" },
);
await mkdir("public", { recursive: true });
for (const size of [180, 192, 512])
  await sharp("resources/logo.png")
    .resize(size, size, { fit: "contain", background: "#081426" })
    .flatten({ background: "#081426" })
    .png()
    .toFile(`public/icon-${size}.png`);
const manifest = JSON.parse(
  await readFile("public/manifest.webmanifest", "utf8"),
);
manifest.icons = [192, 512].map((size) => ({
  src: `/icon-${size}.png`,
  sizes: `${size}x${size}`,
  type: "image/png",
  purpose: size === 512 ? "any maskable" : "any",
}));
await writeFile(
  "public/manifest.webmanifest",
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log("Íconos PNG para web/iOS y recursos nativos generados.");
