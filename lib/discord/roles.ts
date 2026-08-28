const DISCORD_API = "https://discord.com/api/v10";

function requireEnv(name: "DISCORD_BOT_TOKEN" | "DISCORD_GUILD_ID"): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

async function setRole(discordUserId: string, roleId: string, method: "PUT" | "DELETE") {
  const token = requireEnv("DISCORD_BOT_TOKEN");
  const guildId = requireEnv("DISCORD_GUILD_ID");

  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`, {
    method,
    headers: { Authorization: `Bot ${token}` },
  });

  if (!res.ok) {
    const action = method === "PUT" ? "otorgar" : "revocar";
    throw new Error(`Discord API respondió ${res.status} al ${action} el rol`);
  }
}

export function grantDiscordRole(discordUserId: string, roleId: string) {
  return setRole(discordUserId, roleId, "PUT");
}

export function revokeDiscordRole(discordUserId: string, roleId: string) {
  return setRole(discordUserId, roleId, "DELETE");
}
