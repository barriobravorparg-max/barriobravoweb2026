import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const selectResult: { data: unknown[]; error: { message: string } | null } = { data: [], error: null };

const ltMock = vi.fn(() => Promise.resolve(selectResult));
const isMock = vi.fn(() => ({ lt: ltMock }));
const eqMock = vi.fn(() => ({ is: isMock }));
const selectMock = vi.fn(() => ({ eq: eqMock }));

const updateEqMock = vi.fn(() => Promise.resolve({ error: null }));
const updateMock = vi.fn(() => ({ eq: updateEqMock }));

const fromMock = vi.fn(() => ({ select: selectMock, update: updateMock }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock }),
}));

const revokeDiscordRoleMock = vi.fn();
vi.mock("@/lib/discord/roles", () => ({
  revokeDiscordRole: (discordId: string, roleId: string) => revokeDiscordRoleMock(discordId, roleId),
}));

vi.mock("@/lib/discord/role-map", () => ({
  getVipRoleId: () => "role-plata-id",
}));

import { GET } from "./route";

function makeRequest(authHeader: string | null) {
  const headers = new Headers();
  if (authHeader) headers.set("authorization", authHeader);
  return new NextRequest("http://localhost/api/cron/expire-vips", { headers });
}

describe("GET /api/cron/expire-vips", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "cron-secret";
    selectResult.data = [];
    selectResult.error = null;
    revokeDiscordRoleMock.mockReset();
    updateMock.mockClear();
    updateEqMock.mockClear();
  });

  it("rejects requests without the correct bearer token", async () => {
    const res = await GET(makeRequest("Bearer wrong"));
    expect(res.status).toBe(401);
  });

  it("does nothing when there are no expired VIP purchases", async () => {
    selectResult.data = [];
    const res = await GET(makeRequest("Bearer cron-secret"));
    const json = await res.json();
    expect(json).toEqual({ revoked: 0 });
    expect(revokeDiscordRoleMock).not.toHaveBeenCalled();
  });

  it("revokes the Discord role for each expired purchase and marks it processed", async () => {
    selectResult.data = [{ id: "p1", discord_id: "d1", item_key: "plata" }];
    const res = await GET(makeRequest("Bearer cron-secret"));
    const json = await res.json();

    expect(revokeDiscordRoleMock).toHaveBeenCalledWith("d1", "role-plata-id");
    expect(updateMock).toHaveBeenCalledWith({ discord_role_revoked_at: expect.any(String) });
    expect(updateEqMock).toHaveBeenCalledWith("id", "p1");
    expect(json).toEqual({ revoked: 1 });
  });

  it("keeps processing the rest of the batch when one purchase fails, and excludes it from the count", async () => {
    selectResult.data = [
      { id: "p1", discord_id: "d1", item_key: "plata" },
      { id: "p2", discord_id: "d2", item_key: "plata" },
    ];
    revokeDiscordRoleMock.mockImplementationOnce(() => Promise.reject(new Error("Discord API respondió 404")));
    revokeDiscordRoleMock.mockImplementationOnce(() => Promise.resolve());
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await GET(makeRequest("Bearer cron-secret"));
    const json = await res.json();

    expect(revokeDiscordRoleMock).toHaveBeenNthCalledWith(1, "d1", "role-plata-id");
    expect(revokeDiscordRoleMock).toHaveBeenNthCalledWith(2, "d2", "role-plata-id");
    expect(updateEqMock).not.toHaveBeenCalledWith("id", "p1");
    expect(updateEqMock).toHaveBeenCalledWith("id", "p2");
    expect(json).toEqual({ revoked: 1 });
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
