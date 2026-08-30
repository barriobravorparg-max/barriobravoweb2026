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
  let before: string | undefined;

  pages: for (let page = 0; page < MAX_PAGES; page++) {
    const messages = await fetchChannelMessages(channelId, { before, limit: PAGE_SIZE });
    if (messages.length === 0) break;

    for (const message of messages) {
      if (new Date(message.timestamp).getTime() < cutoff) {
        break pages;
      }

      try {
        const result = await syncMessage(admin, message);
        if (result === "inserted") inserted += 1;
        else if (result === "updated") updated += 1;
        else skipped += 1;
      } catch (err) {
        console.error("[cron/sync-galeria] Error procesando un mensaje", { messageId: message.id, error: err });
      }
    }

    if (messages.length < PAGE_SIZE) break;
    before = messages[messages.length - 1].id;
  }

  return NextResponse.json({ inserted, updated, skipped });
}

async function syncMessage(
  admin: ReturnType<typeof createAdminClient>,
  message: DiscordMessage
): Promise<SyncResult> {
  const { data: existing, error: selectError } = await admin
    .from("gallery_photos")
    .select("id")
    .eq("discord_message_id", message.id)
    .maybeSingle();

  if (selectError) throw new Error(selectError.message);

  const reactions = formatReactions(message.reactions);

  if (existing) {
    const { error: updateError } = await admin
      .from("gallery_photos")
      .update({ reactions, synced_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (updateError) throw new Error(updateError.message);
    return "updated";
  }

  const attachment = extractImageAttachment(message);
  if (!attachment) return "skipped";

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
  if (insertError) throw new Error(insertError.message);

  return "inserted";
}
