-- supabase/migrations/0004_devlog_posts.sql
create table if not exists devlog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  bullets jsonb not null default '[]',
  raw_notes text not null,
  created_at timestamptz not null default now()
);

alter table devlog_posts enable row level security;

-- Sin policies: nadie lee ni escribe vía anon/authenticated. Solo
-- service_role (el endpoint /api/devlog, gateado por ADMIN_DEVLOG_PASSWORD)
-- accede a esta tabla — es un registro interno, no contenido público.
