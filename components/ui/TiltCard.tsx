"use client";

import { useRef, type MouseEvent, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
}

const REST_TRANSFORM = "perspective(600px) rotateX(0deg) rotateY(0deg) scale(1)";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function TiltCard({ children, className = "", maxTilt = 12 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    const rotateX = (-py * maxTilt * 2).toFixed(2);
    const rotateY = (px * maxTilt * 2).toFixed(2);
    el.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.04)`;
  }

  function handleMouseLeave() {
    const el = ref.current;
    if (el) el.style.transform = REST_TRANSFORM;
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transform: REST_TRANSFORM }}
      className={twMerge("w-full transition-transform duration-150 ease-out motion-reduce:!transition-none", className)}
    >
      {children}
    </div>
  );
}
