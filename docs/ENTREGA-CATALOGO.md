# Búsqueda, fichas y publicación revisada

Implementación de las mejoras aprobadas 01, 02, 07, 13 y 14. Se conserva el diseño Cobalto urbano, la tipografía grande, las imágenes de ejemplo y el único desplegable de barrios. Los usuarios no crean ni eliminan zonas.

| Mejora | Qué incorpora |
| --- | --- |
| 01 | Autocompletado de comercios, rubros y servicios existentes; filtros de prestaciones confirmadas y alternativas reales cuando no hay resultados. |
| 02 | Galería de fotos autorizadas, carga segura de imágenes, servicios/precios con condiciones y fecha/campos de revisión. |
| 07 | Solicitudes de alta y correcciones en barrios habilitados; bandeja privada, revisión con notas y aprobación a borrador. |
| 13 | Control de datos faltantes, revisiones antiguas, posibles duplicados y fechas especiales que reemplazan el horario semanal. |
| 14 | Borradores privados, vista previa de ancho móvil, comparación con lo publicado, publicación explícita y restauración a un nuevo borrador desde el historial. |

La gestión web está en `/gestion` y se preparó para Supabase Auth/Postgres y Netlify Functions. La app móvil solo incluye la búsqueda y los formularios públicos. No se introducen pagos, turnos automáticos, cupones ni notificaciones: corresponden a propuestas no seleccionadas.

## Estado de activación

La integración está probada localmente; **no está conectada a una cuenta Supabase ni publicada como una nueva versión del sitio actual**. Sin variables privadas y membresía de propietario, las escrituras quedan bloqueadas. No se simula una base compartida con localStorage.

[Crear proyecto y activar Supabase/Netlify](SUPABASE.md). El siguiente paso externo es crear el proyecto desde la cuenta del propietario, ejecutar las dos migraciones y configurar las variables privadas en Netlify. No se deben enviar contraseñas ni service keys por chat.

El sitio Netlify actual respondió HTTP 401 en la comprobación de esta entrega. La protección de acceso se administra en la cuenta propietaria del proveedor; esa respuesta no verifica este build.

## Capturas

Estas vistas se generaron con datos y cuentas de prueba locales. No muestran comercios verificados ni usuarios reales.

- [Dashboard de escritorio](diseno/catalogo-dashboard-escritorio.png).
- [Dashboard móvil](diseno/catalogo-dashboard-movil.png).
- [Ficha ampliada móvil](diseno/catalogo-ficha-movil.png).

## Comprobaciones

- 88 pruebas unitarias/SQL/API: validación, permisos por barrio, RLS, almacenamiento privado, sesiones, MFA, CSRF, moderación, versiones y horarios.
- 57 pruebas de navegador: escritorio, celular, paquete de usuarios, demo compatible y recorrido de solicitud → borrador → vista previa → publicación desde una sesión separada.
- `npm run build`, compilación móvil y verificación de bundles sin demo, secretos, identidad de prueba ni source maps.
- Bundle de Netlify Functions generado y comprobado sin configuración: falla cerrado.
- `npm audit --audit-level=moderate`: sin vulnerabilidades conocidas reportadas.
- `npm run dev`: Vite responde HTTP 200 en el puerto 3000.
- APK debug actualizado y firma verificada, en `artifacts/android/tu-barrio-cerca-debug.apk`; proyecto iOS sincronizado. No se generó una IPA ni una publicación de tiendas: requieren Mac/Xcode, cuentas y firma del propietario.

Las pruebas locales de Postgres e identidad no sustituyen las comprobaciones de activación contra Supabase/Netlify reales ni las pruebas en dispositivos físicos.
