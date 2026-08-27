"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import Image from "next/image";

interface LoadingScreenProps {
  onFinish: () => void;
  minDurationMs?: number;
  autoAdvanceMs?: number;
}

export function LoadingScreen({ onFinish, minDurationMs = 1500, autoAdvanceMs = 4000 }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const bgRef = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: ReactMouseEvent<HTMLDivElement>) {
    const el = bgRef.current;
    if (!el || (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
    const px = (e.clientX / window.innerWidth) * 2 - 1;
    const py = (e.clientY / window.innerHeight) * 2 - 1;
    el.style.transform = `translate(${(px * 16).toFixed(1)}px, ${(py * 16).toFixed(1)}px)`;
  }

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min(100, Math.round((elapsed / minDurationMs) * 100)));
    }, 50);

    const readyTimer = setTimeout(() => {
      setProgress(100);
      setReady(true);
    }, minDurationMs);

    return () => {
      clearInterval(interval);
      clearTimeout(readyTimer);
    };
  }, [minDurationMs]);

  useEffect(() => {
    if (!ready) return;

    const autoTimer = setTimeout(onFinish, autoAdvanceMs);
    const skip = () => onFinish();

    document.addEventListener("keydown", skip);
    document.addEventListener("click", skip);

    return () => {
      clearTimeout(autoTimer);
      document.removeEventListener("keydown", skip);
      document.removeEventListener("click", skip);
    };
  }, [ready, autoAdvanceMs, onFinish]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 overflow-hidden bg-base"
      onMouseMove={handleMouseMove}
    >
      {/* TODO: imagen — loading-bg.jpg, 2400x1350px, ver spec §3.7 (variante ampliada) */}
      <div ref={bgRef} className="absolute inset-0 scale-110 transition-transform duration-300 ease-out motion-reduce:!transition-none">
        <Image src="/loading-bg.png" alt="" fill priority sizes="100vw" className="object-cover" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-base/85 via-base/60 to-base" />

      <div className="relative z-10 flex flex-col items-center gap-6">
        <h1 className="font-display text-5xl tracking-widest text-white sm:text-7xl">BARRIO BRAVO RP</h1>
        <div className="h-1 w-64 overflow-hidden rounded-full bg-white/10 sm:w-96">
          <div className="h-full bg-brand-gradient transition-all duration-100" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-sm text-gray-400">
          {ready ? "Presioná cualquier tecla para continuar" : `Cargando... ${progress}%`}
        </p>
      </div>
    </div>
  );
}
