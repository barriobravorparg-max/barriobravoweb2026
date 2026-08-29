import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ auth: { getUser: () => getUserMock() } }),
}));

const maybeSingleMock = vi.fn();
const slotsEqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const slotsSelectMock = vi.fn(() => ({ eq: slotsEqMock }));

const leasesResult: { data: unknown[] | null; error: { message: string } | null } = { data: [], error: null };
const leasesEqMock = vi.fn(() => Promise.resolve(leasesResult));
const leasesSelectMock = vi.fn(() => ({ eq: leasesEqMock }));

const fromMock = vi.fn((table: string) => {
  if (table === "slots") return { select: slotsSelectMock };
  if (table === "leases") return { select: leasesSelectMock };
  throw new Error(`unexpected table in test mock: ${table}`);
});
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
    leasesResult.data = [];
    leasesResult.error = null;
    // Configurado por defecto para que los tests de banda/propiedad existentes
    // (que no versan sobre este gate) sigan probando lo que probaban antes.
    process.env.DISCORD_STAFF_CHANNEL_ID = "channel-123";
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

  it("returns 404 when the catalog has the slot but there is no matching slots row (seed drift)", async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null });
    const res = await POST(makeRequest({ slotKey: "families", period: "mensual" }));
    expect(res.status).toBe(404);
    expect(createLeasePreferenceMock).not.toHaveBeenCalled();
  });

  it("returns 503 for a banda when DISCORD_STAFF_CHANNEL_ID is not configured", async () => {
    delete process.env.DISCORD_STAFF_CHANNEL_ID;
    const res = await POST(makeRequest({ slotKey: "families", period: "mensual" }));
    expect(res.status).toBe(503);
    expect(createLeasePreferenceMock).not.toHaveBeenCalled();
  });

  it("does not require DISCORD_STAFF_CHANNEL_ID for a negocio (delivered automatically)", async () => {
    delete process.env.DISCORD_STAFF_CHANNEL_ID;
    createLeasePreferenceMock.mockResolvedValue("https://mp.example/checkout/negocio-1");
    const res = await POST(makeRequest({ slotKey: "casino", period: "mensual" }));
    expect(res.status).toBe(200);
  });

  it("returns 409 when the discord_id already holds an active negocio lease for a different slot", async () => {
    const future = new Date(Date.now() + 10_000).toISOString();
    leasesResult.data = [{ slot_key: "casino", expires_at: future }];
    const res = await POST(makeRequest({ slotKey: "taller_bennys", period: "mensual" }));
    expect(res.status).toBe(409);
    expect(createLeasePreferenceMock).not.toHaveBeenCalled();
  });

  it("allows renewing the same negocio slot the discord_id already holds", async () => {
    const future = new Date(Date.now() + 10_000).toISOString();
    leasesResult.data = [{ slot_key: "casino", expires_at: future }];
    maybeSingleMock.mockResolvedValue({ data: { occupied_until: null }, error: null });
    createLeasePreferenceMock.mockResolvedValue("https://mp.example/checkout/negocio-renewal");
    const res = await POST(makeRequest({ slotKey: "casino", period: "mensual" }));
    expect(res.status).toBe(200);
  });

  it("does not block a banda purchase even when the discord_id holds other active leases", async () => {
    const future = new Date(Date.now() + 10_000).toISOString();
    leasesResult.data = [{ slot_key: "casino", expires_at: future }];
    createLeasePreferenceMock.mockResolvedValue("https://mp.example/checkout/banda-1");
    const res = await POST(makeRequest({ slotKey: "vagos", period: "mensual" }));
    expect(res.status).toBe(200);
  });
});
