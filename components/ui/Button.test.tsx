import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("applies the primary gradient class by default", () => {
    render(<Button>Conectar</Button>);
    expect(screen.getByRole("button", { name: "Conectar" })).toHaveClass("bg-brand-gradient");
  });

  it("applies the outline-purple variant class", () => {
    render(<Button variant="outline-purple">Discord</Button>);
    expect(screen.getByRole("button", { name: "Discord" })).toHaveClass("border-purple");
  });

  it("applies the outline-cyan variant class", () => {
    render(<Button variant="outline-cyan">Whitelist</Button>);
    expect(screen.getByRole("button", { name: "Whitelist" })).toHaveClass("border-cyan");
  });
});
