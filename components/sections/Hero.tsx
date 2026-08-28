"use client";

import { useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import Image from "next/image";
import { hero } from "@/lib/content";
import { Button } from "@/components/ui/Button";

const SERVER_IP = "Próximamente";

export function Hero() {
  const [copied, setCopied] = useState(false);
  const ipAvailable = SERVER_IP !== "Próximamente";
  const bgRef = useRef<HTMLDivElement>(null);

  async function handleCopy() {
    if (!ipAvailable) return;
    await navigator.clipboard.writeText(SERVER_IP);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleMouseMove(e: ReactMouseEvent<HTMLElement>) {
    const el = bgRef.current;
    if (!el || (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `translate(${(px * 14).toFixed(1)}px, ${(py * 14).toFixed(1)}px)`;
  }

  return (
    <section id="inicio" className="relative overflow-hidden" onMouseMove={handleMouseMove}>
      <div ref={bgRef} className="absolute inset-0 scale-110 transition-transform duration-300 ease-out motion-reduce:!transition-none">
        <Image src="/hero-bg.png" alt="" fill priority sizes="100vw" className="object-cover" />
      </div>
      <div className="absolute inset-0 bg-base/60" />

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-10 px-4 pb-20 pt-16 text-center sm:px-6 lg:pt-24">
        <div>
          <h1 className="font-display text-5xl uppercase leading-none text-white sm:text-6xl lg:text-7xl">{hero.headline}</h1>
          <p className="mt-4 font-display text-2xl text-transparent bg-brand-gradient bg-clip-text sm:text-3xl">{hero.tagline}</p>
          <p className="mx-auto mt-4 max-w-lg text-gray-400">{hero.description}</p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button variant="primary" disabled>
              Conectar al servidor
            </Button>
            <Button variant="outline-purple" disabled>
              Unirse a Discord
            </Button>
            <Button variant="outline-cyan" disabled>
              Postularte a whitelist
            </Button>
          </div>

          <div className="mx-auto mt-8 flex max-w-sm items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4">
            <span className="font-mono text-sm text-cyan">{SERVER_IP}</span>
            <Button variant="outline-cyan" onClick={handleCopy} disabled={!ipAvailable} className="px-4 py-2 text-xs">
              {copied ? "¡Copiado!" : "Copiar IP"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
