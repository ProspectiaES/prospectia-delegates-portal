"use client";

import { useState, useTransition } from "react";
import { savePlanificacio } from "@/app/actions/diario-planificacio";
import { DEFAULT_INFLUENCIES } from "@/lib/diario-constants";

type InfluenciesData = typeof DEFAULT_INFLUENCIES;
type Referent = { nom: string; ambit: string; accio: string };
type Inspirador = { nom: string; ambit: string; aprenentatge: string };
type PersonaCuidar = { nom: string; relacio: string; accio: string };
type ADistancia = { nom: string; motiu: string; accio: string };

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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-3">
      <h2 className="text-sm font-bold text-[#0A0A0A]">{title}</h2>
      {children}
    </div>
  );
}

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
    <div className="space-y-4">
      {/* Referents */}
      <SectionCard title="Referents personals">
        {referents.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-start">
            <div>
              {i === 0 && <Label>Nom</Label>}
              <input className={inputCls()} value={r.nom} onChange={e => setReferents(p => p.map((x, j) => j === i ? { ...x, nom: e.target.value } : x))} placeholder="Nom…" />
            </div>
            <div>
              {i === 0 && <Label>Àmbit</Label>}
              <input className={inputCls()} value={r.ambit} onChange={e => setReferents(p => p.map((x, j) => j === i ? { ...x, ambit: e.target.value } : x))} placeholder="Àmbit…" />
            </div>
            <div>
              {i === 0 && <Label>Acció</Label>}
              <input className={inputCls()} value={r.accio} onChange={e => setReferents(p => p.map((x, j) => j === i ? { ...x, accio: e.target.value } : x))} placeholder="Acció…" />
            </div>
            <div className={i === 0 ? "pt-5" : ""}>
              <RemoveBtn onClick={() => setReferents(p => p.filter((_, j) => j !== i))} />
            </div>
          </div>
        ))}
        <AddBtn onClick={() => setReferents(p => [...p, { nom: "", ambit: "", accio: "" }])} label="Afegir referent" />
      </SectionCard>

      {/* Inspiradors */}
      <SectionCard title="Inspiradors intel·lectuals">
        {inspiradors.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-start">
            <div>
              {i === 0 && <Label>Nom</Label>}
              <input className={inputCls()} value={r.nom} onChange={e => setInspiradors(p => p.map((x, j) => j === i ? { ...x, nom: e.target.value } : x))} placeholder="Nom…" />
            </div>
            <div>
              {i === 0 && <Label>Àmbit</Label>}
              <input className={inputCls()} value={r.ambit} onChange={e => setInspiradors(p => p.map((x, j) => j === i ? { ...x, ambit: e.target.value } : x))} placeholder="Àmbit…" />
            </div>
            <div>
              {i === 0 && <Label>Aprenentatge</Label>}
              <input className={inputCls()} value={r.aprenentatge} onChange={e => setInspiradors(p => p.map((x, j) => j === i ? { ...x, aprenentatge: e.target.value } : x))} placeholder="Aprenentatge…" />
            </div>
            <div className={i === 0 ? "pt-5" : ""}>
              <RemoveBtn onClick={() => setInspiradors(p => p.filter((_, j) => j !== i))} />
            </div>
          </div>
        ))}
        <AddBtn onClick={() => setInspiradors(p => [...p, { nom: "", ambit: "", aprenentatge: "" }])} label="Afegir inspirador" />
      </SectionCard>

      {/* Persones a cuidar */}
      <SectionCard title="Persones a cuidar">
        {personesCuidar.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-start">
            <div>
              {i === 0 && <Label>Nom</Label>}
              <input className={inputCls()} value={r.nom} onChange={e => setPersonesCuidar(p => p.map((x, j) => j === i ? { ...x, nom: e.target.value } : x))} placeholder="Nom…" />
            </div>
            <div>
              {i === 0 && <Label>Relació</Label>}
              <input className={inputCls()} value={r.relacio} onChange={e => setPersonesCuidar(p => p.map((x, j) => j === i ? { ...x, relacio: e.target.value } : x))} placeholder="Relació…" />
            </div>
            <div>
              {i === 0 && <Label>Acció</Label>}
              <input className={inputCls()} value={r.accio} onChange={e => setPersonesCuidar(p => p.map((x, j) => j === i ? { ...x, accio: e.target.value } : x))} placeholder="Acció…" />
            </div>
            <div className={i === 0 ? "pt-5" : ""}>
              <RemoveBtn onClick={() => setPersonesCuidar(p => p.filter((_, j) => j !== i))} />
            </div>
          </div>
        ))}
        <AddBtn onClick={() => setPersonesCuidar(p => [...p, { nom: "", relacio: "", accio: "" }])} label="Afegir persona" />
      </SectionCard>

      {/* A distància */}
      <SectionCard title="A mantenir a distància">
        {aDistancia.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-start">
            <div>
              {i === 0 && <Label>Nom</Label>}
              <input className={inputCls()} value={r.nom} onChange={e => setADistancia(p => p.map((x, j) => j === i ? { ...x, nom: e.target.value } : x))} placeholder="Nom…" />
            </div>
            <div>
              {i === 0 && <Label>Motiu</Label>}
              <input className={inputCls()} value={r.motiu} onChange={e => setADistancia(p => p.map((x, j) => j === i ? { ...x, motiu: e.target.value } : x))} placeholder="Motiu…" />
            </div>
            <div>
              {i === 0 && <Label>Acció</Label>}
              <input className={inputCls()} value={r.accio} onChange={e => setADistancia(p => p.map((x, j) => j === i ? { ...x, accio: e.target.value } : x))} placeholder="Acció…" />
            </div>
            <div className={i === 0 ? "pt-5" : ""}>
              <RemoveBtn onClick={() => setADistancia(p => p.filter((_, j) => j !== i))} />
            </div>
          </div>
        ))}
        <AddBtn onClick={() => setADistancia(p => [...p, { nom: "", motiu: "", accio: "" }])} label="Afegir persona" />
      </SectionCard>

      {/* Objectiu relacional */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-2">
        <h2 className="text-sm font-bold text-[#0A0A0A]">Objectiu relacional</h2>
        <textarea
          value={objectiuRelacional}
          onChange={e => setObjectiuRelacional(e.target.value)}
          rows={2}
          className="w-full text-sm text-[#0A0A0A] placeholder-[#D1D5DB] bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A] transition-colors"
        />
      </div>

      <div className="flex items-center justify-between pb-8">
        <div className={`text-sm text-emerald-600 font-medium transition-opacity duration-300 ${saved ? "opacity-100" : "opacity-0"}`}>
          ✓ Influències guardades
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="px-6 py-2.5 bg-[#8E0E1A] text-white rounded-lg text-sm font-semibold hover:bg-[#7a0b16] disabled:opacity-60 transition-colors"
        >
          {isPending ? "Guardant…" : "Guardar influències"}
        </button>
      </div>
    </div>
  );
}
