import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const run = (file, args) =>
  execFileSync(process.execPath, [file, ...args], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, VITE_APP_TARGET: "mobile" },
  });
run("scripts/generate-downloads.mjs", []);
run("node_modules/typescript/bin/tsc", ["-b"]);
run("node_modules/vite/bin/vite.js", ["build", "--outDir", "dist-mobile"]);
