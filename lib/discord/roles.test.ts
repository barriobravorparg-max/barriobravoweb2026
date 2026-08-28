import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { grantDiscordRole, revokeDiscordRole } from "./roles";

describe("Discord role helpers", () => {
  const originalToken = process.env.DISCORD_BOT_TOKEN;
  const originalGuild = process.env.DISCORD_GUILD_ID;

  beforeEach(() => {
    process.env.DISCORD_BOT_TOKEN = "bot-token";
    process.env.DISCORD_GUILD_ID = "guild-1";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 204 }));
  });

  afterEach(() => {
    process.env.DISCORD_BOT_TOKEN = originalToken;
    process.env.DISCORD_GUILD_ID = originalGuild;
    vi.unstubAllGlobals();
  });

  it("PUTs to the Discord API to grant a role", async () => {
    await grantDiscordRole("discord-123", "role-456");
    expect(fetch).toHaveBeenCalledWith(
      "https://discord.com/api/v10/guilds/guild-1/members/discord-123/roles/role-456",
      { method: "PUT", headers: { Authorization: "Bot bot-token" } }
    );
  });

  it("DELETEs to the Discord API to revoke a role", async () => {
    await revokeDiscordRole("discord-123", "role-456");
    expect(fetch).toHaveBeenCalledWith(
      "https://discord.com/api/v10/guilds/guild-1/members/discord-123/roles/role-456",
      { method: "DELETE", headers: { Authorization: "Bot bot-token" } }
    );
  });

  it("throws when the Discord API responds with an error status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    await expect(grantDiscordRole("discord-123", "role-456")).rejects.toThrow(/403/);
  });

  it("throws when DISCORD_BOT_TOKEN is missing", async () => {
    delete process.env.DISCORD_BOT_TOKEN;
    await expect(grantDiscordRole("discord-123", "role-456")).rejects.toThrow(/DISCORD_BOT_TOKEN/);
  });
});
