"use client";

import { useState, useTransition } from "react";
import { savePlanificacio } from "@/app/actions/diario-planificacio";
import { DEFAULT_DESITJOS } from "@/lib/diario-constants";

type DesitjosData = typeof DEFAULT_DESITJOS;

// ─── Shared primitives ────────────────────────────────────────────────────────

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-4 pt-2 pb-1">
      <span className="text-[10px] font-bold text-[#C0C0C0] uppercase tracking-[0.15em] whitespace-nowrap">{title}</span>
      <div className="flex-1 h-px bg-[#F0F0F0]" />
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function DesitjosForm({ initial }: { initial: DesitjosData }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [desitjos, setDesitjos] = useState<string[]>(initial.desitjos);
  const [notes, setNotes] = useState(initial.notes);

  function handleSave() {
    startTransition(async () => {
      await savePlanificacio("desitjos", 2026, { desitjos, notes });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <div className="space-y-3">

      {/* Desitjos */}
      <SectionDivider title="Llista de desitjos" />
      <div className="space-y-2">
        {desitjos.map((d, i) => (
          <div key={i} className="bg-white rounded-2xl border border-[#F0F0F0] shadow-[0_1px_4px_rgba(0,0,0,0.04)] px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-black text-[#8E0E1A]/40 shrink-0 select-none w-5">
                {String(i + 1).padStart(2, "0")}
              </span>
              <input
                type="text"
                value={d}
                onChange={e => setDesitjos(prev => prev.map((x, j) => j === i ? e.target.value : x))}
                placeholder="Un desig per al 2026…"
                className="flex-1 text-[15px] font-semibold text-[#0A0A0A] bg-transparent border-0 border-b border-transparent hover:border-[#E8E8E8] focus:border-[#8E0E1A]/40 outline-none pb-1 transition-colors placeholder:text-[#DCDCDC] placeholder:font-normal min-w-0"
              />
              <button
                type="button"
                onClick={() => setDesitjos(prev => prev.filter((_, j) => j !== i))}
                className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[#D0D0D0] hover:text-[#8E0E1A] hover:bg-[#FEF2F2] transition-colors"
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M1 1l6 6M7 1L1 7" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setDesitjos(prev => [...prev, ""])}
          className="flex items-center gap-2 text-[12px] font-semibold text-[#8E0E1A]/70 hover:text-[#8E0E1A] transition-colors py-1"
        >
          <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center">
            <svg width="7" height="7" viewBox="0 0 7 7" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3.5.5v6M.5 3.5h6" strokeLinecap="round"/>
            </svg>
          </span>
          Afegir desig
        </button>
      </div>

      {/* Notes */}
      <SectionDivider title="Notes" />
      <div className="bg-white rounded-2xl border border-[#F0F0F0] shadow-[0_1px_4px_rgba(0,0,0,0.04)] px-5 py-4">
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={4}
          placeholder="Notes addicionals sobre els teus desitjos…"
          className="w-full text-[13px] text-[#5A5A5A] bg-transparent border-0 outline-none resize-none leading-relaxed placeholder:text-[#DCDCDC]"
        />
      </div>

      {/* Save */}
      <div className="flex items-center justify-between pt-4 pb-8">
        <span className={`text-[12px] text-emerald-600 font-medium transition-opacity duration-300 ${saved ? "opacity-100" : "opacity-0"}`}>
          ✓ Desitjos guardats
        </span>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="px-5 py-2 bg-[#0A0A0A] text-white rounded-xl text-[13px] font-semibold hover:bg-[#8E0E1A] disabled:opacity-40 transition-colors"
        >
          {isPending ? "Guardant…" : "Guardar desitjos"}
        </button>
      </div>
    </div>
  );
}
