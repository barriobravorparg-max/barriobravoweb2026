import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PurchaseHistory } from "./PurchaseHistory";

const thenMock = vi.fn();
const orderMock = vi.fn(() => ({ then: thenMock }));
const selectMock = vi.fn(() => ({ order: orderMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ from: fromMock }),
}));

describe("PurchaseHistory", () => {
  it("shows the empty state when there are no purchases", async () => {
    thenMock.mockImplementation((cb) => cb({ data: [] }));
    render(<PurchaseHistory />);
    await waitFor(() => expect(screen.getByText("Todavía no hiciste ninguna compra en la tienda.")).toBeInTheDocument());
  });

  it("renders a row per purchase", async () => {
    thenMock.mockImplementation((cb) =>
      cb({ data: [{ id: "1", item_type: "vip", item_key: "plata", amount_ars: 7000, purchased_at: "2026-08-01T00:00:00Z" }] })
    );
    render(<PurchaseHistory />);
    await waitFor(() => expect(screen.getByText("plata")).toBeInTheDocument());
  });
});
