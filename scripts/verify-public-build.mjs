import { readdir, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
const root = resolve(process.argv[2] || "dist");
const html = await readFile(join(root, "index.html"), "utf8");
if (!html.includes('http-equiv="Content-Security-Policy"'))
  throw new Error("Falta CSP en el documento compilado.");
for (const name of await readdir(join(root, "assets"))) {
  if (name.endsWith(".map"))
    throw new Error("No se distribuyen source maps públicos.");
  if (!name.endsWith(".js")) continue;
  const code = await readFile(join(root, "assets", name), "utf8");
  if (
    /SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|TBC_SESSION_SECRET|test-password|sb_secret_/.test(
      code,
    )
  )
    throw new Error(
      "El cliente no debe incluir secretos ni proveedores de prueba.",
    );
  if (
    root.endsWith("dist-mobile") &&
    /Correo del administrador|Verificar acceso|Publicar esta versión/.test(code)
  )
    throw new Error(
      "La aplicación de usuarios no debe incluir gestión administrativa.",
    );
  if (
    /ESPACIO DEL CREADOR|Dashboard demo|Guardar mi barrio|Importar copia de seguridad/.test(
      code,
    )
  ) {
    throw new Error(
      "La compilación pública contiene herramientas administrativas de demostración.",
    );
  }
}
console.log(
  "Build público verificado: CSP presente, sin dashboard demo ni source maps.",
);
