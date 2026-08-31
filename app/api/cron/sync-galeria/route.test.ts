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
type InsertResult = { error: { code?: string; message: string } | null };
const galleryInsertMock = vi.fn((): Promise<InsertResult> => Promise.resolve({ error: null }));
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
    attachments: [{ content_type: "image/png", filename: "a.png", url: "http://cdn/a.png", size: 1000 }],
    reactions: [{ emoji: { name: "❤️" }, count: 2 }],
    ...overrides,
  };
}

// Una página "llena" (PAGE_SIZE = 100), que es lo que hace que la ruta pida la
// página siguiente.
function fullPage(prefix: string, overrides: Record<string, unknown> = {}) {
  return Array.from({ length: 100 }, (_, i) => message({ id: `${prefix}-${i}`, ...overrides }));
}

describe("GET /api/cron/sync-galeria", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "cron-secret";
    process.env.DISCORD_GALLERY_CHANNEL_ID = "channel-1";
    fetchChannelMessagesMock.mockReset();
    downloadImageBufferMock.mockReset().mockResolvedValue(Buffer.from([1]));
    resizeImageMock.mockReset().mockResolvedValue({ buffer: Buffer.from([1]), width: 800, height: 600 });
    gallerySelectMaybeSingleMock.mockReset().mockResolvedValue({ data: null, error: null });
    gallerySelectMock.mockClear();
    galleryUpdateMock.mockClear();
    galleryInsertMock.mockReset().mockResolvedValue({ error: null });
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
    expect(json).toEqual({ inserted: 1, updated: 0, skipped: 0, errors: 0, truncated: false, debug: [] });
  });

  it("only updates reactions for a message that's already stored, without re-downloading the image", async () => {
    gallerySelectMaybeSingleMock.mockResolvedValue({ data: { id: "row-1", reactions: { "❤️": 1 } }, error: null });
    fetchChannelMessagesMock.mockResolvedValueOnce([message()]).mockResolvedValueOnce([]);

    const res = await GET(makeRequest("Bearer cron-secret"));
    const json = await res.json();

    expect(downloadImageBufferMock).not.toHaveBeenCalled();
    expect(galleryUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ reactions: { "❤️": 2 } })
    );
    expect(json).toEqual({ inserted: 0, updated: 1, skipped: 0, errors: 0, truncated: false, debug: [] });
  });

  it("does not write anything when the stored reactions already match", async () => {
    gallerySelectMaybeSingleMock.mockResolvedValue({ data: { id: "row-1", reactions: { "❤️": 2 } }, error: null });
    fetchChannelMessagesMock.mockResolvedValueOnce([message()]).mockResolvedValueOnce([]);

    const res = await GET(makeRequest("Bearer cron-secret"));
    const json = await res.json();

    expect(galleryUpdateMock).not.toHaveBeenCalled();
    expect(json).toEqual({ inserted: 0, updated: 0, skipped: 1, errors: 0, truncated: false, debug: [] });
  });

  it("treats a different key order in the stored reactions as unchanged", async () => {
    gallerySelectMaybeSingleMock.mockResolvedValue({
      data: { id: "row-1", reactions: { "🔥": 5, "❤️": 2 } },
      error: null,
    });
    fetchChannelMessagesMock
      .mockResolvedValueOnce([
        message({
          reactions: [
            { emoji: { name: "❤️" }, count: 2 },
            { emoji: { name: "🔥" }, count: 5 },
          ],
        }),
      ])
      .mockResolvedValueOnce([]);

    const res = await GET(makeRequest("Bearer cron-secret"));
    const json = await res.json();

    expect(galleryUpdateMock).not.toHaveBeenCalled();
    expect(json).toEqual({ inserted: 0, updated: 0, skipped: 1, errors: 0, truncated: false, debug: [] });
  });

  it("skips a message with no image attachment without querying the database", async () => {
    fetchChannelMessagesMock
      .mockResolvedValueOnce([message({ attachments: [] })])
      .mockResolvedValueOnce([]);

    const res = await GET(makeRequest("Bearer cron-secret"));
    const json = await res.json();

    expect(gallerySelectMock).not.toHaveBeenCalled();
    expect(galleryInsertMock).not.toHaveBeenCalled();
    expect(json).toEqual({ inserted: 0, updated: 0, skipped: 1, errors: 0, truncated: false, debug: [] });
  });

  it("reports diagnostic info when a message has attachments but none qualify as an image", async () => {
    fetchChannelMessagesMock
      .mockResolvedValueOnce([
        message({ attachments: [{ content_type: undefined, filename: "clip.mov", url: "http://cdn/clip.mov", size: 500 }] }),
      ])
      .mockResolvedValueOnce([]);

    const res = await GET(makeRequest("Bearer cron-secret"));
    const json = await res.json();

    expect(json.debug).toEqual([
      {
        messageId: "msg-1",
        attachments: [{ content_type: null, filename: "clip.mov", size: 500 }],
      },
    ]);
  });

  it("treats a 23505 unique violation on insert as already synced, not an error", async () => {
    galleryInsertMock.mockResolvedValueOnce({
      error: { code: "23505", message: "duplicate key value violates unique constraint" },
    });
    fetchChannelMessagesMock.mockResolvedValueOnce([message()]).mockResolvedValueOnce([]);

    const res = await GET(makeRequest("Bearer cron-secret"));
    const json = await res.json();

    expect(json).toEqual({ inserted: 0, updated: 0, skipped: 1, errors: 0, truncated: false, debug: [] });
  });

  it("counts a real insert failure as an error", async () => {
    galleryInsertMock.mockResolvedValueOnce({ error: { code: "42501", message: "permission denied" } });
    fetchChannelMessagesMock.mockResolvedValueOnce([message()]).mockResolvedValueOnce([]);

    const res = await GET(makeRequest("Bearer cron-secret"));
    const json = await res.json();

    expect(json).toEqual({ inserted: 0, updated: 0, skipped: 0, errors: 1, truncated: false, debug: [] });
  });

  it("stops paginating once it reaches a message older than the 7-day window", async () => {
    const old = message({ id: "msg-old", timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString() });
    fetchChannelMessagesMock.mockResolvedValueOnce([message(), old]);

    const res = await GET(makeRequest("Bearer cron-secret"));
    const json = await res.json();

    expect(fetchChannelMessagesMock).toHaveBeenCalledTimes(1);
    expect(json).toEqual({ inserted: 1, updated: 0, skipped: 0, errors: 0, truncated: false, debug: [] });
  });

  it("does not let one message's error stop the rest of the batch, and counts it", async () => {
    downloadImageBufferMock.mockRejectedValueOnce(new Error("boom")).mockResolvedValue(Buffer.from([1]));
    fetchChannelMessagesMock
      .mockResolvedValueOnce([message({ id: "msg-bad" }), message({ id: "msg-good" })])
      .mockResolvedValueOnce([]);

    const res = await GET(makeRequest("Bearer cron-secret"));
    const json = await res.json();

    expect(json).toEqual({ inserted: 1, updated: 0, skipped: 0, errors: 1, truncated: false, debug: [] });
  });

  it("caps new-photo work per run and reports truncated, leaving the rest for the next run", async () => {
    // Una página llena de fotos nuevas: sin tope, la ruta procesaría las 100 y
    // pediría una segunda página.
    fetchChannelMessagesMock.mockResolvedValue(fullPage("msg"));

    const res = await GET(makeRequest("Bearer cron-secret"));
    const json = await res.json();

    expect(json).toEqual({ inserted: 20, updated: 0, skipped: 0, errors: 0, truncated: true, debug: [] });
    expect(galleryInsertMock).toHaveBeenCalledTimes(20);
    expect(downloadImageBufferMock).toHaveBeenCalledTimes(20);
    // Cortó dentro de la primera página: nunca pidió la siguiente.
    expect(fetchChannelMessagesMock).toHaveBeenCalledTimes(1);
  });

  it("stops after MAX_PAGES full pages even when nothing is expensive to process", async () => {
    // Mensajes sin adjunto: se saltean, así que el tope de fotos nuevas nunca
    // se alcanza y lo único que corta la paginación es MAX_PAGES.
    fetchChannelMessagesMock.mockImplementation(() =>
      Promise.resolve(fullPage(`p${fetchChannelMessagesMock.mock.calls.length}`, { attachments: [] }))
    );

    const res = await GET(makeRequest("Bearer cron-secret"));
    const json = await res.json();

    expect(fetchChannelMessagesMock).toHaveBeenCalledTimes(10);
    expect(json).toEqual({ inserted: 0, updated: 0, skipped: 1000, errors: 0, truncated: false, debug: [] });
  });

  it("does not log a duplicate insert as an error", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      galleryInsertMock.mockResolvedValueOnce({ error: { code: "23505", message: "duplicate" } });
      fetchChannelMessagesMock.mockResolvedValueOnce([message()]).mockResolvedValueOnce([]);

      await GET(makeRequest("Bearer cron-secret"));

      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });
});
