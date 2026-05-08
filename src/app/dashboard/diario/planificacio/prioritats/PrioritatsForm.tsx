"use client";

import { useState, useTransition } from "react";
import { savePlanificacio } from "@/app/actions/diario-planificacio";
import { DEFAULT_PRIORITATS } from "@/lib/diario-constants";

type PrioritatsData = typeof DEFAULT_PRIORITATS;
type Top5Row = { prioritat: string; intencio: string };
type ValorRow = { valor: string; practica: string };
type EliminarRow = { element: string; substitucio: string };

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">{children}</p>;
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

function inputCls() {
  return "w-full text-sm text-[#0A0A0A] placeholder-[#D1D5DB] bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A] transition-colors";
}

function Card({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-3">
      <h2 className="text-sm font-bold text-[#0A0A0A]">{title}</h2>
      {children}
    </div>
  );
}

export function PrioritatsForm({ initial }: { initial: PrioritatsData }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [top5, setTop5] = useState<Top5Row[]>(initial.top5);
  const [valors, setValors] = useState<ValorRow[]>(initial.valors);
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
    <div className="space-y-4">
      {/* TOP 5 */}
      <Card title="Top 5 Prioritats de l'any">
        {top5.map((row, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
            <div>
              {i === 0 && <Label>Prioritat</Label>}
              <input className={inputCls()} value={row.prioritat} onChange={e => setTop5(p => p.map((x, j) => j === i ? { ...x, prioritat: e.target.value } : x))} placeholder="Prioritat…" />
            </div>
            <div>
              {i === 0 && <Label>Intenció</Label>}
              <input className={inputCls()} value={row.intencio} onChange={e => setTop5(p => p.map((x, j) => j === i ? { ...x, intencio: e.target.value } : x))} placeholder="Per què importa…" />
            </div>
            <div className={i === 0 ? "pt-5" : ""}>
              <RemoveBtn onClick={() => setTop5(p => p.filter((_, j) => j !== i))} />
            </div>
          </div>
        ))}
        <AddBtn onClick={() => setTop5(p => [...p, { prioritat: "", intencio: "" }])} label="Afegir prioritat" />
      </Card>

      {/* VALORS */}
      <Card title="Valors en pràctica">
        {valors.map((row, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
            <div>
              {i === 0 && <Label>Valor</Label>}
              <input className={inputCls()} value={row.valor} onChange={e => setValors(p => p.map((x, j) => j === i ? { ...x, valor: e.target.value } : x))} placeholder="Valor…" />
            </div>
            <div>
              {i === 0 && <Label>Com ho posaré en pràctica</Label>}
              <input className={inputCls()} value={row.practica} onChange={e => setValors(p => p.map((x, j) => j === i ? { ...x, practica: e.target.value } : x))} placeholder="Acció concreta…" />
            </div>
            <div className={i === 0 ? "pt-5" : ""}>
              <RemoveBtn onClick={() => setValors(p => p.filter((_, j) => j !== i))} />
            </div>
          </div>
        ))}
        <AddBtn onClick={() => setValors(p => [...p, { valor: "", practica: "" }])} label="Afegir valor" />
      </Card>

      {/* ELIMINAR */}
      <Card title="Allò a eliminar">
        {eliminar.map((row, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
            <div>
              {i === 0 && <Label>Element a eliminar</Label>}
              <input className={inputCls()} value={row.element} onChange={e => setEliminar(p => p.map((x, j) => j === i ? { ...x, element: e.target.value } : x))} placeholder="Hàbit o patró…" />
            </div>
            <div>
              {i === 0 && <Label>Substitució</Label>}
              <input className={inputCls()} value={row.substitucio} onChange={e => setEliminar(p => p.map((x, j) => j === i ? { ...x, substitucio: e.target.value } : x))} placeholder="El reemplaçaré per…" />
            </div>
            <div className={i === 0 ? "pt-5" : ""}>
              <RemoveBtn onClick={() => setEliminar(p => p.filter((_, j) => j !== i))} />
            </div>
          </div>
        ))}
        <AddBtn onClick={() => setEliminar(p => [...p, { element: "", substitucio: "" }])} label="Afegir element" />
      </Card>

      {/* REFLEXIO */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-2">
        <h2 className="text-sm font-bold text-[#0A0A0A]">Reflexió final</h2>
        <textarea
          value={reflexio}
          onChange={e => setReflexio(e.target.value)}
          rows={3}
          className="w-full text-sm text-[#0A0A0A] placeholder-[#D1D5DB] bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A] transition-colors"
        />
      </div>

      <div className="flex items-center justify-between pb-8">
        <div className={`text-sm text-emerald-600 font-medium transition-opacity duration-300 ${saved ? "opacity-100" : "opacity-0"}`}>
          ✓ Prioritats guardades
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="px-6 py-2.5 bg-[#8E0E1A] text-white rounded-lg text-sm font-semibold hover:bg-[#7a0b16] disabled:opacity-60 transition-colors"
        >
          {isPending ? "Guardant…" : "Guardar prioritats"}
        </button>
      </div>
    </div>
  );
}
