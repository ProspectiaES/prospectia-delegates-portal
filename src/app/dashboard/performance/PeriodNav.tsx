"use client";
import { useRouter, usePathname } from "next/navigation";

function addMonth(mesStr: string, delta: number): string {
  const [y, m] = mesStr.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function PeriodNav({ mesStr }: { mesStr: string }) {
  const router   = useRouter();
  const pathname = usePathname();
  const now      = new Date();
  const nowStr   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const isNow    = mesStr === nowStr;
  const prev     = addMonth(mesStr, -1);
  const next     = addMonth(mesStr, 1);
  const label    = new Date(Number(mesStr.split("-")[0]), Number(mesStr.split("-")[1]) - 1)
    .toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  const btn = "h-8 w-8 flex items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-lg text-[#6B7280] hover:text-[#0A0A0A] hover:bg-[#F9FAFB] transition-colors leading-none select-none";

  return (
    <div className="flex items-center gap-1">
      <button onClick={() => router.push(`${pathname}?mes=${prev}`)} className={btn} aria-label="Mes anterior">
        ‹
      </button>
      <span className="px-3 py-1.5 text-sm font-medium text-[#0A0A0A] min-w-[160px] text-center capitalize tabular-nums">
        {label}
      </span>
      {!isNow && (
        <button onClick={() => router.push(`${pathname}?mes=${next}`)} className={btn} aria-label="Mes siguiente">
          ›
        </button>
      )}
    </div>
  );
}
