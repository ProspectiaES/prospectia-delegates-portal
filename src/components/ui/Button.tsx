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
    "bg-[#8E0E1A] text-white border border-[#8E0E1A] hover:bg-[#6B0A14] hover:border-[#6B0A14] active:bg-[#6B0A14]",
  outline:
    "bg-white text-[#0A0A0A] border border-[#E5E7EB] hover:border-[#0A0A0A] hover:bg-[#F9FAFB]",
  ghost:
    "bg-transparent text-[#6B7280] border border-transparent hover:text-[#0A0A0A] hover:bg-[#F3F4F6]",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-7  px-3 text-xs gap-1.5",
  md: "h-9  px-4 text-sm gap-2",
  lg: "h-11 px-5 text-sm gap-2",
};

export function Button({
  variant = "primary", size = "md", className, disabled, children, ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center font-medium rounded-[6px]",
        "transition-colors duration-150",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8E0E1A] focus-visible:ring-offset-2",
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
