import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "outline-purple" | "outline-cyan";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-brand-gradient text-base font-semibold hover:brightness-110",
  "outline-purple": "border border-purple text-purple hover:bg-purple/10",
  "outline-cyan": "border border-cyan text-cyan hover:bg-cyan/10",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-full px-6 py-3 text-sm uppercase tracking-wide transition-all duration-200 hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
