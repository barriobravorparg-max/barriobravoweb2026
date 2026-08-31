-- supabase/migrations/0005_devlog_images.sql
alter table devlog_posts add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('devlog-images', 'devlog-images', true)
on conflict (id) do nothing;

drop policy if exists "cualquiera lee imágenes de devlog" on storage.objects;
create policy "cualquiera lee imágenes de devlog"
  on storage.objects for select
  using (bucket_id = 'devlog-images');

-- Igual que 'gallery': lectura pública para que Discord pueda mostrar la
-- imagen en el embed, escritura solo vía service_role (el endpoint de
-- upload, gateado por ADMIN_DEVLOG_PASSWORD).
