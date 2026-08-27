# Landing pública — Barrio Bravo RP

Sub-proyecto 1 de 5 del ecosistema web de Barrio Bravo RP (servidor FiveM/QBCore de
roleplay latinoamericano). Este spec cubre **solo** la landing pública de una sola
página con scroll — sin backend, sin autenticación, sin pagos. Los sub-proyectos
siguientes (auth + shell de cuenta, tienda, perfil de personaje IC, referidos) tienen
specs propios y no están cubiertos acá.

Referencia de estructura/UX: el sitio "NightCity Roleplay" se usó únicamente como
referencia de layout de secciones y patrones de animación durante el brainstorming.
Ningún texto, imagen, nombre o dato de esa referencia aparece en este spec ni debe
aparecer en el código.

## Objetivo

Sitio de pre-lanzamiento en español rioplatense que presente Barrio Bravo RP,
dirija tráfico a Discord/TikTok, y deje toda la estructura lista para que la Tienda
y el Perfil de Personaje se enchufen encima en sub-proyectos posteriores.

## Fuera de alcance (explícitamente, para este sub-proyecto)

- Cualquier llamada a Supabase, Mercado Pago o la MySQL de QBCore.
- Login con Discord (el botón "Conectar" existe visualmente pero no autentica todavía).
- Countdown de lanzamiento (sección 13 del brief original) — no hay fecha definida aún;
  se omite del todo por ahora, no se deja placeholder.
- Números de comunidad en vivo (jugadores online, miembros de Discord) — se muestran
  como bloque placeholder visual (mismo tratamiento que el resto de imágenes/datos
  pendientes), sin ninguna llamada de red real.
- Newsletter — el formulario existe en UI pero no envía a ningún backend (se deja el
  input y botón deshabilitado o con handler no-op comentado, listo para conectar
  cuando exista Supabase).

## Stack y setup

- Next.js 15 (App Router), TypeScript, Tailwind CSS.
- Gestor de paquetes: `pnpm`.
- Fuentes vía `next/font`: Bebas Neue (headlines condensados), Manrope (body),
  JetBrains Mono (IP del server, datos técnicos).
- `@react-three-fiber` + `@react-three/drei` para el token 3D del hero, cargado con
  `next/dynamic` (`ssr: false`) para no bloquear first paint.
- `framer-motion` para animaciones de scroll y micro-interacciones.
- Git inicializado en la raíz del repo (no existía antes de este sub-proyecto).

## Paleta y tipografía

Tal cual §3.2/3.3 del brief original — valores exactos, no aproximados:

- Fondo base: `#0A0B0D`
- Gradiente primario: peach `#FF9B7A` → coral/rosa `#FF6B8A`
- Secundario (púrpura): `#9B5FC0`
- Acento (cyan/menta): `#7BE8E8`
- Texto: blanco roto (headlines), gris medio (body)

Implementadas como CSS custom properties en `app/globals.css` y expuestas a Tailwind
vía `tailwind.config.ts` (`theme.extend.colors`), no hardcodeadas por componente.

## Estructura de componentes

```
app/
  layout.tsx              — fuentes, metadata OG, wrappers globales
  page.tsx                — compone las secciones en orden
  globals.css              — CSS vars de paleta, resets
components/
  loading/LoadingScreen.tsx
  layout/Navbar.tsx
  layout/Footer.tsx
  sections/Hero.tsx
  sections/Features.tsx
  sections/Facciones.tsx        (tabs por categoría)
  sections/Staff.tsx
  sections/TiendaPreview.tsx     (teaser, sin checkout real)
  sections/Reglas.tsx            (timeline numerado + severidad)
  sections/Faq.tsx               (acordeón)
  sections/Testimonios.tsx       (placeholder hasta contenido real)
  sections/Galeria.tsx           (grid placeholder)
  sections/Comunidad.tsx         (placeholder visual, sin fetch)
  sections/Newsletter.tsx        (UI no-op)
  ui/Button.tsx                  (variantes: primary-gradient, outline-purple, outline-cyan)
  ui/Card.tsx
  ui/ImagePlaceholder.tsx        (aspect-ratio fijo + comentario TODO con medida)
  three/HeroToken.tsx            (token 3D, dynamic import)
lib/
  content.ts               — todo el copy placeholder centralizado acá
```

`content.ts` centraliza el copy variable (features, facciones, staff, reglas, FAQ)
en un solo archivo tipado, para que reemplazar texto real después sea editar un
lugar, no rastrear 15 componentes.

## Copy

Se redacta copy placeholder en español rioplatense, tono cercano pero profesional,
consistente con un server QBCore genérico (framework custom, economía, vivienda,
vehículos, eventos, voz por proximidad; facciones: Servicios de Emergencia, Civil,
Criminal, Negocios; staff con alias genéricos; reglas con niveles de severidad; FAQ
sobre whitelist, pagos, entrega automática de tienda, reembolsos, requisitos
técnicos). Todo marcado como reemplazable, sin pretender ser contenido final.

IP del servidor e invite de Discord: placeholder "Próximamente" en la card del hero
y en los CTAs correspondientes, fácil de reemplazar por los datos reales.

## Sistema de imágenes placeholder

Cada espacio de imagen usa `ImagePlaceholder` con:
- `aspect-ratio` fijo vía clase Tailwind (`aspect-[3/2]`, `aspect-square`, etc.)
  según la tabla de medidas del §3.7 del brief original.
- Fondo con degradé de marca o púrpura al 10–15% de opacidad sobre el fondo oscuro,
  sin ícono de "imagen rota" ni stock.
- Comentario `{/* TODO: imagen — <nombre>.png, medidas: <WxH>, ver spec §3.7 */}`
  indicando qué imagen va ahí.
- El logo "BB": como no está disponible el archivo todavía, se usa un wordmark de
  texto tipografiado (Bebas Neue, "BB" o "BARRIO BRAVO") en navbar/loading/footer,
  fácil de swapear por el PNG real más adelante.

## Motion y token 3D

- Fade/slide-in de secciones al entrar en viewport (`framer-motion` + `whileInView`).
- Micro-interacciones en botones/cards: leve scale + glow en hover, no solo cambio
  de color.
- Loading screen: fondo `#0A0B0D`, wordmark de texto, barra de progreso con el
  degradé peach→coral, textos en español ("Cargando...", "Presioná cualquier tecla
  para continuar"), duración mínima real 1.5–2s, skippable con cualquier tecla/click.
- Hero token 3D: geometría tipo moneda con "BB", material con el degradé de marca y
  reflejos púrpura/cyan, rotación idle lenta + reacción leve al mouse. Fallback
  estático (wordmark) si WebGL no está disponible o mientras carga el chunk.

## Responsive

Mobile-first, verificado explícitamente en los 6 breakpoints de Tailwind (base, sm,
md, lg, xl, 2xl) por sección, según la tabla del §9 del brief original. Puntos
específicos: hero apilado en mobile (imagen/token arriba, texto abajo), tabs de
Facciones pasan a scroll horizontal en mobile, navbar colapsa a hamburguesa,
placeholders de imagen mantienen su `aspect-ratio` en todos los tamaños sin
deformarse ni generar layout shift.

## Performance, SEO, accesibilidad

- Lazy load del componente 3D y de imágenes; skeleton simple donde aplique (no hay
  datos async reales en este sub-proyecto, así que esto es mínimo).
- Metadata Open Graph completa (título, descripción, imagen placeholder 1200×630),
  `sitemap.xml` y `robots.txt` básicos.
- Contraste verificado para los 4 colores de marca sobre `#0A0B0D` (el púrpura es el
  más ajustado — usar la variante más clara si hace falta para texto).
- Navegación completa por teclado en tabs de Facciones y acordeón de FAQ.
- `alt` en placeholders describiendo qué imagen va ahí (para cuando se reemplacen).

## Testing / verificación

- `pnpm build` sin errores de tipo/lint.
- Revisión visual manual en los 6 breakpoints (navegador embebido) para cada
  sección, siguiendo la tabla del §9.
- Verificar que ningún texto/botón se corta o superpone, especialmente títulos
  largos en español.
- Verificar navegación por teclado en Facciones (tabs) y FAQ (acordeón).
- No hay tests automatizados de UI en este sub-proyecto (no hay lógica de negocio
  que testear todavía — es presentación estática); se reevalúa cuando se sume lógica
  real en los sub-proyectos siguientes.

## Próximos sub-proyectos (fuera de este spec)

2. Auth + shell de cuenta (Supabase + Discord OAuth, `/mi-cuenta` vacío)
3. Tienda (Mercado Pago, Supabase, webhooks, historial de compras)
4. Perfil de personaje IC (Route Handlers → MySQL QBCore, bloqueado hasta setup
   manual de VPS del §6.3 del brief original)
5. Referidos (se apoya en el shell de cuenta del sub-proyecto 2)
