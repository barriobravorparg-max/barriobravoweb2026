import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Hero } from "./Hero";

describe("Hero", () => {
  it("renders the headline and a disabled copy-IP button while the IP is a placeholder", () => {
    render(<Hero />);
    expect(screen.getByText("BARRIO BRAVO RP")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copiar ip/i })).toBeDisabled();
  });
});
