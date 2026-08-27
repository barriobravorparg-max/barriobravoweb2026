import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { faq } from "@/lib/content";
import { Faq } from "./Faq";

describe("Faq", () => {
  it("starts collapsed and expands the clicked question independently", async () => {
    const user = userEvent.setup();
    render(<Faq />);

    const firstButton = screen.getByRole("button", { name: faq[0].question });
    expect(firstButton).toHaveAttribute("aria-expanded", "false");

    await user.click(firstButton);
    expect(firstButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(faq[0].answer)).toBeVisible();

    const secondButton = screen.getByRole("button", { name: faq[1].question });
    expect(secondButton).toHaveAttribute("aria-expanded", "false");

    await user.click(firstButton);
    expect(firstButton).toHaveAttribute("aria-expanded", "false");
  });
});
