import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "outline" | "ghost";
type Size    = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[#E50914] text-[#F5F5F5] hover:bg-[#B20710] active:bg-[#B20710] border border-[#E50914] hover:border-[#B20710]",
  outline:
    "bg-transparent text-[#F5F5F5] border border-[#2A2A2A] hover:border-[#F5F5F5] hover:bg-[#1E1E1E]",
  ghost:
    "bg-transparent text-[#A0A0A0] border border-transparent hover:text-[#F5F5F5] hover:bg-[#1E1E1E]",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-7  px-3   text-xs  gap-1.5",
  md: "h-9  px-4   text-sm  gap-2",
  lg: "h-11 px-5   text-sm  gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center font-medium rounded-[6px]",
        "transition-colors duration-150",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E50914] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
