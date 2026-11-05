import {
  mkdir,
  readFile,
  writeFile,
  copyFile,
  access,
  chmod,
} from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const plan = JSON.parse(
  await readFile(new URL("./android-toolchain.json", import.meta.url), "utf8"),
);

if (process.platform !== "linux" || process.arch !== "x64")
  throw new Error(
    "Este instalador es para Linux x64. En macOS o Windows usá Android Studio y configurá JAVA_HOME/ANDROID_HOME.",
  );
const repo = fileURLToPath(new URL("../", import.meta.url));
const tools =
  process.env.TBC_TOOLS_ROOT ||
  join(dirname(repo.replace(/\/$/, "")), ".mobile-tools");
const cache = join(tools, "downloads");
await mkdir(cache, { recursive: true });
const exists = async (p) => {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
};
const run = (file, args, options = {}) =>
  execFileSync(file, args, { stdio: "inherit", ...options });
for (const [kind, artifact] of Object.entries({
  java: plan.java,
  sdk: plan.sdk,
})) {
  const path = join(cache, artifact.file);
  if (!(await exists(path)))
    run("curl", [
      "-fLsS",
      "--retry",
      "2",
      "--max-time",
      "300",
      artifact.url,
      "-o",
      path,
    ]);
  const hash = createHash(artifact.algorithm);
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  if (hash.digest("hex") !== artifact.checksum)
    throw new Error(
      `Falló la verificación oficial de ${artifact.file}. No se usará el archivo.`,
    );
  console.log(`${artifact.file}: checksum oficial verificado`);
  if (kind === "java" && !(await exists(join(tools, "jdk-21/bin/javac")))) {
    await mkdir(join(tools, "jdk-21"), { recursive: true });
    run("tar", [
      "-xzf",
      path,
      "-C",
      join(tools, "jdk-21"),
      "--strip-components=1",
    ]);
  }
  if (
    kind === "sdk" &&
    !(await exists(
      join(tools, "android-sdk/cmdline-tools/latest/bin/sdkmanager"),
    ))
  ) {
    const dest = join(tools, "android-sdk/cmdline-tools");
    await mkdir(dest, { recursive: true });
    run("python3", [
      "-c",
      'import zipfile,sys,pathlib; z=zipfile.ZipFile(sys.argv[1]); assert all(not p.startswith("/") and ".." not in pathlib.Path(p).parts for p in z.namelist()); z.extractall(sys.argv[2]); pathlib.Path(sys.argv[2],"cmdline-tools").rename(pathlib.Path(sys.argv[2],"latest"))',
      path,
      dest,
    ]);
    for (const name of [
      "sdkmanager",
      "avdmanager",
      "apkanalyzer",
      "lint",
      "retrace",
      "screenshot2",
      "profgen",
    ]) {
      const script = join(dest, "latest/bin", name);
      if (await exists(script)) await chmod(script, 0o755);
    }
  }
}
const java = join(tools, "jdk-21");
const sdk = join(tools, "android-sdk");
const gradle = join(tools, "gradle");
await mkdir(gradle, { recursive: true });
await mkdir(join(tools, "android-user"), { recursive: true });
const env = {
  ...process.env,
  JAVA_HOME: java,
  ANDROID_HOME: sdk,
  ANDROID_SDK_ROOT: sdk,
  ANDROID_USER_HOME: join(tools, "android-user"),
};
const trust = join(tools, "java-cacerts");
if (
  process.env.CODEX_PROXY_CERT &&
  (await exists(process.env.CODEX_PROXY_CERT))
) {
  if (!(await exists(trust)))
    await copyFile(join(java, "lib/security/cacerts"), trust);
  const keytool = join(java, "bin/keytool");
  let known = false;
  try {
    execFileSync(
      keytool,
      [
        "-list",
        "-alias",
        "cloud-environment-proxy",
        "-keystore",
        trust,
        "-storepass",
        "changeit",
      ],
      { stdio: "ignore" },
    );
    known = true;
  } catch {
    /* Import the supplied public CA. */
  }
  if (!known)
    run(keytool, [
      "-importcert",
      "-noprompt",
      "-alias",
      "cloud-environment-proxy",
      "-keystore",
      trust,
      "-storepass",
      "changeit",
      "-file",
      process.env.CODEX_PROXY_CERT,
    ]);
  env.JAVA_TOOL_OPTIONS = `${process.env.JAVA_TOOL_OPTIONS || ""} -Djavax.net.ssl.trustStore=${trust} -Djavax.net.ssl.trustStorePassword=changeit`;
}
const proxyArgs = [];
const properties = [
  "org.gradle.daemon=false",
  "org.gradle.workers.max=2",
  "org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8",
];
if (process.env.HTTPS_PROXY) {
  const proxy = new URL(process.env.HTTPS_PROXY);
  if (proxy.username || proxy.password)
    throw new Error(
      "El proxy requiere autenticación; usá el mecanismo de red soportado del entorno.",
    );
  const port = proxy.port || "80";
  proxyArgs.push(
    "--proxy=http",
    `--proxy_host=${proxy.hostname}`,
    `--proxy_port=${port}`,
  );
  for (const protocol of ["http", "https"])
    properties.push(
      `systemProp.${protocol}.proxyHost=${proxy.hostname}`,
      `systemProp.${protocol}.proxyPort=${port}`,
    );
  properties.push("systemProp.http.nonProxyHosts=localhost|127.*");
}
const propsPath = join(gradle, "gradle.properties");
const before = (await exists(propsPath))
  ? await readFile(propsPath, "utf8")
  : "";
const block =
  "# BEGIN Tu Barrio Cerca\n" +
  properties.join("\n") +
  "\n# END Tu Barrio Cerca";
await writeFile(
  propsPath,
  before.replace(
    /# BEGIN Tu Barrio Cerca[\s\S]*?# END Tu Barrio Cerca\n?/g,
    "",
  ) +
    "\n" +
    block +
    "\n",
);
const manager = join(sdk, "cmdline-tools/latest/bin/sdkmanager");
const common = [`--sdk_root=${sdk}`, ...proxyArgs];
try {
  execFileSync(manager, [...common, "--licenses"], {
    env,
    input: "y\n".repeat(200),
    stdio: ["pipe", "pipe", "pipe"],
  });
  execFileSync(manager, [...common, ...plan.packages], { env, stdio: "pipe" });
} catch (error) {
  console.error(
    error.stdout?.toString().slice(-3000) || "",
    error.stderr?.toString().slice(-3000) || "",
  );
  throw error;
}
console.log(
  "JDK 21 y Android SDK 36 preparados. Activá scripts/android-env.sh antes de compilar.",
);
