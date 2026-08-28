"use client";

import { useState } from "react";
import Image from "next/image";
import { hero } from "@/lib/content";
import { Button } from "@/components/ui/Button";

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
    <section id="inicio" className="relative overflow-hidden bg-base">
      <div className="absolute inset-0">
        <Image src="/hero-bg.png" alt="" fill priority sizes="100vw" className="object-contain object-center" />
      </div>
      <div className="absolute inset-0 bg-base/60" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-16 text-center sm:px-6 lg:pt-24 lg:text-left">
        <h1 className="font-display text-5xl uppercase leading-none text-white sm:text-6xl lg:text-7xl">{hero.headline}</h1>
        <p className="mt-4 font-display text-2xl text-transparent bg-brand-gradient bg-clip-text sm:text-3xl">{hero.tagline}</p>
        <p className="mx-auto mt-4 max-w-lg text-gray-400 lg:mx-0">{hero.description}</p>

        <div className="mt-8 flex flex-wrap justify-center gap-4 lg:justify-start">
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

        <div className="mx-auto mt-8 flex max-w-sm items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 lg:mx-0">
          <span className="font-mono text-sm text-cyan">{SERVER_IP}</span>
          <Button variant="outline-cyan" onClick={handleCopy} disabled={!ipAvailable} className="px-4 py-2 text-xs">
            {copied ? "¡Copiado!" : "Copiar IP"}
          </Button>
        </div>
      </div>
    </section>
  );
}
