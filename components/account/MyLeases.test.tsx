import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MyLeases } from "./MyLeases";

const thenMock = vi.fn();
const orderMock = vi.fn(() => ({ then: thenMock }));
const selectMock = vi.fn(() => ({ order: orderMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ from: fromMock }),
}));

describe("MyLeases", () => {
  it("shows the empty state when there are no leases", async () => {
    thenMock.mockImplementation((cb) => cb({ data: [] }));
    render(<MyLeases />);
    await waitFor(() =>
      expect(screen.getByText("Todavía no arrendaste ninguna banda, negocio o propiedad.")).toBeInTheDocument()
    );
  });

  it("renders a row per lease with its status", async () => {
    const future = new Date(Date.now() + 100_000).toISOString();
    thenMock.mockImplementation((cb) =>
      cb({
        data: [
          { id: "1", slot_key: "families", period: "mensual", amount_ars: 30000, leased_at: "2026-08-01T00:00:00Z", expires_at: future },
        ],
      })
    );
    render(<MyLeases />);
    await waitFor(() => expect(screen.getByText("families")).toBeInTheDocument());
    expect(screen.getByText(/Activo hasta/)).toBeInTheDocument();
  });

  it("shows a vencido lease as expired, not active", async () => {
    const past = new Date(Date.now() - 100_000).toISOString();
    thenMock.mockImplementation((cb) =>
      cb({
        data: [
          { id: "1", slot_key: "families", period: "mensual", amount_ars: 30000, leased_at: "2026-08-01T00:00:00Z", expires_at: past },
        ],
      })
    );
    render(<MyLeases />);
    await waitFor(() => expect(screen.getByText(/Venció el/)).toBeInTheDocument());
  });
});
