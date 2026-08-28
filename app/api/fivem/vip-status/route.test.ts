import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const selectResult: { data: unknown[]; error: { message: string } | null } = { data: [], error: null };
const updateResult: { data: unknown[] } = { data: [] };

const eqMock = vi.fn(() => Promise.resolve(selectResult));
const selectMock = vi.fn(() => ({ eq: eqMock }));

const updateSelectMock = vi.fn(() => Promise.resolve(updateResult));
const isMock = vi.fn(() => ({ select: updateSelectMock }));
const inMock = vi.fn(() => ({ is: isMock }));
const updateMock = vi.fn(() => ({ in: inMock }));

const fromMock = vi.fn(() => ({ select: selectMock, update: updateMock }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock }),
}));

import { GET } from "./route";

function makeRequest(discordId: string | null, secret: string | null) {
  const url = discordId
    ? `http://localhost/api/fivem/vip-status?discordId=${discordId}`
    : "http://localhost/api/fivem/vip-status";
  const headers = new Headers();
  if (secret) headers.set("x-fivem-secret", secret);
  return new NextRequest(url, { headers });
}

describe("GET /api/fivem/vip-status", () => {
  beforeEach(() => {
    process.env.FIVEM_BRIDGE_SECRET = "bridge-secret";
    selectResult.data = [];
    selectResult.error = null;
    updateResult.data = [];
  });

  it("rejects requests without the correct shared secret", async () => {
    const res = await GET(makeRequest("d1", "wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("requires a discordId query param", async () => {
    const res = await GET(makeRequest(null, "bridge-secret"));
    expect(res.status).toBe(400);
  });

  it("returns null tier when there are no active VIP purchases", async () => {
    selectResult.data = [];
    const res = await GET(makeRequest("d1", "bridge-secret"));
    const json = await res.json();
    expect(json.tier).toBeNull();
  });

  it("returns the highest active tier among non-expired VIP purchases", async () => {
    const future = new Date(Date.now() + 10_000).toISOString();
    selectResult.data = [
      { id: "p1", item_type: "vip", item_key: "bronce", expires_at: future, delivered_at: future },
      { id: "p2", item_type: "vip", item_key: "oro", expires_at: future, delivered_at: future },
    ];
    const res = await GET(makeRequest("d1", "bridge-secret"));
    const json = await res.json();
    expect(json.tier).toBe("oro");
  });

  it("ignores expired VIP purchases when computing the active tier", async () => {
    const past = new Date(Date.now() - 10_000).toISOString();
    selectResult.data = [{ id: "p1", item_type: "vip", item_key: "oro", expires_at: past, delivered_at: past }];
    const res = await GET(makeRequest("d1", "bridge-secret"));
    const json = await res.json();
    expect(json.tier).toBeNull();
  });

  it("marks pending deliveries as delivered and returns them", async () => {
    selectResult.data = [{ id: "p1", item_type: "vehicle", item_key: "moto", expires_at: null, delivered_at: null }];
    updateResult.data = [{ id: "p1", item_type: "vehicle", item_key: "moto" }];

    const res = await GET(makeRequest("d1", "bridge-secret"));
    const json = await res.json();

    expect(updateMock).toHaveBeenCalledWith({ delivered_at: expect.any(String) });
    expect(inMock).toHaveBeenCalledWith("id", ["p1"]);
    expect(json.pendingDeliveries).toEqual([{ id: "p1", itemType: "vehicle", itemKey: "moto" }]);
  });
});
