import type { ReactNode } from "react";

interface CardProps {
  icon?: ReactNode;
  title: string;
  description: string;
  className?: string;
}

export function Card({ icon, title, description, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors duration-200 hover:border-purple/50 ${className}`}
    >
      {icon && <div className="mb-4 text-cyan">{icon}</div>}
      <h3 className="font-display text-2xl uppercase tracking-wide text-white">{title}</h3>
      <p className="mt-2 text-sm text-gray-400">{description}</p>
    </div>
  );
}
