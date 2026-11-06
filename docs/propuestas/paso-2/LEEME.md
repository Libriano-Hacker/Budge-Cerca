# Cómo revisar esta propuesta

Son **14 propuestas y cuatro pantallas de referencia**. No se modificó la aplicación ni se publicó una nueva versión del sitio. Todo está separado en la rama `proposal/phase-2-improvements` y en esta carpeta de documentación.

## Para elegir

1. Revisá las imágenes de `pantallas/` y el detalle de [las 14 propuestas](PASO-2.md).
2. Opcionalmente, descargá `propuesta-revision.zip` y extraelo. `propuesta.html` contiene el bosquejo interactivo, imágenes y tipografía en un solo archivo.
3. Si tu navegador permite abrir el HTML, podés cambiar de pantalla, abrir cada mejora, simular una solicitud y marcar «Me interesa» o «Por ahora no». «Copiar selección» prepara un texto para pegar en el chat. Si el teléfono solo muestra una vista previa del archivo, las imágenes PNG permiten revisar las mismas pantallas.
4. También podés responder directamente con números: por ejemplo, «Aprobar 01, 02 y 14; ajustar 03; descartar 05».

Las preferencias guardadas aquí son apuntes de revisión: no publican contenido ni habilitan cambios automáticamente. Los turnos, beneficios, métricas, perfiles y estados son ficticios. No se envían mensajes, no se crean cuentas y no hay códigos QR de canje válidos.

## Para reproducir el bosquejo desde el repositorio

Desde la raíz, con las dependencias del proyecto instaladas:

```bash
node docs/propuestas/paso-2/export.mjs
python3 -m http.server 4300 --bind 127.0.0.1 --directory artifacts/propuesta-paso-2
```

En otra terminal:

```bash
node docs/propuestas/paso-2/check.mjs
```

La exportación genera un preview separado en `artifacts/propuesta-paso-2/` y un HTML autocontenido. El control usa Chromium/Playwright e inspecciona cuatro paneles en 360, 412 y 1440 px, selección persistente, vista previa, simulaciones y ausencia de solicitudes externas. Se comprobó el documento autocontenido servido por HTTP local y su funcionamiento sin red después de cargarlo; este entorno administrado bloquea la navegación directa a `file://`.

No se cambiaron `src/`, `public/`, el dashboard real, los proyectos Android/iOS, las dependencias ni los scripts de compilación de la aplicación. El catálogo compartido y el acceso administrativo seguro siguen siendo una base previa pendiente, no una función implementada por este bosquejo.
