import { describe, expect, it } from "vitest";
import {
  extractImageAttachment,
  formatReactions,
  getAuthorAvatarUrl,
  getAuthorDisplayName,
  getFileExtension,
} from "./parse";
import type { DiscordMessage } from "@/lib/discord/messages";

function baseMessage(overrides: Partial<DiscordMessage> = {}): DiscordMessage {
  return {
    id: "1",
    content: "",
    timestamp: "2026-08-30T00:00:00.000Z",
    author: { id: "u1", username: "chapa", global_name: null, avatar: null },
    attachments: [],
    ...overrides,
  };
}

describe("extractImageAttachment", () => {
  it("returns null when there are no attachments", () => {
    expect(extractImageAttachment(baseMessage())).toBeNull();
  });

  it("returns null when the only attachment is not an image", () => {
    const message = baseMessage({
      attachments: [{ content_type: "video/mp4", url: "http://x/clip.mp4", size: 100 }],
    });
    expect(extractImageAttachment(message)).toBeNull();
  });

  it("skips an oversized image and returns null if it's the only one", () => {
    const message = baseMessage({
      attachments: [{ content_type: "image/png", url: "http://x/big.png", size: 21 * 1024 * 1024 }],
    });
    expect(extractImageAttachment(message)).toBeNull();
  });

  it("returns the first valid image attachment", () => {
    const attachment = { content_type: "image/png", url: "http://x/a.png", size: 1000 };
    const message = baseMessage({
      attachments: [{ content_type: "video/mp4", url: "http://x/clip.mp4", size: 100 }, attachment],
    });
    expect(extractImageAttachment(message)).toEqual(attachment);
  });
});

describe("formatReactions", () => {
  it("returns an empty object when there are no reactions", () => {
    expect(formatReactions(undefined)).toEqual({});
    expect(formatReactions([])).toEqual({});
  });

  it("maps emoji name to count, skipping reactions without a name", () => {
    const result = formatReactions([
      { emoji: { name: "❤️" }, count: 3 },
      { emoji: { name: null }, count: 1 },
    ]);
    expect(result).toEqual({ "❤️": 3 });
  });
});

describe("getAuthorDisplayName", () => {
  it("prefers global_name over username", () => {
    expect(getAuthorDisplayName({ id: "1", username: "chapa", global_name: "Chapita", avatar: null })).toBe(
      "Chapita"
    );
  });

  it("falls back to username when global_name is null", () => {
    expect(getAuthorDisplayName({ id: "1", username: "chapa", global_name: null, avatar: null })).toBe("chapa");
  });
});

describe("getAuthorAvatarUrl", () => {
  it("builds the CDN URL when the author has an avatar hash", () => {
    expect(getAuthorAvatarUrl({ id: "42", username: "chapa", global_name: null, avatar: "abc123" })).toBe(
      "https://cdn.discordapp.com/avatars/42/abc123.png?size=128"
    );
  });

  it("falls back to the default embed avatar when there's no hash", () => {
    expect(getAuthorAvatarUrl({ id: "42", username: "chapa", global_name: null, avatar: null })).toBe(
      "https://cdn.discordapp.com/embed/avatars/0.png"
    );
  });
});

describe("getFileExtension", () => {
  it("maps known content types", () => {
    expect(getFileExtension("image/png")).toBe("png");
    expect(getFileExtension("image/jpeg")).toBe("jpg");
    expect(getFileExtension("image/webp")).toBe("webp");
  });

  it("falls back to jpg for an unknown content type", () => {
    expect(getFileExtension("image/tiff")).toBe("jpg");
  });
});
