# Budge Cerca

Guía de comercios para **Ing.Budge**, adaptable a otros barrios. Primer prototipo de una app web instalable (PWA), con buscador público y dashboard de demostración.

## Desarrollo

Requiere Node.js 22.12+ (probado con Node 24.19.0) y npm. Desde `/workspace/Budge-Cerca`:

```bash
npm ci --cache /workspace/.npm-cache
npm run dev
```

El servidor de desarrollo escucha en `0.0.0.0:3000`. El puerto es fijo: si ya está ocupado, el comando informa el error en lugar de cambiar silenciosamente de puerto. No se requieren claves ni servicios privados. La vista «Dashboard demo» permite administrar negocios, promociones, rubros, destacados, nombre de la app, nombre del barrio y WhatsApp del creador.

```bash
npm test          # Lógica de búsqueda, distancia, horarios, enlaces y copias
npm run build    # TypeScript + compilación de producción
npm run preview  # Sirve dist en el puerto 3000 (detener antes el servidor dev)
npm run test:e2e # Flujos de navegador en escritorio y celular, sobre dist
```

Las pruebas E2E usan Chromium en `/usr/bin/chromium` en este entorno. En otro equipo, indicá su ruta con `PLAYWRIGHT_CHROMIUM_EXECUTABLE` al ejecutar el comando. Ejecutá el build antes de E2E.

## Publicación en Netlify

La conexión de GitHub solo puede publicar archivos que se hayan subido al repositorio remoto. Los cambios que están únicamente en este entorno no llegan a Netlify.

El archivo `netlify.toml` configura Node.js 24, el comando `npm run build` y la carpeta de publicación `dist`. La carpeta base debe ser la raíz del repositorio: dejala vacía en Netlify, salvo que hayas movido el proyecto a una subcarpeta del repositorio remoto. El nombre local `/workspace/Budge-Cerca` no es una subcarpeta que debas indicar como base en Netlify.

Para una publicación manual, ejecutá `npm ci` y `npm run build`, y subí **el contenido compilado de `dist`**, que debe contener `index.html` y la carpeta `assets`. No subas `src` ni el `index.html` fuente: el navegador no ejecuta TypeScript/TSX directamente. Las reglas de navegación de `public/_redirects` se copian automáticamente al build.

Para probar el resultado publicado, abrí la URL HTTPS del sitio y comprobá que el HTML carga `/assets/*.js`, que esos archivos responden con JavaScript y que el buscador devuelve comercios. `npm run dev` y el puerto 3000 se usan para desarrollo; Netlify sirve la compilación estática.

## Alcance actual

- Buscador por nombre, rubro o dirección, sin distinguir tildes ni mayúsculas.
- Comercios destacados, favoritos y filtro de abiertos según la hora de Argentina.
- Fichas con dirección, WhatsApp, horarios por día y promociones.
- GPS optativo: orden por cercanía y distancias en línea recta; recorridos mediante Google Maps.
- Mapa de OpenStreetMap con marcadores y aviso si la red bloquea sus imágenes.
- Dashboard con alta, edición y eliminación de locales y categorías; importación/exportación de copias JSON validadas.
- Diseño adaptable e instalación desde navegadores compatibles mediante manifiesto y service worker. Se necesita HTTPS para GPS e instalación fuera del entorno local.

La interfaz usa ilustraciones SVG locales; no depende de servidores de imágenes ni tipografías externas. React, TypeScript, Vite, Leaflet y Lucide forman la base técnica. El mapa se descarga por separado al abrir esa vista.

## Datos y limitaciones

**Los comercios iniciales son ejemplos.** Sus direcciones y posiciones son ilustrativas, y sus números de WhatsApp no están configurados. El contacto del creador está configurado con el número solicitado.

Los datos y favoritos se guardan en `localStorage` **solo en este navegador**. Los cambios no se sincronizan entre personas, dispositivos o barrios. Borrar los datos del navegador los elimina: exportá una copia desde el dashboard. El GPS se conserva solo en memoria y no se exporta ni almacena.

**El dashboard es una demo pública, sin autenticación.** Para producción se necesita un backend, base de datos, inicio de sesión y autorización del lado del servidor. No se publica automáticamente ni en la web ni en tiendas.

Las promociones no vencen automáticamente; cargá sus condiciones y actualizalas desde el dashboard. La aplicación no realiza pagos, no envía mensajes automáticamente y no incluye valoraciones inventadas.

Conexiones externas: `tile.openstreetmap.org` para el mapa; `www.openstreetmap.org` para atribución; `www.google.com` para recorridos; `wa.me` para contactos. Los enlaces a WhatsApp y Google Maps se abren al accionarlos. La app sigue permitiendo búsqueda y administración local si esos servicios no están disponibles.

La PWA conserva la interfaz visitada después de una carga con conexión; los servicios externos necesitan Internet. Los procesos no sobreviven a la restauración del entorno: se debe volver a iniciar el servidor. Cada tarea ya está aislada; no es necesario crear un Git worktree.

[Propuesta visual, cinco mejoras y próximos pasos](docs/PRODUCTO.md).
