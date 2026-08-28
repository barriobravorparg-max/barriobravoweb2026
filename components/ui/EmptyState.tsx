interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center">
      <p className="font-display text-xl uppercase text-white">{title}</p>
      <p className="max-w-sm text-sm text-gray-400">{description}</p>
      <p className="mt-2 text-xs uppercase tracking-wide text-cyan">Disponible en una próxima actualización</p>
    </div>
  );
}
