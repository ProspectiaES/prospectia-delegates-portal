"use client";

import { useState, useTransition } from "react";
import { savePlanificacio } from "@/app/actions/diario-planificacio";
import { DEFAULT_OBJECTIUS_VITALS, DEFAULT_OBJECTIUS_TRIMESTRALS } from "@/lib/diario-constants";

type VitalRow = { categoria: string; objectiu: string; descripcio: string };
type TrimRow = { area: string; objectiu: string; descripcio: string };

export interface ObjectiusData {
  vitals: typeof DEFAULT_OBJECTIUS_VITALS;
  trimestrals: typeof DEFAULT_OBJECTIUS_TRIMESTRALS;
}

const HORIZONS = ["2026", "2030", "2035", "2040"] as const;
const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;

// ─── Shared primitives ────────────────────────────────────────────────────────

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-4 pt-2 pb-1">
      <span className="text-[10px] font-bold text-[#C0C0C0] uppercase tracking-[0.15em] whitespace-nowrap">{title}</span>
      <div className="flex-1 h-px bg-[#F0F0F0]" />
    </div>
  );
}

const titleInput = "w-full text-[14px] font-semibold text-[#0A0A0A] bg-transparent border-0 border-b border-[#E4DDD5] focus:border-[#8E0E1A] outline-none pb-1.5 transition-colors placeholder:text-[#C8C0B8] placeholder:font-normal";
const descInput = "w-full text-[12px] text-[#5A5A5A] bg-transparent border-0 border-b border-[#F0EAE0] focus:border-[#C4964A] outline-none pb-1 transition-colors placeholder:text-[#C8C0B8] mt-1";

function ItemCard({ num, onRemove, children }: {
  num: number; onRemove: () => void; children: React.ReactNode;
}) {
  return (
    <div className="relative bg-white rounded-2xl border border-[#F0F0F0] shadow-[0_1px_4px_rgba(0,0,0,0.04)] px-5 pt-4 pb-3">
      <div className="flex items-start gap-3">
        <span className="text-[11px] font-black text-[#8E0E1A]/40 mt-0.5 w-5 shrink-0 select-none">
          {String(num).padStart(2, "0")}
        </span>
        <div className="flex-1 min-w-0">{children}</div>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[#D0D0D0] hover:text-[#8E0E1A] hover:bg-[#FEF2F2] transition-colors mt-0.5"
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M1 1l6 6M7 1L1 7" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 text-[12px] font-semibold text-[#8E0E1A]/70 hover:text-[#8E0E1A] transition-colors py-1"
    >
      <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center">
        <svg width="7" height="7" viewBox="0 0 7 7" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3.5.5v6M.5 3.5h6" strokeLinecap="round"/>
        </svg>
      </span>
      {label}
    </button>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function ObjectiusForm({ initial }: { initial: ObjectiusData }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [vitals, setVitals] = useState<typeof DEFAULT_OBJECTIUS_VITALS>(initial.vitals);
  const [trimestrals, setTrimestrals] = useState<typeof DEFAULT_OBJECTIUS_TRIMESTRALS>(initial.trimestrals);

  function updateVital(horizon: string, i: number, field: keyof VitalRow, val: string) {
    setVitals(prev => ({
      ...prev,
      [horizon]: (prev[horizon] ?? []).map((row, j) => j === i ? { ...row, [field]: val } : row),
    }));
  }

  function removeVital(horizon: string, i: number) {
    setVitals(prev => ({
      ...prev,
      [horizon]: (prev[horizon] ?? []).filter((_, j) => j !== i),
    }));
  }

  function addVital(horizon: string) {
    setVitals(prev => ({
      ...prev,
      [horizon]: [...(prev[horizon] ?? []), { categoria: "", objectiu: "", descripcio: "" }],
    }));
  }

  function updateTrim(q: string, i: number, field: keyof TrimRow, val: string) {
    setTrimestrals(prev => ({
      ...prev,
      [q]: (prev[q] ?? []).map((row, j) => j === i ? { ...row, [field]: val } : row),
    }));
  }

  function removeTrim(q: string, i: number) {
    setTrimestrals(prev => ({
      ...prev,
      [q]: (prev[q] ?? []).filter((_, j) => j !== i),
    }));
  }

  function addTrim(q: string) {
    setTrimestrals(prev => ({
      ...prev,
      [q]: [...(prev[q] ?? []), { area: "", objectiu: "", descripcio: "" }],
    }));
  }

  function handleSave() {
    startTransition(async () => {
      await savePlanificacio("objectius", 2026, { vitals, trimestrals });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <div className="space-y-3">

      {/* Vitals */}
      <SectionDivider title="Objectius vitals per horitzó" />

      {HORIZONS.map(horizon => (
        <div key={horizon} className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-black text-[#8E0E1A]/60 w-10 shrink-0">{horizon}</span>
            <div className="flex-1 h-px bg-[#F8F8F8]" />
          </div>

          {(vitals[horizon] ?? []).map((row, i) => (
            <ItemCard key={i} num={i + 1} onRemove={() => removeVital(horizon, i)}>
              <p className="text-[10px] font-bold text-[#C0C0C0] uppercase tracking-[0.12em] mb-1">{row.categoria || "Categoria"}</p>
              <input
                className={titleInput}
                value={row.objectiu}
                onChange={e => updateVital(horizon, i, "objectiu", e.target.value)}
                placeholder="L'objectiu…"
              />
              <input
                className={descInput}
                value={row.categoria}
                onChange={e => updateVital(horizon, i, "categoria", e.target.value)}
                placeholder="Categoria…"
              />
              <input
                className={descInput}
                value={row.descripcio}
                onChange={e => updateVital(horizon, i, "descripcio", e.target.value)}
                placeholder="Descripció o accions…"
              />
            </ItemCard>
          ))}
          <AddBtn onClick={() => addVital(horizon)} label={`Afegir objectiu ${horizon}`} />
        </div>
      ))}

      {/* Trimestrals */}
      <SectionDivider title="Objectius trimestrals 2026" />

      {QUARTERS.map(q => (
        <div key={q} className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-black text-[#8E0E1A]/60 w-10 shrink-0">{q}</span>
            <div className="flex-1 h-px bg-[#F8F8F8]" />
          </div>

          {(trimestrals[q] ?? []).map((row, i) => (
            <ItemCard key={i} num={i + 1} onRemove={() => removeTrim(q, i)}>
              <p className="text-[10px] font-bold text-[#C0C0C0] uppercase tracking-[0.12em] mb-1">{row.area || "Àrea"}</p>
              <input
                className={titleInput}
                value={row.objectiu}
                onChange={e => updateTrim(q, i, "objectiu", e.target.value)}
                placeholder="L'objectiu…"
              />
              <input
                className={descInput}
                value={row.area}
                onChange={e => updateTrim(q, i, "area", e.target.value)}
                placeholder="Àrea…"
              />
              <input
                className={descInput}
                value={row.descripcio}
                onChange={e => updateTrim(q, i, "descripcio", e.target.value)}
                placeholder="Descripció o accions…"
              />
            </ItemCard>
          ))}
          <AddBtn onClick={() => addTrim(q)} label={`Afegir objectiu ${q}`} />
        </div>
      ))}

      {/* Save */}
      <div className="flex items-center justify-between pt-4 pb-8">
        <span className={`text-[12px] text-emerald-600 font-medium transition-opacity duration-300 ${saved ? "opacity-100" : "opacity-0"}`}>
          ✓ Objectius guardats
        </span>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="px-5 py-2 bg-[#0A0A0A] text-white rounded-xl text-[13px] font-semibold hover:bg-[#8E0E1A] disabled:opacity-40 transition-colors"
        >
          {isPending ? "Guardant…" : "Guardar objectius"}
        </button>
      </div>
    </div>
  );
}
