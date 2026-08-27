"use client";

import { useRef, useState } from "react";
import { facciones } from "@/lib/content";

export function Facciones() {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const active = facciones[activeIndex];

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    const next = (activeIndex + dir + facciones.length) % facciones.length;
    setActiveIndex(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="text-center">
        <h2 className="font-display text-4xl uppercase text-white sm:text-5xl">Facciones y trabajos</h2>
        <p className="mt-2 text-gray-400">Elegí tu camino dentro del barrio.</p>
      </div>

      <div role="tablist" aria-label="Categorías de facciones" className="mt-10 flex gap-2 overflow-x-auto pb-2 sm:justify-center">
        {facciones.map((f, i) => (
          <button
            key={f.category}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            role="tab"
            aria-selected={i === activeIndex}
            tabIndex={i === activeIndex ? 0 : -1}
            onClick={() => setActiveIndex(i)}
            onKeyDown={handleKeyDown}
            className={`shrink-0 rounded-full border px-5 py-2 text-sm uppercase tracking-wide transition-colors ${
              i === activeIndex ? "border-peach text-peach" : "border-white/10 text-gray-400 hover:text-white"
            }`}
          >
            {f.category}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {active.jobs.map((job) => (
          <div key={job.name} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <h3 className="font-display text-xl uppercase text-white">{job.name}</h3>
            <p className="mt-1 text-sm text-gray-400">{job.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
