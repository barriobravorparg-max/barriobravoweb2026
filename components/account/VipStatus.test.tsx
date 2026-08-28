import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VipStatus } from "./VipStatus";

const thenMock = vi.fn();
const selectMock = vi.fn(() => ({ then: thenMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ from: fromMock }),
}));

describe("VipStatus", () => {
  it("shows the empty state when there is no active VIP", async () => {
    thenMock.mockImplementation((cb) => cb({ data: [] }));
    render(<VipStatus />);
    await waitFor(() => expect(screen.getByText("No tenés un plan VIP activo por el momento.")).toBeInTheDocument());
  });

  it("shows the active tier label when there is one", async () => {
    const future = new Date(Date.now() + 10_000).toISOString();
    thenMock.mockImplementation((cb) => cb({ data: [{ item_type: "vip", item_key: "oro", expires_at: future }] }));
    render(<VipStatus />);
    await waitFor(() => expect(screen.getByText("VIP Oro")).toBeInTheDocument());
  });
});
