"use client";

import { useState } from "react";
import { facciones } from "@/lib/content";
import { Tabs, tabPanelLabelledBy } from "@/components/ui/Tabs";

export function Facciones() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = facciones[activeIndex];

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="text-center">
        <h2 className="font-display text-4xl uppercase text-white sm:text-5xl">Facciones y trabajos</h2>
        <p className="mt-2 text-gray-400">Elegí tu camino dentro del barrio.</p>
      </div>

      <div className="mt-10">
        <Tabs
          items={facciones.map((f) => ({ label: f.category }))}
          activeIndex={activeIndex}
          onChange={setActiveIndex}
          panelId="facciones-panel"
          tablistLabel="Categorías de facciones"
        />
      </div>

      <div
        id="facciones-panel"
        role="tabpanel"
        aria-labelledby={tabPanelLabelledBy("facciones-panel", activeIndex)}
        tabIndex={0}
        className="mt-8"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {active.jobs.map((job) => (
            <div
              key={job.name}
              className={`relative rounded-xl border p-5 ${
                job.featured ? "border-cyan bg-cyan/5 shadow-lg shadow-cyan/20" : "border-white/10 bg-white/[0.03]"
              }`}
              style={job.color ? { borderLeft: `4px solid ${job.color}` } : undefined}
            >
              {job.reserved && (
                <span className="absolute -top-3 right-4 rounded-full bg-brand-gradient px-3 py-1 text-xs font-semibold uppercase text-base">
                  Reservada
                </span>
              )}
              {job.featured && (
                <span className="absolute -top-3 right-4 rounded-full border border-cyan bg-base px-3 py-1 text-xs font-semibold uppercase text-cyan">
                  Exclusivo
                </span>
              )}
              <h3 className="font-display text-xl uppercase text-white">{job.name}</h3>
              <p className="mt-1 text-sm text-gray-400">{job.description}</p>
            </div>
          ))}
        </div>

        {active.footer && <p className="mt-8 text-center text-sm text-cyan">{active.footer}</p>}
      </div>
    </section>
  );
}
