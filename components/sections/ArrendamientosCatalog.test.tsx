import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ArrendamientosCatalog } from "./ArrendamientosCatalog";

const thenMock = vi.fn();
const selectMock = vi.fn(() => ({ then: thenMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));

const signInWithOAuthMock = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ from: fromMock, auth: { signInWithOAuth: signInWithOAuthMock } }),
}));

describe("ArrendamientosCatalog", () => {
  beforeEach(() => {
    signInWithOAuthMock.mockReset();
    vi.stubGlobal("fetch", vi.fn());
    thenMock.mockImplementation((cb) => cb({ data: [] }));
  });

  it("renders the three categories and defaults to Bandas", async () => {
    render(<ArrendamientosCatalog user={null} />);
    await waitFor(() => expect(screen.getByText("Families")).toBeInTheDocument());
    expect(screen.getByText("Ballas")).toBeInTheDocument();
    expect(screen.queryByText("Casino")).not.toBeInTheDocument();
  });

  it("switches to Negocios and shows both mensual and semestral prices", async () => {
    const user = userEvent.setup();
    render(<ArrendamientosCatalog user={null} />);
    await waitFor(() => expect(screen.getByText("Families")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "Negocios" }));
    expect(screen.getByText("Casino")).toBeInTheDocument();
    expect(screen.getByText("$45.000 ARS / mes")).toBeInTheDocument();
    expect(screen.getByText("$220.000 ARS / semestre")).toBeInTheDocument();
  });

  it("switches to Propiedades and shows only the mensual button (no semestral offered)", async () => {
    const user = userEvent.setup();
    render(<ArrendamientosCatalog user={null} />);
    await waitFor(() => expect(screen.getByText("Families")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "Propiedades" }));
    expect(screen.getByText("Casa premium")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Arrendar semestral" })).not.toBeInTheDocument();
  });

  it("shows a slot as occupied and disables its buttons when occupied_until is in the future", async () => {
    thenMock.mockImplementation((cb) =>
      cb({ data: [{ slot_key: "ballas", occupied_until: new Date(Date.now() + 100_000).toISOString() }] })
    );
    render(<ArrendamientosCatalog user={null} />);
    await waitFor(() => expect(screen.getByText(/Ocupada hasta/)).toBeInTheDocument());
    const ballasCard = screen.getByText("Ballas").closest("div")!;
    expect(ballasCard.parentElement?.querySelector("button")).toBeDisabled();
  });

  it("triggers Discord login instead of a purchase when no user is logged in", async () => {
    const user = userEvent.setup();
    render(<ArrendamientosCatalog user={null} />);
    await waitFor(() => expect(screen.getByText("Families")).toBeInTheDocument());
    await user.click(screen.getAllByRole("button", { name: "Arrendar mensual" })[0]);
    expect(signInWithOAuthMock).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("calls create-lease-preference and redirects when a logged-in user leases an available slot", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ checkoutUrl: "https://mp.example/checkout/lease-1" }),
    });

    const user = userEvent.setup();
    render(<ArrendamientosCatalog user={{ avatarUrl: null, displayName: "Fundador", email: null }} />);
    await waitFor(() => expect(screen.getByText("Families")).toBeInTheDocument());
    await user.click(screen.getAllByRole("button", { name: "Arrendar mensual" })[0]);

    expect(fetch).toHaveBeenCalledWith(
      "/api/mercadopago/create-lease-preference",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("shows an error message when the lease request fails", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Ese slot ya está ocupado" }),
    });

    const user = userEvent.setup();
    render(<ArrendamientosCatalog user={{ avatarUrl: null, displayName: "Fundador", email: null }} />);
    await waitFor(() => expect(screen.getByText("Families")).toBeInTheDocument());
    await user.click(screen.getAllByRole("button", { name: "Arrendar mensual" })[0]);

    expect(await screen.findByRole("alert")).toHaveTextContent("Ese slot ya está ocupado");
  });
});
