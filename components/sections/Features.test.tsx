import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { features } from "@/lib/content";
import { Features } from "./Features";

describe("Features", () => {
  it("renders one card per feature in content.ts", () => {
    render(<Features />);
    for (const f of features) {
      expect(screen.getByText(f.title)).toBeInTheDocument();
    }
  });
});
