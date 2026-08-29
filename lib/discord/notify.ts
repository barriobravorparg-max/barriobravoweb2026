const DISCORD_API = "https://discord.com/api/v10";

export async function notifyStaffChannel(content: string): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_STAFF_CHANNEL_ID;

  if (!token || !channelId) {
    throw new Error("Falta DISCORD_BOT_TOKEN o DISCORD_STAFF_CHANNEL_ID");
  }

  const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    throw new Error(`Discord API respondió ${res.status} al notificar al canal de staff`);
  }
}
