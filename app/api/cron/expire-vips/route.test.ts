import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const selectResult: { data: unknown[]; error: { message: string } | null } = { data: [], error: null };

// Renewal-check queries are keyed by "discordId:itemKey" so each test can
// control, per purchase, whether an active same-tier renewal exists.
const renewalResults = new Map<string, { data: unknown[]; error: { message: string } | null }>();
const renewalDefault: { data: unknown[]; error: { message: string } | null } = { data: [], error: null };

function makeRenewalBuilder() {
  const calls: Record<string, unknown> = {};
  const builder = {
    eq: vi.fn((col: string, val: unknown) => {
      calls[col] = val;
      return builder;
    }),
    neq: vi.fn(() => builder),
    gt: vi.fn(() => builder),
    limit: vi.fn(() => {
      const key = `${calls.discord_id}:${calls.item_key}`;
      const result = renewalResults.get(key) ?? renewalDefault;
      return Promise.resolve(result);
    }),
  };
  return builder;
}

const ltMock = vi.fn(() => Promise.resolve(selectResult));
const isMock = vi.fn(() => ({ lt: ltMock }));
const eqMock = vi.fn(() => ({ is: isMock }));

const selectMock = vi.fn((cols: string) => {
  if (cols === "id") {
    return makeRenewalBuilder();
  }
  return { eq: eqMock };
});

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

const getVipRoleIdMock = vi.fn((tier: string): string | undefined => {
  void tier;
  return "role-plata-id";
});
vi.mock("@/lib/discord/role-map", () => ({
  getVipRoleId: (tier: string) => getVipRoleIdMock(tier),
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
    renewalResults.clear();
    revokeDiscordRoleMock.mockReset();
    getVipRoleIdMock.mockReset();
    getVipRoleIdMock.mockImplementation(() => "role-plata-id");
    updateMock.mockClear();
    updateEqMock.mockClear();
  });

  it("rejects requests without the correct bearer token", async () => {
    const res = await GET(makeRequest("Bearer wrong"));
    expect(res.status).toBe(401);
  });

  it("rejects the literal 'Bearer undefined' header when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(makeRequest("Bearer undefined"));
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

  it("skips revokeDiscordRole when the same discord_id has an active renewal of the same tier, but still marks the row processed", async () => {
    selectResult.data = [{ id: "p1", discord_id: "d1", item_key: "oro" }];
    renewalResults.set("d1:oro", { data: [{ id: "p2" }], error: null });

    const res = await GET(makeRequest("Bearer cron-secret"));
    const json = await res.json();

    expect(revokeDiscordRoleMock).not.toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalledWith({ discord_role_revoked_at: expect.any(String) });
    expect(updateEqMock).toHaveBeenCalledWith("id", "p1");
    expect(json).toEqual({ revoked: 1 });
  });

  it("skips revoking and marking processed when no Discord role is configured for the tier, so a later fix can catch it", async () => {
    selectResult.data = [{ id: "p1", discord_id: "d1", item_key: "bronce" }];
    getVipRoleIdMock.mockImplementation(() => undefined);
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const res = await GET(makeRequest("Bearer cron-secret"));
    const json = await res.json();

    expect(revokeDiscordRoleMock).not.toHaveBeenCalled();
    expect(updateEqMock).not.toHaveBeenCalledWith("id", "p1");
    expect(json).toEqual({ revoked: 0 });
    expect(consoleWarnSpy).toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });
});
