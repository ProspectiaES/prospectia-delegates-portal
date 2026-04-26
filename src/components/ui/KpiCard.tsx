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
  if (trend === "up") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
        <path d="M6 2L10 7H2L6 2Z" fill="currentColor" />
      </svg>
    );
  }
  if (trend === "down") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
        <path d="M6 10L2 5H10L6 10Z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M2 6H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};

const trendColors: Record<Trend, string> = {
  up:      "text-[#4ADE80]",
  down:    "text-[#E50914]",
  neutral: "text-[#A0A0A0]",
};

export function KpiCard({
  label,
  value,
  subtext,
  trend,
  trendValue,
  accent = false,
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-[8px] border bg-[#121212] px-5 py-5 flex flex-col gap-3 overflow-hidden",
        accent ? "border-[#E50914]/40" : "border-[#2A2A2A]",
        className
      )}
    >
      {/* Red accent bar on left edge for highlighted cards */}
      {accent && (
        <span
          className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full bg-[#E50914]"
          aria-hidden
        />
      )}

      <p className="text-xs font-medium text-[#A0A0A0] uppercase tracking-widest">
        {label}
      </p>

      <p
        className={cn(
          "text-3xl font-bold leading-none tabular-nums",
          accent ? "text-[#F5F5F5]" : "text-[#F5F5F5]"
        )}
      >
        {value}
      </p>

      {(trend || subtext) && (
        <div className="flex items-center gap-2">
          {trend && trendValue && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs font-medium",
                trendColors[trend]
              )}
            >
              <TrendIcon trend={trend} />
              {trendValue}
            </span>
          )}
          {subtext && (
            <span className="text-xs text-[#A0A0A0]">{subtext}</span>
          )}
        </div>
      )}
    </div>
  );
}
