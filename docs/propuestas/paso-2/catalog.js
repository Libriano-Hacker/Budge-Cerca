/* Propuestas para revisar. No habilitan funciones de la aplicación. */
window.TBC_IDEAS = [
  {
    id: "01",
    title: "Búsqueda guiada y filtros de servicios",
    audience: "Usuarios",
    priority: "P1",
    existing: "Ya hay búsqueda por texto, rubro, abiertos y cercanía.",
    proposal:
      "Autocompletar servicios, rubros y comercios; filtros de turnos, entrega, medios de pago y accesibilidad. Sugerir alternativas si no hay resultados.",
    benefit:
      "Encontrar un comercio que resuelva una necesidad concreta, con menos intentos.",
    dependency:
      "Servicios cargados por comercio, datos confirmados y catálogo compartido.",
    screen: "usuarios",
    stage: "confianza",
  },
  {
    id: "02",
    title: "Ficha ampliada con galería, servicios/precios y datos revisados",
    audience: "Usuarios y dashboard",
    priority: "P1",
    existing:
      "La ficha actual tiene una imagen, descripción, contacto, horarios y promoción.",
    proposal:
      "Agregar fotos reales, servicios, precios informados por el local y fecha de revisión. Mostrar qué datos fueron confirmados.",
    benefit:
      "Elegir con más información antes de contactar o acercarse al negocio.",
    dependency:
      "Galería con carga segura, permisos de imágenes y actualización por responsables.",
    screen: "usuarios",
    stage: "confianza",
  },
  {
    id: "03",
    title: "Cupones con vigencia, cupo y canje",
    audience: "Usuarios y dashboard",
    priority: "P2",
    existing: "Las promociones son texto editable y no vencen automáticamente.",
    proposal:
      "Definir condiciones, fechas y usos disponibles. Guardar un cupón y validar su canje una sola vez cuando corresponda.",
    benefit:
      "Ofertas vigentes para el vecino y resultados comprobables para el comercio.",
    dependency:
      "Promociones estructuradas, vencimiento y validación de canjes en servidor.",
    screen: "usuarios",
    stage: "acciones",
  },
  {
    id: "04",
    title: "Solicitud de turno o presupuesto",
    audience: "Usuarios y dashboard",
    priority: "P2",
    existing:
      "Hoy el contacto se realiza mediante WhatsApp; no hay solicitudes dentro de la app.",
    proposal:
      "Elegir un servicio y enviar una consulta con horario preferido. Mostrar pendiente, respondida o cancelada; el comercio confirma.",
    benefit:
      "Ordenar consultas sin prometer una reserva que el negocio aún no aceptó.",
    dependency:
      "Bandeja del comercio, servidor y canal de respuesta con consentimiento.",
    screen: "usuarios",
    stage: "acciones",
  },
  {
    id: "05",
    title: "Seguir comercios y recibir avisos elegidos",
    audience: "Usuarios",
    priority: "P3",
    existing:
      "Los favoritos ya existen y se guardan únicamente en este dispositivo.",
    proposal:
      "Seguir novedades de locales elegidos, decidir frecuencia y silenciar avisos. Ofrecer una cuenta opcional para sincronizar favoritos.",
    benefit:
      "Enterarse de novedades útiles y conservar preferencias al cambiar de teléfono.",
    dependency:
      "Suscripciones, notificaciones opt-in y cuenta para sincronización. Buscar sigue sin exigir cuenta.",
    screen: "usuarios",
    stage: "crecimiento",
  },
  {
    id: "06",
    title: "Fichas compartibles, deep links y QR por comercio",
    audience: "Usuarios y dashboard",
    priority: "P2",
    existing:
      "Existe un QR de instalación; cada ficha todavía no tiene un enlace público propio.",
    proposal:
      "Compartir una URL estable del local y su QR. Abrir la ficha en la app si está instalada o en la web si no lo está.",
    benefit: "Compartir un negocio sin tener que repetir la búsqueda.",
    dependency:
      "Rutas públicas estables, dominio y enlaces verificados Android/iOS. No reemplaza el QR de instalación.",
    screen: "usuarios",
    stage: "acciones",
  },
  {
    id: "07",
    title: "Bandeja de altas, correcciones y verificación de negocios",
    audience: "Usuarios y dashboard",
    priority: "P1",
    existing:
      "El creador carga los locales; no hay solicitudes de alta ni reportes de vecinos.",
    proposal:
      "Recibir solicitudes y avisos de datos incorrectos. Revisar información, pedir correcciones y aprobar antes de publicar.",
    benefit:
      "Hacer crecer el catálogo con control y corregir errores más rápido.",
    dependency:
      "Formularios protegidos, estados de revisión, responsables y registro de decisiones.",
    screen: "resumen",
    stage: "confianza",
  },
  {
    id: "08",
    title: "Acceso acotado para comerciantes",
    audience: "Dashboard",
    priority: "P3",
    existing:
      "No hay cuentas de comerciantes; el dashboard actual es solo una demo de desarrollo.",
    proposal:
      "Invitar al responsable de un local para proponer cambios en su propia ficha. El administrador revisa antes de publicarlos.",
    benefit: "Delegar actualizaciones sin entregar el control del barrio.",
    dependency:
      "Identidad del comerciante, permisos por ficha y barrio, aprobación y auditoría del servidor.",
    screen: "lista",
    stage: "crecimiento",
  },
  {
    id: "09",
    title: "Campañas y espacios patrocinados programados",
    audience: "Dashboard",
    priority: "P3",
    existing:
      "Destacado es un interruptor; no hay campañas, cupos ni vigencia programada.",
    proposal:
      "Programar espacios por barrio con inicio, fin, cupo y vista previa. Identificar los pagos como Patrocinado.",
    benefit: "Organizar la oferta comercial sin mantener promociones vencidas.",
    dependency:
      "Inventario de espacios, programación y reglas comerciales. Pagar no verifica un negocio.",
    screen: "publicar",
    stage: "crecimiento",
  },
  {
    id: "10",
    title: "Estadísticas agregadas y consultas sin resultados",
    audience: "Dashboard",
    priority: "P3",
    existing:
      "Los números actuales cuentan comercios, destacados, promociones y rubros; no miden uso.",
    proposal:
      "Ver fichas consultadas, clics a WhatsApp, pedidos de recorrido y demanda sin resultados, por período y barrio.",
    benefit:
      "Saber qué información falta y mostrar el valor del directorio a los negocios.",
    dependency:
      "Eventos agregados sin GPS ni texto sensible. Un clic no prueba un mensaje, una visita o una venta.",
    screen: "resumen",
    stage: "crecimiento",
  },
  {
    id: "11",
    title: "Importación CSV asistida",
    audience: "Dashboard",
    priority: "P3",
    existing:
      "Ya hay copias JSON validadas; no existe carga asistida desde una planilla.",
    proposal:
      "Mapear columnas, señalar errores y posibles duplicados, y previsualizar altas y cambios antes de confirmarlos.",
    benefit: "Cargar un barrio completo con menos trabajo y menos errores.",
    dependency:
      "Parser seguro, validación del servidor, detección de duplicados y confirmación por lote.",
    screen: "publicar",
    stage: "crecimiento",
  },
  {
    id: "12",
    title: "Espacios independientes por barrio",
    audience: "Dashboard",
    priority: "P3",
    existing:
      "El selector filtra barrios, pero la marca y los datos siguen en una única copia local.",
    proposal:
      "Separar marca, responsables, catálogo y cupo o plan de cada barrio. El propietario administra los espacios habilitados.",
    benefit:
      "Vender y operar el producto para varias comunidades sin mezclar su información.",
    dependency:
      "Datos aislados por espacio y permisos del servidor. El público mantiene un único desplegable.",
    screen: "resumen",
    stage: "crecimiento",
  },
  {
    id: "13",
    title: "Centro de calidad y horarios excepcionales",
    audience: "Usuarios y dashboard",
    priority: "P1",
    existing:
      "Se calculan horarios semanales; faltan excepciones por fecha y revisión de datos antiguos.",
    proposal:
      "Reunir datos faltantes o por confirmar y registrar feriados, vacaciones y cierres temporales con fecha de vigencia.",
    benefit:
      "Evitar viajes innecesarios y mantener información útil para el vecino.",
    dependency:
      "Excepciones por fecha, responsables de confirmación y tareas de revisión del catálogo.",
    screen: "resumen",
    stage: "confianza",
  },
  {
    id: "14",
    title: "Borrador, vista previa, publicación e historial",
    audience: "Dashboard",
    priority: "P1",
    existing:
      "Los cambios de la demo se aplican directamente en el navegador, sin versiones de publicación.",
    proposal:
      "Preparar cambios, revisar la ficha móvil y publicar una versión. Consultar el historial y restaurar una anterior cuando haga falta.",
    benefit:
      "Publicar con menos errores y recuperar información sin rehacerla.",
    dependency:
      "Versiones del catálogo, permisos, publicación del servidor y restauración validada.",
    screen: "publicar",
    stage: "confianza",
  },
];
