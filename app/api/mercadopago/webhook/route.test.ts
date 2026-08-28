import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const getPaymentMock = vi.fn();
vi.mock("@/lib/mercadopago/payment", () => ({
  getPayment: (id: string) => getPaymentMock(id),
}));

const insertMock = vi.fn();
const fromMock = vi.fn(() => ({ insert: insertMock }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock }),
}));

const grantDiscordRoleMock = vi.fn();
vi.mock("@/lib/discord/roles", () => ({
  grantDiscordRole: (discordId: string, roleId: string) => grantDiscordRoleMock(discordId, roleId),
}));

vi.mock("@/lib/discord/role-map", () => ({
  getVipRoleId: () => "role-plata-id",
}));

import { POST } from "./route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/mercadopago/webhook", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/mercadopago/webhook", () => {
  beforeEach(() => {
    getPaymentMock.mockReset();
    insertMock.mockReset();
    fromMock.mockClear();
    grantDiscordRoleMock.mockReset();
    insertMock.mockResolvedValue({ error: null });
  });

  it("ignores payments that are not approved", async () => {
    getPaymentMock.mockResolvedValue({ id: 1, status: "pending", metadata: {} });
    const res = await POST(makeRequest({ data: { id: "1" } }));
    expect(res.status).toBe(200);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("inserts a purchase and grants the Discord role for an approved VIP payment", async () => {
    getPaymentMock.mockResolvedValue({
      id: 42,
      status: "approved",
      metadata: { user_id: "u1", discord_id: "d1", item_type: "vip", item_key: "plata" },
    });

    const res = await POST(makeRequest({ data: { id: "42" } }));

    expect(res.status).toBe(200);
    expect(fromMock).toHaveBeenCalledWith("purchases");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u1",
        discord_id: "d1",
        item_type: "vip",
        item_key: "plata",
        mp_payment_id: "42",
        amount_ars: 7000,
      })
    );
    const insertedPayload = insertMock.mock.calls[0][0];
    expect(typeof insertedPayload.expires_at).toBe("string");
    const expiresAtMs = new Date(insertedPayload.expires_at).getTime();
    const expectedMs = Date.now() + 30 * 24 * 60 * 60 * 1000;
    expect(Math.abs(expiresAtMs - expectedMs)).toBeLessThan(5000);
    expect(grantDiscordRoleMock).toHaveBeenCalledWith("d1", "role-plata-id");
  });

  it("does not grant a Discord role for a vehicle purchase", async () => {
    getPaymentMock.mockResolvedValue({
      id: 43,
      status: "approved",
      metadata: { user_id: "u1", discord_id: "d1", item_type: "vehicle", item_key: "moto" },
    });

    await POST(makeRequest({ data: { id: "43" } }));

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        item_type: "vehicle",
        item_key: "moto",
        expires_at: null,
      })
    );
    expect(grantDiscordRoleMock).not.toHaveBeenCalled();
  });

  it("treats a duplicate mp_payment_id as already processed instead of erroring", async () => {
    getPaymentMock.mockResolvedValue({
      id: 42,
      status: "approved",
      metadata: { user_id: "u1", discord_id: "d1", item_type: "vip", item_key: "plata" },
    });
    insertMock.mockResolvedValue({ error: { code: "23505", message: "duplicate key" } });

    const res = await POST(makeRequest({ data: { id: "42" } }));

    expect(res.status).toBe(200);
    expect(grantDiscordRoleMock).not.toHaveBeenCalled();
  });

  it("returns 500 for a real database error", async () => {
    getPaymentMock.mockResolvedValue({
      id: 44,
      status: "approved",
      metadata: { user_id: "u1", discord_id: "d1", item_type: "vip", item_key: "plata" },
    });
    insertMock.mockResolvedValue({ error: { code: "23503", message: "foreign key violation" } });

    const res = await POST(makeRequest({ data: { id: "44" } }));

    expect(res.status).toBe(500);
  });

  it("still returns 200 for the recorded purchase when grantDiscordRole throws", async () => {
    getPaymentMock.mockResolvedValue({
      id: 45,
      status: "approved",
      metadata: { user_id: "u1", discord_id: "d1", item_type: "vip", item_key: "plata" },
    });
    grantDiscordRoleMock.mockRejectedValue(new Error("Discord API respondió 503"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(makeRequest({ data: { id: "45" } }));

    expect(res.status).toBe(200);
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(grantDiscordRoleMock).toHaveBeenCalledWith("d1", "role-plata-id");
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
