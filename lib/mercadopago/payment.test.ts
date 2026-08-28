import { describe, expect, it, vi, beforeEach } from "vitest";

const getMock = vi.fn();

vi.mock("mercadopago", () => ({
  MercadoPagoConfig: vi.fn(),
  Payment: vi.fn().mockImplementation(() => ({ get: getMock })),
}));

import { getPayment } from "./payment";

describe("getPayment", () => {
  beforeEach(() => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "test-token";
    getMock.mockReset();
  });

  it("normalizes the Mercado Pago payment response", async () => {
    getMock.mockResolvedValue({ id: 42, status: "approved", metadata: { item_key: "plata" } });

    const payment = await getPayment("42");

    expect(payment).toEqual({ id: 42, status: "approved", metadata: { item_key: "plata" } });
    expect(getMock).toHaveBeenCalledWith({ id: "42" });
  });

  it("defaults metadata to an empty object when Mercado Pago omits it", async () => {
    getMock.mockResolvedValue({ id: 42, status: "approved" });
    const payment = await getPayment("42");
    expect(payment.metadata).toEqual({});
  });
});
