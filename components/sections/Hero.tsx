"use client";

import { useState } from "react";
import { hero } from "@/lib/content";
import { Button } from "@/components/ui/Button";
import { HeroTokenLoader } from "@/components/three/HeroTokenLoader";

const SERVER_IP = "Próximamente";

export function Hero() {
  const [copied, setCopied] = useState(false);
  const ipAvailable = SERVER_IP !== "Próximamente";

  async function handleCopy() {
    if (!ipAvailable) return;
    await navigator.clipboard.writeText(SERVER_IP);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section id="inicio" className="mx-auto flex max-w-7xl flex-col items-center gap-10 px-4 pb-20 pt-16 sm:px-6 lg:flex-row lg:pt-24">
      <div className="flex-1 text-center lg:text-left">
        <h1 className="font-display text-5xl uppercase leading-none text-white sm:text-6xl lg:text-7xl">{hero.headline}</h1>
        <p className="mt-4 font-display text-2xl text-transparent bg-brand-gradient bg-clip-text sm:text-3xl">{hero.tagline}</p>
        <p className="mx-auto mt-4 max-w-lg text-gray-400 lg:mx-0">{hero.description}</p>

        <div className="mt-8 flex flex-wrap justify-center gap-4 lg:justify-start">
          <Button variant="primary">Conectar al servidor</Button>
          <Button variant="outline-purple">Unirse a Discord</Button>
          <Button variant="outline-cyan">Postularte a whitelist</Button>
        </div>

        <div className="mx-auto mt-8 flex max-w-sm items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 lg:mx-0">
          <span className="font-mono text-sm text-cyan">{SERVER_IP}</span>
          <Button variant="outline-cyan" onClick={handleCopy} disabled={!ipAvailable} className="px-4 py-2 text-xs">
            {copied ? "¡Copiado!" : "Copiar IP"}
          </Button>
        </div>
      </div>

      <div className="flex-1">
        <HeroTokenLoader />
      </div>
    </section>
  );
}
