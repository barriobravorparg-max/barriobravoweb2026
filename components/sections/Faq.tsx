"use client";

import { useState } from "react";
import { faq } from "@/lib/content";

export function Faq() {
  const [openIndices, setOpenIndices] = useState<Set<number>>(new Set());

  function toggle(i: number) {
    setOpenIndices((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <div className="text-center">
        <h2 className="font-display text-4xl uppercase text-white sm:text-5xl">Preguntas frecuentes</h2>
      </div>

      <div className="mt-10 space-y-3">
        {faq.map((item, i) => {
          const isOpen = openIndices.has(i);
          return (
            <div key={item.question} className="rounded-xl border border-white/10 bg-white/[0.03]">
              <button
                aria-expanded={isOpen}
                onClick={() => toggle(i)}
                className="flex w-full items-center justify-between px-5 py-4 text-left text-white"
              >
                {item.question}
                <span className="text-cyan" aria-hidden="true">
                  {isOpen ? "−" : "+"}
                </span>
              </button>
              {isOpen && <p className="px-5 pb-4 text-sm text-gray-400">{item.answer}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
