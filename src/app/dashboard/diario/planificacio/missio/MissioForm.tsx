"use client";

import { useState, useTransition } from "react";
import { savePlanificacio } from "@/app/actions/diario-planificacio";
import { DEFAULT_MISSIO } from "@/lib/diario-constants";

type MissioData = typeof DEFAULT_MISSIO;

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">{children}</p>;
}

function TextArea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full text-sm text-[#0A0A0A] placeholder-[#D1D5DB] bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A] transition-colors"
    />
  );
}

function Card({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-4">
      {title && <h2 className="text-sm font-bold text-[#0A0A0A]">{title}</h2>}
      {children}
    </div>
  );
}

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
    <div className="space-y-4">
      <Card title="Propòsit central">
        <TextArea value={statement} onChange={setStatement} rows={3} placeholder="Sóc…" />
      </Card>

      <Card title="Rols vitals">
        <div>
          <Label>Professional</Label>
          <TextArea value={professional} onChange={setProfessional} rows={3} />
        </div>
        <div>
          <Label>Pare</Label>
          <TextArea value={pare} onChange={setPare} rows={3} />
        </div>
        <div>
          <Label>Marit</Label>
          <TextArea value={marit} onChange={setMarit} rows={3} />
        </div>
        <div>
          <Label>Amics</Label>
          <TextArea value={amics} onChange={setAmics} rows={3} />
        </div>
        <div>
          <Label>Polític</Label>
          <TextArea value={politic} onChange={setPolitic} rows={3} />
        </div>
        <div>
          <Label>Cívic</Label>
          <TextArea value={civic} onChange={setCivic} rows={3} />
        </div>
      </Card>

      <Card title="Reflexió de coherència">
        <div>
          <Label>On soc coherent</Label>
          <TextArea value={reflexioCoherent} onChange={setReflexioCoherent} rows={2} placeholder="On visc d'acord amb la meva missió…" />
        </div>
        <div>
          <Label>On m&apos;he desviat</Label>
          <TextArea value={reflexioDesviat} onChange={setReflexioDesviat} rows={2} placeholder="On m'he allunyat…" />
        </div>
        <div>
          <Label>Accions correctives</Label>
          <TextArea value={reflexioAccions} onChange={setReflexioAccions} rows={2} placeholder="Que faré diferent…" />
        </div>
      </Card>

      <Card title="Frase de la missió">
        <input
          type="text"
          value={frase}
          onChange={e => setFrase(e.target.value)}
          className="w-full text-sm text-[#0A0A0A] placeholder-[#D1D5DB] bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A] transition-colors"
        />
      </Card>

      <div className="flex items-center justify-between pb-8">
        <div className={`text-sm text-emerald-600 font-medium transition-opacity duration-300 ${saved ? "opacity-100" : "opacity-0"}`}>
          ✓ Missió guardada
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="px-6 py-2.5 bg-[#8E0E1A] text-white rounded-lg text-sm font-semibold hover:bg-[#7a0b16] disabled:opacity-60 transition-colors"
        >
          {isPending ? "Guardant…" : "Guardar missió"}
        </button>
      </div>
    </div>
  );
}
