"use client";

import { useState, useTransition } from "react";
import { savePlanificacio } from "@/app/actions/diario-planificacio";
import { DEFAULT_CARTA } from "@/lib/diario-constants";

type CartaData = typeof DEFAULT_CARTA;

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

function TextInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full text-sm text-[#0A0A0A] placeholder-[#D1D5DB] bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A] transition-colors"
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
    <div className="space-y-4">
      <Card title="Context de la carta">
        <TextArea value={context} onChange={setContext} rows={3} placeholder="Aquesta carta és…" />
      </Card>

      <Card title="Les 3 lliçons del 2025">
        {lliçons.map((ll, i) => (
          <div key={i} className="space-y-2 pb-3 border-b border-[#F3F4F6] last:border-0 last:pb-0">
            <p className="text-xs font-semibold text-[#8E0E1A]">Lliçó {ll.num}</p>
            <div>
              <Label>Aprenentatge</Label>
              <TextArea
                value={ll.aprenentatge}
                onChange={v => setLliçons(prev => prev.map((x, j) => j === i ? { ...x, aprenentatge: v } : x))}
                rows={2}
                placeholder="Que vaig aprendre…"
              />
            </div>
            <div>
              <Label>Impacte</Label>
              <TextArea
                value={ll.impacte}
                onChange={v => setLliçons(prev => prev.map((x, j) => j === i ? { ...x, impacte: v } : x))}
                rows={2}
                placeholder="Com em va afectar…"
              />
            </div>
          </div>
        ))}
      </Card>

      <Card title="Focus 2026 · Els 3 compromisos clau">
        {focus2026.map((f, i) => (
          <div key={i} className="space-y-2 pb-3 border-b border-[#F3F4F6] last:border-0 last:pb-0">
            <p className="text-xs font-semibold text-[#8E0E1A]">Compromís {f.num}</p>
            <div>
              <Label>Compromís</Label>
              <TextInput
                value={f.compromis}
                onChange={v => setFocus2026(prev => prev.map((x, j) => j === i ? { ...x, compromis: v } : x))}
                placeholder="Nom del compromís…"
              />
            </div>
            <div>
              <Label>Descripció</Label>
              <TextInput
                value={f.descripcio}
                onChange={v => setFocus2026(prev => prev.map((x, j) => j === i ? { ...x, descripcio: v } : x))}
                placeholder="Com el portaré a terme…"
              />
            </div>
          </div>
        ))}
      </Card>

      <Card title="Frase d'autoexigència">
        <TextInput value={fraseAuto} onChange={setFraseAuto} placeholder="La meva missió…" />
      </Card>

      <Card title="Declaració final">
        <TextArea value={declaracio} onChange={setDeclaracio} rows={4} placeholder="El 2026 serà…" />
      </Card>

      <Card title="Data">
        <TextInput value={data} onChange={setData} placeholder="DD/MM/YYYY" />
      </Card>

      <div className="flex items-center justify-between pb-8">
        <div className={`text-sm text-emerald-600 font-medium transition-opacity duration-300 ${saved ? "opacity-100" : "opacity-0"}`}>
          ✓ Carta guardada
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="px-6 py-2.5 bg-[#8E0E1A] text-white rounded-lg text-sm font-semibold hover:bg-[#7a0b16] disabled:opacity-60 transition-colors"
        >
          {isPending ? "Guardant…" : "Guardar carta"}
        </button>
      </div>
    </div>
  );
}
