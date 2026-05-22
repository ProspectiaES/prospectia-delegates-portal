"use client";

import { useRouter } from "next/navigation";

export function BruixolaPeriodNav({ mesStr, basePath }: { mesStr: string; basePath: string }) {
  const router = useRouter();
  function navigate(delta: number) {
    const [y, m] = mesStr.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    router.push(`${basePath}?mes=${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => navigate(-1)}
        className="h-7 w-7 rounded-lg flex items-center justify-center text-[#6B7280] hover:bg-[#F3F4F6] transition-colors">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 3L5 7l4 4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <button onClick={() => navigate(1)}
        className="h-7 w-7 rounded-lg flex items-center justify-center text-[#6B7280] hover:bg-[#F3F4F6] transition-colors">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}
