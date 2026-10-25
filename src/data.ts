import type { AppData, Business, Hours } from "./domain";
const normal: Hours[] = [
  { days: [1, 2, 3, 4, 5, 6], opens: "09:00", closes: "20:00" },
];
const create = (
  b: Partial<Business> &
    Pick<
      Business,
      | "id"
      | "name"
      | "category"
      | "description"
      | "address"
      | "coordinates"
      | "color"
      | "initials"
    >,
): Business => ({
  whatsapp: "",
  hours: normal,
  featured: false,
  promotion: "",
  ...b,
});
export const initialData: AppData = {
  version: 1,
  settings: {
    appName: "Budge Cerca",
    neighborhood: "Ing.Budge",
    ownerWhatsapp: "5491150186306",
    intro:
      "Los comercios de siempre. Nuevos lugares por descubrir. Encontrá lo que necesitás y apoyá a quienes hacen tu barrio.",
  },
  categories: [
    "Panaderías",
    "Gastronomía",
    "Almacenes y kioscos",
    "Moda",
    "Belleza",
    "Ferreterías",
    "Automotor",
    "Supermercados",
    "Servicios",
    "Loterías",
    "Fiambrerías",
  ],
  businesses: [
    create({
      id: "pan-del-barrio",
      name: "Pan del Barrio",
      category: "Panaderías",
      description:
        "Pan recién horneado, facturas y esas cosas ricas que te alegran la mañana. Elaboración artesanal todos los días.",
      address: "Camino de la Ribera 1240",
      coordinates: { lat: -34.718, lng: -58.4551 },
      color: "sand",
      initials: "PB",
      featured: true,
      promotion: "Llevá 12 facturas y pagá 10. De lunes a viernes.",
      hours: [{ days: [0, 1, 2, 3, 4, 5, 6], opens: "07:00", closes: "20:00" }],
    }),
    create({
      id: "la-esquina",
      name: "La Esquina",
      category: "Gastronomía",
      description:
        "Café de especialidad, cocina casera y un lugar para encontrarnos. Desayunos, meriendas y almuerzos.",
      address: "Virgilio 820",
      coordinates: { lat: -34.7204, lng: -58.4558 },
      color: "sage",
      initials: "LE",
      featured: true,
      promotion:
        "Café con leche + 2 medialunas: 15% de descuento por la mañana.",
    }),
    create({
      id: "estilo-sur",
      name: "Estilo Sur",
      category: "Moda",
      description:
        "Prendas para todos los días, con el estilo que te identifica. Moda urbana y asesoramiento cercano.",
      address: "Ginebra 560",
      coordinates: { lat: -34.7221, lng: -58.4515 },
      color: "rose",
      initials: "ES",
      featured: true,
    }),
    create({
      id: "don-pepe",
      name: "Almacén Don Pepe",
      category: "Almacenes y kioscos",
      description:
        "Tu compra de todos los días, a la vuelta de casa. Bebidas, golosinas y productos de almacén.",
      address: "Quesada 910",
      coordinates: { lat: -34.7196, lng: -58.4512 },
      color: "blue",
      initials: "DP",
      promotion:
        "10% de descuento en tu segunda unidad de productos seleccionados.",
    }),
    create({
      id: "raices",
      name: "Raíces · Peluquería",
      category: "Belleza",
      description:
        "Cortes, color y cuidado para tu pelo. Atención con turno para dedicarte el tiempo que necesitás.",
      address: "Virgilio 640",
      coordinates: { lat: -34.7232, lng: -58.4576 },
      color: "lilac",
      initials: "R",
      hours: [{ days: [2, 3, 4, 5, 6], opens: "10:00", closes: "19:00" }],
    }),
    create({
      id: "el-tornillo",
      name: "El Tornillo",
      category: "Ferreterías",
      description:
        "Todo para arreglar, construir y darle vida a tus proyectos. Herramientas, pintura y consejos de confianza.",
      address: "Guaminí 1350",
      coordinates: { lat: -34.7175, lng: -58.4587 },
      color: "sand",
      initials: "ET",
    }),
    create({
      id: "el-encuentro",
      name: "Parrilla El Encuentro",
      category: "Gastronomía",
      description:
        "El sabor de la parrilla del barrio. Cortes a las brasas, porciones para compartir y pedidos para llevar.",
      address: "Camino de la Ribera 980",
      coordinates: { lat: -34.7209, lng: -58.4598 },
      color: "peach",
      initials: "EE",
      hours: [{ days: [0, 4, 5, 6], opens: "19:00", closes: "00:30" }],
      promotion: "Papas fritas de regalo con tu parrillada para dos.",
    }),
    create({
      id: "taller-sur",
      name: "Taller Sur",
      category: "Automotor",
      description:
        "Mecánica general, mantenimiento y diagnóstico. Cuidamos tu auto con atención personalizada.",
      address: "Ginebra 1120",
      coordinates: { lat: -34.7248, lng: -58.4533 },
      color: "blue",
      initials: "TS",
    }),
    create({
      id: "agua-clara",
      name: "Agua Clara",
      category: "Servicios",
      description:
        "Distribución de agua y soda para tu casa o negocio. Coordiná tu entrega en el barrio.",
      address: "Quesada 760",
      coordinates: { lat: -34.7166, lng: -58.4524 },
      color: "sage",
      initials: "AC",
    }),
  ],
};
export const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
