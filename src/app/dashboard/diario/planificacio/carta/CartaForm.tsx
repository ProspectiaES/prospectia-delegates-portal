"use client";

import { useState, useTransition } from "react";
import { savePlanificacio } from "@/app/actions/diario-planificacio";
import { DEFAULT_CARTA } from "@/lib/diario-constants";

type CartaData = typeof DEFAULT_CARTA;

// ─── Shared primitives ────────────────────────────────────────────────────────

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-4 pt-2 pb-1">
      <span className="text-[10px] font-bold text-[#C0C0C0] uppercase tracking-[0.15em] whitespace-nowrap">{title}</span>
      <div className="flex-1 h-px bg-[#F0F0F0]" />
    </div>
  );
}

const titleInput = "w-full text-[15px] font-semibold text-[#0A0A0A] bg-transparent border-0 border-b border-transparent hover:border-[#E8E8E8] focus:border-[#8E0E1A]/40 outline-none pb-1 transition-colors placeholder:text-[#DCDCDC] placeholder:font-normal";
const descTextarea = "w-full mt-1.5 text-[13px] text-[#5A5A5A] bg-transparent border-0 outline-none resize-none leading-relaxed placeholder:text-[#DCDCDC]";

function BlockCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#F0F0F0] shadow-[0_1px_4px_rgba(0,0,0,0.04)] px-5 pt-4 pb-4 space-y-3">
      {children}
    </div>
  );
}

function NumCard({ num, children }: { num: number; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#F0F0F0] shadow-[0_1px_4px_rgba(0,0,0,0.04)] px-5 pt-4 pb-3">
      <div className="flex items-start gap-3">
        <span className="text-[11px] font-black text-[#8E0E1A]/40 mt-0.5 w-5 shrink-0 select-none">
          {String(num).padStart(2, "0")}
        </span>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function CartaForm({ initial }: { initial: CartaData }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [context, setContext] = useState(initial.context);
  const [lliçons, setLliçons] = useState(initial.lliçons);
  const [focus2026, setFocus2026] = useState(initial.focus_2026);
  const [fraseAuto, setFraseAuto] = useState(initial.frase_autoexigencia);
  const [declaracio, setDeclaracio] = useState(initial.declaracio);
  const [data, setData] = useState(initial.data);

  function handleSave() {
    startTransition(async () => {
      await savePlanificacio("carta", 2026, {
        context,
        lliçons,
        focus_2026: focus2026,
        frase_autoexigencia: fraseAuto,
        declaracio,
        data,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <div className="space-y-3">

      {/* Context */}
      <SectionDivider title="Context de la carta" />
      <BlockCard>
        <textarea
          value={context}
          onChange={e => setContext(e.target.value)}
          rows={3}
          className={descTextarea}
          placeholder="Aquesta carta és…"
        />
      </BlockCard>

      {/* Lliçons */}
      <SectionDivider title="Les 3 lliçons del 2025" />
      <div className="space-y-2">
        {lliçons.map((ll, i) => (
          <NumCard key={i} num={ll.num}>
            <div className="space-y-2">
              <div>
                <p className="text-[11px] font-bold text-[#C0C0C0] uppercase tracking-[0.12em] mb-1">Aprenentatge</p>
                <textarea
                  value={ll.aprenentatge}
                  onChange={v => setLliçons(prev => prev.map((x, j) => j === i ? { ...x, aprenentatge: v.target.value } : x))}
                  rows={2}
                  className={descTextarea}
                  placeholder="Que vaig aprendre…"
                />
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#C0C0C0] uppercase tracking-[0.12em] mb-1">Impacte</p>
                <textarea
                  value={ll.impacte}
                  onChange={v => setLliçons(prev => prev.map((x, j) => j === i ? { ...x, impacte: v.target.value } : x))}
                  rows={2}
                  className={descTextarea}
                  placeholder="Com em va afectar…"
                />
              </div>
            </div>
          </NumCard>
        ))}
      </div>

      {/* Focus 2026 */}
      <SectionDivider title="Focus 2026 · Els 3 compromisos clau" />
      <div className="space-y-2">
        {focus2026.map((f, i) => (
          <NumCard key={i} num={f.num}>
            <div className="space-y-2">
              <input
                className={titleInput}
                value={f.compromis}
                onChange={v => setFocus2026(prev => prev.map((x, j) => j === i ? { ...x, compromis: v.target.value } : x))}
                placeholder="El compromís…"
              />
              <input
                className="w-full text-[13px] text-[#5A5A5A] bg-transparent border-0 outline-none placeholder:text-[#DCDCDC]"
                value={f.descripcio}
                onChange={v => setFocus2026(prev => prev.map((x, j) => j === i ? { ...x, descripcio: v.target.value } : x))}
                placeholder="Com el portaré a terme…"
              />
            </div>
          </NumCard>
        ))}
      </div>

      {/* Frase autoexigència */}
      <SectionDivider title="Frase d'autoexigència" />
      <BlockCard>
        <input
          className={titleInput}
          value={fraseAuto}
          onChange={e => setFraseAuto(e.target.value)}
          placeholder="La meva missió…"
        />
      </BlockCard>

      {/* Declaració */}
      <SectionDivider title="Declaració final" />
      <BlockCard>
        <textarea
          value={declaracio}
          onChange={e => setDeclaracio(e.target.value)}
          rows={4}
          className={descTextarea}
          placeholder="El 2026 serà…"
        />
      </BlockCard>

      {/* Data */}
      <SectionDivider title="Data" />
      <BlockCard>
        <input
          className="text-[13px] text-[#5A5A5A] bg-transparent border-0 outline-none placeholder:text-[#DCDCDC] w-full"
          value={data}
          onChange={e => setData(e.target.value)}
          placeholder="DD/MM/YYYY"
        />
      </BlockCard>

      {/* Save */}
      <div className="flex items-center justify-between pt-4 pb-8">
        <span className={`text-[12px] text-emerald-600 font-medium transition-opacity duration-300 ${saved ? "opacity-100" : "opacity-0"}`}>
          ✓ Carta guardada
        </span>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="px-5 py-2 bg-[#0A0A0A] text-white rounded-xl text-[13px] font-semibold hover:bg-[#8E0E1A] disabled:opacity-40 transition-colors"
        >
          {isPending ? "Guardant…" : "Guardar carta"}
        </button>
      </div>
    </div>
  );
}
