import { describe, expect, it, vi, beforeEach } from "vitest";

const createMock = vi.fn();

vi.mock("mercadopago", () => ({
  MercadoPagoConfig: vi.fn(),
  Preference: vi.fn().mockImplementation(() => ({ create: createMock })),
}));

import { createLeasePreference } from "./lease-preference";

describe("createLeasePreference", () => {
  beforeEach(() => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "test-token";
    createMock.mockReset();
  });

  it("returns the checkout URL and sends the lease-specific webhook and metadata", async () => {
    createMock.mockResolvedValue({ init_point: "https://mp.example/checkout/lease-1" });

    const url = await createLeasePreference({
      userId: "u1",
      discordId: "d1",
      slotKey: "families",
      period: "mensual",
      label: "Families",
      priceArs: 30000,
    });

    expect(url).toBe("https://mp.example/checkout/lease-1");
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          items: [expect.objectContaining({ unit_price: 30000, currency_id: "ARS" })],
          metadata: { user_id: "u1", discord_id: "d1", slot_key: "families", period: "mensual" },
          notification_url: expect.stringContaining("/api/mercadopago/webhook-leases"),
        }),
      })
    );
  });

  it("throws when Mercado Pago doesn't return an init_point", async () => {
    createMock.mockResolvedValue({});
    await expect(
      createLeasePreference({ userId: "u1", discordId: "d1", slotKey: "families", period: "mensual", label: "Families", priceArs: 30000 })
    ).rejects.toThrow(/checkout/);
  });
});
