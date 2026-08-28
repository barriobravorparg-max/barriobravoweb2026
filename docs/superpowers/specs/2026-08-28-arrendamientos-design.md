# Arrendamientos — Barrio Bravo RP

Sub-proyecto nuevo (no numerado en el plan original de 5), intercalado entre
Tienda (sub-proyecto 3) y Perfil de Personaje IC (sub-proyecto 4). Depende
de Tienda: reusa su integración con Mercado Pago, el patrón de tabla con
RLS, y el puente autenticado hacia FiveM — no repite esa infraestructura,
la extiende.

## Objetivo

Vender el control exclusivo y temporal de bandas criminales, negocios y
propiedades por Mercado Pago. A diferencia de VIP/vehículos (que entregan
algo y listo), acá se arrienda un **slot único y compartido**: solo una
persona puede tener cada banda/negocio/propiedad a la vez, por un período
fijo, y si no se renueva antes de vencer, el slot queda disponible de
nuevo para cualquiera.

## Fuera de alcance (explícitamente, para este sub-proyecto)

- **Policía y EMS** — evaluado y descartado. Se consiguen por
  whitelist/postulación como cualquier trabajo civil, no por dinero real
  — es lo que sostiene el posicionamiento de "server serio" del resto del
  sitio.
- **Cobro automático recurrente** — igual que VIP, es pago único por
  período (mensual o semestral). Si el comprador quiere seguir, vuelve a
  pagar antes de que venza. Nada de Preapproval API de Mercado Pago.
- **Catálogo completo de las +250 propiedades de Origen Housing** — se
  vende un catálogo curado (unas pocas propiedades representativas por
  tier de tamaño), no todo el inventario del script.
- **Qué pasa con los miembros de una banda/negocio cuando el líder
  pierde el arrendamiento** — se define en el plan de implementación, no
  acá. La regla de este spec es simple: al vencer, se le saca el grado de
  "boss" al arrendatario y el slot vuelve a estar disponible; el resto
  del personal no se toca.
- **El propio sistema de renta interno de Origen Housing** (el que cobra
  en plata del juego cada cierto tiempo) — no se usa ni se modifica. Es
  un concepto de economía interna del juego, separado del arrendamiento
  con dinero real que define este spec.

## Catálogo y precios

Precios en ARS, calibrados contra un competidor real (La Matanza
Roleplay) que vende el mismo tipo de slot exclusivo — ahí cuestan entre
$25.000 y $45.000 ARS, bastante más que un VIP porque es control de un
negocio entero, no un cosmético. Además, en su sitio cada slot ocupado
muestra un badge "OCUPADO" — confirma que el patrón de exclusividad que
proponemos acá es el estándar del mercado, no una idea nuestra sin
precedente.

### Bandas (las 7 ya listadas en Facciones: Ballas, Families, Vagos, Triads, Marabunta Grande, Lost MC, Aztecas)

| | Mensual | Semestral |
|---|---|---|
| Cualquier banda | $30.000 ARS | $150.000 ARS |

### Negocios

| | Mensual | Semestral |
|---|---|---|
| Casino | $45.000 ARS | $220.000 ARS |
| Vanilla Unicorn / Vanilla Unicorn (Paleto) | $35.000 ARS | $170.000 ARS |
| Taller Bennys / Los Santos Customs | $30.000 ARS | $145.000 ARS |
| Casinos ilegales | $40.000 ARS | $195.000 ARS |

### Propiedades (catálogo curado sobre `origen_housing`, 4 tiers)

| Tier | Mensual |
|---|---|
| Casa chica | $15.000 ARS |
| Casa mediana | $25.000 ARS |
| Casa grande | $40.000 ARS |
| Casa premium (garage 3 pisos) | $60.000 ARS |

Las propiedades solo tienen período mensual en esta primera versión — el
semestral para propiedades queda para más adelante si hace falta.

## Mecánica de ocupación/exclusividad

Cada ítem vendible (banda, negocio, o una propiedad concreta del catálogo
curado) es un **slot** con un dueño o ninguno. La tienda muestra
"Disponible" u "Ocupada hasta [fecha]" por slot — igual que el badge
"OCUPADO" de la competencia. No se puede iniciar una compra de un slot ya
ocupado.

## Modelo de datos (Supabase, extiende el patrón de `purchases` de Tienda)

```sql
create table slots (
  slot_key text primary key,              -- 'ballas', 'families', ..., 'casino', ..., 'casa_chica_1', ...
  slot_type text not null check (slot_type in ('banda', 'negocio', 'propiedad')),
  label text not null,
  occupied_until timestamptz,             -- null = disponible
  current_lease_id uuid
);

create table leases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  discord_id text not null,
  slot_key text not null references slots(slot_key),
  period text not null check (period in ('mensual', 'semestral')),
  mp_payment_id text not null unique,
  amount_ars numeric not null,
  leased_at timestamptz not null default now(),
  expires_at timestamptz not null,        -- leased_at + 1 o 6 meses según period
  delivered_at timestamptz,               -- lo marca el puente de FiveM al aplicar el boss/la propiedad la primera vez
  job_or_property_revoked_at timestamptz  -- lo marca el cron al liberar el slot tras el vencimiento
);

alter table slots enable row level security;
alter table leases enable row level security;

create policy "cualquiera lee disponibilidad de slots"
  on slots for select using (true);

create policy "usuarios leen sus propios arrendamientos"
  on leases for select using (auth.uid() = user_id);

-- Igual que en purchases: sin policy de insert/update para el rol
-- autenticado. Solo service_role (webhook y cron) escribe.
```

`slots` se pre-carga (seed, en el plan de implementación) con las 7
bandas, los 6 negocios, y las propiedades del catálogo curado — no se
crea dinámicamente desde la web.

## Flujo de pago

Mismo patrón que Tienda (Checkout Pro + webhook que re-consulta el pago
contra la API de Mercado Pago antes de confiar en él), con un paso extra
crítico:

1. Antes de crear la preferencia de pago, el servidor chequea
   `slots.occupied_until` del slot elegido — si está ocupado, ni siquiera
   se genera el link de pago.
2. **Condición de carrera:** puede pasar que dos personas empiecen a pagar
   el mismo slot casi al mismo tiempo, y ambos pagos se aprueben. Por eso
   el webhook, al confirmar un pago, vuelve a chequear
   `slots.occupied_until` **dentro de la misma transacción** en la que va
   a insertar el `lease` y actualizar el slot. Si para ese momento el slot
   ya fue tomado por el otro pago (llegó milisegundos antes), este pago
   **no se entrega** — se guarda igual en `leases` pero sin `delivered_at`,
   y queda marcado para revisión manual (reembolso). Es un caso raro
   (compra simultánea del mismo slot) pero hay que manejarlo explícito en
   vez de dejar que rompa la exclusividad.
3. Si el slot sigue disponible: inserta el `lease`, actualiza
   `slots.occupied_until` y `current_lease_id`.
4. Si es una banda o negocio: se dispara la asignación de "boss" del job
   correspondiente en QBCore a través del mismo puente de FiveM que ya
   entrega VIP (ver más abajo). Si es una propiedad: se dispara la
   creación/transferencia de la propiedad vía `origen_housing`.

## Vencimiento y liberación

Mismo Vercel Cron diario que ya revisa VIPs vencidos
(`/api/cron/expire-vips`, se extiende para cubrir `leases` también, o se
suma un segundo cron `/api/cron/expire-leases` — se decide en el plan):

- Busca `leases` con `expires_at` vencido y `job_or_property_revoked_at`
  nulo.
- Le saca el grado de "boss" al arrendatario (banda/negocio) o revoca el
  acceso a la propiedad, vía el puente de FiveM.
- Pone `slots.occupied_until = null` y `current_lease_id = null` — el
  slot vuelve a estar disponible en la tienda.
- Marca `job_or_property_revoked_at = now()` para no reintentar todos los
  días.

## Integración con QBCore (bandas y negocios)

Se asume que cada banda y cada negocio ya es (o va a ser) un job de
QBCore — se confirma cuando se implemente esta parte, junto con los
nombres reales de job. El arrendatario queda como **boss** de ese job
(QBCore ya trae permisos de boss: manejar la cuenta de la sociedad,
contratar/echar personal) — no hace falta construir un panel de gestión
propio, se usa el que ya existe en el framework. Al vencer, se le baja el
grado (vuelve a empleado raso o queda vacante, a definir en el plan); el
resto de los miembros de la banda/negocio no se ve afectado.

## Integración con `origen_housing` (propiedades)

El puente de FiveM (el mismo Next.js API con secreto compartido que ya
diseñamos para VIP) llama a las funciones/exports que expone
`origen_housing` para crear o transferir una propiedad al arrendatario —
el script ya soporta QBCore de forma nativa, y el permiso de "crear
casas" hoy está limitado a admins o al job `realestate`
(`config/permissions.lua`); el resource nuevo necesita ese mismo nivel de
acceso para poder entregar propiedades compradas en la web. Al vencer, se
revoca el acceso (se define el mecanismo exacto —desalojo vs. solo sacar
llaves— en el plan de implementación).

## Web

- Nueva sección/página de Arrendamientos en la Tienda (o una pestaña
  dentro de `/tienda`, se define en el plan): tres categorías (Bandas,
  Negocios, Propiedades), cada ítem muestra "Disponible" o "Ocupada hasta
  [fecha]" — leyendo `slots` (con RLS abierta a lectura para cualquiera,
  no hace falta estar logueado para ver disponibilidad).
- Botón de compra deshabilitado si el slot está ocupado.
- `/mi-cuenta`: los arrendamientos activos del usuario podrían sumarse a
  la pestaña "Historial de compras" ya existente (mismo lugar que las
  compras de VIP/vehículos) — se define en el plan si conviene una
  pestaña separada o no.

## Seguridad

- Mismas reglas que Tienda: Access Token de Mercado Pago y
  `service_role` solo server-side, webhook nunca confía en el body de la
  notificación, secreto compartido para el puente de FiveM.
- La verificación de ocupación dentro de una transacción atómica (ver
  "Flujo de pago") es la pieza de seguridad específica de este
  sub-proyecto — sin eso, dos pagos simultáneos podrían romper la
  exclusividad y dejar un slot con dos "dueños".

## Testing

- Tests del webhook: slot disponible + pago aprobado → se entrega y se
  ocupa; slot ya ocupado al momento de pagar → no se genera ni siquiera
  la preferencia; condición de carrera (dos pagos aprobados casi
  simultáneos para el mismo slot) → el segundo no se entrega y queda
  marcado para revisión.
- Tests de la UI de disponibilidad: slot ocupado deshabilita el botón de
  compra y muestra la fecha de vencimiento.
- El flujo real de asignación de boss en QBCore y de propiedades en
  `origen_housing` no es testeable de forma automatizada — se verifica a
  mano una vez armado el puente de FiveM.

## Pasos manuales del usuario (fuera de mi alcance)

1. Confirmar los nombres reales de job de QBCore para cada banda y cada
   negocio (para mapear `slot_key` → job).
2. Elegir las propiedades concretas del catálogo curado (4 tiers) dentro
   del inventario de `origen_housing`.
3. Los mismos pasos manuales ya listados en la spec de Tienda (cuenta de
   Mercado Pago, bot de Discord) aplican acá también — no hay pasos
   nuevos de Discord para este sub-proyecto.

## Próximos sub-proyectos (fuera de este spec)

- Perfil de personaje IC (sub-proyecto 4 original).
- Referidos (sub-proyecto 5 original).
- Galería en vivo alimentada desde Discord (idea sin diseñar todavía).
