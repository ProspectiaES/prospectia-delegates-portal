"use client";

import { useState, useTransition } from "react";
import { saveSetmana } from "@/app/actions/diario-planificacio";

const DIES = ["DLL", "DTS", "DMC", "DJS", "DVS", "DSB", "DMG"] as const;
type Dia = typeof DIES[number];

type Seguiment = Partial<Record<Dia, boolean>>;

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">{children}</p>;
}

function TextArea({ name, value, onChange, placeholder, rows = 3 }: {
  name: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      name={name}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full text-sm text-[#0A0A0A] placeholder-[#D1D5DB] bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A] transition-colors"
    />
  );
}

function Card({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-4">
      <div>
        <h2 className="text-sm font-bold text-[#0A0A0A]">{title}</h2>
        {subtitle && <p className="text-[11px] text-[#9CA3AF] mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function StarRating({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? 0 : n)}
          className={[
            "w-7 h-7 rounded-md flex items-center justify-center text-base transition-all hover:scale-110",
            value && n <= value ? "text-amber-400" : "text-[#D1D5DB] hover:text-amber-300",
          ].join(" ")}
        >
          ★
        </button>
      ))}
    </div>
  );
}

interface SetmanaFormProps {
  any: number;
  setmana: number;
  fraseSetmana: string;
  initial: Record<string, unknown> | null;
}

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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Frase de la setmana */}
      <div className="bg-white rounded-xl border-l-4 border-l-[#8E0E1A] border border-[#E5E7EB] px-4 py-3">
        <p className="text-[11px] font-semibold text-[#8E0E1A] uppercase tracking-wider mb-1">Frase de la setmana {setmana}</p>
        <p className="text-sm text-[#0A0A0A] italic">&ldquo;{fraseSetmana}&rdquo;</p>
      </div>

      {/* Inputs setmanals */}
      <Card title="Inputs de la setmana">
        <div>
          <Label>Miro</Label>
          <TextArea name="input_miro" value={inputMiro} onChange={setInputMiro} placeholder="Sèrie, pel·lícula, documental…" rows={2} />
        </div>
        <div>
          <Label>Llegeixo</Label>
          <TextArea name="input_llegeixo" value={inputLlegeixo} onChange={setInputLlegeixo} placeholder="Llibre, article, assaig…" rows={2} />
        </div>
        <div>
          <Label>Escolto</Label>
          <TextArea name="input_escolto" value={inputEscolto} onChange={setInputEscolto} placeholder="Podcast, música, conferència…" rows={2} />
        </div>
      </Card>

      {/* Millores */}
      <Card title="Millores del jo" subtitle="Àrees on treballaré aquesta setmana">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Com a pare</Label>
            <TextArea name="millora_pare" value={milloraPare} onChange={setMilloraPare} rows={2} placeholder="Acció concreta…" />
          </div>
          <div>
            <Label>Com a marit</Label>
            <TextArea name="millora_marit" value={milloraMarit} onChange={setMilloraMarit} rows={2} placeholder="Acció concreta…" />
          </div>
          <div>
            <Label>Personal</Label>
            <TextArea name="millora_personal" value={milloraPersonal} onChange={setMilloraPersonal} rows={2} placeholder="Acció concreta…" />
          </div>
          <div>
            <Label>Caràcter</Label>
            <TextArea name="millora_caracter" value={milloraCaracter} onChange={setMilloraCaracter} rows={2} placeholder="Acció concreta…" />
          </div>
          <div className="sm:col-span-2">
            <Label>Feina</Label>
            <TextArea name="millora_feina" value={milloraFeina} onChange={setMilloraFeina} rows={2} placeholder="Acció concreta…" />
          </div>
        </div>
      </Card>

      {/* Hàbits */}
      <Card title="Hàbits de la setmana">
        <div>
          <Label>Incloc / Reforço</Label>
          <TextArea name="habits_inclou" value={habitsInclou} onChange={setHabitsInclou} rows={2} placeholder="Hàbit que vull incloure o reforçar…" />
        </div>
        <div>
          <Label>Excloure / Eliminar</Label>
          <TextArea name="habits_exclou" value={habitsExclou} onChange={setHabitsExclou} rows={2} placeholder="Hàbit que vull eliminar…" />
        </div>
      </Card>

      {/* Seguiment diari */}
      <Card title="Seguiment diari" subtitle="Marca els dies que has complert les normes">
        <div className="flex flex-wrap gap-2">
          {DIES.map(dia => (
            <button
              key={dia}
              type="button"
              onClick={() => setSeguiment(prev => ({ ...prev, [dia]: !prev[dia] }))}
              className={[
                "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                seguiment[dia]
                  ? "bg-[#8E0E1A] border-[#8E0E1A] text-white"
                  : "bg-[#FAFAFA] border-[#E5E7EB] text-[#9CA3AF] hover:border-[#8E0E1A]/30",
              ].join(" ")}
            >
              {dia}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-[#9CA3AF]">
          {Object.values(seguiment).filter(Boolean).length} / {DIES.length} dies
        </p>
      </Card>

      {/* Resultat */}
      <Card title="Resultat de la setmana">
        <TextArea name="resultat" value={resultat} onChange={setResultat} rows={3}
          placeholder="Com ha anat la setmana? Que he après? Que repetiria?" />
      </Card>

      {/* Nota */}
      <Card title="Nota de la setmana">
        <div className="flex items-center gap-3">
          <StarRating value={nota} onChange={setNota} />
          {nota && <span className="text-sm font-bold text-[#8E0E1A]">{nota}/5</span>}
        </div>
      </Card>

      {/* Save */}
      <div className="flex items-center justify-between pb-8">
        <div className={`text-sm text-emerald-600 font-medium transition-opacity duration-300 ${saved ? "opacity-100" : "opacity-0"}`}>
          ✓ Setmana guardada
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 bg-[#8E0E1A] text-white rounded-lg text-sm font-semibold hover:bg-[#7a0b16] disabled:opacity-60 transition-colors"
        >
          {isPending ? "Guardant…" : "Guardar setmana"}
        </button>
      </div>
    </form>
  );
}
