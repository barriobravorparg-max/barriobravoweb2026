import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders the title, description, and the fixed availability note", () => {
    render(<EmptyState title="Perfil de Personaje" description="Todavía no hay datos." />);
    expect(screen.getByText("Perfil de Personaje")).toBeInTheDocument();
    expect(screen.getByText("Todavía no hay datos.")).toBeInTheDocument();
    expect(screen.getByText("Disponible en una próxima actualización")).toBeInTheDocument();
  });
});
