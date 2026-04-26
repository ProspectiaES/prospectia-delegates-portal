import { cn } from "@/lib/cn";

type Trend = "up" | "down" | "neutral";

interface KpiCardProps {
  label: string;
  value: string;
  subtext?: string;
  trend?: Trend;
  trendValue?: string;
  accent?: boolean;
  className?: string;
}

const TrendIcon = ({ trend }: { trend: Trend }) => {
  if (trend === "up") return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden>
      <path d="M5 2L8.5 7H1.5L5 2Z" />
    </svg>
  );
  if (trend === "down") return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden>
      <path d="M5 8L1.5 3H8.5L5 8Z" />
    </svg>
  );
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
      <path d="M1 5H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};

const trendColors: Record<Trend, string> = {
  up:      "text-emerald-600",
  down:    "text-[#8E0E1A]",
  neutral: "text-[#6B7280]",
};

export function KpiCard({
  label, value, subtext, trend, trendValue, accent = false, className,
}: KpiCardProps) {
  return (
    <div className={cn(
      "relative rounded-xl border bg-white px-5 py-5 flex flex-col gap-3 overflow-hidden shadow-sm",
      accent ? "border-[#8E0E1A]/20" : "border-[#E5E7EB]",
      className
    )}>
      {accent && (
        <span className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full bg-[#8E0E1A]" aria-hidden />
      )}
      <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-widest">
        {label}
      </p>
      <p className="text-[2rem] font-bold leading-none tabular-nums text-[#0A0A0A]">
        {value}
      </p>
      {(trend || subtext) && (
        <div className="flex items-center gap-2 flex-wrap">
          {trend && trendValue && (
            <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", trendColors[trend])}>
              <TrendIcon trend={trend} />
              {trendValue}
            </span>
          )}
          {subtext && <span className="text-xs text-[#6B7280]">{subtext}</span>}
        </div>
      )}
    </div>
  );
}
