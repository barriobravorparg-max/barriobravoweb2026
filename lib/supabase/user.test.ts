import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";
import { toAppUser, getDiscordId } from "./user";

function makeUser(metadata: Record<string, unknown> = {}, email: string | null = "fundador@example.com"): User {
  return {
    id: "u1",
    app_metadata: {},
    user_metadata: metadata,
    aud: "authenticated",
    created_at: "",
    email: email ?? undefined,
  } as User;
}

describe("toAppUser", () => {
  it("prefers full_name for the display name", () => {
    const user = makeUser({ full_name: "Fundador", user_name: "fundador123", avatar_url: "https://cdn.discordapp.com/a.png" });
    expect(toAppUser(user)).toEqual({
      avatarUrl: "https://cdn.discordapp.com/a.png",
      displayName: "Fundador",
      email: "fundador@example.com",
    });
  });

  it("falls back to user_name when full_name is missing", () => {
    const user = makeUser({ user_name: "fundador123" });
    expect(toAppUser(user).displayName).toBe("fundador123");
  });

  it("falls back to email when no name metadata is present", () => {
    const user = makeUser({});
    expect(toAppUser(user).displayName).toBe("fundador@example.com");
  });

  it("falls back to a generic label when nothing is available", () => {
    const user = makeUser({}, null);
    expect(toAppUser(user).displayName).toBe("Usuario");
  });

  it("returns a null avatarUrl when metadata has none", () => {
    const user = makeUser({});
    expect(toAppUser(user).avatarUrl).toBeNull();
  });
});

describe("getDiscordId", () => {
  it("prefers provider_id", () => {
    const user = makeUser({ provider_id: "123456789", sub: "987654321" });
    expect(getDiscordId(user)).toBe("123456789");
  });

  it("falls back to sub when provider_id is missing", () => {
    const user = makeUser({ sub: "987654321" });
    expect(getDiscordId(user)).toBe("987654321");
  });

  it("returns null when neither is present", () => {
    const user = makeUser({});
    expect(getDiscordId(user)).toBeNull();
  });
});
