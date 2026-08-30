import type { DiscordAttachment, DiscordAuthor, DiscordMessage, DiscordReaction } from "@/lib/discord/messages";

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

// Discord no garantiza `content_type` en todos los adjuntos (es un campo
// opcional de su API). Cuando falta, nos apoyamos en la extensión del
// nombre de archivo en vez de descartar una imagen real.
function looksLikeImage(attachment: DiscordAttachment): boolean {
  if (attachment.content_type?.startsWith("image/")) return true;
  const name = attachment.filename.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function extractImageAttachment(message: DiscordMessage): DiscordAttachment | null {
  for (const attachment of message.attachments) {
    if (!looksLikeImage(attachment)) continue;
    if (attachment.size > MAX_IMAGE_BYTES) continue;
    return attachment;
  }
  return null;
}

export function formatReactions(reactions: DiscordReaction[] | undefined): Record<string, number> {
  const result: Record<string, number> = {};
  for (const reaction of reactions ?? []) {
    if (!reaction.emoji.name) continue;
    result[reaction.emoji.name] = reaction.count;
  }
  return result;
}

export function getAuthorDisplayName(author: DiscordAuthor): string {
  return author.global_name ?? author.username;
}

export function getAuthorAvatarUrl(author: DiscordAuthor): string {
  if (author.avatar) {
    return `https://cdn.discordapp.com/avatars/${author.id}/${author.avatar}.png?size=128`;
  }
  return "https://cdn.discordapp.com/embed/avatars/0.png";
}

export function getFileExtension(contentType: string): string {
  return EXTENSION_BY_CONTENT_TYPE[contentType] ?? "jpg";
}
