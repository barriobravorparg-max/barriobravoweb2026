import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Facciones } from "./Facciones";

describe("Facciones", () => {
  it("shows the first category's jobs by default and switches on tab click", async () => {
    const user = userEvent.setup();
    render(<Facciones />);

    expect(screen.getByText("Policía")).toBeInTheDocument();
    expect(screen.queryByText("Taxista")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Civil" }));
    expect(screen.getByText("Taxista")).toBeInTheDocument();
    expect(screen.queryByText("Policía")).not.toBeInTheDocument();
  });

  it("moves the active tab with the right arrow key", async () => {
    const user = userEvent.setup();
    render(<Facciones />);

    screen.getByRole("tab", { name: "Servicios de Emergencia" }).focus();
    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("tab", { name: "Civil" })).toHaveFocus();
    expect(screen.getByText("Taxista")).toBeInTheDocument();
  });
});
