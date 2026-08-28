import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Tabs, tabPanelLabelledBy } from "./Tabs";

const ITEMS = [{ label: "Uno" }, { label: "Dos" }, { label: "Tres" }];

function StatefulTabs() {
  const [activeIndex, setActiveIndex] = useState(0);
  return (
    <>
      <Tabs items={ITEMS} activeIndex={activeIndex} onChange={setActiveIndex} panelId="test-panel" tablistLabel="Test tabs" />
      <div id="test-panel" role="tabpanel" aria-labelledby={tabPanelLabelledBy("test-panel", activeIndex)}>
        {ITEMS[activeIndex].label}
      </div>
    </>
  );
}

describe("Tabs", () => {
  it("switches active tab on click and updates aria-selected/tabIndex on both tabs", async () => {
    const user = userEvent.setup();
    render(<StatefulTabs />);

    const first = screen.getByRole("tab", { name: "Uno" });
    const second = screen.getByRole("tab", { name: "Dos" });
    expect(first).toHaveAttribute("aria-selected", "true");
    expect(first).toHaveAttribute("tabindex", "0");
    expect(second).toHaveAttribute("aria-selected", "false");
    expect(second).toHaveAttribute("tabindex", "-1");

    await user.click(second);

    expect(first).toHaveAttribute("aria-selected", "false");
    expect(first).toHaveAttribute("tabindex", "-1");
    expect(second).toHaveAttribute("aria-selected", "true");
    expect(second).toHaveAttribute("tabindex", "0");
  });

  it("wraps around with ArrowLeft from the first tab to the last", async () => {
    const user = userEvent.setup();
    render(<StatefulTabs />);

    screen.getByRole("tab", { name: "Uno" }).focus();
    await user.keyboard("{ArrowLeft}");

    expect(screen.getByRole("tab", { name: "Tres" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Tres" })).toHaveAttribute("aria-selected", "true");
  });

  it("wraps around with ArrowRight from the last tab to the first", async () => {
    const user = userEvent.setup();
    render(<StatefulTabs />);

    await user.click(screen.getByRole("tab", { name: "Tres" }));
    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("tab", { name: "Uno" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Uno" })).toHaveAttribute("aria-selected", "true");
  });

  it("links the tabpanel to the active tab via aria-controls/aria-labelledby", async () => {
    const user = userEvent.setup();
    render(<StatefulTabs />);

    const panel = screen.getByRole("tabpanel");
    expect(screen.getByRole("tab", { name: "Uno" })).toHaveAttribute("aria-controls", "test-panel");
    expect(panel).toHaveAttribute("id", "test-panel");
    expect(panel).toHaveAttribute("aria-labelledby", "test-panel-tab-0");

    await user.click(screen.getByRole("tab", { name: "Dos" }));
    expect(panel).toHaveAttribute("aria-labelledby", "test-panel-tab-1");
  });
});
