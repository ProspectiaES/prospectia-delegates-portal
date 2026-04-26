import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "neutral";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-[#F3F4F6]  text-[#374151]  border-[#E5E7EB]",
  success: "bg-emerald-50 text-emerald-700 border-emerald-100",
  warning: "bg-amber-50   text-amber-700   border-amber-100",
  danger:  "bg-red-50     text-[#8E0E1A]   border-red-100",
  neutral: "bg-[#F3F4F6]  text-[#6B7280]   border-[#E5E7EB]",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-[#6B7280]",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger:  "bg-[#8E0E1A]",
  neutral: "bg-[#9CA3AF]",
};

export function Badge({ variant = "default", dot = false, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColors[variant])} aria-hidden />
      )}
      {children}
    </span>
  );
}
