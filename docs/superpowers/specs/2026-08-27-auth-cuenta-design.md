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
  patrón estándar de `@supabase/ssr`.
- Variables de entorno (ya en `.env.local`, gitignored, provistas por el
  usuario): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Solo
  la anon key — es pública por diseño (la seguridad la da RLS, no el
  secreto de la key), la service role nunca se usa en este sub-proyecto.

## Flujo de login

1. Usuario hace click en "Conectar"/"Discord" (Navbar o Hero — hoy
   deshabilitados, este sub-proyecto los reactiva).
2. `supabase.auth.signInWithOAuth({ provider: "discord", options: { redirectTo: `${origin}/auth/callback` } })`.
3. Route Handler `app/auth/callback/route.ts` recibe el código de Discord,
   llama `exchangeCodeForSession`, y redirige a `/mi-cuenta`.
4. Logout: `supabase.auth.signOut()` desde un botón en el Navbar o en la
   pestaña "Datos de cuenta", redirige a `/`.

## Integración con el Navbar existente

El Navbar (`components/layout/Navbar.tsx`, de sub-proyecto 1) es un Client
Component con estado local para el menú mobile. Para no filtrar sesión al
cliente antes de tiempo, la sesión se resuelve en un Server Component padre
(`app/layout.tsx` o un wrapper server-only) y se pasa como prop
(`user: { avatarUrl, displayName } | null`) al Navbar client component —
evita el parpadeo de "no logueado" mientras se resuelve la sesión y mantiene
la verificación del lado del servidor. Con sesión: muestra avatar + nombre +
link "Mi Cuenta" en vez de los botones "Discord"/"Conectar". Sin sesión: se
mantiene igual que hoy pero los botones quedan habilitados y disparan el
login real.

## Shell de `/mi-cuenta`

- `app/mi-cuenta/page.tsx`, Server Component: valida sesión con
  `supabase.auth.getUser()` (no `getSession()` — `getUser()` verifica el JWT
  contra el servidor de Supabase en vez de confiar en la cookie tal cual,
  que es exactamente el requisito de "nunca confiar en un discord_id que
  venga del cliente" del §7.1). Sin sesión válida, `redirect("/")`.
- `components/account/AccountTabs.tsx`, Client Component: selector de
  pestañas (mismo patrón de tabs accesibles con roving tabindex que
  `Facciones.tsx` de sub-proyecto 1 — reutilizar esa lógica, no reinventarla).
  Cuatro pestañas: **Datos de cuenta**, **Perfil de Personaje**, **Historial
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

- `AccountTabs.test.tsx`: cambio de pestaña, roving tabindex (mismo criterio
  que se exigió en la revisión de `Facciones.test.tsx` — no alcanza con
  probar el contenido visible, hay que probar la transición de
  `aria-selected`/`tabIndex`).
- `EmptyState.test.tsx`: smoke test de render.
- `Navbar.test.tsx` (extender el existente): con `user` prop en null
  muestra los botones de login; con `user` prop poblado muestra avatar +
  "Mi Cuenta".
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
