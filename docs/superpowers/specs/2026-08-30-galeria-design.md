# Galería — Barrio Bravo RP

Sub-proyecto nuevo (no numerado en el plan original de 5), mencionado como
idea sin diseñar en la spec de Arrendamientos ("Galería en vivo alimentada
desde Discord"). Reemplaza el placeholder estático `components/sections/Galeria.tsx`
(8 slots vacíos) que ya existe en la landing desde el sub-proyecto 1.

## Objetivo

Una sección de galería en la landing que se llena sola con las fotos que
la comunidad comparte en un canal de Discord — sin subida manual desde la
web, sin panel de moderación. Inspirada en la galería de un competidor
real (La Matanza Roleplay: sección "Galería Comunidad", fotos con autor,
fecha, caption y reacciones, alimentada automáticamente desde Discord),
pero con formato visual propio y sin depender de infraestructura nueva
más allá de lo que ya usa el sitio (Vercel + Supabase + GitHub).

## Fuera de alcance (explícitamente, para este sub-proyecto)

- **Subida manual desde la web** — el único punto de entrada de contenido
  es el canal de Discord. No hay formulario de carga en el sitio.
- **Video/clips** — el placeholder actual menciona "capturas y clips",
  pero esta primera versión es solo imágenes. Los adjuntos de video se
  ignoran en el sync. Video queda para una vuelta futura si hace falta.
- **Cola de moderación previa a publicación** — se publica automático,
  igual que el competidor. Se confía en la moderación que ya existe en el
  canal de Discord de origen. La única intervención posible es ocultar
  una foto ya publicada; no hay panel de admin en el sitio (no existe
  ninguno en el resto del proyecto tampoco), así que se hace a mano con
  un `update gallery_photos set hidden = true where id = '...'` desde el
  SQL Editor de Supabase — mismo mecanismo manual que ya usás para
  migraciones y fixes puntuales. No se construye ningún panel para esto.
- **Reacciones históricas ilimitadas** — el sync solo revisita mensajes
  de los últimos 7 días para actualizar el conteo de reacciones. Una
  reacción que llega después de esa ventana no se refleja. Es un
  trade-off explícito para no tener que re-escanear todo el historial en
  cada corrida.
- **Bot con conexión Gateway persistente** — evaluado y descartado (ver
  "Mecanismo de sincronización"). Todo el sync es por polling HTTP, sin
  proceso nuevo corriendo 24/7.

## Fuente en Discord

Un canal dedicado (a elegir/crear por el usuario, ej. `#fotos-comunidad`)
donde el bot ya existente (mismo bot usado para roles VIP y notificaciones
de staff) necesita permisos de "Ver canal" y "Leer historial de mensajes".
No hace falta ningún permiso de escritura en ese canal.

## Mecanismo de sincronización

El plan de Vercel del proyecto es **Hobby**, que limita los Cron Jobs
nativos a una corrida por día — insuficiente para que la galería se sienta
"casi en vivo". En vez de depender del Cron de Vercel o subir a un plan
pago, la sincronización se dispara desde un **workflow de GitHub Actions**
programado (`schedule: cron` en el propio repo, gratis, sin límite de
plan) que llama a un endpoint HTTP cada 5-10 minutos. El endpoint no sabe
ni le importa quién lo llama — solo valida un bearer token, igual que los
crons existentes (`expire-vips`, `expire-leases`). Esto mantiene la
arquitectura sin agregar ningún proceso nuevo que corra continuamente.

## Modelo de datos (Supabase)

```sql
create table gallery_photos (
  id uuid primary key default gen_random_uuid(),
  discord_message_id text not null unique,
  author_display_name text not null,
  author_avatar_url text,
  caption text,
  storage_path text not null,             -- ruta dentro del bucket 'gallery'
  posted_at timestamptz not null,         -- timestamp original del mensaje en Discord
  reactions jsonb not null default '{}',  -- {"❤️": 3, "😄": 1}
  hidden boolean not null default false,  -- lo pone en true un admin manualmente
  synced_at timestamptz not null default now()
);

alter table gallery_photos enable row level security;

create policy "cualquiera lee fotos no ocultas"
  on gallery_photos for select using (hidden = false);

-- Igual que purchases/leases: sin policy de insert/update para el rol
-- autenticado. Solo service_role (el endpoint de sync) escribe.
```

**Storage:** bucket `gallery` en Supabase Storage, lectura pública,
escritura solo vía `service_role`. Path por foto: `{discord_message_id}.{ext}`.

## Flujo del endpoint de sync (`/api/cron/sync-galeria`)

1. Valida el bearer token contra `CRON_SECRET` (mismo secreto y patrón que
   los crons existentes) — GitHub Actions lo manda como header.
2. Pagina `GET /channels/{id}/messages?before={cursor}&limit=100` hacia
   atrás, hasta que la fecha del mensaje sea más vieja que "ahora - 7
   días", o hasta que Discord devuelva una página vacía. La respuesta de
   este endpoint ya incluye los adjuntos y las reacciones actuales de cada
   mensaje — no hace falta un endpoint aparte para reacciones.
3. Filtra: solo mensajes con al menos un adjunto cuyo `content_type`
   empiece con `image/`; adjuntos de más de 8MB se omiten y se loguean
   (límite prudente para el plan free de Supabase Storage).
4. Por cada mensaje válido, con `try/catch` individual (un fallo puntual
   no debe frenar el resto de la corrida, mismo patrón que
   `expire-vips`/`expire-leases`):
   - Si `discord_message_id` es nuevo: descarga la imagen, la redimensiona
     a un máximo de 1600px de ancho (`sharp`), la sube al bucket, e
     inserta la fila completa (incluyendo `reactions` con el estado
     actual).
   - Si `discord_message_id` ya existe: solo actualiza `reactions` y
     `synced_at` — no vuelve a descargar ni subir la imagen.
5. Idempotencia ante corridas superpuestas: el insert es por
   `discord_message_id unique`; un choque (`23505`) se trata como "ya
   existe", mismo patrón que los webhooks de Mercado Pago.

## Diseño visual — mismas prestaciones, formato propio

Layout tipo masonry (columnas de distinto alto vía CSS columns, sin
librería de JS) en vez de la grilla fija de tarjetas iguales del
competidor — cada foto ocupa el espacio real según su proporción. Cada tarjeta muestra el avatar de Discord del autor (`author_avatar_url`)
junto al nombre. Autor, fecha y caption están **siempre presentes de forma accesible** (en el
`alt` de la imagen y, en mobile, como texto fijo debajo de la foto — no
dependen de hover, que no existe en touch ni para lectores de pantalla);
en desktop se suma un overlay visual al pasar el mouse como mejora, no
como único acceso a la info. Las reacciones se muestran como chips
pequeños en la esquina de cada tarjeta.

Reemplaza directamente `components/sections/Galeria.tsx`: la grilla de 8
slots fijos se cambia por una grilla dinámica con la cantidad real de
fotos (traídas paginadas, ~60 más recientes por carga — sin traer la
tabla entera). Estados nuevos: skeleton mientras carga, y un estado vacío
("Todavía no hay fotos — sé el primero") para antes de la primera
sincronización. Se mantiene un CTA final ("¿Querés aparecer acá?") con el
copy adaptado al canal de Discord del servidor. Se suma un buscador simple
(filtro client-side por autor/caption sobre las fotos ya cargadas).

Rendimiento: las imágenes se sirven con el componente `<Image>` de
Next.js (lazy-load automático, tamaños responsivos, conversión a WebP) en
vez de `<img>` plano — mismo patrón que el resto del sitio.

## Seguridad

- Mismas reglas que Tienda/Arrendamientos: `service_role` solo
  server-side, endpoint de sync gateado por `CRON_SECRET`.
- El bucket de Storage acepta escritura solo desde `service_role` — nadie
  puede subir contenido directo al bucket desde el cliente.
- Sin superficie nueva de ataque vía la web: no hay formulario de subida
  ni ningún input de usuario que llegue a Discord o al bucket. El único
  input externo es el propio Discord, ya moderado por el staff del canal.
- El bot solo necesita permisos de lectura en el canal de origen — no
  requiere ningún permiso de escritura ni administración adicional a los
  que ya tiene.

## Testing

- Tests del endpoint de sync: mensaje nuevo con imagen válida → se
  descarga, sube y guarda; mensaje sin adjuntos de imagen → se ignora;
  adjunto de más de 8MB → se omite y loguea; mensaje ya existente con
  reacciones nuevas → se actualiza `reactions` sin volver a subir la
  imagen; `discord_message_id` duplicado en la misma corrida (choque
  23505) → no rompe el resto del loop.
- Tests de la UI: grilla con fotos → cada tarjeta muestra autor/fecha/
  caption/reacciones; estado vacío sin fotos; foto con `hidden = true` no
  aparece (verificado a nivel de la query, ya que RLS la filtra).
- La descarga y redimensión real de imágenes contra la API de Discord no
  es testeable de forma automatizada de punta a punta — se verifica a
  mano una vez armado el workflow de GitHub Actions, publicando una foto
  de prueba en el canal.

## Pasos manuales del usuario (fuera de mi alcance)

1. Elegir o crear el canal de Discord de origen (ej. `#fotos-comunidad`)
   y darle al bot permisos de "Ver canal" + "Leer historial de mensajes"
   ahí.
2. Crear el bucket `gallery` en Supabase Storage (lectura pública).
3. Configurar el secreto `CRON_SECRET` (ya existe, se reusa) como GitHub
   Actions secret del repo, para que el workflow pueda autenticar la
   llamada al endpoint.

## Próximos sub-proyectos (fuera de este spec)

- Perfil de personaje IC (sub-proyecto 4 original).
- Referidos (sub-proyecto 5 original).
- Video/clips en la galería (evaluado y descartado para esta primera
  versión, ver "Fuera de alcance").
