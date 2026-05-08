"use client";

import { useState, useTransition } from "react";
import { savePlanificacio } from "@/app/actions/diario-planificacio";
import { DEFAULT_INFLUENCIES } from "@/lib/diario-constants";

type InfluenciesData = typeof DEFAULT_INFLUENCIES;
type Referent = { nom: string; ambit: string; accio: string };
type Inspirador = { nom: string; ambit: string; aprenentatge: string };
type PersonaCuidar = { nom: string; relacio: string; accio: string };
type ADistancia = { nom: string; motiu: string; accio: string };

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
    <div className="bg-white rounded-2xl border border-[#F0F0F0] shadow-[0_1px_4px_rgba(0,0,0,0.04)] px-5 pt-4 pb-3">
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

const titleInput = "w-full text-[15px] font-semibold text-[#0A0A0A] bg-transparent border-0 border-b border-transparent hover:border-[#E8E8E8] focus:border-[#8E0E1A]/40 outline-none pb-1 transition-colors placeholder:text-[#DCDCDC] placeholder:font-normal";
const inlineInput = "text-[12px] text-[#5A5A5A] bg-transparent border-0 outline-none placeholder:text-[#DCDCDC] min-w-0 flex-1";

// ─── Main form ────────────────────────────────────────────────────────────────

export function InfluenciesForm({ initial }: { initial: InfluenciesData }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [referents, setReferents] = useState<Referent[]>(initial.referents);
  const [inspiradors, setInspiradors] = useState<Inspirador[]>(initial.inspiradors);
  const [personesCuidar, setPersonesCuidar] = useState<PersonaCuidar[]>(initial.persones_cuidar);
  const [aDistancia, setADistancia] = useState<ADistancia[]>(initial.a_distancia);
  const [objectiuRelacional, setObjectiuRelacional] = useState(initial.objectiu_relacional);

  function handleSave() {
    startTransition(async () => {
      await savePlanificacio("influencies", 2026, {
        referents,
        inspiradors,
        persones_cuidar: personesCuidar,
        a_distancia: aDistancia,
        objectiu_relacional: objectiuRelacional,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <div className="space-y-3">

      {/* Referents */}
      <SectionDivider title="Referents personals" />
      <div className="space-y-2">
        {referents.map((r, i) => (
          <ItemCard key={i} num={i + 1} onRemove={() => setReferents(p => p.filter((_, j) => j !== i))}>
            <input
              className={titleInput}
              value={r.nom}
              onChange={e => setReferents(p => p.map((x, j) => j === i ? { ...x, nom: e.target.value } : x))}
              placeholder="Nom…"
            />
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <input
                className={inlineInput}
                value={r.ambit}
                onChange={e => setReferents(p => p.map((x, j) => j === i ? { ...x, ambit: e.target.value } : x))}
                placeholder="Àmbit…"
              />
              <span className="text-[#E0E0E0] text-xs">·</span>
              <input
                className={inlineInput}
                value={r.accio}
                onChange={e => setReferents(p => p.map((x, j) => j === i ? { ...x, accio: e.target.value } : x))}
                placeholder="Acció a prendre…"
              />
            </div>
          </ItemCard>
        ))}
        <AddBtn onClick={() => setReferents(p => [...p, { nom: "", ambit: "", accio: "" }])} label="Afegir referent" />
      </div>

      {/* Inspiradors */}
      <SectionDivider title="Inspiradors intel·lectuals" />
      <div className="space-y-2">
        {inspiradors.map((r, i) => (
          <ItemCard key={i} num={i + 1} onRemove={() => setInspiradors(p => p.filter((_, j) => j !== i))}>
            <input
              className={titleInput}
              value={r.nom}
              onChange={e => setInspiradors(p => p.map((x, j) => j === i ? { ...x, nom: e.target.value } : x))}
              placeholder="Nom…"
            />
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <input
                className={inlineInput}
                value={r.ambit}
                onChange={e => setInspiradors(p => p.map((x, j) => j === i ? { ...x, ambit: e.target.value } : x))}
                placeholder="Àmbit…"
              />
              <span className="text-[#E0E0E0] text-xs">·</span>
              <input
                className={inlineInput}
                value={r.aprenentatge}
                onChange={e => setInspiradors(p => p.map((x, j) => j === i ? { ...x, aprenentatge: e.target.value } : x))}
                placeholder="Aprenentatge clau…"
              />
            </div>
          </ItemCard>
        ))}
        <AddBtn onClick={() => setInspiradors(p => [...p, { nom: "", ambit: "", aprenentatge: "" }])} label="Afegir inspirador" />
      </div>

      {/* Persones a cuidar */}
      <SectionDivider title="Persones a cuidar" />
      <div className="space-y-2">
        {personesCuidar.map((r, i) => (
          <ItemCard key={i} num={i + 1} onRemove={() => setPersonesCuidar(p => p.filter((_, j) => j !== i))}>
            <input
              className={titleInput}
              value={r.nom}
              onChange={e => setPersonesCuidar(p => p.map((x, j) => j === i ? { ...x, nom: e.target.value } : x))}
              placeholder="Nom…"
            />
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <input
                className={inlineInput}
                value={r.relacio}
                onChange={e => setPersonesCuidar(p => p.map((x, j) => j === i ? { ...x, relacio: e.target.value } : x))}
                placeholder="Relació…"
              />
              <span className="text-[#E0E0E0] text-xs">·</span>
              <input
                className={inlineInput}
                value={r.accio}
                onChange={e => setPersonesCuidar(p => p.map((x, j) => j === i ? { ...x, accio: e.target.value } : x))}
                placeholder="Acció concreta…"
              />
            </div>
          </ItemCard>
        ))}
        <AddBtn onClick={() => setPersonesCuidar(p => [...p, { nom: "", relacio: "", accio: "" }])} label="Afegir persona" />
      </div>

      {/* A distància */}
      <SectionDivider title="A mantenir a distància" />
      <div className="space-y-2">
        {aDistancia.map((r, i) => (
          <ItemCard key={i} num={i + 1} onRemove={() => setADistancia(p => p.filter((_, j) => j !== i))}>
            <input
              className={titleInput}
              value={r.nom}
              onChange={e => setADistancia(p => p.map((x, j) => j === i ? { ...x, nom: e.target.value } : x))}
              placeholder="Nom…"
            />
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <input
                className={inlineInput}
                value={r.motiu}
                onChange={e => setADistancia(p => p.map((x, j) => j === i ? { ...x, motiu: e.target.value } : x))}
                placeholder="Motiu…"
              />
              <span className="text-[#E0E0E0] text-xs">·</span>
              <input
                className={inlineInput}
                value={r.accio}
                onChange={e => setADistancia(p => p.map((x, j) => j === i ? { ...x, accio: e.target.value } : x))}
                placeholder="Com gestionar la distància…"
              />
            </div>
          </ItemCard>
        ))}
        <AddBtn onClick={() => setADistancia(p => [...p, { nom: "", motiu: "", accio: "" }])} label="Afegir persona" />
      </div>

      {/* Objectiu relacional */}
      <SectionDivider title="Objectiu relacional" />
      <div className="bg-white rounded-2xl border border-[#F0F0F0] shadow-[0_1px_4px_rgba(0,0,0,0.04)] px-5 py-4">
        <textarea
          value={objectiuRelacional}
          onChange={e => setObjectiuRelacional(e.target.value)}
          rows={2}
          className="w-full text-[13px] text-[#5A5A5A] bg-transparent border-0 outline-none resize-none leading-relaxed placeholder:text-[#DCDCDC]"
          placeholder="El meu objectiu relacional per al 2026…"
        />
      </div>

      {/* Save */}
      <div className="flex items-center justify-between pt-4 pb-8">
        <span className={`text-[12px] text-emerald-600 font-medium transition-opacity duration-300 ${saved ? "opacity-100" : "opacity-0"}`}>
          ✓ Influències guardades
        </span>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="px-5 py-2 bg-[#0A0A0A] text-white rounded-xl text-[13px] font-semibold hover:bg-[#8E0E1A] disabled:opacity-40 transition-colors"
        >
          {isPending ? "Guardant…" : "Guardar influències"}
        </button>
      </div>
    </div>
  );
}
