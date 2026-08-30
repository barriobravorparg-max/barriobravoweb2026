// app/api/cron/sync-galeria/route.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const fetchChannelMessagesMock = vi.fn();
vi.mock("@/lib/discord/messages", () => ({
  fetchChannelMessages: (channelId: string, options?: unknown) => fetchChannelMessagesMock(channelId, options),
}));

const downloadImageBufferMock = vi.fn();
const resizeImageMock = vi.fn();
vi.mock("@/lib/gallery/process-image", () => ({
  downloadImageBuffer: (url: string) => downloadImageBufferMock(url),
  resizeImage: (buffer: Buffer) => resizeImageMock(buffer),
}));

const gallerySelectMaybeSingleMock = vi.fn();
const gallerySelectEqMock = vi.fn(() => ({ maybeSingle: gallerySelectMaybeSingleMock }));
const gallerySelectMock = vi.fn(() => ({ eq: gallerySelectEqMock }));
const galleryUpdateEqMock = vi.fn(() => Promise.resolve({ error: null }));
const galleryUpdateMock = vi.fn(() => ({ eq: galleryUpdateEqMock }));
const galleryInsertMock = vi.fn(() => Promise.resolve({ error: null }));
const galleryFromMock = vi.fn(() => ({ select: gallerySelectMock, update: galleryUpdateMock, insert: galleryInsertMock }));

const storageUploadMock = vi.fn(() => Promise.resolve({ error: null }));
const storageFromMock = vi.fn(() => ({ upload: storageUploadMock }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: galleryFromMock, storage: { from: storageFromMock } }),
}));

import { GET } from "./route";

function makeRequest(authHeader: string | null) {
  const headers = new Headers();
  if (authHeader) headers.set("authorization", authHeader);
  return new NextRequest("http://localhost/api/cron/sync-galeria", { headers });
}

function message(overrides: Record<string, unknown> = {}) {
  return {
    id: "msg-1",
    content: "que noche",
    timestamp: new Date().toISOString(),
    author: { id: "u1", username: "chapa", global_name: "Chapita", avatar: null },
    attachments: [{ content_type: "image/png", url: "http://cdn/a.png", size: 1000 }],
    reactions: [{ emoji: { name: "❤️" }, count: 2 }],
    ...overrides,
  };
}

describe("GET /api/cron/sync-galeria", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "cron-secret";
    process.env.DISCORD_GALLERY_CHANNEL_ID = "channel-1";
    fetchChannelMessagesMock.mockReset();
    downloadImageBufferMock.mockReset().mockResolvedValue(Buffer.from([1]));
    resizeImageMock.mockReset().mockResolvedValue({ buffer: Buffer.from([1]), width: 800, height: 600 });
    gallerySelectMaybeSingleMock.mockReset().mockResolvedValue({ data: null, error: null });
    galleryUpdateMock.mockClear();
    galleryInsertMock.mockClear();
    storageUploadMock.mockClear();
  });

  it("rejects requests without the correct bearer token", async () => {
    const res = await GET(makeRequest("Bearer wrong"));
    expect(res.status).toBe(401);
  });

  it("fails clearly when DISCORD_GALLERY_CHANNEL_ID is missing", async () => {
    delete process.env.DISCORD_GALLERY_CHANNEL_ID;
    const res = await GET(makeRequest("Bearer cron-secret"));
    expect(res.status).toBe(500);
  });

  it("inserts a new message with a valid image attachment", async () => {
    fetchChannelMessagesMock.mockResolvedValueOnce([message()]).mockResolvedValueOnce([]);

    const res = await GET(makeRequest("Bearer cron-secret"));
    const json = await res.json();

    expect(downloadImageBufferMock).toHaveBeenCalledWith("http://cdn/a.png");
    expect(storageUploadMock).toHaveBeenCalledWith(
      "msg-1.png",
      Buffer.from([1]),
      expect.objectContaining({ contentType: "image/png" })
    );
    expect(galleryInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        discord_message_id: "msg-1",
        author_display_name: "Chapita",
        width: 800,
        height: 600,
        reactions: { "❤️": 2 },
      })
    );
    expect(json).toEqual({ inserted: 1, updated: 0, skipped: 0 });
  });

  it("only updates reactions for a message that's already stored, without re-downloading the image", async () => {
    gallerySelectMaybeSingleMock.mockResolvedValue({ data: { id: "row-1" }, error: null });
    fetchChannelMessagesMock.mockResolvedValueOnce([message()]).mockResolvedValueOnce([]);

    const res = await GET(makeRequest("Bearer cron-secret"));
    const json = await res.json();

    expect(downloadImageBufferMock).not.toHaveBeenCalled();
    expect(galleryUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ reactions: { "❤️": 2 } })
    );
    expect(json).toEqual({ inserted: 0, updated: 1, skipped: 0 });
  });

  it("skips a message with no image attachment", async () => {
    fetchChannelMessagesMock
      .mockResolvedValueOnce([message({ attachments: [] })])
      .mockResolvedValueOnce([]);

    const res = await GET(makeRequest("Bearer cron-secret"));
    const json = await res.json();

    expect(galleryInsertMock).not.toHaveBeenCalled();
    expect(json).toEqual({ inserted: 0, updated: 0, skipped: 1 });
  });

  it("stops paginating once it reaches a message older than the 7-day window", async () => {
    const old = message({ id: "msg-old", timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString() });
    fetchChannelMessagesMock.mockResolvedValueOnce([message(), old]);

    const res = await GET(makeRequest("Bearer cron-secret"));
    const json = await res.json();

    expect(fetchChannelMessagesMock).toHaveBeenCalledTimes(1);
    expect(json).toEqual({ inserted: 1, updated: 0, skipped: 0 });
  });

  it("does not let one message's error stop the rest of the batch", async () => {
    downloadImageBufferMock.mockRejectedValueOnce(new Error("boom")).mockResolvedValue(Buffer.from([1]));
    fetchChannelMessagesMock
      .mockResolvedValueOnce([message({ id: "msg-bad" }), message({ id: "msg-good" })])
      .mockResolvedValueOnce([]);

    const res = await GET(makeRequest("Bearer cron-secret"));
    const json = await res.json();

    expect(json).toEqual({ inserted: 1, updated: 0, skipped: 0 });
  });
});
