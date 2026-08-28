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
  { title: "Voz por proximidad", description: "Comunicación inmersiva dentro y fuera de los vehículos." },
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
      { name: "Taxista", description: "Movete por la ciudad y generá ingresos." },
      { name: "Mecánico", description: "Reparación y tuning de vehículos." },
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
