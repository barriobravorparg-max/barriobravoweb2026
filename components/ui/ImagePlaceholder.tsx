import { twMerge } from "tailwind-merge";

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
      data-todo={todo}
      className={twMerge("relative w-full overflow-hidden rounded-xl bg-purple/10", aspectClassName, className)}
    >
      {/* TODO: imagen — el nombre y medidas exactos están en el atributo data-todo de arriba */}
    </div>
  );
}
