import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "neutral";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-[#1E1E1E] text-[#F5F5F5]  border-[#2A2A2A]",
  success: "bg-[#0F2418]  text-[#4ADE80]  border-[#1a3d27]",
  warning: "bg-[#251A00]  text-[#FACC15]  border-[#3a2900]",
  danger:  "bg-[#1F0406]  text-[#E50914]  border-[#3d080e]",
  neutral: "bg-[#1A1A1A]  text-[#A0A0A0]  border-[#2A2A2A]",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-[#A0A0A0]",
  success: "bg-[#4ADE80]",
  warning: "bg-[#FACC15]",
  danger:  "bg-[#E50914]",
  neutral: "bg-[#A0A0A0]",
};

export function Badge({
  variant = "default",
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px]",
        "text-xs font-medium border",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColors[variant])}
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}
