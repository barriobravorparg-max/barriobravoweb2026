import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ auth: { getUser: () => getUserMock() } }),
}));

const createPreferenceMock = vi.fn();
vi.mock("@/lib/mercadopago/preference", () => ({
  createPreference: (input: unknown) => createPreferenceMock(input),
}));

import { POST } from "./route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/mercadopago/create-preference", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/mercadopago/create-preference", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    createPreferenceMock.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeRequest({ itemType: "vip", itemKey: "plata" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when the account has no Discord ID", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1", user_metadata: {} } } });
    const res = await POST(makeRequest({ itemType: "vip", itemKey: "plata" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown item key", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1", user_metadata: { provider_id: "d1" } } } });
    const res = await POST(makeRequest({ itemType: "vip", itemKey: "platino" }));
    expect(res.status).toBe(404);
  });

  it("creates a preference and returns the checkout URL for a valid request", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1", user_metadata: { provider_id: "d1" } } } });
    createPreferenceMock.mockResolvedValue("https://mp.example/checkout/1");

    const res = await POST(makeRequest({ itemType: "vip", itemKey: "plata" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ checkoutUrl: "https://mp.example/checkout/1" });
    expect(createPreferenceMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", discordId: "d1", itemType: "vip", itemKey: "plata" })
    );
  });
});
