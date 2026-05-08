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

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">{children}</p>;
}

function inputCls() {
  return "w-full text-sm text-[#0A0A0A] placeholder-[#D1D5DB] bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A] transition-colors";
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="p-1.5 rounded-md text-[#9CA3AF] hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 2l8 8M10 2L2 10" strokeLinecap="round"/>
      </svg>
    </button>
  );
}

function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 text-sm text-[#8E0E1A] hover:text-[#7a0b16] font-medium transition-colors"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 1v12M1 7h12" strokeLinecap="round"/>
      </svg>
      {label}
    </button>
  );
}

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
    <div className="space-y-6">
      {/* Objectius Vitals */}
      <div>
        <h2 className="text-base font-bold text-[#0A0A0A] mb-3">Objectius Vitals per horitzó</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {HORIZONS.map(horizon => (
            <div key={horizon} className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#8E0E1A]">{horizon}</h3>
              </div>

              {(vitals[horizon] ?? []).map((row, i) => (
                <div key={i} className="space-y-1 pb-2 border-b border-[#F3F4F6] last:border-0 last:pb-0">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-1">
                      <div>
                        {i === 0 && <Label>Categoria</Label>}
                        <input className={inputCls()} value={row.categoria} onChange={e => updateVital(horizon, i, "categoria", e.target.value)} placeholder="Categoria…" />
                      </div>
                      <div>
                        {i === 0 && <Label>Objectiu</Label>}
                        <input className={inputCls()} value={row.objectiu} onChange={e => updateVital(horizon, i, "objectiu", e.target.value)} placeholder="Objectiu…" />
                      </div>
                      <div>
                        {i === 0 && <Label>Descripció</Label>}
                        <input className={inputCls()} value={row.descripcio} onChange={e => updateVital(horizon, i, "descripcio", e.target.value)} placeholder="Descripció…" />
                      </div>
                    </div>
                    <div className={i === 0 ? "pt-5" : "pt-0"}>
                      <RemoveBtn onClick={() => removeVital(horizon, i)} />
                    </div>
                  </div>
                </div>
              ))}
              <AddBtn onClick={() => addVital(horizon)} label="Afegir objectiu" />
            </div>
          ))}
        </div>
      </div>

      {/* Objectius Trimestrals */}
      <div>
        <h2 className="text-base font-bold text-[#0A0A0A] mb-3">Objectius Trimestrals 2026</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {QUARTERS.map(q => (
            <div key={q} className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-3">
              <h3 className="text-sm font-bold text-[#8E0E1A]">{q}</h3>

              {(trimestrals[q] ?? []).map((row, i) => (
                <div key={i} className="space-y-1 pb-2 border-b border-[#F3F4F6] last:border-0 last:pb-0">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-1">
                      <div>
                        {i === 0 && <Label>Àrea</Label>}
                        <input className={inputCls()} value={row.area} onChange={e => updateTrim(q, i, "area", e.target.value)} placeholder="Àrea…" />
                      </div>
                      <div>
                        {i === 0 && <Label>Objectiu</Label>}
                        <input className={inputCls()} value={row.objectiu} onChange={e => updateTrim(q, i, "objectiu", e.target.value)} placeholder="Objectiu…" />
                      </div>
                      <div>
                        {i === 0 && <Label>Descripció</Label>}
                        <input className={inputCls()} value={row.descripcio} onChange={e => updateTrim(q, i, "descripcio", e.target.value)} placeholder="Descripció…" />
                      </div>
                    </div>
                    <div className={i === 0 ? "pt-5" : "pt-0"}>
                      <RemoveBtn onClick={() => removeTrim(q, i)} />
                    </div>
                  </div>
                </div>
              ))}
              <AddBtn onClick={() => addTrim(q)} label="Afegir objectiu" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pb-8">
        <div className={`text-sm text-emerald-600 font-medium transition-opacity duration-300 ${saved ? "opacity-100" : "opacity-0"}`}>
          ✓ Objectius guardats
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="px-6 py-2.5 bg-[#8E0E1A] text-white rounded-lg text-sm font-semibold hover:bg-[#7a0b16] disabled:opacity-60 transition-colors"
        >
          {isPending ? "Guardant…" : "Guardar objectius"}
        </button>
      </div>
    </div>
  );
}
