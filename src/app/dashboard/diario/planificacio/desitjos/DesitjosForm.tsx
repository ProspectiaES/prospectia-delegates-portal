"use client";

import { useState, useTransition } from "react";
import { savePlanificacio } from "@/app/actions/diario-planificacio";
import { DEFAULT_DESITJOS } from "@/lib/diario-constants";

type DesitjosData = typeof DEFAULT_DESITJOS;

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
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-3">
        <h2 className="text-sm font-bold text-[#0A0A0A]">Llista de desitjos</h2>

        {desitjos.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#FEF2F2] flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-[#8E0E1A]">{i + 1}</span>
            </div>
            <input
              type="text"
              value={d}
              onChange={e => setDesitjos(prev => prev.map((x, j) => j === i ? e.target.value : x))}
              placeholder="Un desig…"
              className="flex-1 text-sm text-[#0A0A0A] placeholder-[#D1D5DB] bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A] transition-colors"
            />
            <button
              type="button"
              onClick={() => setDesitjos(prev => prev.filter((_, j) => j !== i))}
              className="p-1.5 rounded-md text-[#9CA3AF] hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 2l8 8M10 2L2 10" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setDesitjos(prev => [...prev, ""])}
          className="flex items-center gap-1.5 text-sm text-[#8E0E1A] hover:text-[#7a0b16] font-medium transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 1v12M1 7h12" strokeLinecap="round"/>
          </svg>
          Afegir desig
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-2">
        <h2 className="text-sm font-bold text-[#0A0A0A]">Notes</h2>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={4}
          placeholder="Notes addicionals sobre els teus desitjos…"
          className="w-full text-sm text-[#0A0A0A] placeholder-[#D1D5DB] bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A] transition-colors"
        />
      </div>

      <div className="flex items-center justify-between pb-8">
        <div className={`text-sm text-emerald-600 font-medium transition-opacity duration-300 ${saved ? "opacity-100" : "opacity-0"}`}>
          ✓ Desitjos guardats
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="px-6 py-2.5 bg-[#8E0E1A] text-white rounded-lg text-sm font-semibold hover:bg-[#7a0b16] disabled:opacity-60 transition-colors"
        >
          {isPending ? "Guardant…" : "Guardar desitjos"}
        </button>
      </div>
    </div>
  );
}
