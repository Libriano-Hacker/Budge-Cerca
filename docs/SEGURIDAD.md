# Revisión de seguridad — paso 1

Fecha: **6 de noviembre de 2026**. Base revisada: `9a12723`. Se revisaron código, configuración, dependencias, datos locales, empaquetado móvil y comportamiento en laboratorio. La revisión toma como referencia áreas de OWASP WSTG/ASVS y MASVS/MASTG; no es una certificación de cumplimiento ni una prueba de todos los ataques posibles.

## Alcance y límites

La aplicación actual es una SPA estática React/Vite con PWA y envoltorios Capacitor. Usa localStorage para catálogos/favoritos y ubicación en memoria. No hay servidor de datos, login, sesiones, base de datos, cobros ni API de administración.

Las pruebas adversariales se realizaron contra compilaciones y servidores locales del proyecto. Las cargas de XSS fueron canarios sin extracción de datos; los ensayos de caché usaron respuestas locales simuladas. No se atacaron WhatsApp, Google, OpenStreetMap, GitHub ni Netlify. La comprobación del sitio externo se limitó a leer sus dos páginas conocidas y encabezados.

El sitio de Netlify respondió **HTTP 401** en `/` y `/descargar`. Eso acredita una barrera de acceso del proveedor, pero impide verificar remotamente el HTML nuevo, el despliegue y sus encabezados de aplicación. No se intentó eludirla. Linux permite compilar Android; no permite compilar ni firmar iOS con Xcode. No se dispuso de teléfonos físicos.

## Hallazgos y tratamiento

| ID  | Riesgo observado                                                                                                                                                                                                | Tratamiento y alcance real                                                                                                                                                                                                                                                                                                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S01 | Dashboard demo público sin autenticación. No es apto como administración de un catálogo compartido.                                                                                                             | Excluido de builds públicos y móviles; solo queda en DEV. Se verifica el bundle y que query/hash/localStorage no lo habiliten. Antes sus cambios solo afectaban al mismo navegador: no se demostró modificación de datos de otros usuarios. Un administrador real continúa bloqueado hasta implementar servidor, identidad y permisos.       |
| S02 | Unicode malformado en una copia podía provocar `URIError` al construir un enlace WhatsApp y bloquear la vista local. Rubros como `constructor` podían alcanzar propiedades heredadas en lookups de componentes. | Validación Unicode y construcción defensiva de enlaces; `Object.hasOwn` en iconos/fotos e iniciales por puntos de código. Casos de regresión unitarios y de navegador.                                                                                                                                                                       |
| S03 | Los formularios limitaban campos, pero las copias y el almacenamiento permitían tamaños/tipos adicionales.                                                                                                      | Esquema cerrado, propiedades propias sin getters, máximo de 2 MB para archivos y 2 millones de unidades UTF-16 para texto antes de parsear, 2.000 comercios/favoritos, 200 barrios/rubros y límites de texto/horarios. No se reprodujo contaminación global de prototipos; se cerraron entradas que antes se aceptaban.                      |
| S04 | Cuatro avisos moderados de desarrollo en `@capacitor/assets → @trapezedev/project → xcode → uuid`.                                                                                                              | Override acotado de `uuid` para `xcode@3.0.1`. Se probó CommonJS, lectura/escritura del proyecto iOS e identificadores. La auditoría inicial de producción ya daba cero; el problema estaba en herramientas de desarrollo.                                                                                                                   |
| S05 | Faltaban políticas de contenido y encabezados explícitos de la aplicación.                                                                                                                                      | CSP en HTML y HTTP, bloqueo de scripts inline/eval, framing y objetos; `nosniff`, Referrer-Policy, Permissions-Policy, COOP/CORP y HSTS. Se comprueba en el preview de producción. Se conserva `style-src 'unsafe-inline'` por estilos de React/Leaflet, sin relajar `script-src`.                                                           |
| S06 | Android permitía backups y tenía rutas FileProvider demasiado amplias; faltaba endurecer valores de versiones antiguas y hacer explícito el cierre de depuración.                                               | Backup/transferencia/HTTP/contenido mixto cerrados; rutas propias acotadas, WebView sin acceso arbitrario a archivos ni ventanas automáticas, logs/inspección desactivados y release no depurable. iOS conserva ATS sin excepciones y no comparte archivos. Son controles locales y baselines; no se demostró extracción remota de archivos. |
| S07 | El service worker almacenaba cualquier GET exitoso del mismo origen, con riesgo si se agregaban áreas autenticadas.                                                                                             | Lista acotada de recursos públicos, exclusión de query/API/administración y respuestas privadas/no-store o redirigidas. Invalida la caché anterior. No se encontraron sesiones reales ni respuestas privadas actuales filtradas.                                                                                                             |
| S08 | Los enlaces de fotos/descargas permitían IPs o nombres locales y puertos alternativos; faltaba validación uniforme al abrir enlaces nativos.                                                                    | Validación de URLs públicas y destinos de tiendas; imágenes sin Referer y navegación externa fuera del WebView. No hay fetch backend y no se afirma SSRF de servidor. La sintaxis del dominio no elimina DNS rebinding o redirecciones en terceros.                                                                                          |
| S09 | La seguridad de dependencias no se verificaba continuamente.                                                                                                                                                    | Workflow de auditoría en push/PR/semanal, permisos de lectura, acciones oficiales fijadas por SHA e instalación sin lifecycle scripts para la auditoría. La ejecución remota depende de que GitHub Actions esté habilitado.                                                                                                                  |

## Casos ofensivos controlados

- HTML/script en nombres, presentación, iniciales, marcadores y tooltips: comprobar texto literal y ausencia de ejecución.
- Cargas JSON con campos extra, claves de prototipo, Unicode aislado, tipos incorrectos, coordenadas no finitas, horarios inválidos y volúmenes excesivos.
- `javascript:`, URLs con credenciales, IPs codificadas/locales, puertos alternativos y destinos falsos de tiendas.
- Intentos de activar administración mediante URL, hash y claves locales; inspección del JavaScript compilado para confirmar que la demo fue eliminada.
- Inyección inline y conexión a un origen canario bloqueadas por CSP, sin tráfico ofensivo a terceros.
- API y recursos `private`/`no-store` excluidos de la caché; búsqueda y recursos públicos conservados sin conexión.
- Inspección de manifiestos, permisos y configuración empaquetada de Android, más validación estática de plist/ATS de iOS.
- Auditoría de dependencias completas y de producción; búsqueda por patrones de secretos en archivos e historial. No aparecieron credenciales, pero un escaneo por patrones no prueba ausencia universal.

No se ejecutaron fuerza bruta, denegación de servicio contra Internet, ingeniería social, ataques a cuentas de terceros ni evasión de la barrera de Netlify. SQL injection, IDOR/BOLA, CSRF de sesiones y SSRF de servidor no tienen actualmente un backend donde ejercitarse; no se presentan como controles aprobados de un servidor que no existe.

## Reproducción y evidencia

Resultado integrado: **62 pruebas unitarias y 54 pruebas de navegador aprobadas (116 en total)**. Incluyen 20 ejecuciones de casos adversariales/regresión en escritorio y emulación móvil. La auditoría npm completa y de producción terminó con **0 vulnerabilidades conocidas**. Los builds web y de usuarios pasaron la verificación de CSP y ausencia de código administrativo.

Android compiló en debug con firma de pruebas verificada y en release **sin firma de publicación**. Se inspeccionaron recursos, CSP, manifiesto y configuración dentro de ambos APK: backup/HTTP desactivados y release sin depuración. iOS se sincronizó y su plist/configuración se validaron estáticamente; no se compiló.

Una prueba con un archivo canario inocuo confirmó HTTP 403 tanto en `/.env.security-canary` como en su ruta `@fs` del servidor DEV; una petición con Origin ajeno no recibió permiso CORS. No se usaron archivos de credenciales reales para ese ensayo.

```bash
npm run security:check
npm run android:debug
```

La evidencia de trabajo se guarda en `artifacts/security/` (informes sin secretos) y las pruebas están en `src/securityValidation.test.ts`, `src/neighborhoods.test.ts` y `tests/security.spec.ts`. `scripts/verify-public-build.mjs` valida cada build público. El APK debug es de prueba y no debe confundirse con un release firmado para vecinos.

## Pendientes que requieren otro acceso o entorno

1. **Administración real:** servidor y base de datos con autenticación, autorización por barrio, validación del servidor, registro de acciones y tratamiento seguro de sesiones. La escritura pública permanece deshabilitada hasta tener esos controles; no se añadieron credenciales ni contraseñas ficticias en el cliente.
2. **Infraestructura:** confirmar despliegue y políticas aplicadas en Netlify desde la cuenta propietaria; revisar MFA, roles, accesos y registros de GitHub/Netlify. No habilitar acceso público tomando la barrera de Netlify como sustituto de autorización por operación.
3. **Dispositivos y distribución:** probar GPS, enlaces y navegación en Android/iPhone reales, compilar iOS en Mac/Xcode y generar releases con las claves del propietario. No se proporcionó una firma de publicación y no se creó una identidad de tienda a nombre del usuario.
4. **Evolución del sistema:** repetir la revisión cuando existan cuentas/API/pagos, porque agregan superficies ausentes en este prototipo. Rate limiting, recuperación de acceso y protección de sesiones deben verificarse contra la implementación real.

Estos pendientes limitan el lanzamiento comercial. Las correcciones reducen riesgos verificables del prototipo; no justifican afirmar que el sistema es invulnerable ni que una prueba de laboratorio cubre todos los métodos existentes.

Referencias: [OWASP WSTG](https://owasp.org/www-project-web-security-testing-guide/), [ASVS](https://owasp.org/www-project-application-security-verification-standard/), [MASTG](https://mas.owasp.org/MASTG/).
