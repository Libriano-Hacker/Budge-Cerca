# Aplicaciones de Tu Barrio Cerca

Propuesta **A · Cobalto urbano**, versión **0.1.0**, preparada en `feat/cobalt-mobile-apps`. Los cambios no se publicaron en Netlify ni se subieron a `main`, respetando la indicación de revisar primero el diseño. Los proyectos nativos usan Capacitor y los mismos componentes del buscador.

## Entregables y estado

| Entregable         | Estado                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Diseño A           | Implementado: azul noche/cobalto, portada fotográfica ilustrativa, vidrio, letras grandes y 3D opcional.                              |
| Android            | Proyecto `android/`; APK de pruebas compilado y firma debug verificada. Android 7+ (API 24); destino API 36.                          |
| iPhone             | Proyecto `ios/App/App.xcodeproj`, recursos y plugins sincronizados. iOS 15+. Todavía sin compilación ni firma: este entorno es Linux. |
| QR                 | PNG de 1024 px y SVG, generados con una biblioteca QR y decodificados en una prueba independiente.                                    |
| Descargas públicas | Pendientes de publicación. No hay ficha de Google Play, App Store, TestFlight ni APK público configurados.                            |

La app de usuarios tiene búsqueda, selección de barrio, fichas, promociones, favoritos y GPS solicitado al tocar el botón. No incluye los controles del dashboard. Los enlaces externos se abren con el navegador del dispositivo y Android tiene manejo del botón Atrás. No se pide ubicación en segundo plano.

El catálogo sigue siendo una **demostración local**: los comercios, coordenadas y fotografías son ilustrativos. No hay base de datos compartida, servidor de catálogo ni autenticación administrativa. Los cambios de la web no llegan automáticamente a los teléfonos. La ubicación se mantiene en memoria; favoritos y selección de barrio se guardan en cada dispositivo. Ocultar el dashboard en el paquete móvil no sustituye la autorización de un futuro servidor.

## Desarrollo y pruebas

Requiere Node.js 22.12+ y npm; validado con Node 24.19.0. Desde la raíz:

```bash
npm ci
npm run dev                 # 0.0.0.0:3000, puerto fijo
npm test
npm run build               # dist: web con dashboard demo
npm run build:mobile        # dist-mobile: app de usuarios
npm run test:e2e             # necesita ambos builds y Chromium
npm run mobile:sync         # recompila usuarios y sincroniza Android + iOS
```

Las pruebas E2E usan Chromium en `/usr/bin/chromium`; otra ubicación se indica mediante `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Las vistas de prueba escuchan en 4173 y 4180. Se verificaron 18 pruebas unitarias y 32 de navegador, incluido el paquete móvil sin dashboard, GPS del navegador, persistencia de favoritos y la página de descargas. Estas pruebas no equivalen a ejecutar la app en un teléfono real.

Los iconos y pantallas de inicio ya están incluidos en los proyectos. Para regenerarlos desde la imagen `resources/logo.png`:

```bash
npm run assets:mobile
```

## Android: preparar herramientas y generar APK de pruebas

En este entorno Linux x64 se instaló y verificó JDK 21 y Android SDK 36 en `/workspace/.mobile-tools`, fuera del repositorio:

```bash
npm run setup:android
npm run android:debug
```

El instalador requiere `curl`, `tar` y Python 3. Descarga desde los proveedores oficiales, verifica los checksums fijados en `scripts/android-toolchain.json` y acepta las licencias del SDK para el entorno de desarrollo. Instala plataformas Android 36, platform-tools y build-tools 35/36. El wrapper verifica el SHA-256 oficial de Gradle 8.14.3.

Si el entorno proporciona una CA pública de proxy, se agrega a una copia local del almacén de confianza de Java. No se deshabilita TLS. Los ajustes de proxy y la confianza quedan fuera del repositorio y no se empaquetan en la app.

`scripts/android-env.sh` activa las herramientas. `android:debug` lo carga automáticamente. Para ejecutar Gradle o ADB manualmente:

```bash
source scripts/android-env.sh
```

En otros equipos, usar Android Studio con JDK 21 y SDK 36; configurar `JAVA_HOME` y `ANDROID_HOME`. `TBC_JAVA_HOME`, `TBC_ANDROID_HOME` y `TBC_TOOLS_ROOT` permiten personalizar las rutas sin modificar archivos del sistema.

El build produce:

```text
artifacts/android/tu-barrio-cerca-debug.apk
artifacts/android/tu-barrio-cerca-debug.apk.sha256
```

El script verifica la firma con `apksigner`. Para instalar la prueba mediante USB en un dispositivo conectado y autorizado:

```bash
adb install -r artifacts/android/tu-barrio-cerca-debug.apk
```

Es un **APK debug**, con depuración y firma de desarrollo, para probar en dispositivos propios. No es un lanzamiento de Google Play. La distribución a vecinos requiere generar un release firmado con una clave del propietario, probarlo y publicar el archivo o la ficha correspondiente. No se incluyeron certificados, claves privadas ni perfiles de firma en Git.

## iPhone: abrir y compilar en Mac

Se necesitan macOS, una versión de Xcode compatible con Capacitor 8 y las herramientas de línea de comandos de Xcode. Tras clonar esta rama y ejecutar `npm ci`:

```bash
npm run build:mobile
npx cap sync ios
npm run ios:open
```

En Xcode, seleccionar el equipo de firma, revisar el identificador de app y ejecutar en simulador o iPhone. Para distribución por TestFlight/App Store se necesita Apple Developer y un archivo firmado desde Xcode. No se generó un `.ipa` en Linux.

`Info.plist` contiene descripciones de uso de ubicación en español. El plugin requiere ambas entradas de descripción de ubicación, pero la app solamente solicita una posición al accionarlo y no usa seguimiento en segundo plano. Validar permisos y navegación en un iPhone real antes de distribuir.

## QR y página de instalación

`app.config.json` centraliza el nombre, el identificador provisorio `com.tubarriocerca.app`, la URL pública y los enlaces de distribución. Antes de crear fichas de tiendas, confirmar que el identificador pertenece al propietario. Si se cambia, actualizar también `applicationId`/`namespace` de Android y `PRODUCT_BUNDLE_IDENTIFIER` de Xcode; editar solo el JSON no renombra proyectos ya creados.

El QR actual apunta a:

```text
https://ubiquitous-moxie-da14db.netlify.app/descargar
```

Archivos:

```text
public/descargas/tu-barrio-cerca-qr.png
public/descargas/tu-barrio-cerca-qr.svg
public/descargas/destino.json
```

**El QR todavía no habilita una descarga pública.** La página nueva no está publicada. En la comprobación de este trabajo, el sitio de Netlify respondió HTTP 401 y exigió acceso. Debe habilitarse el acceso público antes de entregar o imprimir el QR. Los archivos del espacio de trabajo tampoco son enlaces de descarga accesibles desde un teléfono.

Después de autorizar la publicación:

1. Publicar y comprobar `/descargar` en el sitio público, sin sesión de Netlify ni cookies previas. La página ya está incluida en `dist` y las reglas SPA existentes cubren su ruta.
2. Publicar un release Android firmado, Google Play y/o App Store. Cargar únicamente las URLs reales en `distribution.googlePlayUrl`, `distribution.appStoreUrl` y `distribution.androidApkUrl`. Los campos están vacíos para no mostrar enlaces inexistentes.
3. Ejecutar `npm run build` para regenerar el QR y el sitio. Si cambia el dominio, cambiar primero `publicUrl` y volver a generar el QR. No imprimir los códigos del dominio anterior.
4. Escanear desde Android y Safari/iPhone sin estar autenticado. Comprobar el destino, las descargas, la instalación web y el tamaño de impresión. El QR abre la página; no instala automáticamente.

El mismo QR podrá dirigir a las dos tiendas sin reimprimirse, mientras se conserve la URL de la página. La instalación web desde Chrome o Safari también requiere que el sitio esté publicado con acceso público mediante HTTPS.

## Verificación y trabajo pendiente

Se ejecutaron el build web y móvil, sincronización Capacitor de ambas plataformas, build Android `assembleDebug`, verificación de firma y metadatos del APK, decodificación del QR, 50 pruebas automatizadas e inspección visual de escritorio/celular sin desbordamiento horizontal. El desarrollo escucha en el puerto 3000.

Falta probar el APK en un Android real, compilar y probar en iPhone/Mac, conectar el catálogo compartido con permisos administrativos, cargar comercios reales y completar firma/publicación. Los permisos GPS nativos, los enlaces externos y el comportamiento de los bordes de pantalla deben comprobarse en teléfonos. No se afirma aprobación de tiendas ni publicación realizada.

Vistas de revisión: [escritorio](diseno/cobalto-escritorio.png), [celular](diseno/cobalto-celular.png), [instalación y QR](diseno/descargas-escritorio.png).
