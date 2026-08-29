import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ auth: { getUser: () => getUserMock() } }),
}));

const maybeSingleMock = vi.fn();
const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const selectMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock }),
}));

const createLeasePreferenceMock = vi.fn();
vi.mock("@/lib/mercadopago/lease-preference", () => ({
  createLeasePreference: (input: unknown) => createLeasePreferenceMock(input),
}));

import { POST } from "./route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/mercadopago/create-lease-preference", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/mercadopago/create-lease-preference", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    createLeasePreferenceMock.mockReset();
    maybeSingleMock.mockReset();
    maybeSingleMock.mockResolvedValue({ data: { occupied_until: null }, error: null });
    getUserMock.mockResolvedValue({ data: { user: { id: "u1", user_metadata: { provider_id: "d1" } } } });
  });

  it("returns 401 when there is no session", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeRequest({ slotKey: "families", period: "mensual" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid period", async () => {
    const res = await POST(makeRequest({ slotKey: "families", period: "semanal" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown slot key", async () => {
    const res = await POST(makeRequest({ slotKey: "no-existe", period: "mensual" }));
    expect(res.status).toBe(404);
  });

  it("returns 400 when semestral is requested for a propiedad (not offered)", async () => {
    const res = await POST(makeRequest({ slotKey: "casa_chica", period: "semestral" }));
    expect(res.status).toBe(400);
  });

  it("returns 409 when the slot is already occupied", async () => {
    maybeSingleMock.mockResolvedValue({ data: { occupied_until: new Date(Date.now() + 10_000).toISOString() }, error: null });
    const res = await POST(makeRequest({ slotKey: "families", period: "mensual" }));
    expect(res.status).toBe(409);
  });

  it("creates a preference and returns the checkout URL when the slot is free", async () => {
    createLeasePreferenceMock.mockResolvedValue("https://mp.example/checkout/lease-1");

    const res = await POST(makeRequest({ slotKey: "families", period: "mensual" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ checkoutUrl: "https://mp.example/checkout/lease-1" });
    expect(createLeasePreferenceMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", discordId: "d1", slotKey: "families", period: "mensual", priceArs: 30000 })
    );
  });

  it("treats an already-expired occupied_until as available", async () => {
    maybeSingleMock.mockResolvedValue({ data: { occupied_until: new Date(Date.now() - 10_000).toISOString() }, error: null });
    createLeasePreferenceMock.mockResolvedValue("https://mp.example/checkout/lease-2");

    const res = await POST(makeRequest({ slotKey: "families", period: "mensual" }));
    expect(res.status).toBe(200);
  });
});
