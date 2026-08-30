import { describe, expect, it, vi, beforeEach } from "vitest";
import sharp from "sharp";
import { downloadImageBuffer, resizeImage } from "./process-image";

describe("downloadImageBuffer", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns the response bytes as a Buffer", async () => {
    const bytes = new Uint8Array([1, 2, 3]).buffer;
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true, arrayBuffer: async () => bytes });

    const result = await downloadImageBuffer("http://x/a.png");

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(Array.from(result)).toEqual([1, 2, 3]);
  });

  it("throws when the download fails", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false, status: 404 });
    await expect(downloadImageBuffer("http://x/missing.png")).rejects.toThrow("404");
  });
});

describe("resizeImage", () => {
  it("downscales a wide image to the 1600px max width", async () => {
    const wide = await sharp({
      create: { width: 2000, height: 1000, channels: 3, background: { r: 10, g: 10, b: 10 } },
    })
      .png()
      .toBuffer();

    const result = await resizeImage(wide);

    expect(result.width).toBe(1600);
    expect(result.height).toBe(800);
  });

  it("does not enlarge an image already smaller than the max width", async () => {
    const small = await sharp({
      create: { width: 400, height: 300, channels: 3, background: { r: 10, g: 10, b: 10 } },
    })
      .png()
      .toBuffer();

    const result = await resizeImage(small);

    expect(result.width).toBe(400);
    expect(result.height).toBe(300);
  });
});
