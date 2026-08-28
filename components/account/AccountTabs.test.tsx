import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AccountTabs } from "./AccountTabs";
import type { AppUser } from "@/lib/supabase/user";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const thenMock = vi.fn((cb: (result: { data: unknown[] }) => void) => cb({ data: [] }));
const orderMock = vi.fn(() => ({ then: thenMock }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      // PurchaseHistory calls .select().order().then(); VipStatus calls .select().then() directly.
      select: () => ({ then: thenMock, order: orderMock }),
    }),
  }),
}));

const user: AppUser = { avatarUrl: null, displayName: "Fundador", email: "fundador@example.com" };

describe("AccountTabs", () => {
  it("declares all four tabs and shows account details by default", () => {
    render(<AccountTabs user={user} />);
    expect(screen.getByRole("tab", { name: "Datos de cuenta" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Perfil de Personaje" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Historial de compras" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "VIP activo" })).toBeInTheDocument();
    expect(screen.getByText("Fundador")).toBeInTheDocument();
  });

  it("shows the empty state when another tab is selected", async () => {
    const userEvt = userEvent.setup();
    render(<AccountTabs user={user} />);
    await userEvt.click(screen.getByRole("tab", { name: "Perfil de Personaje" }));
    expect(screen.getByText("Disponible en una próxima actualización")).toBeInTheDocument();
    expect(screen.queryByText("Fundador")).not.toBeInTheDocument();
  });

  it("renders real purchase rows from Supabase when the tab is selected", async () => {
    thenMock.mockImplementation((cb) =>
      cb({ data: [{ id: "1", item_type: "vip", item_key: "plata", amount_ars: 7000, purchased_at: "2026-08-01T00:00:00Z" }] })
    );
    const userEvt = userEvent.setup();
    render(<AccountTabs user={user} />);
    await userEvt.click(screen.getByRole("tab", { name: "Historial de compras" }));
    // "plata" only appears if PurchaseHistory actually mapped the mocked row into the DOM —
    // the old static EmptyState never rendered an item_key.
    expect(await screen.findByText("plata")).toBeInTheDocument();
  });

  it("computes the active VIP tier from real purchase data when the tab is selected", async () => {
    const future = new Date(Date.now() + 10_000).toISOString();
    thenMock.mockImplementation((cb) => cb({ data: [{ item_type: "vip", item_key: "oro", expires_at: future }] }));
    const userEvt = userEvent.setup();
    render(<AccountTabs user={user} />);
    await userEvt.click(screen.getByRole("tab", { name: "VIP activo" }));
    // "VIP Oro" only appears if VipStatus ran getActiveVipTier against the mocked row and looked
    // up the label in vipTiers — the old static EmptyState never rendered a tier label.
    expect(await screen.findByText("VIP Oro")).toBeInTheDocument();
  });
});
