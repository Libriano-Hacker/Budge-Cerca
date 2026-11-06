# Seguridad de Tu Barrio Cerca

La versión pública es un buscador estático de demostración. No ofrece una API de escritura, cuentas, pagos ni un catálogo compartido. El dashboard demo **solo se habilita en desarrollo** (`npm run dev`), y sus cambios permanecen en ese navegador. Los builds web y móvil excluyen su código; un indicador de rol en localStorage o una URL no habilita administración.

Esto desactiva la herramienta de prueba en producción, pero **no implementa autenticación de administrador**. Para administrar datos compartidos hay que conectar un servidor con autenticación, autorización por barrio y validación del lado del servidor antes de habilitar operaciones de escritura. Un control en JavaScript no sustituye esos permisos.

## Controles incluidos

- Esquema cerrado y acotado para copias y datos locales, validación de Unicode, teléfonos, coordenadas, horarios, colores e identificadores. Los archivos se limitan a 2 MB y el texto a 2 millones de unidades UTF-16 antes de `JSON.parse`.
- React y marcadores Leaflet tratan nombres/descripciones como texto. Las búsquedas de iconos y fotos solo usan propiedades propias del catálogo de componentes.
- Imágenes y descargas validan HTTPS, credenciales, dominio y puerto; se rechazan IPs literales y nombres locales conocidos. No hay un proxy de imágenes ni solicitudes de un servidor a esas URLs. La validación de nombres no resuelve DNS ni garantiza controlar redirecciones externas.
- CSP en el HTML compilado y encabezados HTTP para Netlify: JavaScript de origen propio, sin scripts inline ni `eval`, sin objetos/iframes y con destinos de red limitados. Los estilos inline siguen habilitados porque React, Leaflet y la escena los usan; no habilitan scripts inline.
- Protección contra framing, MIME sniffing y envío de Referer. GPS limitado al propio origen; cámara, micrófono, pagos y USB denegados en la web.
- Service worker limitado a documentos y recursos públicos concretos; no almacena APIs, rutas administrativas, queries, redirecciones o respuestas `private`/`no-store`. El caché anterior se invalida.
- Android: HTTP/contenido mixto, backups, transferencias, inspección WebView, logs y acceso arbitrario a archivos desactivados. FileProvider limitado a directorios propios. iOS: ATS sin excepciones, intercambio de archivos e inspección WebView desactivados. Ubicación solo a pedido, sin seguimiento en segundo plano.
- Dependencias fijadas por lockfile, corrección acotada de la cadena `xcode → uuid`, auditoría de dependencias en CI con permisos de lectura y acciones fijadas por SHA. Las descargas del toolchain usan HTTPS y checksums.

## Validación reproducible

```bash
npm ci
npm run security:check
```

Requiere Node.js 22.12+ y Chromium (por defecto `/usr/bin/chromium`; se puede indicar `PLAYWRIGHT_CHROMIUM_EXECUTABLE`). El comando audita dependencias, ejecuta pruebas unitarias, compila web/usuarios y corre las pruebas de navegador. Las herramientas del dashboard se prueban por separado en el servidor DEV local de 4181. Los builds públicos se prueban en 4173/4180 con la CSP real, y el postbuild rechaza código de administración demo o source maps.

`npm run android:debug` compila y verifica un APK de desarrollo; **no es un release para distribuir**. Las pruebas en dispositivos, la compilación iOS en Mac y la firma de releases pertenecen a una validación adicional. No almacenar claves de firma ni tokens en el repositorio o en variables `VITE_*`, que son públicas en el navegador.

## Operación y publicación

`security/headers.json` es la fuente de los encabezados; `npm run generate:security` actualiza `public/_headers`. Netlify usa ese archivo y `public/_redirects`. Otro hosting debe reproducir esos encabezados y los 404 de rutas reservadas; el meta CSP no puede aplicar `frame-ancestors`, HSTS ni los demás encabezados de respuesta.

No exponer el servidor de desarrollo como sitio de producción. Los cambios locales previos se conservan, pero no deben tomarse como un catálogo confiable para otras personas. Datos públicos y configuración de contacto son visibles por diseño; no se deben incluir secretos ni datos privados de clientes en `src/data.ts` o archivos de `public/`.

La protección de cuenta y del proyecto en GitHub/Netlify, los registros de acceso y las políticas de publicación requieren acceso del propietario. No se han cambiado esas políticas con credenciales inexistentes. Mantener MFA, acceso mínimo y revisión de cambios al operar esas cuentas. Si se agregan sesiones o APIs, revisar nuevamente autorización, CSRF, caché y rate limiting antes de publicarlas.

## Informe de revisión

[Alcance, hallazgos, evidencia y pendientes de la revisión del 6 de noviembre de 2026](docs/SEGURIDAD.md).

Para informar un problema, compartir una reproducción mínima por un canal privado del propietario, sin credenciales ni datos personales en issues públicos. No publicar detalles de explotación antes de corregir y verificar el problema.
