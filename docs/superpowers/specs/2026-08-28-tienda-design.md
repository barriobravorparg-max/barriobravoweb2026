# Tienda — Barrio Bravo RP

Sub-proyecto 3 de 5 del ecosistema web de Barrio Bravo RP. Depende del
shell de cuenta (sub-proyecto 2, ya completo): usa la sesión de Discord ya
resuelta para saber quién compra, y llena la pestaña "Historial de compras"
de `/mi-cuenta` que hoy es un `EmptyState`.

## Objetivo

Catálogo de VIP y vehículos pagables con Mercado Pago, entrega automática
en el servidor de FiveM al confirmarse el pago (sin intervención manual de
un admin), rol de Discord otorgado y revocado automáticamente según el
estado del VIP, e historial de compras real en la cuenta del usuario.

## Fuera de alcance (explícitamente, para este sub-proyecto)

- **Suscripciones recurrentes / cobro automático mensual** — se evaluó y
  se descartó. El VIP se paga de una sola vez por Checkout Pro; si vence,
  el usuario vuelve a comprarlo a mano. Nada de Preapproval API de Mercado
  Pago.
- **Login con Steam** — se evaluó como alternativa a Discord (mirando la
  competencia) y se descartó: Discord ya cubre a jugadores de Steam, Epic
  Games y Rockstar por igual, y ya está construido y probado de punta a
  punta. Podría sumarse como login *adicional* en el futuro, no ahora.
- **Galería de Discord en vivo** — idea que salió de mirar a un
  competidor (fotos posteadas en un canal de Discord que se publican solas
  en la web). Es su propio sub-proyecto futuro, no tiene relación con
  pagos.
- **Catálogo estilo competidor completo** (Organizaciones, Facciones,
  Negocios, Propiedades, Desbaneos, monedas virtuales tipo "LM Coins")
  — el catálogo de este sub-proyecto son dos categorías: **VIP** y
  **Vehículos**. Lo demás queda anotado como posible ampliación futura del
  catálogo, no se construye ahora.
- **Perfil de personaje IC** — su propia pestaña en `/mi-cuenta`, sigue
  siendo `EmptyState` hasta el sub-proyecto 4.
- **Sistema de referidos** — sub-proyecto 5.
- **Reclamo manual/periódico de recompensas** (el patrón "apretá un botón
  cada 30 días para volver a cobrar tu paquete VIP" del script
  `vip_system` existente) — acá el VIP simplemente está activo o vencido;
  no hay ritual de reclamo.
- **Beneficios finales cerrados al 100%** — nombres exactos de accesorios
  de armas (miras, cargadores, silenciadores) e ítem de fichas de casino
  dependen del inventario real del server (`qb-weapons`/`ox_inventory`) y
  quedan como config a completar por el usuario; el resto del catálogo
  (plata, chalecos, armas base, vehículos) sí tiene valores concretos en
  este spec.

## Catálogo

Se decidió separar VIP (rango + plata + cosméticos) de Vehículos
(catálogo aparte, se compran sueltos) después de analizar los precios de
un competidor real (La Matanza Roleplay) — meter un vehículo caro gratis
dentro de un tier VIP barato desvaloriza el vehículo. Precios en ARS
(Mercado Pago Argentina opera en ARS), calibrados por debajo de un
competidor ya establecido por ser un server que recién arranca.

### VIP (pago único, vale para la cuenta de Discord completa, vence a los 30 días)

| | Bronce ($3.000 ARS) | Plata ($7.000 ARS, incluye Bronce) | Oro ($14.000 ARS, incluye Plata) |
|---|---|---|---|
| Efectivo | $15.000 | $35.000 | $75.000 |
| Banco | $10.000 | $25.000 | $50.000 |
| Dinero negro | — | $15.000 | $40.000 |
| Fichas de casino | — | Sí (cantidad: TBD, depende del ítem real) | Sí, más cantidad |
| Chaleco antibalas | x2 | x4 | x6 |
| Arma(s) | `weapon_pistol` + munición + 1 accesorio (TBD) | + `weapon_pumpshotgun` + accesorios (TBD) | + `weapon_carbinerifle` + `weapon_heavypistol`, accesorios completos (TBD) |
| Discord | Rol con color + canal de texto VIP | + categoría privada (texto y voz) | + badge/ícono distintivo |

### Vehículos (catálogo aparte, compra individual, sin vencimiento)

| Vehículo | Modelo (spawn code) | Precio ARS |
|---|---|---|
| Moto | `bati2` (Western Bati) | $3.000 |
| Auto de lujo vanilla | `windsor` (Enus Windsor) | $8.000 |
| Lancha | `marquis` | $10.000 |
| Helicóptero | `supervolito2` | $30.000 |

Todos los modelos son de fábrica (sin tuning), no policiales ni
militares. Los códigos de spawn y de armas salen de la wiki pública de
vehículos/armas de GTA V (compartidos entre RAGE:MP, FiveM y cualquier
mod que use los assets base del juego).

## Flujo de pago (Mercado Pago Checkout Pro)

1. Usuario logueado (Discord/Supabase) elige un ítem del catálogo en
   `/tienda`.
2. Route Handler server-side (`/api/mercadopago/create-preference`) crea
   una preferencia de pago con el Access Token de Mercado Pago (nunca
   expuesto al cliente) y devuelve la URL de checkout hosteada por MP.
3. Usuario paga en la página de Mercado Pago.
4. Mercado Pago notifica por webhook a `/api/mercadopago/webhook`. El
   webhook **no confía en el body de la notificación** — vuelve a
   consultar el pago por ID directo contra la API de Mercado Pago para
   confirmar `status: approved` antes de hacer cualquier cosa. Esto evita
   que alguien falsifique una notificación y se auto-otorgue VIP.
5. Si el pago está aprobado, inserta una fila en `purchases` (ver modelo
   de datos) usando la `service_role` key de Supabase — es la primera vez
   que este proyecto usa `service_role`, y solo se usa server-side, en
   este endpoint.
6. Si el ítem es VIP: llama a la API REST de Discord para asignar el rol
   correspondiente al usuario (ver sección Discord).

Idempotencia: `mp_payment_id` es `UNIQUE` en `purchases` — si Mercado
Pago reintenta la notificación (puede pasar), el segundo intento de
insertar la misma fila falla silenciosamente en vez de duplicar la
entrega.

## Modelo de datos (Supabase)

Primera tabla propia del proyecto, primera vez que se escribe RLS (tal
como estaba previsto desde el spec de Auth).

```sql
create table purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  discord_id text not null,
  item_type text not null check (item_type in ('vip', 'vehicle')),
  item_key text not null,               -- 'bronce' | 'plata' | 'oro' | 'moto' | 'auto' | 'lancha' | 'helicoptero'
  mp_payment_id text not null unique,
  amount_ars numeric not null,
  status text not null default 'approved',
  purchased_at timestamptz not null default now(),
  expires_at timestamptz,               -- solo VIP: purchased_at + 30 días. null para vehículos (no vencen).
  delivered_at timestamptz,             -- lo marca el puente de FiveM cuando el jugador se conecta y recibe el ítem/vehículo la primera vez.
  discord_role_revoked_at timestamptz   -- solo VIP: lo marca el cron diario al revocar el rol tras el vencimiento, para no reintentar el llamado a Discord todos los días sobre la misma compra ya vencida.
);

alter table purchases enable row level security;

create policy "users read own purchases"
  on purchases for select
  using (auth.uid() = user_id);

-- Sin policy de insert/update para el rol autenticado: solo service_role
-- (el webhook) puede escribir. service_role bypassea RLS por diseño.
```

- **Historial de compras** (`/mi-cuenta`): lee `purchases` filtrado por
  `user_id = auth.uid()` — RLS ya lo garantiza, no hace falta filtrar a
  mano.
- **Estado VIP activo**: el tier VIP vigente de una cuenta es el de mayor
  jerarquía entre las filas `item_type = 'vip'` con `expires_at > now()`.
  No se guarda como un campo separado — se calcula en el momento
  (tanto en la pestaña "VIP activo" de `/mi-cuenta` como en el endpoint
  que consulta el resource de FiveM), así nunca se puede desincronizar.

## Integración con Discord (rol automático)

- No hace falta un bot corriendo 24/7 — son llamados puntuales a la API
  REST de Discord (`PUT /guilds/{guild_id}/members/{user_id}/roles/{role_id}`
  para otorgar, `DELETE` con el mismo path para revocar) usando un bot
  token con permiso "Manage Roles", guardado como variable de entorno
  server-only (`DISCORD_BOT_TOKEN`).
- El webhook de Mercado Pago llama a "otorgar" apenas confirma un pago de
  VIP.
- Vercel Cron (`/api/cron/expire-vips`, corre 1 vez por día) busca
  compras VIP con `expires_at` vencido y `discord_role_revoked_at` nulo,
  llama a "revocar", y marca `discord_role_revoked_at = now()` — así una
  compra vencida solo dispara el llamado a Discord una vez, no todos los
  días.
- El usuario crea los roles y la categoría en su servidor de Discord (ya
  lo tenía planeado) y provee los IDs de rol por tier para mapearlos en
  config — guiado paso a paso cuando se llegue a esa parte, mismo patrón
  que la app de Discord OAuth del sub-proyecto 2.

## Puente con FiveM (entrega en el juego)

Se evaluó reusar el resource `vip_system` existente
(`D:\BARRIO2\txData\QBCore_BF699E.base\resources\vip_system`) y se
descartó como sistema completo: usa una tabla MySQL propia indexada por
`citizenid` (nosotros necesitamos por cuenta de Discord), un solo paquete
de recompensas sin tiers, y lo otorga un admin a mano en vez de un pago.
Sí se reaprovechan sus funciones de "cómo dar cosas en QBCore" (plata,
arma con munición, ítems, vehículo con patente registrado en el garage)
como base del resource nuevo.

**Resource nuevo**, se crea en la misma carpeta
(`D:\BARRIO2\txData\QBCore_BF699E.base\resources\`), config-driven por
tier en vez de recompensas fijas.

- Al conectarse un jugador, el resource llama a
  `GET /api/fivem/vip-status?discordId=...` (Next.js), protegido con un
  secreto compartido en el header (`FIVEM_BRIDGE_SECRET`) — Supabase
  nunca se expone al servidor de juego, todo pasa por este endpoint.
- La respuesta: `{ tier: 'bronce'|'plata'|'oro'|null, expiresAt, pendingDeliveries: [...] }`.
  `pendingDeliveries` son compras (VIP o vehículo) con `delivered_at`
  nulo — el endpoint las marca como entregadas al responder (opera de
  forma atómica: si el resource no llega a procesarlas, seguirán
  apareciendo en el próximo request, no se pierden).
- El resource aplica el permiso/rango QBCore correspondiente al tier
  activo (recalculado en cada conexión, no se guarda estado local) y
  entrega los extras de `pendingDeliveries` (plata, armas, chaleco,
  vehículo con patente) usando las funciones portadas de `vip_system`.
- Los nombres de ítem de accesorios de arma y fichas de casino quedan
  como constantes de config a completar por el usuario con los nombres
  reales de su inventario.

## Web

- `components/sections/TiendaPreview.tsx`: dos categorías (VIP,
  Vehículos) con los precios y beneficios de la tabla de arriba,
  reemplaza los botones "Muy pronto" por un botón real que llama a
  `/api/mercadopago/create-preference` y redirige a Mercado Pago.
- `components/account/AccountTabs.tsx`: la pestaña "Historial de compras"
  dejar de ser `EmptyState`, lista las filas de `purchases` del usuario
  (ítem, fecha, estado). La pestaña "VIP activo" muestra el tier vigente
  calculado (o `EmptyState` si no hay ninguno activo).

## Seguridad

- Access Token de Mercado Pago y `service_role` de Supabase: solo
  server-side, nunca en variables `NEXT_PUBLIC_`.
- El webhook jamás confía en el body de la notificación de MP — siempre
  re-consulta el pago por ID contra la API de MP antes de otorgar nada.
- `purchases` tiene RLS: cada usuario solo lee sus propias filas: sin
  policy de insert/update para el rol autenticado, solo `service_role`
  escribe.
- El puente de FiveM usa un secreto compartido (`FIVEM_BRIDGE_SECRET`),
  nunca las credenciales de Supabase — el server de juego no tiene forma
  de leer ni escribir la base de datos directamente.
- `DISCORD_BOT_TOKEN` server-only, con el permiso mínimo necesario
  ("Manage Roles"), nunca expuesto al cliente.

## Testing

- `TiendaPreview.test.tsx`: smoke test de que las dos categorías y sus
  precios se renderizan.
- `AccountTabs.test.tsx` (extender el existente): la pestaña "Historial
  de compras" ahora renderiza filas reales dado un `purchases` mockeado,
  en vez del `EmptyState`.
- Webhook (`/api/mercadopago/webhook`): tests unitarios mockeando la
  respuesta de la API de Mercado Pago — verifica que un pago no aprobado
  no inserta nada, que un `mp_payment_id` repetido no duplica la fila, y
  que un pago aprobado de VIP dispara el llamado a la API de Discord.
- El flujo real de pago con Mercado Pago y la entrega en el juego no son
  testeables de forma automatizada (dependen de la cuenta de Mercado Pago
  real y del server de FiveM) — se verifican a mano, guiado paso a paso,
  una vez creada la cuenta de Mercado Pago y cargados los IDs de rol de
  Discord.

## Pasos manuales del usuario (fuera de mi alcance)

1. Crear la cuenta de Mercado Pago (o cuenta de vendedor si la personal
   no alcanza) y conseguir el Access Token / Public Key.
2. Crear el bot de Discord con permiso "Manage Roles", agregarlo al
   servidor, y pasar el token.
3. Crear los roles y la categoría privada en Discord, pasar los IDs por
   tier.
4. Completar en el resource de FiveM los nombres reales de ítem
   (accesorios de arma, fichas de casino) según su inventario.

Se guía paso a paso cuando lleguemos a cada uno, mismo patrón que
Discord OAuth en el sub-proyecto 2.

## Próximos sub-proyectos (fuera de este spec)

4. Perfil de personaje IC (Route Handlers → MySQL QBCore, llena la
   pestaña "Perfil de Personaje").
5. Referidos (se apoya en el shell de cuenta).
6. (Idea nueva, sin numerar todavía) Galería en vivo alimentada desde
   Discord, con formato propio — evaluada a partir de un competidor,
   pendiente de diseño.
