"use client";

import { useEffect, useState } from "react";

interface LoadingScreenProps {
  onFinish: () => void;
  minDurationMs?: number;
  autoAdvanceMs?: number;
}

export function LoadingScreen({ onFinish, minDurationMs = 1500, autoAdvanceMs = 4000 }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);

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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-base">
      <h1 className="font-display text-5xl tracking-widest text-white sm:text-7xl">BARRIO BRAVO RP</h1>
      <div className="h-1 w-64 overflow-hidden rounded-full bg-white/10 sm:w-96">
        <div className="h-full bg-brand-gradient transition-all duration-100" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-sm text-gray-400">
        {ready ? "Presioná cualquier tecla para continuar" : `Cargando... ${progress}%`}
      </p>
    </div>
  );
}
