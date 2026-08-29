export type ItemType = "vip" | "vehicle";
export type VipTier = "bronce" | "plata" | "oro";

export interface NavLink {
  href: string;
  label: string;
}

export interface Feature {
  title: string;
  description: string;
}

export interface VipTierDef {
  key: VipTier;
  label: string;
  priceArs: number;
  discordPerk: string;
}

export interface VehicleDef {
  key: string;
  label: string;
  priceArs: number;
  model: string;
}

export interface StaffMember {
  alias: string;
  role: string;
  photo?: string;
  name?: string;
}

export interface FaccionJob {
  name: string;
  description: string;
  color?: string;
  reserved?: boolean;
  featured?: boolean;
}

export interface Faccion {
  category: "Servicios de Emergencia" | "Civil" | "Criminal" | "Negocios";
  jobs: FaccionJob[];
  footer?: string;
}

export interface Regla {
  severity: "Leve" | "Grave" | "Muy grave";
  title: string;
  description: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface Testimonio {
  name: string;
  quote: string;
}

export type SlotType = "banda" | "negocio" | "propiedad";
export type Period = "mensual" | "semestral";

export interface LeaseSlotDef {
  slotKey: string;
  slotType: SlotType;
  label: string;
  priceMensual: number;
  priceSemestral: number | null;
  jobName?: string;
  jobBossGrade?: number;
}

export const navLinks: NavLink[] = [
  { href: "#inicio", label: "Inicio" },
  { href: "#tienda", label: "Tienda" },
  { href: "#reglas", label: "Reglas" },
  { href: "#faq", label: "FAQ" },
  { href: "#comunidad", label: "Comunidad" },
  { href: "/arrendamientos", label: "Arrendamientos" },
];

export const hero = {
  headline: "BARRIO BRAVO RP",
  tagline: "Tu barrio, tus reglas, tu historia.",
  description:
    "Un servidor de roleplay serio en GTA V (FiveM), hecho por y para la comunidad latinoamericana que busca vivir una historia real, no solo jugar — con moderación activa y cero tolerancia a romper la inmersión. Economía propia, facciones, vivienda y eventos en vivo — postulate a la whitelist y demostrá que estás a la altura.",
};

export const features: Feature[] = [
  { title: "Framework a medida", description: "QBCore adaptado con scripts propios pensados para nuestra comunidad, sin copiar y pegar de otros servers." },
  { title: "Economía viva", description: "Trabajos, negocios y un mercado que reacciona a lo que hace la comunidad, no números fijos." },
  { title: "Vivienda y vehículos", description: "Sistema de propiedades y garages propio, con personalización real." },
  { title: "Eventos en vivo", description: "Staff activo organizando eventos IC y OOC de forma regular." },
  {
    title: "Moderación activa",
    description:
      "Un staff dividido por especialidad (soporte técnico, moderación en vivo, gestión de eventos) para que cualquier problema lo atienda quien realmente sabe resolverlo, no un solo mod haciendo malabares.",
  },
  { title: "Comunidad activa", description: "Discord y TikTok con contenido y soporte constante." },
];

export const facciones: Faccion[] = [
  {
    category: "Servicios de Emergencia",
    jobs: [
      { name: "Policía", description: "Mantené el orden en las calles del barrio." },
      { name: "Paramédico", description: "Atención de emergencias y RP médico." },
    ],
  },
  {
    category: "Civil",
    jobs: [
      { name: "Repartidor de Pizzas", description: "Solo. Tomá pedidos de la pizzería y repartilos por la ciudad." },
      { name: "Repartidor de Diarios", description: "Solo. Repartí diarios casa por casa por la ciudad." },
      { name: "Puesto de Panchos", description: "Solo. Instalá tu carrito donde quieras y vendeles comida a los vecinos." },
      { name: "Autoelevadorista", description: "Solo. Cargá pallets en el tráiler con la autoelevadora." },
      { name: "Jardinero", description: "Solo. Mantené jardines con rastrillo y cortadora de pasto." },
      { name: "Camionero", description: "Solo. Enganchá el tráiler y hacé entregas por toda la ciudad." },
      { name: "Auxilio Mecánico", description: "Solo. Respondé llamados para asistir vehículos varados: combustible, grúa, gomas." },
      { name: "Colectivero", description: "Solo. Elegí una línea y manejá tu recorrido." },
      { name: "Buscador de Tesoros", description: "Solo. Rastreá objetos de valor con un detector de metales." },
      { name: "Bomberos", description: "Solo o en equipo. Respondé llamados de incendio y salí a intervenir." },
      { name: "Cazador", description: "Solo o en equipo. Cazá en las zonas habilitadas del mapa." },
      { name: "Preparación de Autos", description: "Solo o en equipo. Armá proyectos de autos y ganá plata con cada uno." },
      { name: "Buzo", description: "Solo o en equipo. Buceá y recolectá objetos y criaturas del fondo del mar." },
      { name: "Granjero", description: "Solo o en equipo. Cosechá trigo y entregá los fardos en el centro de acopio." },
      { name: "Electricista", description: "Solo o en equipo. Solucioná problemas eléctricos: postes, transformadores, cajas." },
    ],
  },
  {
    category: "Criminal",
    jobs: [
      {
        name: "Ballas",
        description: "Controlan buena parte del sur de la ciudad — territorio ganado a pulso, no se lo regalan a nadie.",
        color: "#8B00FF",
      },
      {
        name: "Families",
        description: "La banda más reconocida del barrio, con historia y lealtad de sobra.",
        color: "#2ECC71",
        reserved: true,
      },
      {
        name: "Vagos",
        description: "Fuerte presencia en el este, conocidos por moverse rápido y no dejar cabos sueltos.",
        color: "#F5C518",
      },
      {
        name: "Triads",
        description: "Negocios que van mucho más allá de la calle — discreción ante todo.",
        color: "#E63946",
      },
      {
        name: "Marabunta Grande",
        description: "Lealtad interna a muerte y un territorio que defienden con todo.",
        color: "#14B8A6",
      },
      {
        name: "Lost MC",
        description: "Motociclistas fuera de la ley, tan familia entre ellos como amenaza para el resto.",
        color: "#71717A",
      },
      {
        name: "Aztecas",
        description: "Raíces profundas en el barrio, defienden lo suyo hasta las últimas consecuencias.",
        color: "#D97706",
      },
    ],
    footer: "¿Querés reservar tu banda? Sumate al Discord y enterate de todo lo que incluye.",
  },
  {
    category: "Negocios",
    jobs: [
      { name: "Casino", description: "El Diamond Casino: mesas de juego, shows en vivo y la chance de ganar (o perderlo todo)." },
      { name: "Vanilla Unicorn", description: "El local más conocido de Los Santos — trabajá la barra, la seguridad o el escenario." },
      { name: "Vanilla Unicorn (Paleto)", description: "La sucursal del norte, el mismo ambiente en el corazón de Paleto Bay." },
      { name: "Taller Bennys", description: "Especializados en tuning y modificaciones, para los que quieren un auto único." },
      { name: "Los Santos Customs", description: "El taller de referencia de la ciudad: reparación y personalización de vehículos." },
      {
        name: "Casinos ilegales",
        description: "Detrás de la fachada legal, hay quien mueve las fichas de otra manera — sin reglas, sin límites.",
        featured: true,
      },
    ],
  },
];

export const staff: StaffMember[] = [
  { name: "RK", alias: "Fundador", role: "Dirección y desarrollador del proyecto", photo: "/staff-fundador.jpg" },
];

export const reglas: Regla[] = [
  { severity: "Leve", title: "Metagaming", description: "Usar información fuera de personaje dentro del rol." },
  { severity: "Grave", title: "Powergaming", description: "Forzar acciones sobre otro jugador sin darle chance de reaccionar." },
  { severity: "Muy grave", title: "RDM/VDM", description: "Matar o atropellar sin motivo de rol válido." },
];

export const faq: FaqItem[] = [
  { question: "¿Cómo consigo la whitelist?", answer: "Vas a poder postularte desde Discord apenas abramos las postulaciones." },
  { question: "¿Cómo pago en la tienda?", answer: "La tienda va a aceptar Mercado Pago con entrega automática al conectarte al server." },
  { question: "¿La entrega es automática?", answer: "Sí, tu compra se entrega sola al detectar tu Discord conectado al servidor." },
  { question: "¿Hay reembolsos?", answer: "Sí, escribinos por Discord dentro de las 48hs de la compra." },
  { question: "¿Qué necesito para jugar?", answer: "FiveM instalado y una copia legítima de GTA V." },
];

export const testimonios: Testimonio[] = [
  { name: "Comunidad", quote: "Espacio reservado para testimonios reales una vez que abramos al público." },
];

export const comunidadStats = {
  jugadoresOnline: "Próximamente",
  miembrosDiscord: "Próximamente",
};

export const vipTiers: VipTierDef[] = [
  { key: "bronce", label: "VIP Bronce", priceArs: 3000, discordPerk: "Rol con color + canal de texto VIP" },
  { key: "plata", label: "VIP Plata", priceArs: 7000, discordPerk: "+ categoría privada (texto y voz)" },
  { key: "oro", label: "VIP Oro", priceArs: 14000, discordPerk: "+ badge/ícono distintivo" },
];

export const vehicles: VehicleDef[] = [
  { key: "moto", label: "Moto", priceArs: 3000, model: "bati2" },
  { key: "auto", label: "Auto de lujo vanilla", priceArs: 8000, model: "windsor" },
  { key: "lancha", label: "Lancha", priceArs: 10000, model: "marquis" },
  { key: "helicoptero", label: "Helicóptero", priceArs: 30000, model: "supervolito2" },
];

export const bandas: LeaseSlotDef[] = [
  { slotKey: "ballas", slotType: "banda", label: "Ballas", priceMensual: 30000, priceSemestral: 150000 },
  { slotKey: "families", slotType: "banda", label: "Families", priceMensual: 30000, priceSemestral: 150000 },
  { slotKey: "vagos", slotType: "banda", label: "Vagos", priceMensual: 30000, priceSemestral: 150000 },
  { slotKey: "triads", slotType: "banda", label: "Triads", priceMensual: 30000, priceSemestral: 150000 },
  { slotKey: "marabunta_grande", slotType: "banda", label: "Marabunta Grande", priceMensual: 30000, priceSemestral: 150000 },
  { slotKey: "lost_mc", slotType: "banda", label: "Lost MC", priceMensual: 30000, priceSemestral: 150000 },
  { slotKey: "aztecas", slotType: "banda", label: "Aztecas", priceMensual: 30000, priceSemestral: 150000 },
];

export const negocios: LeaseSlotDef[] = [
  { slotKey: "casino", slotType: "negocio", label: "Casino", priceMensual: 45000, priceSemestral: 220000, jobName: "casino", jobBossGrade: 4 },
  { slotKey: "vanilla_unicorn", slotType: "negocio", label: "Vanilla Unicorn", priceMensual: 35000, priceSemestral: 170000, jobName: "unicorn", jobBossGrade: 5 },
  { slotKey: "taller_bennys", slotType: "negocio", label: "Taller Bennys", priceMensual: 30000, priceSemestral: 145000, jobName: "bennys", jobBossGrade: 4 },
  { slotKey: "los_santos_customs", slotType: "negocio", label: "Los Santos Customs", priceMensual: 30000, priceSemestral: 145000, jobName: "mechanic", jobBossGrade: 4 },
  { slotKey: "casinos_ilegales", slotType: "negocio", label: "Casinos ilegales", priceMensual: 40000, priceSemestral: 195000, jobName: "casino_ilegal", jobBossGrade: 4 },
];

export const propiedades: LeaseSlotDef[] = [
  { slotKey: "casa_chica", slotType: "propiedad", label: "Casa chica", priceMensual: 15000, priceSemestral: null },
  { slotKey: "casa_mediana", slotType: "propiedad", label: "Casa mediana", priceMensual: 25000, priceSemestral: null },
  { slotKey: "casa_grande", slotType: "propiedad", label: "Casa grande", priceMensual: 40000, priceSemestral: null },
  { slotKey: "casa_premium", slotType: "propiedad", label: "Casa premium", priceMensual: 60000, priceSemestral: null },
];
