const DISCORD_API = "https://discord.com/api/v10";

export interface DiscordAuthor {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
}

export interface DiscordAttachment {
  content_type?: string;
  url: string;
  size: number;
}

export interface DiscordReaction {
  emoji: { name: string | null };
  count: number;
}

export interface DiscordMessage {
  id: string;
  content: string;
  timestamp: string;
  author: DiscordAuthor;
  attachments: DiscordAttachment[];
  reactions?: DiscordReaction[];
}

export async function fetchChannelMessages(
  channelId: string,
  options: { before?: string; limit?: number } = {}
): Promise<DiscordMessage[]> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    throw new Error("Falta DISCORD_BOT_TOKEN");
  }

  const params = new URLSearchParams({ limit: String(options.limit ?? 100) });
  if (options.before) params.set("before", options.before);

  const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages?${params}`, {
    headers: { Authorization: `Bot ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Discord API respondió ${res.status} al leer mensajes del canal`);
  }

  return res.json();
}
