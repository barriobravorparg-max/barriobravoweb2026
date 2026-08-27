// components/sections/Newsletter.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Newsletter } from "./Newsletter";

describe("Newsletter", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("shows a confirmation message on submit without calling the network", async () => {
    const user = userEvent.setup();
    render(<Newsletter />);

    await user.type(screen.getByLabelText(/email/i), "jugador@example.com");
    await user.click(screen.getByRole("button", { name: /avisenme/i }));

    expect(await screen.findByText(/te avisamos/i)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
