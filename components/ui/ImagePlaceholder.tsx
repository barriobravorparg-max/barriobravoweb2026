interface ImagePlaceholderProps {
  aspectClassName: string;
  label: string;
  todo: string;
  className?: string;
}

export function ImagePlaceholder({ aspectClassName, label, todo, className = "" }: ImagePlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`relative w-full overflow-hidden rounded-xl bg-purple/10 ${aspectClassName} ${className}`}
    >
      {/* TODO: imagen — {todo} */}
    </div>
  );
}
