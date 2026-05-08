"use client";

import { useState, useTransition } from "react";
import { saveSetmana } from "@/app/actions/diario-planificacio";

const DIES = ["DLL", "DTS", "DMC", "DJS", "DVS", "DSB", "DMG"] as const;
type Dia = typeof DIES[number];
type Seguiment = Partial<Record<Dia, boolean>>;

// ─── Shared primitives ────────────────────────────────────────────────────────

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-4 pt-2 pb-1">
      <span className="text-[10px] font-bold text-[#C0C0C0] uppercase tracking-[0.15em] whitespace-nowrap">{title}</span>
      <div className="flex-1 h-px bg-[#F0F0F0]" />
    </div>
  );
}

function BlockCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#F0F0F0] shadow-[0_1px_4px_rgba(0,0,0,0.04)] px-5 py-4 space-y-3">
      {children}
    </div>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold text-[#C0C0C0] uppercase tracking-[0.12em] mb-1">{children}</p>;
}

const areaTextarea = "w-full text-[13px] text-[#5A5A5A] bg-[#FAFAFA] rounded-xl px-4 py-3 border-0 outline-none resize-none leading-relaxed placeholder:text-[#DCDCDC]";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function str(v: unknown): string {
  if (typeof v === "string") return v;
  return "";
}

function num(v: unknown): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "string") { const n = parseInt(v, 10); return isNaN(n) ? null : n; }
  return null;
}

function parseSeguiment(v: unknown): Seguiment {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Seguiment;
  return {};
}

// ─── Star rating ──────────────────────────────────────────────────────────────

function StarRating({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? 0 : n)}
          className={`w-7 h-7 rounded flex items-center justify-center text-base transition-all hover:scale-110 ${value && n <= value ? "text-amber-400" : "text-[#E0E0E0] hover:text-amber-300"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

interface SetmanaFormProps {
  any: number;
  setmana: number;
  fraseSetmana: string;
  initial: Record<string, unknown> | null;
}

export function SetmanaForm({ any, setmana, fraseSetmana, initial }: SetmanaFormProps) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [inputMiro, setInputMiro] = useState(str(initial?.input_miro));
  const [inputLlegeixo, setInputLlegeixo] = useState(str(initial?.input_llegeixo));
  const [inputEscolto, setInputEscolto] = useState(str(initial?.input_escolto));
  const [milloraPare, setMilloraPare] = useState(str(initial?.millora_pare));
  const [milloraMarit, setMilloraMarit] = useState(str(initial?.millora_marit));
  const [milloraPersonal, setMilloraPersonal] = useState(str(initial?.millora_personal));
  const [milloraCaracter, setMilloraCaracter] = useState(str(initial?.millora_caracter));
  const [milloraFeina, setMilloraFeina] = useState(str(initial?.millora_feina));
  const [habitsInclou, setHabitsInclou] = useState(str(initial?.habits_inclou));
  const [habitsExclou, setHabitsExclou] = useState(str(initial?.habits_exclou));
  const [seguiment, setSeguiment] = useState<Seguiment>(parseSeguiment(initial?.seguiment));
  const [resultat, setResultat] = useState(str(initial?.resultat));
  const [nota, setNota] = useState<number | null>(num(initial?.nota));

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("year_num", String(any));
    fd.set("setmana", String(setmana));
    fd.set("frase_set", fraseSetmana);
    fd.set("input_miro", inputMiro);
    fd.set("input_llegeixo", inputLlegeixo);
    fd.set("input_escolto", inputEscolto);
    fd.set("millora_pare", milloraPare);
    fd.set("millora_marit", milloraMarit);
    fd.set("millora_personal", milloraPersonal);
    fd.set("millora_caracter", milloraCaracter);
    fd.set("millora_feina", milloraFeina);
    fd.set("habits_inclou", habitsInclou);
    fd.set("habits_exclou", habitsExclou);
    fd.set("seguiment", JSON.stringify(seguiment));
    fd.set("resultat", resultat);
    if (nota !== null) fd.set("nota", String(nota));

    startTransition(async () => {
      await saveSetmana(fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  const diesComplerts = Object.values(seguiment).filter(Boolean).length;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">

      {/* Frase */}
      <div className="bg-white rounded-2xl border-l-4 border-l-[#8E0E1A] border border-[#F0F0F0] shadow-[0_1px_4px_rgba(0,0,0,0.04)] px-5 py-4">
        <p className="text-[10px] font-bold text-[#8E0E1A] uppercase tracking-[0.15em] mb-1">Frase · setmana {setmana}</p>
        <p className="text-[14px] text-[#0A0A0A] italic leading-relaxed">&ldquo;{fraseSetmana}&rdquo;</p>
      </div>

      {/* Inputs */}
      <SectionDivider title="Inputs de la setmana" />
      <BlockCard>
        <div>
          <SubLabel>Miro</SubLabel>
          <textarea value={inputMiro} onChange={e => setInputMiro(e.target.value)} rows={2} className={areaTextarea} placeholder="Sèrie, pel·lícula, documental…" />
        </div>
        <div>
          <SubLabel>Llegeixo</SubLabel>
          <textarea value={inputLlegeixo} onChange={e => setInputLlegeixo(e.target.value)} rows={2} className={areaTextarea} placeholder="Llibre, article, assaig…" />
        </div>
        <div>
          <SubLabel>Escolto</SubLabel>
          <textarea value={inputEscolto} onChange={e => setInputEscolto(e.target.value)} rows={2} className={areaTextarea} placeholder="Podcast, música, conferència…" />
        </div>
      </BlockCard>

      {/* Millores */}
      <SectionDivider title="Millores del jo" />
      <BlockCard>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <SubLabel>Com a pare</SubLabel>
            <textarea value={milloraPare} onChange={e => setMilloraPare(e.target.value)} rows={2} className={areaTextarea} placeholder="Acció concreta…" />
          </div>
          <div>
            <SubLabel>Com a marit</SubLabel>
            <textarea value={milloraMarit} onChange={e => setMilloraMarit(e.target.value)} rows={2} className={areaTextarea} placeholder="Acció concreta…" />
          </div>
          <div>
            <SubLabel>Personal</SubLabel>
            <textarea value={milloraPersonal} onChange={e => setMilloraPersonal(e.target.value)} rows={2} className={areaTextarea} placeholder="Acció concreta…" />
          </div>
          <div>
            <SubLabel>Caràcter</SubLabel>
            <textarea value={milloraCaracter} onChange={e => setMilloraCaracter(e.target.value)} rows={2} className={areaTextarea} placeholder="Acció concreta…" />
          </div>
          <div className="sm:col-span-2">
            <SubLabel>Feina</SubLabel>
            <textarea value={milloraFeina} onChange={e => setMilloraFeina(e.target.value)} rows={2} className={areaTextarea} placeholder="Acció concreta…" />
          </div>
        </div>
      </BlockCard>

      {/* Hàbits */}
      <SectionDivider title="Hàbits de la setmana" />
      <BlockCard>
        <div>
          <SubLabel>Incloc · Reforço</SubLabel>
          <textarea value={habitsInclou} onChange={e => setHabitsInclou(e.target.value)} rows={2} className={areaTextarea} placeholder="Hàbit que vull incloure o reforçar…" />
        </div>
        <div>
          <SubLabel>Excloure · Eliminar</SubLabel>
          <textarea value={habitsExclou} onChange={e => setHabitsExclou(e.target.value)} rows={2} className={areaTextarea} placeholder="Hàbit que vull eliminar…" />
        </div>
      </BlockCard>

      {/* Seguiment */}
      <SectionDivider title="Seguiment diari" />
      <div className="bg-white rounded-2xl border border-[#F0F0F0] shadow-[0_1px_4px_rgba(0,0,0,0.04)] px-5 py-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {DIES.map(dia => (
            <button
              key={dia}
              type="button"
              onClick={() => setSeguiment(prev => ({ ...prev, [dia]: !prev[dia] }))}
              className={[
                "px-4 py-2 rounded-xl text-[12px] font-bold transition-all",
                seguiment[dia]
                  ? "bg-[#0A0A0A] text-white"
                  : "bg-[#FAFAFA] border border-[#F0F0F0] text-[#C0C0C0] hover:text-[#0A0A0A] hover:border-[#E0E0E0]",
              ].join(" ")}
            >
              {dia}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-[#C0C0C0]">
          {diesComplerts} / {DIES.length} dies complerts
        </p>
      </div>

      {/* Resultat */}
      <SectionDivider title="Resultat de la setmana" />
      <div className="bg-white rounded-2xl border border-[#F0F0F0] shadow-[0_1px_4px_rgba(0,0,0,0.04)] px-5 py-4">
        <textarea
          value={resultat}
          onChange={e => setResultat(e.target.value)}
          rows={3}
          className="w-full text-[13px] text-[#5A5A5A] bg-transparent border-0 outline-none resize-none leading-relaxed placeholder:text-[#DCDCDC]"
          placeholder="Com ha anat la setmana? Que he après? Que repetiria?"
        />
      </div>

      {/* Nota */}
      <SectionDivider title="Nota de la setmana" />
      <div className="bg-white rounded-2xl border border-[#F0F0F0] shadow-[0_1px_4px_rgba(0,0,0,0.04)] px-5 py-4 flex items-center gap-4">
        <StarRating value={nota} onChange={setNota} />
        {nota != null && nota > 0 && (
          <span className="text-[15px] font-bold text-[#0A0A0A]">{nota}/5</span>
        )}
      </div>

      {/* Save */}
      <div className="flex items-center justify-between pt-4 pb-8">
        <span className={`text-[12px] text-emerald-600 font-medium transition-opacity duration-300 ${saved ? "opacity-100" : "opacity-0"}`}>
          ✓ Setmana guardada
        </span>
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2 bg-[#0A0A0A] text-white rounded-xl text-[13px] font-semibold hover:bg-[#8E0E1A] disabled:opacity-40 transition-colors"
        >
          {isPending ? "Guardant…" : "Guardar setmana"}
        </button>
      </div>
    </form>
  );
}
