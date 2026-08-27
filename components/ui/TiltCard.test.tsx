import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TiltCard } from "./TiltCard";

function mockReducedMotion(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  );
}

describe("TiltCard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders its children", () => {
    mockReducedMotion(false);
    render(
      <TiltCard>
        <p>Contenido</p>
      </TiltCard>
    );
    expect(screen.getByText("Contenido")).toBeInTheDocument();
  });

  it("tilts on mouse move and resets to rest on mouse leave", () => {
    mockReducedMotion(false);
    render(
      <TiltCard>
        <p>Contenido</p>
      </TiltCard>
    );
    const wrapper = screen.getByText("Contenido").parentElement as HTMLElement;
    vi.spyOn(wrapper, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 100,
      height: 100,
      right: 100,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    fireEvent.mouseMove(wrapper, { clientX: 10, clientY: 10 });
    expect(wrapper.style.transform).toContain("rotateX");
    expect(wrapper.style.transform).not.toBe("perspective(600px) rotateX(0deg) rotateY(0deg) scale(1)");

    fireEvent.mouseLeave(wrapper);
    expect(wrapper.style.transform).toBe("perspective(600px) rotateX(0deg) rotateY(0deg) scale(1)");
  });

  it("does not tilt when the user prefers reduced motion", () => {
    mockReducedMotion(true);
    render(
      <TiltCard>
        <p>Contenido</p>
      </TiltCard>
    );
    const wrapper = screen.getByText("Contenido").parentElement as HTMLElement;
    vi.spyOn(wrapper, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 100,
      height: 100,
      right: 100,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    fireEvent.mouseMove(wrapper, { clientX: 10, clientY: 10 });
    expect(wrapper.style.transform).toBe("perspective(600px) rotateX(0deg) rotateY(0deg) scale(1)");
  });
});
