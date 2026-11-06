# Activar el catálogo compartido con Supabase

La integración está implementada y probada localmente. **No se creó un proyecto remoto ni se cargaron claves privadas.** Sin configuración, `/api/config` informa `configured:false`, `/gestion` muestra activación pendiente y las escrituras responden 503. El catálogo de ejemplo sigue identificado como demo. No hay cuentas predeterminadas de producción.

## 1. Crear el proyecto y la base

1. Creá un proyecto en [Supabase](https://supabase.com/dashboard) desde tu cuenta y guardá su contraseña en tu gestor de contraseñas.
2. En SQL Editor ejecutá, en orden, los archivos completos [001_catalog.sql](../supabase/migrations/001_catalog.sql) y [002_private_media.sql](../supabase/migrations/002_private_media.sql). Alternativa con Supabase CLI: vincular el proyecto y ejecutar `supabase db push`. Probá primero en un proyecto vacío de desarrollo.
3. Se crea la marca y un barrio inicial editable, **sin comercios ficticios publicados**. El bucket `tbc-private-media` es privado. No agregues políticas públicas a las tablas ni al bucket.
4. En Authentication → Providers dejá Email habilitado y desactivá el registro público en Authentication → Settings. No hay pantalla de registro de administradores. Configurá las políticas de contraseñas y protección de cuentas disponibles en tu plan.
5. Creá tu usuario desde Authentication → Users (Add user). Elegí y guardá una contraseña privada, confirmá el correo según las opciones de Supabase y copiá su UUID.
6. Desde SQL Editor habilitá ese UUID como propietario, reemplazando el texto del ejemplo:

```sql
insert into public.tbc_members(user_id, role, neighborhoods)
values ('REEMPLAZAR_POR_UUID_DEL_USUARIO', 'owner', '{}');
```

Para un administrador de un barrio, creá antes su usuario de Auth y luego:

```sql
insert into public.tbc_members(user_id, role, neighborhoods)
values ('REEMPLAZAR_POR_UUID_DEL_ADMIN', 'admin', ARRAY['Barrio Centro']);
```

Los nombres deben coincidir con barrios existentes. Un propietario administra todos los barrios; un administrador solo los asignados. La baja de una membresía bloquea las siguientes operaciones, aunque quede una cookie de sesión. Para revocar una cuenta, quitá la membresía y revocá sus sesiones en Auth.

## 2. Configurar Netlify

Usá el despliegue conectado al repositorio con `netlify.toml`. **Arrastrar únicamente `dist/` a Netlify no publica las funciones** y no sirve para activar este backend.

En Site configuration → Environment variables agregá estas variables **privadas del servidor**, disponibles para Functions/runtime, sin prefijo `VITE_`:

| Variable | Valor |
| --- | --- |
| `SUPABASE_URL` | Origen HTTPS del proyecto, por ejemplo `https://proyecto.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key de Supabase; se acepta también `SUPABASE_ANON_KEY` |
| `SUPABASE_SECRET_KEY` | Secret key del servidor; se acepta también `SUPABASE_SERVICE_ROLE_KEY` |
| `TBC_SESSION_SECRET` | 32 bytes aleatorios, base64url o 64 caracteres hexadecimales |
| `TBC_SITE_ORIGIN` | Origen HTTPS exacto del sitio, sin barra final, ruta, query ni hash |

Generá el secreto de sesión en tu equipo y pegalo directamente en el campo privado de Netlify:

```bash
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64url'))"
```

No lo agregues a Git, al navegador ni al chat. Cambiarlo cierra las sesiones existentes. La service key permite operaciones privilegiadas: nunca la publiques. `.env.example` contiene solo marcadores.

Redesplegá después de configurar las variables. Comprobá primero en un sitio de prueba con su propio `TBC_SITE_ORIGIN`. Las previews de Netlify tienen otro origen: necesitan configuración acorde y una base de prueba; las escrituras rechazan orígenes distintos.

Si Netlify devuelve **401/Login Redirect antes de mostrar la app**, revisá la protección de acceso del sitio desde la cuenta propietaria. Esa barrera pertenece al proveedor; el código de la app no puede desactivarla. No se verificó un despliegue público de esta versión desde este entorno.

## 3. Ingresar y publicar

1. Abrí `https://TU-SITIO/gestion`. Ingresá con la cuenta de Auth habilitada como propietario. No se usa una contraseña guardada en el frontend.
2. Configuración permite editar marca, presentación, WhatsApp, barrios y rubros. Los usuarios públicos solo seleccionan un barrio desde el único desplegable. Guardar configuración exige confirmación y la actualiza para todos.
3. Creá un comercio real: dirección, coordenadas comprobadas, horario, contacto, prestaciones, servicios/precios y fotos autorizadas. Se guarda como **borrador privado**.
4. Abrí Vista previa → Publicar esta versión → Confirmar. Solo entonces aparece en `/api/catalog` y en los dispositivos con conexión.
5. Editar una ficha publicada conserva la versión pública hasta publicar el nuevo borrador. Los conflictos de versión devuelven 409: cerrá el editor, recargá y revisá los cambios antes de guardar otra vez.
6. Historial muestra las últimas 50 versiones. Restaurar crea un borrador nuevo; nunca publica automáticamente. Archivar retira el comercio del catálogo y conserva su historial.
7. Solicitudes de alta/corrección entran en una bandeja privada. Aprobar requiere completar y revisar la ficha y crea un borrador. Las notas son internas, sin mensajes automáticos al solicitante. Se muestran hasta 100 solicitudes pendientes, atendiendo primero las más antiguas; el máximo de pendientes es 500.
8. Calidad de datos muestra faltantes, datos por confirmar, revisiones de más de 90 días y posibles duplicados. No elimina ni certifica comercios automáticamente. Las fechas especiales reemplazan el horario semanal en la zona horaria argentina.

Se conserva la demo DEV y sus copias JSON locales por compatibilidad. No se suben esos datos al servidor automáticamente: revisá su veracidad antes de cargarlos. La gestión compartida puede exportar una copia JSON de las fichas de trabajo; no incluye contactos privados de solicitudes. Los respaldos de la base y la retención del historial se administran desde Supabase según tu plan.

## 4. Comprobaciones de activación

- `/api/config` responde JSON con `configured:true, mode:"live"`; `/api/catalog` devuelve solo fichas publicadas.
- Sin sesión, `/api/admin/catalog` responde 401. Un usuario Auth sin membresía no administra datos. Las tablas no permiten acceso directo a `anon`/`authenticated` y las funciones de escritura son exclusivas del servidor.
- Una solicitud recibida aparece solo en la bandeja privada. Ningún borrador ni contacto privado aparece en el JSON público.
- Una foto subida es privada hasta estar referenciada por una versión publicada. JPEG/PNG/WebP de hasta 5 MB y 32 MP se convierten a WebP, se reducen a 1920 px y pierden metadatos. Las fotos externas por URL se cargan directamente en el navegador; el servidor no visita URLs indicadas por usuarios.
- Las sesiones usan cookies cifradas HttpOnly, SameSite=Strict y Secure en producción; vencen a las 8 horas. Los tokens de Auth no se devuelven al navegador ni se guardan en localStorage. Las escrituras administrativas exigen origen exacto y token CSRF en memoria.
- Si una cuenta tiene un factor TOTP verificado en Supabase, la gestión pide sus seis dígitos y bloquea acceso privado hasta AAL2. El alta/recuperación de factores se administra con las herramientas de Supabase, fuera de esta interfaz.
- Las solicitudes tienen consentimiento, campo trampa, desafío de un solo uso y límites persistentes por IP (5 envíos/hora). Login: 10 intentos/15 min; MFA: 6/15 min; fotos: 30/hora. Son controles de abuso, no una garantía de bloquear todos los bots. No se almacena la IP en claro: se usa HMAC. Hay límites de catálogo de 2000 registros y 2 MB por conjunto público/de trabajo.
- API, solicitudes, sesiones, imágenes privadas y `/gestion` no se guardan en el service worker. Solo se conserva una copia pública validada del catálogo para consulta sin conexión. Favoritos y barrio siguen siendo locales.

## 5. Web y aplicaciones

`npm run dev` sigue iniciando Vite en el puerto **3000**, con demo local. Vite solo no ejecuta Netlify Functions. Para probar la integración real usá Netlify CLI (`netlify dev`) con variables privadas en tu entorno, o un despliegue de prueba. La configuración local inicia Vite en 3000 y usa Netlify como entrada en 8888: detené antes cualquier Vite existente y configurá `TBC_SITE_ORIGIN=http://localhost:8888` (Netlify CLI indica `NETLIFY_DEV=true`; la excepción HTTP solo se admite para localhost/127.0.0.1). Usá siempre el origen exacto del servidor de entrada en `TBC_SITE_ORIGIN`; en Netlify remoto debe ser HTTPS.

Las aplicaciones de usuarios consultan el origen `publicUrl` de `app.config.json`; no incluyen el portal administrativo ni claves de Supabase. Si cambiás de dominio, actualizá `publicUrl`, la lista `connect-src` de `security/headers.json`, generá QR y recompilá/sincronizá los proyectos. El servidor acepta solicitudes públicas desde los orígenes locales de Capacitor, sin cookies de administrador.

## 6. Validación y operación

```bash
npm ci
npm test
npm run build
npm run build:mobile
npm run test:e2e
npm audit --audit-level=moderate
```

Las pruebas usan Postgres real en WASM (PGlite) con un proveedor de identidad de prueba y servidor HTTP limitado a `127.0.0.1`. Esos módulos no se importan en producción. Verifican migración, permisos, conflictos, borradores, publicación, historial, moderación, fotos, MFA y el recorrido de navegador. No sustituyen las comprobaciones contra un proyecto Supabase/Netlify real, sus políticas de cuenta ni pruebas en teléfonos.

Revisá periódicamente solicitudes, logs de Auth/Functions sin registrar contraseñas/tokens, uso de almacenamiento, copias de seguridad y membresías. Definí con el propietario la retención de solicitudes resueltas, contactos privados, versiones y medios huérfanos; no se elimina información del cliente automáticamente. Mantené actualizadas las dependencias. La prueba de seguridad no equivale a garantizar ausencia de vulnerabilidades.
