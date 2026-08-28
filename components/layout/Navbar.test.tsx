import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Navbar } from "./Navbar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("Navbar", () => {
  it("toggles the mobile menu open and closed", async () => {
    const user = userEvent.setup();
    render(<Navbar user={null} />);

    const toggle = screen.getByRole("button", { name: /menú/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByText("Inicio").length).toBeGreaterThan(0);

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("shows the Ingresar login button enabled and Conectar disabled when there is no session", () => {
    render(<Navbar user={null} />);
    expect(screen.getByRole("button", { name: "Ingresar" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Conectar" })).toBeDisabled();
  });

  it("shows the avatar, Mi Cuenta link, and Salir button when there is a session", () => {
    render(<Navbar user={{ avatarUrl: null, displayName: "Fundador", email: null }} />);
    expect(screen.getByRole("link", { name: "Mi Cuenta" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salir" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ingresar" })).not.toBeInTheDocument();
    expect(screen.getByText("Fundador")).toBeInTheDocument();
  });

  it("shows Mi Cuenta and Salir in the mobile menu too when there is a session", async () => {
    const userEvt = userEvent.setup();
    render(<Navbar user={{ avatarUrl: null, displayName: "Fundador", email: null }} />);
    await userEvt.click(screen.getByRole("button", { name: /menú/i }));
    expect(screen.getAllByRole("link", { name: "Mi Cuenta" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Salir" })).toHaveLength(2);
    expect(screen.getAllByTestId("avatar")).toHaveLength(2);
    expect(screen.getAllByText("Fundador")).toHaveLength(2);
  });
});
