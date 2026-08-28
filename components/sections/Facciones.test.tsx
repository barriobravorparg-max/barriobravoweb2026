import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Facciones } from "./Facciones";

describe("Facciones", () => {
  it("shows the first category's jobs by default and switches on tab click", async () => {
    const user = userEvent.setup();
    render(<Facciones />);

    expect(screen.getByText("Policía")).toBeInTheDocument();
    expect(screen.queryByText("Repartidor de Pizzas")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Civil" }));
    expect(screen.getByText("Repartidor de Pizzas")).toBeInTheDocument();
    expect(screen.queryByText("Policía")).not.toBeInTheDocument();
  });

  it("moves the active tab with the right arrow key and updates roving tabindex", async () => {
    const user = userEvent.setup();
    render(<Facciones />);

    const emergencyTab = screen.getByRole("tab", { name: "Servicios de Emergencia" });
    const civilTab = screen.getByRole("tab", { name: "Civil" });

    emergencyTab.focus();

    // Before arrow key: Emergency is active (tabindex=0, aria-selected=true), Civil is inactive (tabindex=-1, aria-selected=false)
    expect(emergencyTab).toHaveAttribute("tabindex", "0");
    expect(emergencyTab).toHaveAttribute("aria-selected", "true");
    expect(civilTab).toHaveAttribute("tabindex", "-1");
    expect(civilTab).toHaveAttribute("aria-selected", "false");

    await user.keyboard("{ArrowRight}");

    // After arrow key: Civil is now active (tabindex=0, aria-selected=true), Emergency is inactive (tabindex=-1, aria-selected=false)
    expect(civilTab).toHaveFocus();
    expect(emergencyTab).toHaveAttribute("tabindex", "-1");
    expect(emergencyTab).toHaveAttribute("aria-selected", "false");
    expect(civilTab).toHaveAttribute("tabindex", "0");
    expect(civilTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Repartidor de Pizzas")).toBeInTheDocument();
  });

  it("wraps around to the last tab when pressing ArrowLeft on the first tab", async () => {
    const user = userEvent.setup();
    render(<Facciones />);

    const emergencyTab = screen.getByRole("tab", { name: "Servicios de Emergencia" });
    const negocios = screen.getByRole("tab", { name: "Negocios" });

    emergencyTab.focus();
    await user.keyboard("{ArrowLeft}");

    expect(negocios).toHaveFocus();
    expect(negocios).toHaveAttribute("tabindex", "0");
    expect(negocios).toHaveAttribute("aria-selected", "true");
    expect(emergencyTab).toHaveAttribute("tabindex", "-1");
    expect(emergencyTab).toHaveAttribute("aria-selected", "false");
    expect(screen.getByText("Casino")).toBeInTheDocument();
  });

  it("wraps around to the first tab when pressing ArrowRight on the last tab", async () => {
    const user = userEvent.setup();
    render(<Facciones />);

    const emergencyTab = screen.getByRole("tab", { name: "Servicios de Emergencia" });
    const negociosTab = screen.getByRole("tab", { name: "Negocios" });

    negociosTab.focus();
    // Manually click to activate Negocios tab since it starts inactive
    await user.click(negociosTab);

    await user.keyboard("{ArrowRight}");

    expect(emergencyTab).toHaveFocus();
    expect(emergencyTab).toHaveAttribute("tabindex", "0");
    expect(emergencyTab).toHaveAttribute("aria-selected", "true");
    expect(negociosTab).toHaveAttribute("tabindex", "-1");
    expect(negociosTab).toHaveAttribute("aria-selected", "false");
    expect(screen.getByText("Policía")).toBeInTheDocument();
  });
});
