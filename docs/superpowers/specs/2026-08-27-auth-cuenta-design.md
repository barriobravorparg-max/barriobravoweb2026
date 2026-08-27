# Auth + Shell de Cuenta — Barrio Bravo RP

Sub-proyecto 2 de 5 del ecosistema web de Barrio Bravo RP. Depende de la
Landing pública (sub-proyecto 1, ya completa) y la extiende: reactiva los
botones de login que hoy están deshabilitados y agrega la ruta protegida
`/mi-cuenta`. Los sub-proyectos siguientes (Tienda, Perfil de personaje IC,
Referidos) construyen sobre el shell que define este spec, sin tener que
tocarlo.

## Objetivo

Login con Discord vía Supabase, reflejado en el Navbar de la landing, y un
shell de cuenta (`/mi-cuenta`) protegido por sesión con sus cuatro pestañas
—una con datos reales, tres como estado vacío listo para llenarse en
sub-proyectos futuros.

## Fuera de alcance (explícitamente, para este sub-proyecto)

- Cualquier tabla propia de Postgres o política RLS — Discord OAuth vía
  Supabase ya guarda avatar, username y email en `auth.users` /
  `user_metadata` automáticamente, así que no hace falta un `profiles` propio
  todavía. RLS se vuelve obligatorio (§7.1 del brief original) recién cuando
  aparezca la primera tabla de datos de usuario, en Tienda.
- Datos reales de personaje, historial de compras o VIP — sus pestañas en
  `/mi-cuenta` quedan como estado vacío hasta sus sub-proyectos.
- La `service_role` key y cualquier operación administrativa contra Supabase.
- Sistema de referidos (bolt-on al shell de cuenta, pero es su propio
  sub-proyecto).

## Stack y setup

- `@supabase/supabase-js` + `@supabase/ssr` (patrón recomendado actual para
  Next.js App Router, maneja sesión vía cookies en server y client).
- `lib/supabase/client.ts` — cliente para Client Components (`createBrowserClient`).
- `lib/supabase/server.ts` — cliente para Server Components/Route Handlers
  (`createServerClient`, lee/escribe cookies).
- `middleware.ts` en la raíz — refresca la cookie de sesión en cada request,
  patrón estándar de `@supabase/ssr`. `matcher` excluye `_next/static`,
  `_next/image`, `favicon.ico` y extensiones de imagen comunes, para no
  ejecutar el middleware en cada asset estático — solo en navegaciones
  reales de página.
- Variables de entorno (ya en `.env.local`, gitignored, provistas por el
  usuario): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Solo
  la anon key — es pública por diseño (la seguridad la da RLS, no el
  secreto de la key), la service role nunca se usa en este sub-proyecto.
  Estas mismas variables hay que cargarlas también en Vercel (Project
  Settings → Environment Variables) cuando se despliegue — no es parte de
  este spec, pero queda anotado para no perderlo.
- `next.config.ts`: agregar `images.remotePatterns` para
  `cdn.discordapp.com` (hostname:`cdn.discordapp.com`) — los avatares de
  Discord se sirven desde ahí, y `next/image` tira error en runtime contra
  cualquier hostname externo no declarado explícitamente.

## Flujo de login

1. Usuario hace click en "Conectar"/"Discord" (Navbar o Hero — hoy
   deshabilitados, este sub-proyecto los reactiva).
2. `supabase.auth.signInWithOAuth({ provider: "discord", options: { redirectTo: `${origin}/auth/callback` } })`.
3. Route Handler `app/auth/callback/route.ts` recibe el código de Discord y
   llama `exchangeCodeForSession`. Si tiene éxito, redirige a `/mi-cuenta`.
   Si falla (usuario canceló el login, código inválido, error de Discord),
   redirige a `/?auth_error=1` en vez de dejar la sesión en un estado
   ambiguo — la landing puede leer ese query param y mostrar un aviso
   ("No pudimos conectarte con Discord, probá de nuevo").
4. Logout: botón en el Navbar (desktop y mobile) y en la pestaña "Datos de
   cuenta" llama `supabase.auth.signOut()` y después `router.refresh()`
   (Next.js `useRouter`) para que el Server Component que resuelve la
   sesión del Navbar se vuelva a ejecutar — sin esto, el Navbar quedaría
   mostrando el estado logueado hasta un refresh manual, ya que la sesión
   se resuelve del lado del servidor. Redirige a `/`.

## Integración con el Navbar existente

El Navbar (`components/layout/Navbar.tsx`, de sub-proyecto 1) es un Client
Component con estado local para el menú mobile. Para no filtrar sesión al
cliente antes de tiempo, la sesión se resuelve en un Server Component padre
(`app/layout.tsx` o un wrapper server-only) y se pasa como prop
(`user: { avatarUrl, displayName } | null`) al Navbar client component —
evita el parpadeo de "no logueado" mientras se resuelve la sesión y mantiene
la verificación del lado del servidor.

Para esta resolución server-side se usa `supabase.auth.getSession()`, **no**
`getUser()` — el Navbar aparece en todas las páginas, incluida la landing
pública que ven visitantes anónimos, y `getUser()` hace un round-trip de red
contra Supabase en cada carga. `getSession()` solo lee el JWT ya refrescado
por el middleware, sin costo de red — aceptable acá porque es únicamente
para decidir qué mostrar en la UI, no para autorizar acceso a nada (esa
verificación fuerte con `getUser()` se reserva para el gate real de
`/mi-cuenta`, ver más abajo).

Con sesión: Navbar (desktop y menú mobile) muestra avatar + nombre + link
"Mi Cuenta" + botón "Salir", en vez de los botones "Discord"/"Conectar".
Sin sesión: se mantiene igual que hoy pero los botones quedan habilitados y
disparan el login real.

## Shell de `/mi-cuenta`

- `app/mi-cuenta/page.tsx`, Server Component: valida sesión con
  `supabase.auth.getUser()` (no `getSession()` — acá sí importa la
  verificación fuerte: `getUser()` valida el JWT contra el servidor de
  Supabase en vez de confiar en la cookie tal cual, que es exactamente el
  requisito de "nunca confiar en un discord_id que venga del cliente" del
  §7.1). Sin sesión válida, `redirect("/")`.
- `components/ui/Tabs.tsx`, Client Component nuevo: extrae el patrón de tabs
  accesibles con roving tabindex que hoy vive duplicado dentro de
  `Facciones.tsx` (sub-proyecto 1) a un primitivo genérico reutilizable
  (`items: {id, label}[]`, `activeId`, `onChange`, maneja
  ArrowLeft/ArrowRight con wraparound y `aria-controls`/`aria-labelledby`).
  `Facciones.tsx` se retoca para usar este primitivo en vez de su
  implementación propia — paga la deuda técnica que la revisión final del
  sub-proyecto 1 dejó señalada (extracción de componentes duplicados) sin
  agregarle alcance nuevo a este sub-proyecto.
- `components/account/AccountTabs.tsx`, Client Component: usa `Tabs` con
  cuatro pestañas: **Datos de cuenta**, **Perfil de Personaje**, **Historial
  de compras**, **VIP activo**.
- **Datos de cuenta**: real — avatar (`user_metadata.avatar_url`), nombre de
  Discord (`user_metadata.full_name` o `user_name`), email, botón de logout.
- Las otras tres: `components/ui/EmptyState.tsx` reutilizable (ícono +
  mensaje + nota "Disponible en una próxima actualización"), una instancia
  por pestaña con su propio texto.

## Seguridad

- Sesión verificada server-side con `getUser()` en la página protegida — no
  se confía en cookies sin verificar.
- Middleware refresca la sesión en cada request (patrón estándar
  `@supabase/ssr`), cookies con las flags default de Supabase Auth
  (httpOnly, secure, sameSite).
- Sin `service_role` key en ningún lado del cliente ni variable
  `NEXT_PUBLIC_`.
- Sin tablas propias todavía, así que sin RLS que escribir en este
  sub-proyecto — se retoma explícitamente en el spec de Tienda.

## Testing

- `Tabs.test.tsx`: cambio de pestaña por click, navegación por teclado con
  wraparound, y la transición completa de `aria-selected`/`tabIndex` en
  ambos elementos afectados (no alcanza con probar el contenido visible —
  este fue exactamente el hueco que la revisión de sub-proyecto 1 encontró
  en `Facciones.test.tsx` y hubo que corregir en un fix round).
- `Facciones.test.tsx` (existente): debe seguir pasando sin modificaciones
  después de retocar `Facciones.tsx` para usar `Tabs` — mismo comportamiento
  observable, solo cambia la implementación interna. Si algún test necesita
  ajustarse, es señal de que el refactor cambió comportamiento, no solo
  estructura.
- `AccountTabs.test.tsx`: smoke test de que las 4 pestañas están declaradas
  y cada una renderiza su contenido correspondiente (la lógica de
  interacción ya la cubre `Tabs.test.tsx`).
- `EmptyState.test.tsx`: smoke test de render.
- `Navbar.test.tsx` (extender el existente): con `user` prop en null
  muestra los botones de login habilitados; con `user` prop poblado muestra
  avatar + "Mi Cuenta" + "Salir", tanto en el nav desktop como en el menú
  mobile.
- El flujo real de OAuth con Discord no es testeable de forma automatizada
  (depende de la app de Discord y del redirect real) — se verifica a mano en
  navegador una vez creada la app de Discord.

## Paso manual del usuario (fuera de mi alcance)

Crear la aplicación en el Discord Developer Portal (OAuth2 → redirect URI
apuntando al callback de Supabase, `https://ufuwgdjxrodlwklzlqrx.supabase.co/auth/v1/callback`)
y cargar el Client ID/Secret en Supabase → Authentication → Providers →
Discord. Se guía paso a paso cuando lleguemos a esa parte de la
implementación.

## Próximos sub-proyectos (fuera de este spec)

3. Tienda (Mercado Pago, tabla `pending_deliveries` con RLS, historial de
   compras real en la pestaña correspondiente).
4. Perfil de personaje IC (Route Handlers → MySQL QBCore, llena la pestaña
   "Perfil de Personaje").
5. Referidos (se apoya en este shell de cuenta).
