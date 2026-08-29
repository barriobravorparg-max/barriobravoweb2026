import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const getPaymentMock = vi.fn();
vi.mock("@/lib/mercadopago/payment", () => ({
  getPayment: (id: string) => getPaymentMock(id),
}));

const rpcMock = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: rpcMock }),
}));

const notifyStaffChannelMock = vi.fn();
vi.mock("@/lib/discord/notify", () => ({
  notifyStaffChannel: (content: string) => notifyStaffChannelMock(content),
}));

import { POST } from "./route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/mercadopago/webhook-leases", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/mercadopago/webhook-leases", () => {
  beforeEach(() => {
    getPaymentMock.mockReset();
    rpcMock.mockReset();
    notifyStaffChannelMock.mockReset();
    notifyStaffChannelMock.mockResolvedValue(undefined);
  });

  it("ignores payments that are not approved", async () => {
    getPaymentMock.mockResolvedValue({ id: 1, status: "pending", metadata: {} });
    const res = await POST(makeRequest({ data: { id: "1" } }));
    expect(res.status).toBe(200);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("claims the slot and notifies staff for a banda purchase", async () => {
    getPaymentMock.mockResolvedValue({
      id: 42,
      status: "approved",
      metadata: { user_id: "u1", discord_id: "d1", slot_key: "families", period: "mensual" },
    });
    rpcMock.mockResolvedValue({ data: [{ claimed: true, lease_id: "l1" }], error: null });

    const res = await POST(makeRequest({ data: { id: "42" } }));

    expect(res.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledWith(
      "claim_slot",
      expect.objectContaining({ p_slot_key: "families", p_user_id: "u1", p_discord_id: "d1", p_period: "mensual", p_mp_payment_id: "42", p_amount_ars: 30000 })
    );
    expect(notifyStaffChannelMock).toHaveBeenCalledWith(expect.stringContaining("Families"));
  });

  it("does not notify staff for a negocio purchase (delivered automatically)", async () => {
    getPaymentMock.mockResolvedValue({
      id: 43,
      status: "approved",
      metadata: { user_id: "u1", discord_id: "d1", slot_key: "casino", period: "mensual" },
    });
    rpcMock.mockResolvedValue({ data: [{ claimed: true, lease_id: "l2" }], error: null });

    await POST(makeRequest({ data: { id: "43" } }));

    expect(notifyStaffChannelMock).not.toHaveBeenCalled();
  });

  it("treats a duplicate mp_payment_id as already processed instead of erroring", async () => {
    getPaymentMock.mockResolvedValue({
      id: 42,
      status: "approved",
      metadata: { user_id: "u1", discord_id: "d1", slot_key: "families", period: "mensual" },
    });
    rpcMock.mockResolvedValue({ data: null, error: { code: "23505", message: "duplicate key" } });

    const res = await POST(makeRequest({ data: { id: "42" } }));

    expect(res.status).toBe(200);
    expect(notifyStaffChannelMock).not.toHaveBeenCalled();
  });

  it("ignores a payment whose metadata period is neither mensual nor semestral", async () => {
    getPaymentMock.mockResolvedValue({
      id: 46,
      status: "approved",
      metadata: { user_id: "u1", discord_id: "d1", slot_key: "families", period: "semanal" },
    });

    const res = await POST(makeRequest({ data: { id: "46" } }));

    expect(res.status).toBe(200);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("handles the race-condition case (claimed: false) by notifying staff for manual review instead of delivering", async () => {
    getPaymentMock.mockResolvedValue({
      id: 44,
      status: "approved",
      metadata: { user_id: "u1", discord_id: "d1", slot_key: "families", period: "mensual" },
    });
    rpcMock.mockResolvedValue({ data: [{ claimed: false, lease_id: "l3" }], error: null });

    const res = await POST(makeRequest({ data: { id: "44" } }));

    expect(res.status).toBe(200);
    expect(notifyStaffChannelMock).toHaveBeenCalledWith(expect.stringContaining("ya estaba ocupado"));
  });

  it("returns 500 for a real database error", async () => {
    getPaymentMock.mockResolvedValue({
      id: 45,
      status: "approved",
      metadata: { user_id: "u1", discord_id: "d1", slot_key: "families", period: "mensual" },
    });
    rpcMock.mockResolvedValue({ data: null, error: { code: "42P01", message: "relation does not exist" } });

    const res = await POST(makeRequest({ data: { id: "45" } }));

    expect(res.status).toBe(500);
  });
});
