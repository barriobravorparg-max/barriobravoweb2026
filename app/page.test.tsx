import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Home from "./page";

// Mock LoadingScreen so this test doesn't have to deal with its internal
// timers — it's already covered by components/loading/LoadingScreen.test.tsx.
// The mock renders a stand-in "Cargando..." text plus a button that calls
// onFinish, so this test can assert on both the "still loading" and
// "finished" states rather than collapsing them into a single instant call.
vi.mock("@/components/loading/LoadingScreen", () => ({
  LoadingScreen: ({ onFinish }: { onFinish: () => void }) => (
    <div>
      <p>Cargando...</p>
      <button onClick={onFinish}>Terminar carga (mock)</button>
    </div>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const getSession = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getSession },
  }),
}));

describe("Home", () => {
  it("keeps section content in the DOM under the loading overlay, then removes the overlay once it finishes", async () => {
    getSession.mockResolvedValueOnce({ data: { session: null } });
    const user = userEvent.setup();

    const element = await Home();
    render(element);

    expect(screen.getByText("Cargando...")).toBeInTheDocument();

    // The real page content is already mounted underneath it — this is the
    // fix under test: sections must exist in the DOM immediately (for SEO
    // and for #hash links to resolve), not only after the loading screen
    // finishes.
    expect(screen.getByText("Qué te espera")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /terminar carga/i }));

    expect(screen.queryByText("Cargando...")).not.toBeInTheDocument();
    expect(screen.getByText("Qué te espera")).toBeInTheDocument();
  });
});
