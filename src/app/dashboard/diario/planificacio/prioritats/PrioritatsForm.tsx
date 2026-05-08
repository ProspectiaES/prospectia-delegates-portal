"use client";

import { useState, useTransition } from "react";
import { savePlanificacio } from "@/app/actions/diario-planificacio";
import { DEFAULT_PRIORITATS } from "@/lib/diario-constants";

type PrioritatsData = typeof DEFAULT_PRIORITATS;
type Top5Row = { prioritat: string; intencio: string };
type ValorRow = { valor: string; practica: string };
type EliminarRow = { element: string; substitucio: string };

// ─── Shared primitives ────────────────────────────────────────────────────────

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-4 pt-2 pb-1">
      <span className="text-[10px] font-bold text-[#C0C0C0] uppercase tracking-[0.15em] whitespace-nowrap">{title}</span>
      <div className="flex-1 h-px bg-[#F0F0F0]" />
    </div>
  );
}

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

const titleInput = "w-full text-[15px] font-semibold text-[#0A0A0A] bg-transparent border-0 border-b border-transparent hover:border-[#E8E8E8] focus:border-[#8E0E1A]/40 outline-none pb-1 transition-colors placeholder:text-[#DCDCDC] placeholder:font-normal";
const descTextarea = "w-full mt-1.5 text-[13px] text-[#5A5A5A] bg-transparent border-0 outline-none resize-none leading-relaxed placeholder:text-[#DCDCDC]";

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

export function PrioritatsForm({ initial }: { initial: PrioritatsData }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [top5, setTop5]       = useState<Top5Row[]>(initial.top5);
  const [valors, setValors]   = useState<ValorRow[]>(initial.valors);
  const [eliminar, setEliminar] = useState<EliminarRow[]>(initial.eliminar);
  const [reflexio, setReflexio] = useState(initial.reflexio);

  function handleSave() {
    startTransition(async () => {
      await savePlanificacio("prioritats", 2026, { top5, valors, eliminar, reflexio });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <div className="space-y-3">

      {/* TOP 5 */}
      <SectionDivider title="Top 5 prioritats de l'any" />
      <div className="space-y-2">
        {top5.map((row, i) => (
          <ItemCard key={i} num={i + 1} onRemove={() => setTop5(p => p.filter((_, j) => j !== i))}>
            <input
              className={titleInput}
              value={row.prioritat}
              onChange={e => setTop5(p => p.map((x, j) => j === i ? { ...x, prioritat: e.target.value } : x))}
              placeholder="La prioritat…"
            />
            <textarea
              className={descTextarea}
              rows={2}
              value={row.intencio}
              onChange={e => setTop5(p => p.map((x, j) => j === i ? { ...x, intencio: e.target.value } : x))}
              placeholder="Per quin motiu és important per a tu…"
            />
          </ItemCard>
        ))}
        <AddBtn onClick={() => setTop5(p => [...p, { prioritat: "", intencio: "" }])} label="Afegir prioritat" />
      </div>

      {/* VALORS */}
      <SectionDivider title="Valors en pràctica" />
      <div className="space-y-2">
        {valors.map((row, i) => (
          <ItemCard key={i} num={i + 1} onRemove={() => setValors(p => p.filter((_, j) => j !== i))}>
            <input
              className={titleInput}
              value={row.valor}
              onChange={e => setValors(p => p.map((x, j) => j === i ? { ...x, valor: e.target.value } : x))}
              placeholder="El valor…"
            />
            <textarea
              className={descTextarea}
              rows={2}
              value={row.practica}
              onChange={e => setValors(p => p.map((x, j) => j === i ? { ...x, practica: e.target.value } : x))}
              placeholder="Com el posaré en pràctica cada dia…"
            />
          </ItemCard>
        ))}
        <AddBtn onClick={() => setValors(p => [...p, { valor: "", practica: "" }])} label="Afegir valor" />
      </div>

      {/* ELIMINAR */}
      <SectionDivider title="Allò a eliminar" />
      <div className="space-y-2">
        {eliminar.map((row, i) => (
          <ItemCard key={i} num={i + 1} onRemove={() => setEliminar(p => p.filter((_, j) => j !== i))}>
            <input
              className={titleInput}
              value={row.element}
              onChange={e => setEliminar(p => p.map((x, j) => j === i ? { ...x, element: e.target.value } : x))}
              placeholder="Hàbit, patró o situació…"
            />
            <textarea
              className={descTextarea}
              rows={2}
              value={row.substitucio}
              onChange={e => setEliminar(p => p.map((x, j) => j === i ? { ...x, substitucio: e.target.value } : x))}
              placeholder="El substituiré per…"
            />
          </ItemCard>
        ))}
        <AddBtn onClick={() => setEliminar(p => [...p, { element: "", substitucio: "" }])} label="Afegir element" />
      </div>

      {/* REFLEXIÓ */}
      <SectionDivider title="Reflexió final" />
      <div className="bg-white rounded-2xl border border-[#F0F0F0] shadow-[0_1px_4px_rgba(0,0,0,0.04)] px-5 py-4">
        <textarea
          value={reflexio}
          onChange={e => setReflexio(e.target.value)}
          rows={3}
          className="w-full text-[14px] text-[#0A0A0A] bg-transparent border-0 outline-none resize-none leading-relaxed placeholder:text-[#DCDCDC]"
          placeholder="El resum personal de les teves prioritats…"
        />
      </div>

      {/* SAVE */}
      <div className="flex items-center justify-between pt-4 pb-8">
        <span className={`text-[12px] text-emerald-600 font-medium transition-opacity duration-300 ${saved ? "opacity-100" : "opacity-0"}`}>
          ✓ Guardat
        </span>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="px-5 py-2 bg-[#0A0A0A] text-white rounded-xl text-[13px] font-semibold hover:bg-[#8E0E1A] disabled:opacity-40 transition-colors"
        >
          {isPending ? "Guardant…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}
