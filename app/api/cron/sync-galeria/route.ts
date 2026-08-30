// app/api/cron/sync-galeria/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchChannelMessages, type DiscordMessage } from "@/lib/discord/messages";
import {
  extractImageAttachment,
  formatReactions,
  getAuthorAvatarUrl,
  getAuthorDisplayName,
  getFileExtension,
} from "@/lib/gallery/parse";
import { downloadImageBuffer, resizeImage } from "@/lib/gallery/process-image";

const SYNC_WINDOW_DAYS = 7;
const MAX_PAGES = 10;
const PAGE_SIZE = 100;

// Presupuesto de trabajo caro (descargar + redimensionar + subir + insertar) por
// corrida. El cron corre cada 10 minutos, así que un backlog grande se drena en
// varias corridas en vez de reventar el límite de duración de función de Vercel.
const MAX_NEW_PHOTOS_PER_RUN = 20;

// Vercel Hobby corta las funciones bastante antes que esto; pedir 60s explícito
// nos da el techo máximo del plan en vez del default (10s).
export const maxDuration = 60;

type SyncResult = "inserted" | "updated" | "skipped";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const channelId = process.env.DISCORD_GALLERY_CHANNEL_ID;
  if (!channelId) {
    return NextResponse.json({ error: "Falta DISCORD_GALLERY_CHANNEL_ID" }, { status: 500 });
  }

  const admin = createAdminClient();
  const cutoff = Date.now() - SYNC_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  let truncated = false;
  let before: string | undefined;

  pages: for (let page = 0; page < MAX_PAGES; page++) {
    const messages = await fetchChannelMessages(channelId, { before, limit: PAGE_SIZE });
    if (messages.length === 0) break;

    for (const message of messages) {
      if (new Date(message.timestamp).getTime() < cutoff) {
        break pages;
      }

      if (inserted >= MAX_NEW_PHOTOS_PER_RUN) {
        // Gastamos el presupuesto de fotos nuevas: cortamos acá y dejamos el
        // resto para la próxima corrida.
        truncated = true;
        break pages;
      }

      try {
        const result = await syncMessage(admin, message);
        if (result === "inserted") inserted += 1;
        else if (result === "updated") updated += 1;
        else skipped += 1;
      } catch (err) {
        errors += 1;
        console.error("[cron/sync-galeria] Error procesando un mensaje", { messageId: message.id, error: err });
      }
    }

    if (messages.length < PAGE_SIZE) break;
    before = messages[messages.length - 1].id;
  }

  return NextResponse.json({ inserted, updated, skipped, errors, truncated });
}

async function syncMessage(
  admin: ReturnType<typeof createAdminClient>,
  message: DiscordMessage
): Promise<SyncResult> {
  // El chequeo de adjunto va PRIMERO: los mensajes sin imagen (la mayoría en un
  // canal real) no deben costar ni una consulta a la base.
  //
  // Contrapartida aceptada: si a un mensaje ya sincronizado le editan/borran el
  // adjunto, deja de recibir actualizaciones de reacciones. La fila sigue
  // renderizando bien con sus últimas reacciones conocidas.
  const attachment = extractImageAttachment(message);
  if (!attachment) return "skipped";

  const { data: existing, error: selectError } = await admin
    .from("gallery_photos")
    .select("id, reactions")
    .eq("discord_message_id", message.id)
    .maybeSingle();

  if (selectError) throw new Error(selectError.message);

  const reactions = formatReactions(message.reactions);

  if (existing) {
    // Sin cambios en las reacciones no hay nada que escribir: esto evita un
    // UPDATE por mensaje ya sincronizado en cada corrida.
    if (reactionsEqual(existing.reactions, reactions)) return "skipped";

    const { error: updateError } = await admin
      .from("gallery_photos")
      .update({ reactions, synced_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (updateError) throw new Error(updateError.message);
    return "updated";
  }

  const rawBuffer = await downloadImageBuffer(attachment.url);
  const { buffer: resizedBuffer, width, height } = await resizeImage(rawBuffer);
  const contentType = attachment.content_type ?? "image/jpeg";
  const storagePath = `${message.id}.${getFileExtension(contentType)}`;

  const { error: uploadError } = await admin.storage
    .from("gallery")
    .upload(storagePath, resizedBuffer, { contentType, upsert: true });
  if (uploadError) throw new Error(uploadError.message);

  const { error: insertError } = await admin.from("gallery_photos").insert({
    discord_message_id: message.id,
    author_display_name: getAuthorDisplayName(message.author),
    author_avatar_url: getAuthorAvatarUrl(message.author),
    caption: message.content || null,
    storage_path: storagePath,
    width,
    height,
    posted_at: message.timestamp,
    reactions,
  });
  if (insertError) {
    // 23505 = unique_violation sobre discord_message_id: otra corrida
    // solapada ya insertó esta foto. No es un error, ya está sincronizada.
    if (insertError.code === "23505") return "skipped";
    throw new Error(insertError.message);
  }

  return "inserted";
}

// Comparación de reacciones independiente del orden: Discord no garantiza un
// orden estable en el array de reacciones, así que un JSON.stringify directo
// daría falsos "cambió".
function reactionsEqual(a: unknown, b: Record<string, number>): boolean {
  return canonicalReactions(a) === canonicalReactions(b);
}

function canonicalReactions(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "[]";
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return JSON.stringify(entries);
}
