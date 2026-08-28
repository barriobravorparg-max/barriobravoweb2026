-- supabase/migrations/0001_purchases.sql
create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  discord_id text not null,
  item_type text not null check (item_type in ('vip', 'vehicle')),
  item_key text not null,
  mp_payment_id text not null unique,
  amount_ars numeric not null,
  status text not null default 'approved',
  purchased_at timestamptz not null default now(),
  expires_at timestamptz,
  delivered_at timestamptz,
  discord_role_revoked_at timestamptz
);

alter table purchases enable row level security;

create policy "users read own purchases"
  on purchases for select
  using (auth.uid() = user_id);

-- Sin policy de insert/update para el rol autenticado: solo la service_role
-- key (usada server-side en el webhook y el cron) puede escribir —
-- service_role bypassea RLS por diseño.
