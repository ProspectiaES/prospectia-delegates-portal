"use client";

import { useState, useTransition } from "react";
import { savePlanificacio } from "@/app/actions/diario-planificacio";
import { DEFAULT_MISSIO } from "@/lib/diario-constants";

type MissioData = typeof DEFAULT_MISSIO;

// ─── Shared primitives ────────────────────────────────────────────────────────

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-4 pt-2 pb-1">
      <span className="text-[10px] font-bold text-[#C0C0C0] uppercase tracking-[0.15em] whitespace-nowrap">{title}</span>
      <div className="flex-1 h-px bg-[#F0F0F0]" />
    </div>
  );
}

const descTextarea = "w-full text-[13px] text-[#5A5A5A] bg-transparent border-0 outline-none resize-none leading-relaxed placeholder:text-[#DCDCDC]";

function BlockCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#F0F0F0] shadow-[0_1px_4px_rgba(0,0,0,0.04)] px-5 py-4 space-y-1">
      {children}
    </div>
  );
}

function RolCard({ rol, children }: { rol: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#F0F0F0] shadow-[0_1px_4px_rgba(0,0,0,0.04)] px-5 pt-4 pb-3">
      <p className="text-[10px] font-bold text-[#8E0E1A]/50 uppercase tracking-[0.15em] mb-2">{rol}</p>
      {children}
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function MissioForm({ initial }: { initial: MissioData }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [statement, setStatement] = useState(initial.statement);
  const [professional, setProfessional] = useState(initial.professional);
  const [pare, setPare] = useState(initial.pare);
  const [amics, setAmics] = useState(initial.amics);
  const [politic, setPolitic] = useState(initial.politic);
  const [civic, setCivic] = useState(initial.civic);
  const [marit, setMarit] = useState(initial.marit);
  const [reflexioCoherent, setReflexioCoherent] = useState(initial.reflexio_coherent);
  const [reflexioDesviat, setReflexioDesviat] = useState(initial.reflexio_desviat);
  const [reflexioAccions, setReflexioAccions] = useState(initial.reflexio_accions);
  const [frase, setFrase] = useState(initial.frase);

  function handleSave() {
    startTransition(async () => {
      await savePlanificacio("missio", 2026, {
        statement, professional, pare, amics, politic, civic, marit,
        reflexio_coherent: reflexioCoherent,
        reflexio_desviat: reflexioDesviat,
        reflexio_accions: reflexioAccions,
        frase,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <div className="space-y-3">

      {/* Statement */}
      <SectionDivider title="Propòsit central" />
      <div className="bg-white rounded-2xl border border-[#F0F0F0] shadow-[0_1px_4px_rgba(0,0,0,0.04)] px-5 py-4">
        <textarea
          value={statement}
          onChange={e => setStatement(e.target.value)}
          rows={3}
          className="w-full text-[15px] font-semibold text-[#0A0A0A] bg-transparent border-0 outline-none resize-none leading-relaxed placeholder:text-[#DCDCDC] placeholder:font-normal"
          placeholder="Sóc…"
        />
      </div>

      {/* Rols */}
      <SectionDivider title="Rols vitals" />
      <div className="space-y-2">
        {([
          ["Professional", professional, setProfessional],
          ["Pare", pare, setPare],
          ["Marit", marit, setMarit],
          ["Amics", amics, setAmics],
          ["Polític", politic, setPolitic],
          ["Cívic", civic, setCivic],
        ] as const).map(([rol, val, setVal]) => (
          <RolCard key={rol} rol={rol}>
            <textarea
              value={val}
              onChange={e => (setVal as (v: string) => void)(e.target.value)}
              rows={3}
              className={descTextarea}
              placeholder={`Com vull ser com a ${rol.toLowerCase()}…`}
            />
          </RolCard>
        ))}
      </div>

      {/* Reflexió */}
      <SectionDivider title="Reflexió de coherència" />
      <div className="space-y-2">
        <RolCard rol="On soc coherent">
          <textarea
            value={reflexioCoherent}
            onChange={e => setReflexioCoherent(e.target.value)}
            rows={2}
            className={descTextarea}
            placeholder="On visc d'acord amb la meva missió…"
          />
        </RolCard>
        <RolCard rol="On m'he desviat">
          <textarea
            value={reflexioDesviat}
            onChange={e => setReflexioDesviat(e.target.value)}
            rows={2}
            className={descTextarea}
            placeholder="On m'he allunyat…"
          />
        </RolCard>
        <RolCard rol="Accions correctives">
          <textarea
            value={reflexioAccions}
            onChange={e => setReflexioAccions(e.target.value)}
            rows={2}
            className={descTextarea}
            placeholder="Que faré diferent…"
          />
        </RolCard>
      </div>

      {/* Frase */}
      <SectionDivider title="Frase de la missió" />
      <BlockCard>
        <input
          type="text"
          value={frase}
          onChange={e => setFrase(e.target.value)}
          className="w-full text-[15px] font-semibold text-[#0A0A0A] bg-transparent border-0 border-b border-transparent hover:border-[#E8E8E8] focus:border-[#8E0E1A]/40 outline-none pb-1 transition-colors placeholder:text-[#DCDCDC] placeholder:font-normal"
          placeholder="La meva frase guia…"
        />
      </BlockCard>

      {/* Save */}
      <div className="flex items-center justify-between pt-4 pb-8">
        <span className={`text-[12px] text-emerald-600 font-medium transition-opacity duration-300 ${saved ? "opacity-100" : "opacity-0"}`}>
          ✓ Missió guardada
        </span>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="px-5 py-2 bg-[#0A0A0A] text-white rounded-xl text-[13px] font-semibold hover:bg-[#8E0E1A] disabled:opacity-40 transition-colors"
        >
          {isPending ? "Guardant…" : "Guardar missió"}
        </button>
      </div>
    </div>
  );
}
