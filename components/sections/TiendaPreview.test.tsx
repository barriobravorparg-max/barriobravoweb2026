import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TiendaPreview } from "./TiendaPreview";

const signInWithOAuthMock = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signInWithOAuth: signInWithOAuthMock } }),
}));

describe("TiendaPreview", () => {
  beforeEach(() => {
    signInWithOAuthMock.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("renders the three VIP tiers and four vehicles with their prices", () => {
    render(<TiendaPreview user={null} />);
    expect(screen.getByText("VIP Bronce")).toBeInTheDocument();
    expect(screen.getByText("VIP Plata")).toBeInTheDocument();
    expect(screen.getByText("VIP Oro")).toBeInTheDocument();
    expect(screen.getByText("Moto")).toBeInTheDocument();
    expect(screen.getByText("Auto de lujo vanilla")).toBeInTheDocument();
    expect(screen.getByText("Lancha")).toBeInTheDocument();
    expect(screen.getByText("Helicóptero")).toBeInTheDocument();
  });

  it("triggers Discord login instead of a purchase when no user is logged in", async () => {
    const user = userEvent.setup();
    render(<TiendaPreview user={null} />);
    await user.click(screen.getAllByRole("button", { name: "Comprar" })[0]);
    expect(signInWithOAuthMock).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("calls create-preference and redirects when a logged-in user buys an item", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ checkoutUrl: "https://mp.example/checkout/1" }),
    });

    const user = userEvent.setup();
    render(<TiendaPreview user={{ avatarUrl: null, displayName: "Fundador", email: null }} />);
    await user.click(screen.getAllByRole("button", { name: "Comprar" })[0]);

    expect(fetch).toHaveBeenCalledWith(
      "/api/mercadopago/create-preference",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("shows an error message and does not redirect when the create-preference call fails", async () => {
    const initialHref = window.location.href;
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    const user = userEvent.setup();
    render(<TiendaPreview user={{ avatarUrl: null, displayName: "Fundador", email: null }} />);
    await user.click(screen.getAllByRole("button", { name: "Comprar" })[0]);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos iniciar la compra. Probá de nuevo en un momento."
    );
    expect(window.location.href).toBe(initialHref);
  });

  it("shows an error message when the fetch call itself throws (network error)", async () => {
    const initialHref = window.location.href;
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network down"));

    const user = userEvent.setup();
    render(<TiendaPreview user={{ avatarUrl: null, displayName: "Fundador", email: null }} />);
    await user.click(screen.getAllByRole("button", { name: "Comprar" })[0]);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos iniciar la compra. Probá de nuevo en un momento."
    );
    expect(window.location.href).toBe(initialHref);
  });
});
