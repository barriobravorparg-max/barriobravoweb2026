import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ImagePlaceholder } from "./ImagePlaceholder";

describe("ImagePlaceholder", () => {
  it("renders with the given aspect-ratio class and accessible label", () => {
    render(
      <ImagePlaceholder aspectClassName="aspect-[3/2]" label="Card de facción" todo="faccion-civil.jpg, 800x533px" />
    );
    const el = screen.getByRole("img", { name: "Card de facción" });
    expect(el).toHaveClass("aspect-[3/2]");
  });
});
