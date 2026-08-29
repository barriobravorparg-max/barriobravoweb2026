# Arrendamientos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Arrendamientos sub-project — exclusive, time-limited leasing of gangs, businesses, and properties, paid via Mercado Pago, with automatic in-game delivery for businesses (real QBCore jobs) and a staff Discord notification for gangs and properties (whose underlying FiveM scripts are commercially escrowed with no safe programmatic API).

**Architecture:** Reuses every piece of infrastructure the Tienda sub-project already built and shipped (Mercado Pago client, Supabase admin client, the "never trust the webhook body" pattern, Discord role helpers, the FiveM-bridge-with-shared-secret pattern, the daily-cron pattern) rather than rebuilding any of it. Adds a `slots`/`leases` data model with a Postgres RPC function (`claim_slot`) that makes the "is this slot still free?" check and the lease insert atomic under real concurrent load — the spec's core requirement, since two people can pay for the same slot within the same second. Businesses get full automated delivery through an extension of the existing `bb_vip` FiveM resource (QBCore job/boss assignment, not escrowed). Gangs (`op-crime`) and properties (`origen_housing`) are commercially escrowed FiveM scripts with no exports for creating/transferring ownership — delivery for those two categories is a Discord message to a staff channel, not a code path.

**Tech Stack:** Same as Tienda — Next.js 15 App Router Route Handlers, `@supabase/supabase-js` (service_role client) plus a Postgres `plpgsql` function for the transactional slot claim, `mercadopago` SDK, Discord REST API v10, Vitest + Testing Library, FiveM/QBCore Lua (manually verified, no automated tests).

**Spec:** `docs/superpowers/specs/2026-08-28-arrendamientos-design.md`

## Global Constraints

- All prices are in ARS — never show or charge USD.
- Every new server-only env var (`DISCORD_STAFF_CHANNEL_ID`) is server-only — never `NEXT_PUBLIC_`, never referenced from a Client Component.
- The lease webhook never trusts the notification body — it always re-fetches the payment by ID from Mercado Pago's API before acting on it (same rule as Tienda's webhook).
- `leases` has Row Level Security — a user can only `select` their own rows; `slots` has RLS with an open `select` policy (availability is public, no login needed to see what's taken) but no insert/update policy for the authenticated role either. Only `service_role` writes to both.
- `mp_payment_id` is `unique` on `leases` — every write path must treat a duplicate-key error as "already processed," not a failure.
- The occupancy check that actually matters is the one inside `claim_slot` (a single Postgres transaction with a row lock) — the pre-checkout check in `create-lease-preference` is a UX nicety only, never the real enforcement.
- Do not attempt to call into `op-crime` or `origen_housing`'s server-side Lua, and do not attempt to read/decrypt their escrowed files — both are confirmed Cfx.re asset-escrowed, and their licenses explicitly forbid reverse engineering. Delivery for gang and property leases is a Discord staff notification, full stop.
- All user-facing copy is Spanish (Rioplatense/voseo), matching the rest of the site.
- Before every commit: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint` must all pass.

---

## Task 1: Catálogo de bandas, negocios y propiedades

**Files:**
- Modify: `lib/content.ts`
- Create: `lib/leases/catalog.ts`
- Test: `lib/leases/catalog.test.ts`

**Interfaces:**
- Produces: `export type SlotType = "banda" | "negocio" | "propiedad"`, `export type Period = "mensual" | "semestral"`, `export interface LeaseSlotDef { slotKey: string; slotType: SlotType; label: string; priceMensual: number; priceSemestral: number | null; jobName?: string; jobBossGrade?: number }`, `export const bandas: LeaseSlotDef[]`, `export const negocios: LeaseSlotDef[]`, `export const propiedades: LeaseSlotDef[]`, `export function findLeaseSlot(slotKey: string): LeaseSlotDef | null`, `export function getLeasePrice(slot: LeaseSlotDef, period: Period): number | null`, `export const PERIOD_DAYS: Record<Period, number>`

- [ ] **Step 1: Agregar los tipos y el catálogo a `lib/content.ts`**

Agregar cerca de los otros tipos/interfaces del archivo (no tocar nada existente):

```ts
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
```

- [ ] **Step 2: Escribir el test de `lib/leases/catalog.ts` (falla porque el archivo no existe)**

```ts
// lib/leases/catalog.test.ts
import { describe, expect, it } from "vitest";
import { findLeaseSlot, getLeasePrice, PERIOD_DAYS } from "./catalog";

describe("findLeaseSlot", () => {
  it("finds a banda by key", () => {
    expect(findLeaseSlot("families")?.label).toBe("Families");
  });

  it("finds a negocio by key", () => {
    const slot = findLeaseSlot("casino");
    expect(slot?.label).toBe("Casino");
    expect(slot?.jobName).toBe("casino");
    expect(slot?.jobBossGrade).toBe(4);
  });

  it("finds a propiedad by key", () => {
    expect(findLeaseSlot("casa_premium")?.label).toBe("Casa premium");
  });

  it("returns null for an unknown slot key", () => {
    expect(findLeaseSlot("no-existe")).toBeNull();
  });
});

describe("getLeasePrice", () => {
  it("returns the monthly price for a banda", () => {
    const slot = findLeaseSlot("ballas")!;
    expect(getLeasePrice(slot, "mensual")).toBe(30000);
  });

  it("returns the semestral price for a negocio", () => {
    const slot = findLeaseSlot("vanilla_unicorn")!;
    expect(getLeasePrice(slot, "semestral")).toBe(170000);
  });

  it("returns null for semestral on a propiedad (not offered)", () => {
    const slot = findLeaseSlot("casa_chica")!;
    expect(getLeasePrice(slot, "semestral")).toBeNull();
  });
});

describe("PERIOD_DAYS", () => {
  it("maps mensual to 30 days and semestral to 180", () => {
    expect(PERIOD_DAYS.mensual).toBe(30);
    expect(PERIOD_DAYS.semestral).toBe(180);
  });
});
```

- [ ] **Step 3: Correr el test y verificar que falla**

Run: `npx vitest run lib/leases/catalog.test.ts`
Expected: FAIL — no se encuentra el módulo `./catalog`.

- [ ] **Step 4: Implementar `lib/leases/catalog.ts`**

```ts
import { bandas, negocios, propiedades, type LeaseSlotDef, type Period } from "@/lib/content";

const ALL_SLOTS: LeaseSlotDef[] = [...bandas, ...negocios, ...propiedades];

export function findLeaseSlot(slotKey: string): LeaseSlotDef | null {
  return ALL_SLOTS.find((s) => s.slotKey === slotKey) ?? null;
}

export function getLeasePrice(slot: LeaseSlotDef, period: Period): number | null {
  return period === "mensual" ? slot.priceMensual : slot.priceSemestral;
}

export const PERIOD_DAYS: Record<Period, number> = {
  mensual: 30,
  semestral: 180,
};
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `npx vitest run lib/leases/catalog.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/content.ts lib/leases/catalog.ts lib/leases/catalog.test.ts
git commit -m "feat: add the bandas/negocios/propiedades catalog"
```

---

## Task 2: Tabla `slots`/`leases` + función `claim_slot` (con RLS)

**Files:**
- Create: `supabase/migrations/0002_slots_leases.sql`

**Interfaces:**
- Produces: tablas `slots` (slot_key, slot_type, label, occupied_until, current_lease_id) y `leases` (id, user_id, discord_id, slot_key, period, mp_payment_id, amount_ars, leased_at, expires_at, delivered_at, job_or_property_revoked_at), y la función `claim_slot(p_slot_key, p_user_id, p_discord_id, p_period, p_mp_payment_id, p_amount_ars, p_expires_at) returns table(claimed boolean, lease_id uuid)` — todas las tareas siguientes dependen de estos nombres exactos.

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- supabase/migrations/0002_slots_leases.sql
create table if not exists slots (
  slot_key text primary key,
  slot_type text not null check (slot_type in ('banda', 'negocio', 'propiedad')),
  label text not null,
  occupied_until timestamptz,
  current_lease_id uuid
);

create table if not exists leases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  discord_id text not null,
  slot_key text not null references slots(slot_key),
  period text not null check (period in ('mensual', 'semestral')),
  mp_payment_id text not null unique,
  amount_ars numeric not null,
  leased_at timestamptz not null default now(),
  expires_at timestamptz not null,
  delivered_at timestamptz,
  job_or_property_revoked_at timestamptz
);

alter table slots enable row level security;
alter table leases enable row level security;

drop policy if exists "cualquiera lee disponibilidad de slots" on slots;
create policy "cualquiera lee disponibilidad de slots"
  on slots for select using (true);

drop policy if exists "usuarios leen sus propios arrendamientos" on leases;
create policy "usuarios leen sus propios arrendamientos"
  on leases for select using (auth.uid() = user_id);

-- Igual que purchases: sin policy de insert/update para el rol autenticado.
-- Solo service_role (webhook y cron) escribe.

-- Chequea ocupación e inserta el lease dentro de una sola transacción,
-- usando un row lock (`for update`) sobre la fila del slot para serializar
-- dos pagos casi simultáneos del mismo slot — el segundo que llega espera
-- el lock, y cuando lo obtiene ya ve el slot recién ocupado por el primero.
create or replace function claim_slot(
  p_slot_key text,
  p_user_id uuid,
  p_discord_id text,
  p_period text,
  p_mp_payment_id text,
  p_amount_ars numeric,
  p_expires_at timestamptz
) returns table(claimed boolean, lease_id uuid) as $$
declare
  v_occupied_until timestamptz;
  v_lease_id uuid;
begin
  select occupied_until into v_occupied_until
  from slots
  where slot_key = p_slot_key
  for update;

  if v_occupied_until is not null and v_occupied_until > now() then
    insert into leases (user_id, discord_id, slot_key, period, mp_payment_id, amount_ars, expires_at)
    values (p_user_id, p_discord_id, p_slot_key, p_period, p_mp_payment_id, p_amount_ars, p_expires_at)
    returning id into v_lease_id;

    return query select false, v_lease_id;
    return;
  end if;

  insert into leases (user_id, discord_id, slot_key, period, mp_payment_id, amount_ars, expires_at)
  values (p_user_id, p_discord_id, p_slot_key, p_period, p_mp_payment_id, p_amount_ars, p_expires_at)
  returning id into v_lease_id;

  update slots
  set occupied_until = p_expires_at, current_lease_id = v_lease_id
  where slot_key = p_slot_key;

  return query select true, v_lease_id;
end;
$$ language plpgsql security definer;

insert into slots (slot_key, slot_type, label) values
  ('ballas', 'banda', 'Ballas'),
  ('families', 'banda', 'Families'),
  ('vagos', 'banda', 'Vagos'),
  ('triads', 'banda', 'Triads'),
  ('marabunta_grande', 'banda', 'Marabunta Grande'),
  ('lost_mc', 'banda', 'Lost MC'),
  ('aztecas', 'banda', 'Aztecas'),
  ('casino', 'negocio', 'Casino'),
  ('vanilla_unicorn', 'negocio', 'Vanilla Unicorn'),
  ('taller_bennys', 'negocio', 'Taller Bennys'),
  ('los_santos_customs', 'negocio', 'Los Santos Customs'),
  ('casinos_ilegales', 'negocio', 'Casinos ilegales'),
  ('casa_chica', 'propiedad', 'Casa chica'),
  ('casa_mediana', 'propiedad', 'Casa mediana'),
  ('casa_grande', 'propiedad', 'Casa grande'),
  ('casa_premium', 'propiedad', 'Casa premium')
on conflict (slot_key) do nothing;
```

- [ ] **Step 2: Correr la migración a mano en Supabase (paso manual, no automatizable)**

SQL Editor del proyecto de Supabase → pegar el contenido completo del archivo → Run.

Verify: en Table Editor aparecen `slots` (16 filas ya cargadas) y `leases` (vacía) con RLS "Enabled". En Database → Functions, aparece `claim_slot`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0002_slots_leases.sql
git commit -m "feat: add slots/leases tables, the claim_slot RPC, and seed the 16 slots"
```

---

## Task 3: Aviso a Discord para el staff

**Files:**
- Create: `lib/discord/notify.ts`
- Test: `lib/discord/notify.test.ts`

**Interfaces:**
- Produces: `export function notifyStaffChannel(content: string): Promise<void>` — usado por el webhook de leases (Task 6) y el cron de vencimiento (Task 8) para avisar de compras/vencimientos de bandas y propiedades.

- [ ] **Step 1: Escribir el test (falla porque el archivo no existe)**

```ts
// lib/discord/notify.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { notifyStaffChannel } from "./notify";

describe("notifyStaffChannel", () => {
  const originalToken = process.env.DISCORD_BOT_TOKEN;
  const originalChannel = process.env.DISCORD_STAFF_CHANNEL_ID;

  beforeEach(() => {
    process.env.DISCORD_BOT_TOKEN = "bot-token";
    process.env.DISCORD_STAFF_CHANNEL_ID = "channel-1";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200 }));
  });

  afterEach(() => {
    process.env.DISCORD_BOT_TOKEN = originalToken;
    process.env.DISCORD_STAFF_CHANNEL_ID = originalChannel;
    vi.unstubAllGlobals();
  });

  it("POSTs the message to the staff channel", async () => {
    await notifyStaffChannel("hola staff");
    expect(fetch).toHaveBeenCalledWith("https://discord.com/api/v10/channels/channel-1/messages", {
      method: "POST",
      headers: { Authorization: "Bot bot-token", "Content-Type": "application/json" },
      body: JSON.stringify({ content: "hola staff" }),
    });
  });

  it("throws when the Discord API responds with an error status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    await expect(notifyStaffChannel("hola")).rejects.toThrow(/403/);
  });

  it("throws when DISCORD_STAFF_CHANNEL_ID is missing", async () => {
    delete process.env.DISCORD_STAFF_CHANNEL_ID;
    await expect(notifyStaffChannel("hola")).rejects.toThrow(/DISCORD_STAFF_CHANNEL_ID/);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run lib/discord/notify.test.ts`
Expected: FAIL — no se encuentra el módulo `./notify`.

- [ ] **Step 3: Implementar `lib/discord/notify.ts`**

```ts
const DISCORD_API = "https://discord.com/api/v10";

export async function notifyStaffChannel(content: string): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_STAFF_CHANNEL_ID;

  if (!token || !channelId) {
    throw new Error("Falta DISCORD_BOT_TOKEN o DISCORD_STAFF_CHANNEL_ID");
  }

  const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    throw new Error(`Discord API respondió ${res.status} al notificar al canal de staff`);
  }
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run lib/discord/notify.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/discord/notify.ts lib/discord/notify.test.ts
git commit -m "feat: add a Discord staff-channel notifier for gang/property lease events"
```

---

## Task 4: Preferencia de pago de arrendamiento

**Files:**
- Create: `lib/mercadopago/lease-preference.ts`
- Test: `lib/mercadopago/lease-preference.test.ts`

**Interfaces:**
- Consumes: `getMercadoPagoClient` de `@/lib/mercadopago/client` (ya existe, no modificar), `SITE_URL` de `@/lib/site`, `Period` de `@/lib/content`
- Produces: `export function createLeasePreference(input: { userId: string; discordId: string; slotKey: string; period: Period; label: string; priceArs: number }): Promise<string>`

- [ ] **Step 1: Escribir el test (falla porque el archivo no existe)**

```ts
// lib/mercadopago/lease-preference.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";

const createMock = vi.fn();

vi.mock("mercadopago", () => ({
  MercadoPagoConfig: vi.fn(),
  Preference: vi.fn().mockImplementation(() => ({ create: createMock })),
}));

import { createLeasePreference } from "./lease-preference";

describe("createLeasePreference", () => {
  beforeEach(() => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "test-token";
    createMock.mockReset();
  });

  it("returns the checkout URL and sends the lease-specific webhook and metadata", async () => {
    createMock.mockResolvedValue({ init_point: "https://mp.example/checkout/lease-1" });

    const url = await createLeasePreference({
      userId: "u1",
      discordId: "d1",
      slotKey: "families",
      period: "mensual",
      label: "Families",
      priceArs: 30000,
    });

    expect(url).toBe("https://mp.example/checkout/lease-1");
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          items: [expect.objectContaining({ unit_price: 30000, currency_id: "ARS" })],
          metadata: { user_id: "u1", discord_id: "d1", slot_key: "families", period: "mensual" },
          notification_url: expect.stringContaining("/api/mercadopago/webhook-leases"),
        }),
      })
    );
  });

  it("throws when Mercado Pago doesn't return an init_point", async () => {
    createMock.mockResolvedValue({});
    await expect(
      createLeasePreference({ userId: "u1", discordId: "d1", slotKey: "families", period: "mensual", label: "Families", priceArs: 30000 })
    ).rejects.toThrow(/checkout/);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run lib/mercadopago/lease-preference.test.ts`
Expected: FAIL — no se encuentra el módulo `./lease-preference`.

- [ ] **Step 3: Implementar `lib/mercadopago/lease-preference.ts`**

```ts
import { Preference } from "mercadopago";
import { getMercadoPagoClient } from "./client";
import { SITE_URL } from "@/lib/site";
import type { Period } from "@/lib/content";

export interface CreateLeasePreferenceInput {
  userId: string;
  discordId: string;
  slotKey: string;
  period: Period;
  label: string;
  priceArs: number;
}

export async function createLeasePreference(input: CreateLeasePreferenceInput): Promise<string> {
  const preference = new Preference(getMercadoPagoClient());

  const result = await preference.create({
    body: {
      items: [
        {
          id: input.slotKey,
          title: `${input.label} (${input.period})`,
          quantity: 1,
          unit_price: input.priceArs,
          currency_id: "ARS",
        },
      ],
      metadata: {
        user_id: input.userId,
        discord_id: input.discordId,
        slot_key: input.slotKey,
        period: input.period,
      },
      back_urls: {
        success: `${SITE_URL}/mi-cuenta?lease=success`,
        failure: `${SITE_URL}/mi-cuenta?lease=failure`,
        pending: `${SITE_URL}/mi-cuenta?lease=pending`,
      },
      notification_url: `${SITE_URL}/api/mercadopago/webhook-leases`,
    },
  });

  if (!result.init_point) {
    throw new Error("Mercado Pago no devolvió una URL de checkout");
  }

  return result.init_point;
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run lib/mercadopago/lease-preference.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/mercadopago/lease-preference.ts lib/mercadopago/lease-preference.test.ts
git commit -m "feat: add Mercado Pago preference creation for lease purchases"
```

---

## Task 5: `POST /api/mercadopago/create-lease-preference`

**Files:**
- Create: `app/api/mercadopago/create-lease-preference/route.ts`
- Test: `app/api/mercadopago/create-lease-preference/route.test.ts`

**Interfaces:**
- Consumes: `createClient` de `@/lib/supabase/server`, `getDiscordId` de `@/lib/supabase/user` (ya existe), `findLeaseSlot`/`getLeasePrice` de `@/lib/leases/catalog` (Task 1), `createAdminClient` de `@/lib/supabase/admin` (ya existe), `createLeasePreference` de `@/lib/mercadopago/lease-preference` (Task 4)
- Produces: `POST` handler que devuelve `{ checkoutUrl: string }` con 200, o `{ error: string }` con 401/400/404/409

- [ ] **Step 1: Escribir el test (falla porque el archivo no existe)**

```ts
// app/api/mercadopago/create-lease-preference/route.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ auth: { getUser: () => getUserMock() } }),
}));

const maybeSingleMock = vi.fn();
const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const selectMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock }),
}));

const createLeasePreferenceMock = vi.fn();
vi.mock("@/lib/mercadopago/lease-preference", () => ({
  createLeasePreference: (input: unknown) => createLeasePreferenceMock(input),
}));

import { POST } from "./route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/mercadopago/create-lease-preference", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/mercadopago/create-lease-preference", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    createLeasePreferenceMock.mockReset();
    maybeSingleMock.mockReset();
    maybeSingleMock.mockResolvedValue({ data: { occupied_until: null }, error: null });
    getUserMock.mockResolvedValue({ data: { user: { id: "u1", user_metadata: { provider_id: "d1" } } } });
  });

  it("returns 401 when there is no session", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeRequest({ slotKey: "families", period: "mensual" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid period", async () => {
    const res = await POST(makeRequest({ slotKey: "families", period: "semanal" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown slot key", async () => {
    const res = await POST(makeRequest({ slotKey: "no-existe", period: "mensual" }));
    expect(res.status).toBe(404);
  });

  it("returns 400 when semestral is requested for a propiedad (not offered)", async () => {
    const res = await POST(makeRequest({ slotKey: "casa_chica", period: "semestral" }));
    expect(res.status).toBe(400);
  });

  it("returns 409 when the slot is already occupied", async () => {
    maybeSingleMock.mockResolvedValue({ data: { occupied_until: new Date(Date.now() + 10_000).toISOString() }, error: null });
    const res = await POST(makeRequest({ slotKey: "families", period: "mensual" }));
    expect(res.status).toBe(409);
  });

  it("creates a preference and returns the checkout URL when the slot is free", async () => {
    createLeasePreferenceMock.mockResolvedValue("https://mp.example/checkout/lease-1");

    const res = await POST(makeRequest({ slotKey: "families", period: "mensual" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ checkoutUrl: "https://mp.example/checkout/lease-1" });
    expect(createLeasePreferenceMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", discordId: "d1", slotKey: "families", period: "mensual", priceArs: 30000 })
    );
  });

  it("treats an already-expired occupied_until as available", async () => {
    maybeSingleMock.mockResolvedValue({ data: { occupied_until: new Date(Date.now() - 10_000).toISOString() }, error: null });
    createLeasePreferenceMock.mockResolvedValue("https://mp.example/checkout/lease-2");

    const res = await POST(makeRequest({ slotKey: "families", period: "mensual" }));
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run app/api/mercadopago/create-lease-preference/route.test.ts`
Expected: FAIL — no se encuentra el módulo `./route`.

- [ ] **Step 3: Implementar `app/api/mercadopago/create-lease-preference/route.ts`**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDiscordId } from "@/lib/supabase/user";
import { findLeaseSlot, getLeasePrice } from "@/lib/leases/catalog";
import { createAdminClient } from "@/lib/supabase/admin";
import { createLeasePreference } from "@/lib/mercadopago/lease-preference";
import type { Period } from "@/lib/content";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const discordId = getDiscordId(user);
  if (!discordId) {
    return NextResponse.json({ error: "No se encontró el Discord ID de la cuenta" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const slotKey = body?.slotKey as string | undefined;
  const period = body?.period as Period | undefined;

  if (!slotKey || (period !== "mensual" && period !== "semestral")) {
    return NextResponse.json({ error: "slotKey o period inválido" }, { status: 400 });
  }

  const slot = findLeaseSlot(slotKey);
  if (!slot) {
    return NextResponse.json({ error: "Slot no encontrado" }, { status: 404 });
  }

  const price = getLeasePrice(slot, period);
  if (price === null) {
    return NextResponse.json({ error: "Ese período no está disponible para este ítem" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: slotRow, error } = await admin.from("slots").select("occupied_until").eq("slot_key", slotKey).maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const occupiedUntilMs = slotRow?.occupied_until ? new Date(slotRow.occupied_until).getTime() : 0;
  if (occupiedUntilMs > Date.now()) {
    return NextResponse.json({ error: "Ese slot ya está ocupado" }, { status: 409 });
  }

  const checkoutUrl = await createLeasePreference({
    userId: user.id,
    discordId,
    slotKey,
    period,
    label: slot.label,
    priceArs: price,
  });

  return NextResponse.json({ checkoutUrl });
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run app/api/mercadopago/create-lease-preference/route.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/mercadopago/create-lease-preference
git commit -m "feat: add the create-lease-preference API route"
```

---

## Task 6: `POST /api/mercadopago/webhook-leases`

**Files:**
- Create: `app/api/mercadopago/webhook-leases/route.ts`
- Test: `app/api/mercadopago/webhook-leases/route.test.ts`

**Interfaces:**
- Consumes: `getPayment` de `@/lib/mercadopago/payment` (ya existe), `findLeaseSlot`/`getLeasePrice`/`PERIOD_DAYS` de `@/lib/leases/catalog` (Task 1), `createAdminClient` de `@/lib/supabase/admin` (ya existe, usa `.rpc("claim_slot", ...)` — Task 2), `notifyStaffChannel` de `@/lib/discord/notify` (Task 3)
- Produces: `POST` handler que llama a `claim_slot`, avisa al staff por banda/propiedad, y siempre responde 200 salvo error real de base de datos.

- [ ] **Step 1: Escribir el test (falla porque el archivo no existe)**

```ts
// app/api/mercadopago/webhook-leases/route.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const getPaymentMock = vi.fn();
vi.mock("@/lib/mercadopago/payment", () => ({
  getPayment: (id: string) => getPaymentMock(id),
}));

const rpcMock = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: rpcMock }),
}));

const notifyStaffChannelMock = vi.fn();
vi.mock("@/lib/discord/notify", () => ({
  notifyStaffChannel: (content: string) => notifyStaffChannelMock(content),
}));

import { POST } from "./route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/mercadopago/webhook-leases", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/mercadopago/webhook-leases", () => {
  beforeEach(() => {
    getPaymentMock.mockReset();
    rpcMock.mockReset();
    notifyStaffChannelMock.mockReset();
    notifyStaffChannelMock.mockResolvedValue(undefined);
  });

  it("ignores payments that are not approved", async () => {
    getPaymentMock.mockResolvedValue({ id: 1, status: "pending", metadata: {} });
    const res = await POST(makeRequest({ data: { id: "1" } }));
    expect(res.status).toBe(200);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("claims the slot and notifies staff for a banda purchase", async () => {
    getPaymentMock.mockResolvedValue({
      id: 42,
      status: "approved",
      metadata: { user_id: "u1", discord_id: "d1", slot_key: "families", period: "mensual" },
    });
    rpcMock.mockResolvedValue({ data: [{ claimed: true, lease_id: "l1" }], error: null });

    const res = await POST(makeRequest({ data: { id: "42" } }));

    expect(res.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledWith(
      "claim_slot",
      expect.objectContaining({ p_slot_key: "families", p_user_id: "u1", p_discord_id: "d1", p_period: "mensual", p_mp_payment_id: "42", p_amount_ars: 30000 })
    );
    expect(notifyStaffChannelMock).toHaveBeenCalledWith(expect.stringContaining("Families"));
  });

  it("does not notify staff for a negocio purchase (delivered automatically)", async () => {
    getPaymentMock.mockResolvedValue({
      id: 43,
      status: "approved",
      metadata: { user_id: "u1", discord_id: "d1", slot_key: "casino", period: "mensual" },
    });
    rpcMock.mockResolvedValue({ data: [{ claimed: true, lease_id: "l2" }], error: null });

    await POST(makeRequest({ data: { id: "43" } }));

    expect(notifyStaffChannelMock).not.toHaveBeenCalled();
  });

  it("treats a duplicate mp_payment_id as already processed instead of erroring", async () => {
    getPaymentMock.mockResolvedValue({
      id: 42,
      status: "approved",
      metadata: { user_id: "u1", discord_id: "d1", slot_key: "families", period: "mensual" },
    });
    rpcMock.mockResolvedValue({ data: null, error: { code: "23505", message: "duplicate key" } });

    const res = await POST(makeRequest({ data: { id: "42" } }));

    expect(res.status).toBe(200);
    expect(notifyStaffChannelMock).not.toHaveBeenCalled();
  });

  it("handles the race-condition case (claimed: false) by notifying staff for manual review instead of delivering", async () => {
    getPaymentMock.mockResolvedValue({
      id: 44,
      status: "approved",
      metadata: { user_id: "u1", discord_id: "d1", slot_key: "families", period: "mensual" },
    });
    rpcMock.mockResolvedValue({ data: [{ claimed: false, lease_id: "l3" }], error: null });

    const res = await POST(makeRequest({ data: { id: "44" } }));

    expect(res.status).toBe(200);
    expect(notifyStaffChannelMock).toHaveBeenCalledWith(expect.stringContaining("ya estaba ocupado"));
  });

  it("returns 500 for a real database error", async () => {
    getPaymentMock.mockResolvedValue({
      id: 45,
      status: "approved",
      metadata: { user_id: "u1", discord_id: "d1", slot_key: "families", period: "mensual" },
    });
    rpcMock.mockResolvedValue({ data: null, error: { code: "42P01", message: "relation does not exist" } });

    const res = await POST(makeRequest({ data: { id: "45" } }));

    expect(res.status).toBe(500);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run app/api/mercadopago/webhook-leases/route.test.ts`
Expected: FAIL — no se encuentra el módulo `./route`.

- [ ] **Step 3: Implementar `app/api/mercadopago/webhook-leases/route.ts`**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { getPayment } from "@/lib/mercadopago/payment";
import { findLeaseSlot, getLeasePrice, PERIOD_DAYS } from "@/lib/leases/catalog";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyStaffChannel } from "@/lib/discord/notify";
import type { Period } from "@/lib/content";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (body?.type && body.type !== "payment") {
    return NextResponse.json({ ok: true });
  }

  const paymentId = body?.data?.id as string | undefined;
  if (!paymentId) {
    return NextResponse.json({ ok: true });
  }

  const payment = await getPayment(paymentId);
  if (payment.status !== "approved") {
    return NextResponse.json({ ok: true });
  }

  const metadata = payment.metadata;
  const userId = metadata.user_id as string | undefined;
  const discordId = metadata.discord_id as string | undefined;
  const slotKey = metadata.slot_key as string | undefined;
  const period = metadata.period as Period | undefined;

  if (!userId || !discordId || !slotKey || !period) {
    return NextResponse.json({ ok: true });
  }

  const slot = findLeaseSlot(slotKey);
  if (!slot) {
    return NextResponse.json({ ok: true });
  }

  const price = getLeasePrice(slot, period);
  if (price === null) {
    return NextResponse.json({ ok: true });
  }

  const expiresAt = new Date(Date.now() + PERIOD_DAYS[period] * 24 * 60 * 60 * 1000).toISOString();

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_slot", {
    p_slot_key: slotKey,
    p_user_id: userId,
    p_discord_id: discordId,
    p_period: period,
    p_mp_payment_id: String(payment.id),
    p_amount_ars: price,
    p_expires_at: expiresAt,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const result = (data ?? [])[0] as { claimed: boolean; lease_id: string } | undefined;

  if (!result?.claimed) {
    console.error("[webhook-leases] Slot ya ocupado al confirmar el pago — revisar a mano", {
      slotKey,
      discordId,
      mpPaymentId: String(payment.id),
    });
    try {
      await notifyStaffChannel(
        `⚠️ Pago de "${slot.label}" confirmado pero el slot ya estaba ocupado (condición de carrera). Revisar manualmente — posible reembolso. Discord: <@${discordId}>, pago: ${payment.id}.`
      );
    } catch (notifyError) {
      console.error("[webhook-leases] Falló notifyStaffChannel (condición de carrera)", notifyError);
    }
    return NextResponse.json({ ok: true });
  }

  if (slot.slotType === "banda" || slot.slotType === "propiedad") {
    const action = slot.slotType === "banda" ? "asignarle el liderazgo en /crimeadmin" : "crear/transferir la propiedad en el juego";
    try {
      await notifyStaffChannel(
        `✅ Nueva compra de "${slot.label}" — hay que ${action}. Discord: <@${discordId}>, vence: ${expiresAt}.`
      );
    } catch (notifyError) {
      console.error("[webhook-leases] Falló notifyStaffChannel", notifyError);
    }
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run app/api/mercadopago/webhook-leases/route.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/mercadopago/webhook-leases
git commit -m "feat: add the lease webhook (claims the slot atomically, notifies staff for gangs/properties)"
```

---

## Task 7: `GET /api/fivem/negocio-status` (puente automático para negocios)

**Files:**
- Create: `app/api/fivem/negocio-status/route.ts`
- Test: `app/api/fivem/negocio-status/route.test.ts`

**Interfaces:**
- Consumes: `createAdminClient` de `@/lib/supabase/admin` (ya existe), `negocios` de `@/lib/content` (Task 1)
- Produces: `GET` handler que responde `{ activeNegocioJobs: { jobName: string; bossGrade: number }[] }` — el resource de FiveM (Task 12) consume exactamente esta forma. A diferencia de `vip-status`, acá no hay un concepto de "entrega pendiente" que marcar: asignar el grado de boss vía `SetJob` es idempotente y se recalcula en vivo en cada conexión a partir de qué leases de negocio siguen vigentes — no hace falta (ni tiene sentido) un flag de "ya entregado" separado.

- [ ] **Step 1: Escribir el test (falla porque el archivo no existe)**

```ts
// app/api/fivem/negocio-status/route.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const selectResult: { data: unknown[]; error: { message: string } | null } = { data: [], error: null };

const eqMock = vi.fn(() => Promise.resolve(selectResult));
const selectMock = vi.fn(() => ({ eq: eqMock }));

const fromMock = vi.fn(() => ({ select: selectMock }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock }),
}));

import { GET } from "./route";

function makeRequest(discordId: string | null, secret: string | null) {
  const url = discordId
    ? `http://localhost/api/fivem/negocio-status?discordId=${discordId}`
    : "http://localhost/api/fivem/negocio-status";
  const headers = new Headers();
  if (secret) headers.set("x-fivem-secret", secret);
  return new NextRequest(url, { headers });
}

describe("GET /api/fivem/negocio-status", () => {
  beforeEach(() => {
    process.env.FIVEM_BRIDGE_SECRET = "bridge-secret";
    selectResult.data = [];
    selectResult.error = null;
  });

  it("rejects requests without the correct shared secret", async () => {
    const res = await GET(makeRequest("d1", "wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("requires a discordId query param", async () => {
    const res = await GET(makeRequest(null, "bridge-secret"));
    expect(res.status).toBe(400);
  });

  it("returns an empty activeNegocioJobs when there are no active negocio leases", async () => {
    selectResult.data = [];
    const res = await GET(makeRequest("d1", "bridge-secret"));
    const json = await res.json();
    expect(json.activeNegocioJobs).toEqual([]);
  });

  it("returns the job name and boss grade for an active negocio lease", async () => {
    const future = new Date(Date.now() + 10_000).toISOString();
    selectResult.data = [{ id: "l1", slot_key: "casino", expires_at: future }];
    const res = await GET(makeRequest("d1", "bridge-secret"));
    const json = await res.json();
    expect(json.activeNegocioJobs).toEqual([{ jobName: "casino", bossGrade: 4 }]);
  });

  it("ignores an expired negocio lease", async () => {
    const past = new Date(Date.now() - 10_000).toISOString();
    selectResult.data = [{ id: "l1", slot_key: "casino", expires_at: past }];
    const res = await GET(makeRequest("d1", "bridge-secret"));
    const json = await res.json();
    expect(json.activeNegocioJobs).toEqual([]);
  });

  it("ignores banda/propiedad leases entirely", async () => {
    const future = new Date(Date.now() + 10_000).toISOString();
    selectResult.data = [{ id: "l1", slot_key: "families", expires_at: future }];
    const res = await GET(makeRequest("d1", "bridge-secret"));
    const json = await res.json();
    expect(json.activeNegocioJobs).toEqual([]);
  });

  it("returns one entry per active negocio lease when a discord_id holds more than one", async () => {
    const future = new Date(Date.now() + 10_000).toISOString();
    selectResult.data = [
      { id: "l1", slot_key: "casino", expires_at: future },
      { id: "l2", slot_key: "taller_bennys", expires_at: future },
    ];
    const res = await GET(makeRequest("d1", "bridge-secret"));
    const json = await res.json();
    expect(json.activeNegocioJobs).toEqual([
      { jobName: "casino", bossGrade: 4 },
      { jobName: "bennys", bossGrade: 4 },
    ]);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run app/api/fivem/negocio-status/route.test.ts`
Expected: FAIL — no se encuentra el módulo `./route`.

- [ ] **Step 3: Implementar `app/api/fivem/negocio-status/route.ts`**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { negocios } from "@/lib/content";

export async function GET(request: NextRequest) {
  const secret = request.headers.get("x-fivem-secret");
  if (!secret || secret !== process.env.FIVEM_BRIDGE_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const discordId = request.nextUrl.searchParams.get("discordId");
  if (!discordId) {
    return NextResponse.json({ error: "Falta discordId" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: leases, error } = await admin
    .from("leases")
    .select("id, slot_key, expires_at")
    .eq("discord_id", discordId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = leases ?? [];
  const now = Date.now();
  const negocioBySlotKey = new Map(negocios.map((n) => [n.slotKey, n]));

  const activeNegocioJobs = rows
    .filter((l) => negocioBySlotKey.has(l.slot_key) && l.expires_at !== null && new Date(l.expires_at).getTime() > now)
    .map((l) => negocioBySlotKey.get(l.slot_key)!)
    .map((n) => ({ jobName: n.jobName as string, bossGrade: n.jobBossGrade as number }));

  return NextResponse.json({ activeNegocioJobs });
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run app/api/fivem/negocio-status/route.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/fivem/negocio-status
git commit -m "feat: add the negocio-status bridge endpoint for automatic business boss assignment"
```

---

## Task 8: Cron diario de vencimiento de arrendamientos

**Files:**
- Create: `app/api/cron/expire-leases/route.ts`
- Test: `app/api/cron/expire-leases/route.test.ts`
- Modify: `vercel.json`

**Interfaces:**
- Consumes: `createAdminClient` de `@/lib/supabase/admin` (ya existe), `findLeaseSlot` de `@/lib/leases/catalog` (Task 1), `notifyStaffChannel` de `@/lib/discord/notify` (Task 3)
- Produces: `GET` handler que responde `{ released: number }`

- [ ] **Step 1: Escribir el test (falla porque el archivo no existe)**

```ts
// app/api/cron/expire-leases/route.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const selectResult: { data: unknown[]; error: { message: string } | null } = { data: [], error: null };
const slotSelectResult: { data: { current_lease_id: string } | null; error: { message: string } | null } = {
  data: null,
  error: null,
};

const leasesLtMock = vi.fn(() => Promise.resolve(selectResult));
const leasesIsMock = vi.fn(() => ({ lt: leasesLtMock }));
const leasesSelectMock = vi.fn(() => ({ is: leasesIsMock }));

const leasesUpdateEqMock = vi.fn(() => Promise.resolve({ error: null }));
const leasesUpdateMock = vi.fn(() => ({ eq: leasesUpdateEqMock }));

const slotMaybeSingleMock = vi.fn(() => Promise.resolve(slotSelectResult));
const slotEqForSelectMock = vi.fn(() => ({ maybeSingle: slotMaybeSingleMock }));
const slotSelectMock = vi.fn(() => ({ eq: slotEqForSelectMock }));

const slotUpdateEqMock = vi.fn(() => Promise.resolve({ error: null }));
const slotUpdateMock = vi.fn(() => ({ eq: slotUpdateEqMock }));

const fromMock = vi.fn((table: string) => {
  if (table === "leases") return { select: leasesSelectMock, update: leasesUpdateMock };
  return { select: slotSelectMock, update: slotUpdateMock };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock }),
}));

const notifyStaffChannelMock = vi.fn();
vi.mock("@/lib/discord/notify", () => ({
  notifyStaffChannel: (content: string) => notifyStaffChannelMock(content),
}));

import { GET } from "./route";

function makeRequest(authHeader: string | null) {
  const headers = new Headers();
  if (authHeader) headers.set("authorization", authHeader);
  return new NextRequest("http://localhost/api/cron/expire-leases", { headers });
}

describe("GET /api/cron/expire-leases", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "cron-secret";
    selectResult.data = [];
    selectResult.error = null;
    slotSelectResult.data = null;
    slotSelectResult.error = null;
    notifyStaffChannelMock.mockReset();
    notifyStaffChannelMock.mockResolvedValue(undefined);
    leasesUpdateEqMock.mockClear();
    slotUpdateEqMock.mockClear();
  });

  it("rejects requests without the correct bearer token", async () => {
    const res = await GET(makeRequest("Bearer wrong"));
    expect(res.status).toBe(401);
  });

  it("does nothing when there are no expired leases", async () => {
    selectResult.data = [];
    const res = await GET(makeRequest("Bearer cron-secret"));
    const json = await res.json();
    expect(json).toEqual({ released: 0 });
  });

  it("frees the slot and notifies staff for an expired banda lease that is still the current lease", async () => {
    selectResult.data = [{ id: "lease-1", slot_key: "families", discord_id: "d1" }];
    slotSelectResult.data = { current_lease_id: "lease-1" };

    const res = await GET(makeRequest("Bearer cron-secret"));
    const json = await res.json();

    expect(slotUpdateMock).toHaveBeenCalledWith({ occupied_until: null, current_lease_id: null });
    expect(notifyStaffChannelMock).toHaveBeenCalledWith(expect.stringContaining("Families"));
    expect(leasesUpdateMock).toHaveBeenCalledWith({ job_or_property_revoked_at: expect.any(String) });
    expect(json).toEqual({ released: 1 });
  });

  it("does not free the slot when a newer lease already replaced it (renewal already claimed the slot)", async () => {
    selectResult.data = [{ id: "lease-1", slot_key: "families", discord_id: "d1" }];
    slotSelectResult.data = { current_lease_id: "lease-2" };

    const res = await GET(makeRequest("Bearer cron-secret"));
    const json = await res.json();

    expect(slotUpdateMock).not.toHaveBeenCalled();
    expect(json).toEqual({ released: 1 });
  });

  it("does not notify staff for an expired negocio lease (automatic delivery handles it)", async () => {
    selectResult.data = [{ id: "lease-1", slot_key: "casino", discord_id: "d1" }];
    slotSelectResult.data = { current_lease_id: "lease-1" };

    await GET(makeRequest("Bearer cron-secret"));

    expect(notifyStaffChannelMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run app/api/cron/expire-leases/route.test.ts`
Expected: FAIL — no se encuentra el módulo `./route`.

- [ ] **Step 3: Implementar `app/api/cron/expire-leases/route.ts`**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findLeaseSlot } from "@/lib/leases/catalog";
import { notifyStaffChannel } from "@/lib/discord/notify";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: expired, error } = await admin
    .from("leases")
    .select("id, slot_key, discord_id")
    .is("job_or_property_revoked_at", null)
    .lt("expires_at", new Date().toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let released = 0;
  for (const lease of expired ?? []) {
    try {
      const slot = findLeaseSlot(lease.slot_key);

      const { data: slotRow, error: slotError } = await admin
        .from("slots")
        .select("current_lease_id")
        .eq("slot_key", lease.slot_key)
        .maybeSingle();

      if (slotError) {
        console.error("[cron/expire-leases] Error leyendo el slot", { leaseId: lease.id, error: slotError });
        continue;
      }

      if (slotRow?.current_lease_id === lease.id) {
        const { error: freeError } = await admin
          .from("slots")
          .update({ occupied_until: null, current_lease_id: null })
          .eq("slot_key", lease.slot_key);

        if (freeError) {
          console.error("[cron/expire-leases] Error liberando el slot", { leaseId: lease.id, error: freeError });
          continue;
        }
      }

      if (slot && (slot.slotType === "banda" || slot.slotType === "propiedad")) {
        const action = slot.slotType === "banda" ? "sacarle el liderazgo en /crimeadmin" : "revocar el acceso a la propiedad";
        try {
          await notifyStaffChannel(`⏰ Venció el arrendamiento de "${slot.label}" — hay que ${action}. Discord: <@${lease.discord_id}>.`);
        } catch (notifyError) {
          console.error("[cron/expire-leases] Falló notifyStaffChannel", { leaseId: lease.id, error: notifyError });
        }
      }

      const { error: updateError } = await admin
        .from("leases")
        .update({ job_or_property_revoked_at: new Date().toISOString() })
        .eq("id", lease.id);

      if (updateError) {
        console.error("[cron/expire-leases] Error marcando el lease como procesado", { leaseId: lease.id, error: updateError });
        continue;
      }

      released += 1;
    } catch (err) {
      console.error("[cron/expire-leases] Error procesando un lease vencido", { leaseId: lease.id, error: err });
    }
  }

  return NextResponse.json({ released });
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run app/api/cron/expire-leases/route.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Agregar el segundo cron a `vercel.json`**

```json
{
  "crons": [
    { "path": "/api/cron/expire-vips", "schedule": "0 6 * * *" },
    { "path": "/api/cron/expire-leases", "schedule": "15 6 * * *" }
  ]
}
```

(Corre 15 minutos después del cron de VIP para no pegarle a la base de datos exactamente al mismo minuto — no es un requisito estricto, solo prolijo.)

- [ ] **Step 6: Commit**

```bash
git add app/api/cron/expire-leases vercel.json
git commit -m "feat: add the daily cron that releases expired lease slots and notifies staff"
```

---

## Task 9: Sección web de Arrendamientos

**Files:**
- Create: `app/arrendamientos/page.tsx`
- Create: `components/sections/ArrendamientosCatalog.tsx`
- Test: `components/sections/ArrendamientosCatalog.test.tsx`
- Modify: `lib/content.ts` (agregar el link de navegación)

**Interfaces:**
- Consumes: `bandas`, `negocios`, `propiedades`, `type Period` de `@/lib/content` (Task 1), `createClient` de `@/lib/supabase/client`, `AppUser`/`toAppUser` de `@/lib/supabase/user`, `createClient` (server) de `@/lib/supabase/server`, `Tabs`/`tabPanelLabelledBy` de `@/components/ui/Tabs`, `Button` de `@/components/ui/Button`, `Navbar`/`Footer` (existentes)

- [ ] **Step 1: Agregar el link de navegación a `lib/content.ts`**

En el array `navLinks` existente, agregar un ítem (no reescribir el array completo, solo agregar la entrada):

```ts
{ href: "/arrendamientos", label: "Arrendamientos" },
```

- [ ] **Step 2: Escribir el test de `ArrendamientosCatalog` (falla porque el componente no existe)**

```tsx
// components/sections/ArrendamientosCatalog.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ArrendamientosCatalog } from "./ArrendamientosCatalog";

const thenMock = vi.fn();
const selectMock = vi.fn(() => ({ then: thenMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));

const signInWithOAuthMock = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ from: fromMock, auth: { signInWithOAuth: signInWithOAuthMock } }),
}));

describe("ArrendamientosCatalog", () => {
  beforeEach(() => {
    signInWithOAuthMock.mockReset();
    vi.stubGlobal("fetch", vi.fn());
    thenMock.mockImplementation((cb) => cb({ data: [] }));
  });

  it("renders the three categories and defaults to Bandas", async () => {
    render(<ArrendamientosCatalog user={null} />);
    await waitFor(() => expect(screen.getByText("Families")).toBeInTheDocument());
    expect(screen.getByText("Ballas")).toBeInTheDocument();
    expect(screen.queryByText("Casino")).not.toBeInTheDocument();
  });

  it("switches to Negocios and shows both mensual and semestral prices", async () => {
    const user = userEvent.setup();
    render(<ArrendamientosCatalog user={null} />);
    await waitFor(() => expect(screen.getByText("Families")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "Negocios" }));
    expect(screen.getByText("Casino")).toBeInTheDocument();
    expect(screen.getByText("$45.000 ARS / mes")).toBeInTheDocument();
    expect(screen.getByText("$220.000 ARS / semestre")).toBeInTheDocument();
  });

  it("switches to Propiedades and shows only the mensual button (no semestral offered)", async () => {
    const user = userEvent.setup();
    render(<ArrendamientosCatalog user={null} />);
    await waitFor(() => expect(screen.getByText("Families")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "Propiedades" }));
    expect(screen.getByText("Casa premium")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Arrendar semestral" })).not.toBeInTheDocument();
  });

  it("shows a slot as occupied and disables its buttons when occupied_until is in the future", async () => {
    thenMock.mockImplementation((cb) =>
      cb({ data: [{ slot_key: "ballas", occupied_until: new Date(Date.now() + 100_000).toISOString() }] })
    );
    render(<ArrendamientosCatalog user={null} />);
    await waitFor(() => expect(screen.getByText(/Ocupada hasta/)).toBeInTheDocument());
    const ballasCard = screen.getByText("Ballas").closest("div")!;
    expect(ballasCard.parentElement?.querySelector("button")).toBeDisabled();
  });

  it("triggers Discord login instead of a purchase when no user is logged in", async () => {
    const user = userEvent.setup();
    render(<ArrendamientosCatalog user={null} />);
    await waitFor(() => expect(screen.getByText("Families")).toBeInTheDocument());
    await user.click(screen.getAllByRole("button", { name: "Arrendar mensual" })[0]);
    expect(signInWithOAuthMock).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("calls create-lease-preference and redirects when a logged-in user leases an available slot", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ checkoutUrl: "https://mp.example/checkout/lease-1" }),
    });

    const user = userEvent.setup();
    render(<ArrendamientosCatalog user={{ avatarUrl: null, displayName: "Fundador", email: null }} />);
    await waitFor(() => expect(screen.getByText("Families")).toBeInTheDocument());
    await user.click(screen.getAllByRole("button", { name: "Arrendar mensual" })[0]);

    expect(fetch).toHaveBeenCalledWith(
      "/api/mercadopago/create-lease-preference",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("shows an error message when the lease request fails", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Ese slot ya está ocupado" }),
    });

    const user = userEvent.setup();
    render(<ArrendamientosCatalog user={{ avatarUrl: null, displayName: "Fundador", email: null }} />);
    await waitFor(() => expect(screen.getByText("Families")).toBeInTheDocument());
    await user.click(screen.getAllByRole("button", { name: "Arrendar mensual" })[0]);

    expect(await screen.findByRole("alert")).toHaveTextContent("Ese slot ya está ocupado");
  });
});
```

- [ ] **Step 3: Correr el test y verificar que falla**

Run: `npx vitest run components/sections/ArrendamientosCatalog.test.tsx`
Expected: FAIL — no se encuentra el módulo `./ArrendamientosCatalog`.

- [ ] **Step 4: Implementar `components/sections/ArrendamientosCatalog.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { bandas, negocios, propiedades, type Period } from "@/lib/content";
import { Button } from "@/components/ui/Button";
import { Tabs, tabPanelLabelledBy } from "@/components/ui/Tabs";
import { createClient } from "@/lib/supabase/client";
import type { AppUser } from "@/lib/supabase/user";

interface SlotAvailability {
  slot_key: string;
  occupied_until: string | null;
}

interface ArrendamientosCatalogProps {
  user: AppUser | null;
}

const CATEGORIES = [
  { label: "Bandas", items: bandas },
  { label: "Negocios", items: negocios },
  { label: "Propiedades", items: propiedades },
];

export function ArrendamientosCatalog({ user }: ArrendamientosCatalogProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [availability, setAvailability] = useState<Record<string, string | null>>({});
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("slots")
      .select("slot_key, occupied_until")
      .then(({ data }: { data: SlotAvailability[] | null }) => {
        const map: Record<string, string | null> = {};
        for (const row of data ?? []) {
          map[row.slot_key] = row.occupied_until;
        }
        setAvailability(map);
      });
  }, []);

  async function handleLease(slotKey: string, period: Period) {
    setError(null);

    if (!user) {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      return;
    }

    setLoadingKey(slotKey);
    try {
      const res = await fetch("/api/mercadopago/create-lease-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotKey, period }),
      });
      const json = await res.json();
      if (res.ok && json.checkoutUrl) {
        window.location.href = json.checkoutUrl;
      } else {
        setError(json.error ?? "No pudimos iniciar el arrendamiento. Probá de nuevo en un momento.");
      }
    } catch {
      setError("No pudimos iniciar el arrendamiento. Probá de nuevo en un momento.");
    } finally {
      setLoadingKey(null);
    }
  }

  const active = CATEGORIES[activeIndex];

  return (
    <section id="arrendamientos" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="text-center">
        <h1 className="font-display text-4xl uppercase text-white sm:text-5xl">Arrendamientos</h1>
        <p className="mt-2 text-gray-400">
          Tomá el control de una banda, un negocio o una propiedad — por tiempo limitado, un solo dueño a la vez.
        </p>
      </div>

      <div className="mt-10">
        <Tabs
          items={CATEGORIES.map((c) => ({ label: c.label }))}
          activeIndex={activeIndex}
          onChange={setActiveIndex}
          panelId="arrendamientos-panel"
          tablistLabel="Categorías de arrendamientos"
        />
      </div>

      {error && (
        <p role="alert" className="mt-4 text-center text-sm text-coral">
          {error}
        </p>
      )}

      <div
        id="arrendamientos-panel"
        role="tabpanel"
        aria-labelledby={tabPanelLabelledBy("arrendamientos-panel", activeIndex)}
        tabIndex={0}
        className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {active.items.map((item) => {
          const occupiedUntil = availability[item.slotKey];
          const isOccupied = Boolean(occupiedUntil && new Date(occupiedUntil).getTime() > Date.now());

          return (
            <div key={item.slotKey} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h3 className="font-display text-xl uppercase text-white">{item.label}</h3>
              <p className="mt-1 text-sm text-gray-400">
                {isOccupied ? `Ocupada hasta ${new Date(occupiedUntil as string).toLocaleDateString("es-AR")}` : "Disponible"}
              </p>
              <p className="mt-2 font-display text-lg text-peach">${item.priceMensual.toLocaleString("es-AR")} ARS / mes</p>
              {item.priceSemestral !== null && (
                <p className="text-sm text-gray-400">${item.priceSemestral.toLocaleString("es-AR")} ARS / semestre</p>
              )}
              <div className="mt-4 flex flex-col gap-2">
                <Button
                  variant="primary"
                  disabled={isOccupied || loadingKey === item.slotKey}
                  onClick={() => handleLease(item.slotKey, "mensual")}
                >
                  {loadingKey === item.slotKey ? "Redirigiendo…" : "Arrendar mensual"}
                </Button>
                {item.priceSemestral !== null && (
                  <Button
                    variant="outline-cyan"
                    disabled={isOccupied || loadingKey === item.slotKey}
                    onClick={() => handleLease(item.slotKey, "semestral")}
                  >
                    Arrendar semestral
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Implementar `app/arrendamientos/page.tsx`**

```tsx
import { createClient } from "@/lib/supabase/server";
import { toAppUser } from "@/lib/supabase/user";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ArrendamientosCatalog } from "@/components/sections/ArrendamientosCatalog";

export default async function ArrendamientosPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session ? toAppUser(session.user) : null;

  return (
    <>
      <Navbar user={user} />
      <ArrendamientosCatalog user={user} />
      <Footer />
    </>
  );
}
```

- [ ] **Step 6: Correr el test y verificar que pasa**

Run: `npx vitest run components/sections/ArrendamientosCatalog.test.tsx`
Expected: PASS (8 tests)

- [ ] **Step 7: Correr toda la suite**

Run: `npm test`
Expected: PASS en todos los archivos.

- [ ] **Step 8: Commit**

```bash
git add lib/content.ts components/sections/ArrendamientosCatalog.tsx components/sections/ArrendamientosCatalog.test.tsx app/arrendamientos
git commit -m "feat: add the Arrendamientos catalog page with live availability"
```

---

## Task 10: Pestaña "Mis arrendamientos" en `/mi-cuenta`

**Files:**
- Create: `components/account/MyLeases.tsx`
- Test: `components/account/MyLeases.test.tsx`
- Modify: `components/account/AccountTabs.tsx`
- Modify: `components/account/AccountTabs.test.tsx`

**Interfaces:**
- Consumes: `createClient` de `@/lib/supabase/client`, `EmptyState` de `@/components/ui/EmptyState`

- [ ] **Step 1: Escribir el test de `MyLeases` (falla porque el archivo no existe)**

```tsx
// components/account/MyLeases.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MyLeases } from "./MyLeases";

const thenMock = vi.fn();
const orderMock = vi.fn(() => ({ then: thenMock }));
const selectMock = vi.fn(() => ({ order: orderMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ from: fromMock }),
}));

describe("MyLeases", () => {
  it("shows the empty state when there are no leases", async () => {
    thenMock.mockImplementation((cb) => cb({ data: [] }));
    render(<MyLeases />);
    await waitFor(() =>
      expect(screen.getByText("Todavía no arrendaste ninguna banda, negocio o propiedad.")).toBeInTheDocument()
    );
  });

  it("renders a row per lease with its status", async () => {
    const future = new Date(Date.now() + 100_000).toISOString();
    thenMock.mockImplementation((cb) =>
      cb({
        data: [
          { id: "1", slot_key: "families", period: "mensual", amount_ars: 30000, leased_at: "2026-08-01T00:00:00Z", expires_at: future },
        ],
      })
    );
    render(<MyLeases />);
    await waitFor(() => expect(screen.getByText("families")).toBeInTheDocument());
    expect(screen.getByText(/Activo hasta/)).toBeInTheDocument();
  });

  it("shows a vencido lease as expired, not active", async () => {
    const past = new Date(Date.now() - 100_000).toISOString();
    thenMock.mockImplementation((cb) =>
      cb({
        data: [
          { id: "1", slot_key: "families", period: "mensual", amount_ars: 30000, leased_at: "2026-08-01T00:00:00Z", expires_at: past },
        ],
      })
    );
    render(<MyLeases />);
    await waitFor(() => expect(screen.getByText(/Venció el/)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run components/account/MyLeases.test.tsx`
Expected: FAIL — no se encuentra el módulo `./MyLeases`.

- [ ] **Step 3: Implementar `components/account/MyLeases.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/ui/EmptyState";

interface LeaseRow {
  id: string;
  slot_key: string;
  period: string;
  amount_ars: number;
  leased_at: string;
  expires_at: string;
}

export function MyLeases() {
  const [leases, setLeases] = useState<LeaseRow[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("leases")
      .select("id, slot_key, period, amount_ars, leased_at, expires_at")
      .order("leased_at", { ascending: false })
      .then(({ data }: { data: LeaseRow[] | null }) => setLeases(data ?? []));
  }, []);

  if (leases === null) return null;

  if (leases.length === 0) {
    return <EmptyState title="Mis arrendamientos" description="Todavía no arrendaste ninguna banda, negocio o propiedad." />;
  }

  return (
    <ul className="flex flex-col gap-3">
      {leases.map((l) => {
        const isActive = new Date(l.expires_at).getTime() > Date.now();
        return (
          <li key={l.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4">
            <span className="text-sm uppercase tracking-wide text-white">{l.slot_key}</span>
            <span className="text-sm text-gray-400">
              {isActive ? "Activo hasta" : "Venció el"} {new Date(l.expires_at).toLocaleDateString("es-AR")}
            </span>
            <span className="text-sm text-peach">${l.amount_ars.toLocaleString("es-AR")} ARS</span>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run components/account/MyLeases.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Agregar la 5ta pestaña en `AccountTabs.tsx`**

Cambiar `TAB_LABELS` para agregar la nueva pestaña, importar `MyLeases`, y agregar la rama `activeIndex === 4`:

```ts
import { MyLeases } from "./MyLeases";

const TAB_LABELS = ["Datos de cuenta", "Perfil de Personaje", "Historial de compras", "VIP activo", "Mis arrendamientos"];
```

```tsx
{activeIndex === 4 && <MyLeases />}
```

- [ ] **Step 6: Actualizar `AccountTabs.test.tsx`**

Agregar el mock de `leases` junto al de `purchases` ya existente (el mock actual de `@/lib/supabase/client` solo cubre `purchases` — extenderlo para que `.from("leases")` también devuelva datos vacíos por defecto, y agregar un test nuevo):

```ts
const leasesThenMock = vi.fn((cb: (result: { data: unknown[] }) => void) => cb({ data: [] }));
```

Extender el mock de `createClient` existente para que `from(table)` devuelva el mock correcto según la tabla (`"purchases"` usa el mock ya existente, `"leases"` usa `leasesThenMock`), y agregar:

```ts
it("shows real lease history instead of a static EmptyState when the tab is selected", async () => {
  const userEvt = userEvent.setup();
  render(<AccountTabs user={user} />);
  await userEvt.click(screen.getByRole("tab", { name: "Mis arrendamientos" }));
  expect(await screen.findByText("Todavía no arrendaste ninguna banda, negocio o propiedad.")).toBeInTheDocument();
});
```

- [ ] **Step 7: Correr el test y verificar que pasa**

Run: `npx vitest run components/account/AccountTabs.test.tsx`
Expected: PASS (5 tests: los 4 existentes + el nuevo)

- [ ] **Step 8: Correr toda la suite**

Run: `npm test`
Expected: PASS en todos los archivos.

- [ ] **Step 9: Commit**

```bash
git add components/account
git commit -m "feat: add the Mis arrendamientos tab to the account page"
```

---

## Task 11: Jobs de QBCore nuevos para Casino y Casinos ilegales

Este resource vive fuera de este repo, en el servidor de FiveM
(`D:\BARRIO2\txData\QBCore_BF699E.base\resources\[qb]\qb-core\shared\jobs.lua`).
No corre en la suite de Vitest — se verifica a mano.

**Files (fuera del repo web):**
- Modify: `D:\BARRIO2\txData\QBCore_BF699E.base\resources\[qb]\qb-core\shared\jobs.lua`

**Interfaces:**
- Produces: dos entradas nuevas en `QBShared.Jobs`, `casino` y `casino_ilegal`, cada una con grado de boss en `['4']` — coincide exactamente con `jobName`/`jobBossGrade` de `casino`/`casinos_ilegales` en `lib/content.ts` (Task 1).

- [ ] **Step 1: Agregar los dos jobs nuevos**

Agregar estas dos entradas dentro de la tabla `QBCore.Shared.Jobs` (o `QBShared.Jobs`, según el nombre exacto de la tabla en este archivo — usar el mismo nombre de tabla que ya usan las entradas existentes como `mechanic`/`bennys`/`unicorn`), en cualquier lugar de la tabla, siguiendo el mismo estilo de indentación que el resto del archivo:

```lua
casino = {
    label = 'Casino',
    type = 'casino',
    defaultDuty = true,
    offDutyPay = false,
    grades = {
        ['0'] = { name = 'Recruit', payment = 50 },
        ['1'] = { name = 'Novice', payment = 75 },
        ['2'] = { name = 'Experienced', payment = 100 },
        ['3'] = { name = 'Advanced', payment = 125 },
        ['4'] = { name = 'Manager', isboss = true, payment = 150 },
    },
},
casino_ilegal = {
    label = 'Casinos Ilegales',
    type = 'casino_ilegal',
    defaultDuty = true,
    offDutyPay = false,
    grades = {
        ['0'] = { name = 'Recruit', payment = 50 },
        ['1'] = { name = 'Novice', payment = 75 },
        ['2'] = { name = 'Experienced', payment = 100 },
        ['3'] = { name = 'Advanced', payment = 125 },
        ['4'] = { name = 'Manager', isboss = true, payment = 150 },
    },
},
```

- [ ] **Step 2: Verificación manual**

1. Reiniciar `qb-core` (o el servidor entero) para que cargue la tabla de jobs actualizada.
2. Confirmar en la consola del servidor que no hay errores de sintaxis Lua al cargar `shared/jobs.lua`.
3. Con un comando de admin de QBCore (ej. `/setjob <id> casino 4` o el equivalente que use este server), verificar que el job `casino` existe y se puede asignar el grado 4 ("Manager", boss).

No hay commit de este paso en el repo web — es un archivo de otro resource, fuera del control de versiones de `BARRIOBRAVOWEB`.

---

## Task 12: Extender `bb_vip` para entregar negocios automáticamente

Este resource vive fuera de este repo
(`D:\BARRIO2\txData\QBCore_BF699E.base\resources\bb_vip\`, ya creado en el
sub-proyecto Tienda). No corre en la suite de Vitest — se verifica a mano.

**Files (fuera del repo web):**
- Modify: `D:\BARRIO2\txData\QBCore_BF699E.base\resources\bb_vip\config.lua`
- Modify: `D:\BARRIO2\txData\QBCore_BF699E.base\resources\bb_vip\server\main.lua`

**Interfaces:**
- Consumes: `GET /api/fivem/negocio-status` (Task 7) — misma forma de respuesta `{ activeNegocioJobs: [{jobName, bossGrade}], pendingDeliveries: [...] }`.

- [ ] **Step 1: Agregar la config de negocios a `config.lua`**

Agregar al final del archivo (después de `Config.VehicleOwnership`):

```lua
-- Nombres de job de QBCore por negocio arrendado — deben coincidir con
-- jobName/jobBossGrade en lib/content.ts (negocios) del repo web.
Config.NegocioJobs = {
    'casino',
    'unicorn',
    'bennys',
    'mechanic',
    'casino_ilegal',
}
```

- [ ] **Step 2: Agregar la lógica de negocios a `server/main.lua`**

Agregar estas funciones y modificar el handler `QBCore:Server:PlayerLoaded` existente:

```lua
local function negocioStatusRequest(discordId, cb)
    local url = ('%s/api/fivem/negocio-status?discordId=%s'):format(Config.ApiBaseUrl, discordId)
    PerformHttpRequest(url, function(statusCode, response)
        if statusCode ~= 200 then
            print(('[bb_vip] negocio-status respondió %s para discordId %s'):format(statusCode, discordId))
            cb(nil)
            return
        end
        local ok, data = pcall(json.decode, response)
        if not ok then
            print('[bb_vip] No se pudo parsear la respuesta de negocio-status')
            cb(nil)
            return
        end
        cb(data)
    end, 'GET', '', { ['x-fivem-secret'] = Config.BridgeSecret, ['Content-Type'] = 'application/json' })
end

local function reconcileNegocioJobs(Player, activeNegocioJobs)
    local activeByJobName = {}
    for _, entry in ipairs(activeNegocioJobs or {}) do
        activeByJobName[entry.jobName] = entry.bossGrade
    end

    local currentJob = Player.PlayerData.job and Player.PlayerData.job.name

    -- Si el job actual del jugador es uno de los negocios arrendables pero ya
    -- no le corresponde (venció o nunca fue suyo), lo baja a grado 0.
    if currentJob then
        for _, jobName in ipairs(Config.NegocioJobs) do
            if currentJob == jobName and not activeByJobName[jobName] then
                Player.Functions.SetJob(jobName, 0)
                currentJob = nil
            end
        end
    end

    -- Aplica el grado de boss para cada negocio que sí le corresponde ahora.
    for jobName, bossGrade in pairs(activeByJobName) do
        if Player.PlayerData.job.name ~= jobName or Player.PlayerData.job.grade.level ~= bossGrade then
            Player.Functions.SetJob(jobName, bossGrade)
        end
    end
end
```

Modificar el handler `AddEventHandler('QBCore:Server:PlayerLoaded', ...)` ya existente para que, además del `apiRequest` de VIP que ya tiene, también llame a `negocioStatusRequest` y procese su resultado:

```lua
AddEventHandler('QBCore:Server:PlayerLoaded', function(Player)
    local src = Player.PlayerData.source
    local discordId = getDiscordId(src)
    if not discordId then return end

    apiRequest(discordId, function(data)
        if not data then return end

        for _, delivery in ipairs(data.pendingDeliveries or {}) do
            processDelivery(Player, delivery)
        end

        if data.tier then
            TriggerClientEvent('chat:addMessage', src, {
                args = { '^5[Barrio Bravo]', ('Tu VIP activo es %s.'):format(data.tier) },
            })
        end
    end)

    negocioStatusRequest(discordId, function(data)
        if not data then return end
        reconcileNegocioJobs(Player, data.activeNegocioJobs)
    end)
end)
```

- [ ] **Step 3: Verificación manual**

1. Reiniciar `bb_vip` (`restart bb_vip`).
2. Confirmar en consola que no hay errores de sintaxis Lua.
3. Con un lease de negocio ya cargado en la base (creado a mano en Supabase para la prueba, o vía un pago real de prueba), conectar al servidor con esa cuenta y verificar que el job/grado de boss se aplicó.
4. Editar esa fila en Supabase para que `expires_at` quede en el pasado, reconectar, y verificar que el jugador vuelve a grado 0 en ese job.

No hay commit de este paso en el repo web.

---

## Task 13: Configuración manual final y verificación end-to-end

Esta tarea no agrega código de la web — cierra los pasos manuales pendientes
y corre la verificación completa.

- [ ] **Step 1: Confirmar las variables de entorno nuevas en `.env.local`**

```
DISCORD_STAFF_CHANNEL_ID=...   (Task 3 — ID del canal privado de staff donde se avisan las compras de bandas/propiedades)
```

(El resto de las variables ya están de Tienda — no hay más variables nuevas para Arrendamientos.)

- [ ] **Step 2: Cargar la variable nueva en Vercel**

Vercel → Project Settings → Environment Variables → agregar `DISCORD_STAFF_CHANNEL_ID` → Redeploy.

- [ ] **Step 3: Actualizar `.env.example`**

Agregar la línea nueva a `.env.example` (ya existe del sub-proyecto Tienda):

```
DISCORD_STAFF_CHANNEL_ID=
```

- [ ] **Step 4: Correr la suite completa una última vez**

```bash
npm test
npm run typecheck
npm run build
npm run lint
```

Expected: los cuatro comandos terminan sin errores.

- [ ] **Step 5: Prueba end-to-end en producción (manual, guiada paso a paso)**

1. Entrar a la web logueado con Discord, ir a `/arrendamientos`, arrendar una banda (ej. Families) con una tarjeta de prueba de Mercado Pago.
2. Confirmar que aparece el mensaje en el canal de staff de Discord.
3. Confirmar en Supabase que `leases` tiene la fila nueva y `slots` marca `families` como ocupado con `current_lease_id` apuntando a esa fila.
4. Confirmar en `/arrendamientos` que "Families" ahora aparece "Ocupada hasta [fecha]" y el botón está deshabilitado.
5. Repetir con un negocio (ej. Casino): confirmar que NO llega mensaje a staff, y que al conectarse al servidor de FiveM con esa cuenta, el jugador queda con el job `casino` en grado 4.
6. Repetir con una propiedad (ej. Casa chica): confirmar que sí llega el mensaje a staff.
7. Verificar en `/mi-cuenta` → "Mis arrendamientos" que las 3 compras aparecen.

- [ ] **Step 6: Commit final (si hubo algún ajuste de esta verificación)**

```bash
git add -A
git commit -m "chore: env var documentation and end-to-end verification for Arrendamientos"
```

(Si no hubo cambios de código, este paso no aplica.)
