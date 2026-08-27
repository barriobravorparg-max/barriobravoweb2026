import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoadingScreen } from "./LoadingScreen";

describe("LoadingScreen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not finish before the minimum duration even if a key is pressed", async () => {
    const onFinish = vi.fn();
    render(<LoadingScreen onFinish={onFinish} minDurationMs={1500} autoAdvanceMs={4000} />);

    await vi.advanceTimersByTimeAsync(500);
    screen.getByText("Cargando...", { exact: false }).ownerDocument.dispatchEvent(new KeyboardEvent("keydown"));
    expect(onFinish).not.toHaveBeenCalled();
  });

  it("shows the skip prompt and finishes on keypress once the minimum duration has passed", async () => {
    const onFinish = vi.fn();
    render(<LoadingScreen onFinish={onFinish} minDurationMs={1500} autoAdvanceMs={4000} />);

    await vi.advanceTimersByTimeAsync(1500);
    expect(screen.getByText(/Presion/i)).toBeInTheDocument();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("finishes automatically after autoAdvanceMs with no input", async () => {
    const onFinish = vi.fn();
    render(<LoadingScreen onFinish={onFinish} minDurationMs={1500} autoAdvanceMs={4000} />);

    await vi.advanceTimersByTimeAsync(1500 + 4000);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
