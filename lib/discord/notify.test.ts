import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { notifyStaffChannel } from "./notify";

describe("notifyStaffChannel", () => {
  const originalToken = process.env.DISCORD_BOT_TOKEN;
  const originalChannel = process.env.DISCORD_STAFF_CHANNEL_ID;

  beforeEach(() => {
    process.env.DISCORD_BOT_TOKEN = "bot-token";
    process.env.DISCORD_STAFF_CHANNEL_ID = "channel-1";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200 }));
  });

  afterEach(() => {
    process.env.DISCORD_BOT_TOKEN = originalToken;
    process.env.DISCORD_STAFF_CHANNEL_ID = originalChannel;
    vi.unstubAllGlobals();
  });

  it("POSTs the message to the staff channel", async () => {
    await notifyStaffChannel("hola staff");
    expect(fetch).toHaveBeenCalledWith("https://discord.com/api/v10/channels/channel-1/messages", {
      method: "POST",
      headers: { Authorization: "Bot bot-token", "Content-Type": "application/json" },
      body: JSON.stringify({ content: "hola staff" }),
    });
  });

  it("throws when the Discord API responds with an error status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    await expect(notifyStaffChannel("hola")).rejects.toThrow(/403/);
  });

  it("throws when DISCORD_STAFF_CHANNEL_ID is missing", async () => {
    delete process.env.DISCORD_STAFF_CHANNEL_ID;
    await expect(notifyStaffChannel("hola")).rejects.toThrow(/DISCORD_STAFF_CHANNEL_ID/);
  });
});
