> Evolución implementada: las mejoras aprobadas 01, 02, 07, 13 y 14 están preparadas con Netlify/Supabase. Incluyen búsqueda guiada, ficha ampliada, solicitudes privadas, calidad/fechas especiales y borradores/vista previa/historial. El proyecto remoto y las claves aún requieren activación: [guía](SUPABASE.md). El texto siguiente documenta la propuesta inicial.

# Tu Barrio Cerca: primera propuesta

Una guía móvil para encontrar comercios, servicios y promociones de un barrio. Marca: **Tu Barrio Cerca**. Eslogan: **«Conectá con lo que te rodea»**. La portada tiene un único desplegable para seleccionar el barrio de búsqueda. Los barrios se agregan y eliminan en la demo DEV desde Dashboard → Barrios; el barrio inicial se elige en «Mi barrio». Cada local se asigna a su zona. El WhatsApp del creador se configuró con el número indicado, interpretado como celular argentino con código internacional.

## Diseño

- Propuesta A · Cobalto urbano: fondo azul noche con acentos azules, fotografía ilustrativa al anochecer, tipografía Manrope grande, transparencias y controles con relieve.
- Portada con nombre del barrio, presentación, buscador y acceso a contacto por WhatsApp. En celulares, el contacto queda disponible en un botón flotante.
- Categorías con íconos; destacados con imágenes ilustrativas realistas por rubro; tarjetas con dirección, estado de atención, promociones y favoritos.
- Navegación inferior en celular: Explorar, Promos, Favoritos y Descargar. Dashboard demo solo en desarrollo; no se incluye en los builds públicos web ni nativos.
- Ficha de cada local con descripción, dirección, WhatsApp, horarios por día, promoción y recorrido desde la ubicación actual.
- Dashboard con alta, edición y eliminación de negocios, rubros nuevos, selección de destacados, personalización de la marca y enlaces HTTPS a fotos propias.
- Fotografía de portada con opción «Explorar en 3D». Escena ilustrativa que responde al puntero y al scroll, tarjetas flotantes, transiciones de aparición, barra de progreso y navegación de vidrio. Botón para pausar la escena, respeto de la preferencia de reducir movimiento y alternativa visual sin WebGL.

## Qué funciona en este prototipo

La búsqueda ignora tildes y mayúsculas, y combina nombre, rubro, descripción y dirección. Las promociones tienen su propia sección. Los favoritos y las modificaciones del dashboard persisten en este navegador, y se pueden exportar/importar copias JSON.

El GPS se solicita al tocar «Usar mi ubicación». Con autorización, los resultados se ordenan por distancia en línea recta; la ubicación del vecino no se guarda. «Cómo llegar» abre Google Maps con el origen autorizado y el destino del comercio. Google Maps calcula el recorrido; esta app no calcula tiempos ni distancias por calles.

El mapa usa OpenStreetMap y permite seleccionar marcadores. Requiere conexión con el proveedor. Si no puede cargar las imágenes del mapa, la app lo informa y mantiene los accesos a los comercios y a Google Maps.

Los horarios se evalúan con la hora de Argentina; admiten horarios cortados y franjas que pasan de medianoche. Los feriados deben confirmarse con el local. Las promociones son texto editable: su vencimiento todavía se administra manualmente.

La app incluye manifiesto, íconos y service worker para instalación desde navegadores compatibles. Después de una visita con conexión, conserva la interfaz consultada para uso sin conexión. WhatsApp, mapas y recorridos requieren Internet. Todavía no se distribuye mediante Google Play ni App Store.

Se agregaron proyectos Capacitor para Android e iPhone, un APK Android de pruebas compilado y una página `/descargar` con QR en PNG/SVG. La página y su QR requieren publicación con acceso público antes de usarse. El proyecto iPhone necesita Mac/Xcode para compilar y firmar. [Estado, comandos y límites de las aplicaciones](APLICACIONES.md).

Todos los comercios, direcciones y posiciones iniciales son ejemplos. Las imágenes iniciales fueron generadas para ilustrar rubros y no muestran locales reales. Los números de los comercios quedan vacíos para evitar contactar personas ajenas. El contacto del creador sí usa el número solicitado.

## Cinco mejoras recomendadas

1. **Comercios verificados y solicitudes de alta.** Los dueños pueden solicitar aparecer y corregir información; el creador revisa cada alta antes de publicarla. Reduce datos falsos y mantiene el directorio confiable.
2. **Un producto para varios barrios.** Espacios separados con marca, administrador y catálogo propios; planes para comercios destacados y suscripciones por barrio. Facilita vender la misma plataforma a distintas comunidades sin mezclar datos.
3. **Cupones y promociones con vencimiento.** Beneficios con QR, límite de usos y fechas de inicio/fin. Da una razón concreta para volver a la app y permite medir canjes.
4. **Avisos elegidos por el vecino.** Notificaciones de ofertas y novedades únicamente de rubros o comercios que la persona siga, con horarios y frecuencia configurables.
5. **Estadísticas útiles para el creador y los locales.** Búsquedas frecuentes, visitas a fichas, clics a WhatsApp y solicitudes de recorrido. Ayudan a mejorar la oferta del barrio y a justificar los planes comerciales sin almacenar ubicaciones precisas de vecinos.

## Antes de lanzar con clientes reales

Conectar una base de datos y API con control de acceso del lado del servidor. Agregar inicio de sesión del creador, permisos por barrio, copias de seguridad y publicación compartida. El acceso «Dashboard demo» solo se habilita en DEV y no es una autenticación administrativa. Las operaciones de escritura no se incluyen en producción. [Revisión de seguridad](SEGURIDAD.md).

Cargar locales reales con autorización, coordenadas verificadas y sus números de contacto. Definir condiciones de promociones, términos y política de privacidad. Publicar mediante HTTPS para habilitar GPS e instalación; validar en dispositivos Android/iOS reales. Si se requiere distribución por tiendas, preparar y probar el empaquetado y la publicación correspondientes.

Los catálogos se filtran por el barrio elegido. Los barrios administrados, comercios y selección se guardan en este navegador. Un barrio con locales no puede eliminarse hasta reasignarlos y siempre se conserva al menos uno. El nombre geográfico anterior se retira también de los datos guardados sin perder comercios ni favoritos. Esto permite probar varias zonas; las cuentas, permisos y datos compartidos entre personas requieren todavía un servidor.
