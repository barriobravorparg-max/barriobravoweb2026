"use client";

import { useRef } from "react";

export interface TabItem {
  label: string;
}

interface TabsProps {
  items: TabItem[];
  activeIndex: number;
  onChange: (index: number) => void;
  panelId: string;
  tablistLabel: string;
}

export function tabPanelLabelledBy(panelId: string, activeIndex: number) {
  return `${panelId}-tab-${activeIndex}`;
}

export function Tabs({ items, activeIndex, onChange, panelId, tablistLabel }: TabsProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    const next = (activeIndex + dir + items.length) % items.length;
    onChange(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <div role="tablist" aria-label={tablistLabel} className="flex gap-2 overflow-x-auto pb-2 sm:justify-center">
      {items.map((item, i) => (
        <button
          key={item.label}
          id={`${panelId}-tab-${i}`}
          ref={(el) => {
            tabRefs.current[i] = el;
          }}
          role="tab"
          aria-selected={i === activeIndex}
          aria-controls={panelId}
          tabIndex={i === activeIndex ? 0 : -1}
          onClick={() => onChange(i)}
          onKeyDown={handleKeyDown}
          className={`shrink-0 rounded-full border px-5 py-2 text-sm uppercase tracking-wide transition-colors ${
            i === activeIndex ? "border-peach text-peach" : "border-white/10 text-gray-400 hover:text-white"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
