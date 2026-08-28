export interface NavLink {
  href: string;
  label: string;
}

export interface Feature {
  title: string;
  description: string;
}

export interface StaffMember {
  alias: string;
  role: string;
}

export interface Faccion {
  category: "Servicios de Emergencia" | "Civil" | "Criminal" | "Negocios";
  jobs: { name: string; description: string }[];
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

export const navLinks: NavLink[] = [
  { href: "#inicio", label: "Inicio" },
  { href: "#tienda", label: "Tienda" },
  { href: "#reglas", label: "Reglas" },
  { href: "#faq", label: "FAQ" },
  { href: "#comunidad", label: "Comunidad" },
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
      { name: "Banda independiente", description: "Organizá tu propia facción criminal." },
      { name: "Contrabando", description: "Rutas y negocios al margen de la ley." },
    ],
  },
  {
    category: "Negocios",
    jobs: [
      { name: "Dueño de local", description: "Montá y administrá tu propio negocio." },
      { name: "Repartidor", description: "Logística y entregas dentro de la ciudad." },
    ],
  },
];

export const staff: StaffMember[] = [
  { alias: "Fundador", role: "Dirección del proyecto" },
  { alias: "Co-fundador", role: "Desarrollo" },
  { alias: "Admin", role: "Moderación y soporte" },
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

export const tiendaTiers = [
  { name: "VIP Bronce", price: "Próximamente" },
  { name: "VIP Plata", price: "Próximamente", popular: true },
  { name: "VIP Oro", price: "Próximamente" },
];
