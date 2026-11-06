# Tu Barrio Cerca

Guía de comercios y servicios con marca **Tu Barrio Cerca** y eslogan **«Conectá con lo que te rodea»**. Prototipo web instalable (PWA) y proyectos de usuarios para Android/iPhone con Capacitor. Los builds públicos web y móvil excluyen el dashboard demo, que solo está disponible en desarrollo.

La propuesta **A · Cobalto urbano** está implementada junto con los proyectos móviles. La publicación web y la distribución en tiendas se verifican por separado. [Aplicaciones, APK de pruebas y QR](docs/APLICACIONES.md).

## Desarrollo

Requiere Node.js 22.12+ (probado con Node 24.19.0) y npm. Desde `/workspace/Budge-Cerca`:

```bash
npm ci --cache /workspace/.npm-cache
npm run dev
```

El servidor de desarrollo escucha en `0.0.0.0:3000`. El puerto es fijo: si ya está ocupado, el comando informa el error en lugar de cambiar silenciosamente de puerto. No se requieren claves ni servicios privados. La vista «Dashboard demo» permite probar la administración de negocios, promociones, rubros, destacados, marca, barrios y WhatsApp del creador. Solo se habilita en DEV, sin autenticación real y con datos de ese navegador; no se debe exponer el servidor DEV como sitio de producción.

```bash
npm test          # Lógica de búsqueda, distancia, horarios, enlaces y copias
npm run build    # Producción pública + CSP y verificación sin dashboard
npm run build:mobile # Compilación de usuarios sin dashboard (dist-mobile)
npm run preview  # Sirve dist en el puerto 3000 (detener antes el servidor dev)
npm run test:e2e # Flujos de navegador en escritorio y celular, sobre dist
```

Las pruebas E2E usan Chromium en `/usr/bin/chromium` en este entorno. En otro equipo, indicá su ruta con `PLAYWRIGHT_CHROMIUM_EXECUTABLE` al ejecutar el comando. Ejecutá ambos builds antes de E2E; las pruebas abren vistas previas públicas en 4173/4180 y una demo DEV local en 4181 para probar administración.

## Publicación en Netlify

La conexión de GitHub solo puede publicar archivos que se hayan subido al repositorio remoto. Los cambios que están únicamente en este entorno no llegan a Netlify.

El archivo `netlify.toml` configura Node.js 24, el comando `npm run build` y la carpeta de publicación `dist`. La carpeta base debe ser la raíz del repositorio: dejala vacía en Netlify, salvo que hayas movido el proyecto a una subcarpeta del repositorio remoto. El nombre local `/workspace/Budge-Cerca` no es una subcarpeta que debas indicar como base en Netlify.

Para una publicación manual, ejecutá `npm ci` y `npm run build`, y subí **el contenido compilado de `dist`**, que debe contener `index.html` y la carpeta `assets`. No subas `src` ni el `index.html` fuente: el navegador no ejecuta TypeScript/TSX directamente. Las reglas de navegación de `public/_redirects` se copian automáticamente al build.

Para probar el resultado publicado, abrí la URL HTTPS del sitio y comprobá que el HTML carga `/assets/*.js`, que esos archivos responden con JavaScript y que el buscador devuelve comercios. `npm run dev` y el puerto 3000 se usan para desarrollo; Netlify sirve la compilación estática.

## Alcance actual

- Un único selector desplegable para elegir el barrio de búsqueda y recordar la selección en este navegador. Las altas y bajas se prueban en DEV, Dashboard → Barrios; los barrios con comercios requieren reasignarlos antes de eliminarlos.
- Cada comercio se asigna a un barrio desde el dashboard. Búsqueda, destacados, promociones y mapa muestran únicamente el barrio seleccionado. Las zonas sin comercios cargados lo indican.
- Buscador por nombre, rubro o dirección, sin distinguir tildes ni mayúsculas.
- Rubros ampliados: barberías, centros de spa, peluquerías, estética y uñas, farmacias, veterinarias, pet shops, gimnasios, ópticas, odontología, lavanderías, tecnología, oficios y más.
- Comercios destacados, favoritos y filtro de abiertos según la hora de Argentina.
- Fichas con dirección, WhatsApp, horarios por día y promociones.
- GPS optativo: orden por cercanía y distancias en línea recta; recorridos mediante Google Maps.
- Mapa de OpenStreetMap con marcadores y aviso si la red bloquea sus imágenes.
- Dashboard de desarrollo con alta, edición y eliminación de locales y categorías; importación/exportación de copias JSON validadas.
- Diseño adaptable e instalación desde navegadores compatibles mediante manifiesto y service worker. Se necesita HTTPS para GPS e instalación fuera del entorno local.

La propuesta A usa fondo azul noche, acentos cobalto, paneles de vidrio, controles con relieve y tipografía Manrope grande, alojada localmente. La portada muestra una calle comercial ilustrativa al anochecer, tarjetas flotantes, barra de progreso y aparición de secciones al desplazarse. «Explorar en 3D» activa una escena con Three.js que responde al puntero y al scroll. Se puede pausar; se respeta `prefers-reduced-motion` y hay una alternativa visual si WebGL no está disponible. La animación se detiene fuera de pantalla y cuando la pestaña está oculta.

Las imágenes predeterminadas son ilustrativas, generadas para los comercios de ejemplo; no son fotos reales de esos locales. Están almacenadas en `public/media/comercios-atlas.png` y se muestran por rubro sin depender de servidores de imágenes. El dashboard permite asignar una foto propia mediante un enlace HTTPS directo. Si esa foto no carga, se conserva la imagen ilustrativa. Las copias y datos anteriores siguen siendo compatibles.

La imagen de portada está en `public/media/cobalto-barrio.png`. [Vista de escritorio](docs/diseno/cobalto-escritorio.png), [vista móvil](docs/diseno/cobalto-celular.png) y [página de instalación con QR](docs/diseno/descargas-escritorio.png).

React, TypeScript, Vite, Three.js, Leaflet y Lucide forman la base técnica. El módulo 3D y el mapa se descargan por separado; la interfaz principal permanece disponible mientras se cargan.

## Datos y limitaciones

**Los comercios iniciales son ejemplos.** Sus direcciones y posiciones son ilustrativas, y sus números de WhatsApp no están configurados. El contacto del creador está configurado con el número solicitado.

Las versiones anteriores con la marca original se actualizan automáticamente a Tu Barrio Cerca. Se conservan comercios, promociones, imágenes, favoritos y marcas personalizadas. El nombre geográfico retirado se reemplaza por «Barrio Centro» en los datos de ejemplo y guardados. Los demás barrios personalizados se conservan. No se agregan de nuevo negocios, barrios o rubros que el creador elimine después de la migración. Las claves internas de almacenamiento se mantienen por compatibilidad.

Los datos y favoritos se guardan en `localStorage` **solo en este navegador**. Los cambios no se sincronizan entre personas, dispositivos o barrios. Borrar los datos del navegador los elimina: exportá una copia desde el dashboard. El GPS se conserva solo en memoria y no se exporta ni almacena.

**El dashboard demo no se incluye en producción y no es un login administrativo.** Para administrar datos compartidos se necesita un backend, base de datos, autenticación y autorización del lado del servidor. Las funciones de escritura permanecen fuera de la versión pública hasta contar con esos controles.

Las promociones no vencen automáticamente; cargá sus condiciones y actualizalas desde el dashboard. La aplicación no realiza pagos, no envía mensajes automáticamente y no incluye valoraciones inventadas.

Conexiones externas: `tile.openstreetmap.org` para el mapa; `www.openstreetmap.org` para atribución; `www.google.com` para recorridos; `wa.me` para contactos. Los enlaces a WhatsApp y Google Maps se abren al accionarlos. La app sigue permitiendo búsqueda y administración local si esos servicios no están disponibles.

La PWA conserva la interfaz visitada después de una carga con conexión; los servicios externos necesitan Internet. Los procesos no sobreviven a la restauración del entorno: se debe volver a iniciar el servidor. Cada tarea ya está aislada; no es necesario crear un Git worktree.

[Propuesta visual, cinco mejoras y próximos pasos](docs/PRODUCTO.md).

[Controles y validación de seguridad](SECURITY.md) · [Informe del paso 1](docs/SEGURIDAD.md).
