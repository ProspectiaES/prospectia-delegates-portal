"use client";

import { useRouter, usePathname } from "next/navigation";

function monthLabel(mesStr: string) {
  const [y, m] = mesStr.split("-").map(Number);
  return new Date(y, m - 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

function prevMes(mes: string) {
  const [y, m] = mes.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

function nextMes(mes: string) {
  const [y, m] = mes.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

export function MonthPicker({ mesStr, isCurrentMes }: { mesStr: string; isCurrentMes: boolean }) {
  const router   = useRouter();
  const pathname = usePathname();

  function go(mes: string) {
    const now    = new Date();
    const nowMes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    router.push(pathname + (mes === nowMes ? "" : `?mes=${mes}`));
  }

  const nowStr = (() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
  })();

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => go(prevMes(mesStr))}
        className="w-7 h-7 rounded-lg border border-[#E5E7EB] bg-white flex items-center justify-center text-[#6B7280] hover:text-[#8E0E1A] hover:border-[#8E0E1A]/30 transition-colors shadow-sm"
        aria-label="Mes anterior"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 4L6 8l4 4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Overlay trick: hidden input on top of styled label */}
      <div className="relative h-8">
        <span className="h-8 px-3 text-xs font-semibold text-[#374151] capitalize flex items-center rounded-lg border border-[#E5E7EB] bg-white shadow-sm pointer-events-none select-none whitespace-nowrap">
          {monthLabel(mesStr)}
        </span>
        <input
          type="month"
          value={mesStr}
          max={nowStr}
          onChange={e => { if (e.target.value) go(e.target.value); }}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </div>

      <button
        onClick={() => !isCurrentMes && go(nextMes(mesStr))}
        disabled={isCurrentMes}
        className="w-7 h-7 rounded-lg border border-[#E5E7EB] bg-white flex items-center justify-center text-[#6B7280] hover:text-[#8E0E1A] hover:border-[#8E0E1A]/30 transition-colors shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Mes siguiente"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {!isCurrentMes && (
        <button
          onClick={() => go(nowStr)}
          className="h-7 px-2.5 rounded-lg border border-[#E5E7EB] bg-white text-[10px] font-semibold text-[#6B7280] hover:text-[#8E0E1A] hover:border-[#8E0E1A]/30 transition-colors shadow-sm whitespace-nowrap"
        >
          Hoy
        </button>
      )}
    </div>
  );
}
