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
  -- OJO — moderar una foto son DOS pasos, no uno:
  --   1) update gallery_photos set hidden = true where discord_message_id = '...';
  --   2) borrar el objeto correspondiente del bucket `gallery` (dashboard de
  --      Supabase → Storage → gallery, o un delete sobre storage.objects).
  -- El paso 1 solo la saca de las consultas (vía RLS). El archivo sigue en un
  -- bucket PÚBLICO, en una ruta derivable del ID del mensaje de Discord
  -- ({discord_message_id}.{ext}), así que cualquiera que tenga o adivine ese ID
  -- puede seguir bajándolo por URL directa. Sin el paso 2 la foto no está oculta
  -- de verdad.
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

-- OJO al correr esto desde el SQL Editor: en algunas "vintages" de proyectos de
-- Supabase, `create policy ... on storage.objects` falla con un error de
-- permisos/ownership (la tabla es del rol `supabase_storage_admin`). Como el
-- editor corre todo el script en UNA transacción, esa falla hace rollback de
-- TODO lo de arriba también: la tabla, el RLS y el insert del bucket.
--
-- Después de correr la migración, verificá explícitamente que quedó aplicada:
--     select * from gallery_photos limit 1;
-- Si eso da "relation does not exist", el script hizo rollback entero. En ese
-- caso, creá la policy de storage.objects desde el panel de Storage (Policies)
-- y volvé a correr el resto del script sin este bloque.
drop policy if exists "cualquiera lee fotos de la galería" on storage.objects;
create policy "cualquiera lee fotos de la galería"
  on storage.objects for select
  using (bucket_id = 'gallery');
