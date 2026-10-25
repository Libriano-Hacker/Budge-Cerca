# Budge Cerca: primera propuesta

Una guía móvil para encontrar comercios, servicios y promociones de un barrio. Marca inicial: **Budge Cerca**, barrio **Ing.Budge**. El nombre de la aplicación y del barrio son editables desde el dashboard. El WhatsApp del creador se configuró con el número indicado, interpretado como celular argentino con código internacional.

## Diseño

- Verde petróleo, fondo marfil y acentos terracota. Una identidad cercana, sobria y fácil de adaptar a otros barrios.
- Portada con nombre del barrio, presentación, buscador y acceso a contacto por WhatsApp. En celulares, el contacto queda disponible en un botón flotante.
- Categorías con íconos; destacados con ilustraciones propias de locales; tarjetas con dirección, estado de atención, promociones y favoritos.
- Navegación inferior en celular: Explorar, Promos, Favoritos e Instalar. Versión de escritorio para operar cómodamente el dashboard.
- Ficha de cada local con descripción, dirección, WhatsApp, horarios por día, promoción y recorrido desde la ubicación actual.
- Dashboard con alta, edición y eliminación de negocios, rubros nuevos, selección de destacados y personalización de la marca.

## Qué funciona en este prototipo

La búsqueda ignora tildes y mayúsculas, y combina nombre, rubro, descripción y dirección. Las promociones tienen su propia sección. Los favoritos y las modificaciones del dashboard persisten en este navegador, y se pueden exportar/importar copias JSON.

El GPS se solicita al tocar «Usar mi ubicación». Con autorización, los resultados se ordenan por distancia en línea recta; la ubicación del vecino no se guarda. «Cómo llegar» abre Google Maps con el origen autorizado y el destino del comercio. Google Maps calcula el recorrido; esta app no calcula tiempos ni distancias por calles.

El mapa usa OpenStreetMap y permite seleccionar marcadores. Requiere conexión con el proveedor. Si no puede cargar las imágenes del mapa, la app lo informa y mantiene los accesos a los comercios y a Google Maps.

Los horarios se evalúan con la hora de Argentina; admiten horarios cortados y franjas que pasan de medianoche. Los feriados deben confirmarse con el local. Las promociones son texto editable: su vencimiento todavía se administra manualmente.

La app incluye manifiesto, íconos y service worker para instalación desde navegadores compatibles. Después de una visita con conexión, conserva la interfaz consultada para uso sin conexión. WhatsApp, mapas y recorridos requieren Internet. Todavía no se distribuye mediante Google Play ni App Store.

Todos los comercios, direcciones y posiciones iniciales son ejemplos. Los números de los comercios quedan vacíos para evitar contactar personas ajenas. El contacto del creador sí usa el número solicitado.

## Cinco mejoras recomendadas

1. **Comercios verificados y solicitudes de alta.** Los dueños pueden solicitar aparecer y corregir información; el creador revisa cada alta antes de publicarla. Reduce datos falsos y mantiene el directorio confiable.
2. **Un producto para varios barrios.** Espacios separados con marca, administrador y catálogo propios; planes para comercios destacados y suscripciones por barrio. Facilita vender la misma plataforma a distintas comunidades sin mezclar datos.
3. **Cupones y promociones con vencimiento.** Beneficios con QR, límite de usos y fechas de inicio/fin. Da una razón concreta para volver a la app y permite medir canjes.
4. **Avisos elegidos por el vecino.** Notificaciones de ofertas y novedades únicamente de rubros o comercios que la persona siga, con horarios y frecuencia configurables.
5. **Estadísticas útiles para el creador y los locales.** Búsquedas frecuentes, visitas a fichas, clics a WhatsApp y solicitudes de recorrido. Ayudan a mejorar la oferta del barrio y a justificar los planes comerciales sin almacenar ubicaciones precisas de vecinos.

## Antes de lanzar con clientes reales

Conectar una base de datos y API con control de acceso del lado del servidor. Agregar inicio de sesión del creador, permisos por barrio, copias de seguridad y publicación compartida. El acceso «Dashboard demo» es público por diseño en este prototipo y no ofrece protección administrativa.

Cargar locales reales con autorización, coordenadas verificadas y sus números de contacto. Definir condiciones de promociones, términos y política de privacidad. Publicar mediante HTTPS para habilitar GPS e instalación; validar en dispositivos Android/iOS reales. Si se requiere distribución por tiendas, preparar y probar el empaquetado y la publicación correspondientes.

El cambio de nombre del barrio permite revisar la personalización; no crea todavía una instancia o base de datos separada para cada cliente.
