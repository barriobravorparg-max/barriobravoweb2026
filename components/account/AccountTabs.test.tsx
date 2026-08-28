import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AccountTabs } from "./AccountTabs";
import type { AppUser } from "@/lib/supabase/user";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const thenMock = vi.fn((cb: (result: { data: unknown[] }) => void) => cb({ data: [] }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({ then: thenMock, order: () => ({ then: thenMock }) }),
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

  it("shows real purchase history instead of the empty EmptyState copy when the tab is selected", async () => {
    const userEvt = userEvent.setup();
    render(<AccountTabs user={user} />);
    await userEvt.click(screen.getByRole("tab", { name: "Historial de compras" }));
    expect(await screen.findByText("Todavía no hiciste ninguna compra en la tienda.")).toBeInTheDocument();
  });

  it("shows VIP status instead of the old static EmptyState when the tab is selected", async () => {
    const userEvt = userEvent.setup();
    render(<AccountTabs user={user} />);
    await userEvt.click(screen.getByRole("tab", { name: "VIP activo" }));
    expect(await screen.findByText("No tenés un plan VIP activo por el momento.")).toBeInTheDocument();
  });
});
