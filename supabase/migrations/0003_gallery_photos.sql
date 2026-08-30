-- supabase/migrations/0003_gallery_photos.sql
create table if not exists gallery_photos (
  id uuid primary key default gen_random_uuid(),
  discord_message_id text not null unique,
  author_display_name text not null,
  author_avatar_url text,
  caption text,
  storage_path text not null,
  width integer not null,
  height integer not null,
  posted_at timestamptz not null,
  reactions jsonb not null default '{}',
  hidden boolean not null default false,
  synced_at timestamptz not null default now()
);

alter table gallery_photos enable row level security;

drop policy if exists "cualquiera lee fotos no ocultas" on gallery_photos;
create policy "cualquiera lee fotos no ocultas"
  on gallery_photos for select using (hidden = false);

-- Igual que purchases/leases/slots: sin policy de insert/update para el rol
-- autenticado. Solo service_role (el endpoint de sync) escribe.

insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

drop policy if exists "cualquiera lee fotos de la galería" on storage.objects;
create policy "cualquiera lee fotos de la galería"
  on storage.objects for select
  using (bucket_id = 'gallery');
