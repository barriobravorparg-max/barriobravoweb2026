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
) returns table(claimed boolean, lease_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_occupied_until timestamptz;
  v_lease_id uuid;
begin
  select occupied_until into v_occupied_until
  from slots
  where slot_key = p_slot_key
  for update;

  if not found then
    -- El slot_key no existe en la tabla slots (drift catálogo/seed). Devolver
    -- claimed=false en vez de dejar que el insert de abajo viole la FK
    -- leases.slot_key -> slots.slot_key (23503), que rompería el webhook.
    return query select false, null::uuid;
    return;
  end if;

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
$$;

-- Por defecto Postgres otorga EXECUTE sobre funciones nuevas a PUBLIC, y
-- Supabase expone automáticamente cada función del schema public como
-- endpoint RPC de PostgREST para los roles anon/authenticated. Sin este
-- revoke/grant, cualquier visitante podría llamar supabase.rpc('claim_slot',
-- {...}) desde devtools con parámetros arbitrarios y reclamar un slot gratis,
-- saltándose Mercado Pago por completo. Solo el webhook (service_role) debe
-- poder invocarla.
revoke all on function claim_slot(text, uuid, text, text, text, numeric, timestamptz) from public, anon, authenticated;
grant execute on function claim_slot(text, uuid, text, text, text, numeric, timestamptz) to service_role;

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
