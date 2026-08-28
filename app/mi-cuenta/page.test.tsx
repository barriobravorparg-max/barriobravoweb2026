import { describe, expect, it, vi } from "vitest";
import MiCuentaPage from "./page";

const redirectMock = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    redirectMock(url);
    const error = new Error("NEXT_REDIRECT") as Error & { digest: string };
    error.digest = "NEXT_REDIRECT";
    throw error;
  },
}));

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser },
  }),
}));

describe("MiCuentaPage", () => {
  it("redirects to / when there is no authenticated user", async () => {
    getUser.mockResolvedValueOnce({ data: { user: null } });

    try {
      await MiCuentaPage();
      expect.fail("Expected redirect to be called");
    } catch (error) {
      if (error instanceof Error && error.message === "NEXT_REDIRECT") {
        expect(redirectMock).toHaveBeenCalledWith("/");
      } else {
        throw error;
      }
    }
  });
});
