import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const exchangeCodeForSession = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { exchangeCodeForSession },
  }),
}));

describe("GET /auth/callback", () => {
  it("redirects to /mi-cuenta when the code exchange succeeds", async () => {
    exchangeCodeForSession.mockResolvedValueOnce({ error: null });
    const request = new NextRequest("http://localhost:3000/auth/callback?code=abc123");

    const response = await GET(request);

    expect(response.headers.get("location")).toBe("http://localhost:3000/mi-cuenta");
  });

  it("redirects to /?auth_error=1 when the code exchange fails", async () => {
    exchangeCodeForSession.mockResolvedValueOnce({ error: new Error("invalid code") });
    const request = new NextRequest("http://localhost:3000/auth/callback?code=bad");

    const response = await GET(request);

    expect(response.headers.get("location")).toBe("http://localhost:3000/?auth_error=1");
  });

  it("redirects to /?auth_error=1 when there is no code in the URL", async () => {
    const request = new NextRequest("http://localhost:3000/auth/callback");

    const response = await GET(request);

    expect(response.headers.get("location")).toBe("http://localhost:3000/?auth_error=1");
  });
});
