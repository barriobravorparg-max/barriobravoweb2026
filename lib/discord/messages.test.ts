import { describe, expect, it, vi, beforeEach } from "vitest";
import { fetchChannelMessages } from "./messages";

describe("fetchChannelMessages", () => {
  beforeEach(() => {
    process.env.DISCORD_BOT_TOKEN = "bot-token";
    vi.stubGlobal("fetch", vi.fn());
  });

  it("throws if DISCORD_BOT_TOKEN is missing", async () => {
    delete process.env.DISCORD_BOT_TOKEN;
    await expect(fetchChannelMessages("channel-1")).rejects.toThrow("DISCORD_BOT_TOKEN");
  });

  it("calls Discord with the bot token and default limit", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    await fetchChannelMessages("channel-1");

    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("/channels/channel-1/messages");
    expect(url).toContain("limit=100");
    expect(init.headers.Authorization).toBe("Bot bot-token");
  });

  it("includes the before cursor when provided", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true, json: async () => [] });

    await fetchChannelMessages("channel-1", { before: "msg-99", limit: 50 });

    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("before=msg-99");
    expect(url).toContain("limit=50");
  });

  it("throws when Discord responds with a non-ok status", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false, status: 403 });
    await expect(fetchChannelMessages("channel-1")).rejects.toThrow("403");
  });

  it("returns the parsed messages on success", async () => {
    const messages = [{ id: "1" }];
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true, json: async () => messages });
    await expect(fetchChannelMessages("channel-1")).resolves.toEqual(messages);
  });
});
