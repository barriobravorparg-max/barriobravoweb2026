import { describe, expect, it, vi, beforeEach } from "vitest";

const createMock = vi.fn();

vi.mock("mercadopago", () => ({
  MercadoPagoConfig: vi.fn(),
  Preference: vi.fn().mockImplementation(() => ({ create: createMock })),
}));

import { createPreference } from "./preference";

describe("createPreference", () => {
  beforeEach(() => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "test-token";
    createMock.mockReset();
  });

  it("returns the checkout URL from Mercado Pago's response", async () => {
    createMock.mockResolvedValue({ init_point: "https://mp.example/checkout/123" });

    const url = await createPreference({
      userId: "u1",
      discordId: "d1",
      itemType: "vip",
      itemKey: "plata",
      label: "VIP Plata",
      priceArs: 7000,
    });

    expect(url).toBe("https://mp.example/checkout/123");
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          items: [expect.objectContaining({ unit_price: 7000, currency_id: "ARS" })],
          metadata: { user_id: "u1", discord_id: "d1", item_type: "vip", item_key: "plata" },
        }),
      })
    );
  });

  it("throws when Mercado Pago doesn't return an init_point", async () => {
    createMock.mockResolvedValue({});
    await expect(
      createPreference({ userId: "u1", discordId: "d1", itemType: "vip", itemKey: "plata", label: "VIP Plata", priceArs: 7000 })
    ).rejects.toThrow(/checkout/);
  });
});
