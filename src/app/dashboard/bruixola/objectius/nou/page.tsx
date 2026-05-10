"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveObjectiu, generarObjectiuSMART } from "@/app/actions/bruixola";

const CARD    = "#FFFFFF";
const SURFACE = "#F9FAFB";
const BORDER  = "#E5E7EB";
const BORDER2 = "#D1D5DB";
const TEXT    = "#111827";
const DIM     = "#6B7280";
const LABEL   = "#9CA3AF";
const GOLD    = "#B45309";
const BLUE    = "#1D4ED8";
const GREEN   = "#15803D";
const RED     = "#DC2626";
const AMBER   = "#D97706";

const ESTAT_OPTS = ["actiu", "pendent", "bloquejat", "desviat", "assolit", "cancelat"];
const TIPUS_OPTS = ["anual", "trimestral", "mensual"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: LABEL }}>{label}</p>
      {children}
    </div>
  );
}

function DInput({ name, value, onChange, placeholder, type = "text" }: {
  name: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input name={name} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type}
      className="w-full outline-none text-[13px] font-medium rounded-lg px-3 py-2"
      style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER2}`, color: TEXT }}
      onFocus={e => (e.target.style.borderColor = GOLD)}
      onBlur={e => (e.target.style.borderColor = BORDER2)} />
  );
}

function DTextarea({ name, value, onChange, placeholder, rows = 3 }: {
  name: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea name={name} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="w-full outline-none resize-none text-[12px] leading-relaxed rounded-lg px-3 py-2"
      style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER2}`, color: TEXT }}
      onFocus={e => (e.target.style.borderColor = GOLD)}
      onBlur={e => (e.target.style.borderColor = BORDER2)} />
  );
}

function Scale5({ name, label, value, onChange, colorFn }: {
  name: string; label: string; value: number | null; onChange: (v: number) => void;
  colorFn?: (n: number) => string;
}) {
  const defColor = (n: number) => n >= 4 ? RED : n === 3 ? AMBER : LABEL;
  const getC = colorFn ?? defColor;
  return (
    <div className="flex items-center gap-3">
      <p className="text-[11px] w-32 shrink-0" style={{ color: TEXT }}>{label}</p>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" onClick={() => onChange(n)}
            className="w-7 h-7 rounded-lg text-[10px] font-bold transition-all"
            style={{
              backgroundColor: value === n ? getC(n) : SURFACE,
              border: `1px solid ${value === n ? getC(n) : BORDER2}`,
              color: value === n ? "#FFFFFF" : DIM,
            }}>
            {n}
          </button>
        ))}
      </div>
      <input type="hidden" name={name} value={value ?? ""} />
    </div>
  );
}

export default function NouObjectiuPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isAI, startAITransition] = useTransition();
  const [ideaIA, setIdeaIA] = useState("");
  const [aiError, setAiError] = useState("");

  const [titol, setTitol]           = useState("");
  const [descripcio, setDescripcio] = useState("");
  const [tipus, setTipus]           = useState("trimestral");
  const [any, setAny]               = useState(String(new Date().getFullYear()));
  const [trimestre, setTrimestre]   = useState("2");
  const [estat, setEstat]           = useState("actiu");
  const [metrica, setMetrica]       = useState("");
  const [valorObj, setValorObj]     = useState("");
  const [dataObj, setDataObj]       = useState("");
  const [prioritat, setPrioritat]   = useState<number | null>(3);
  const [impacte, setImpacte]       = useState<number | null>(null);
  const [urgencia, setUrgencia]     = useState<number | null>(null);
  const [esforc, setEsforc]         = useState<number | null>(null);
  const [seguentAccio, setSeguentAccio] = useState("");
  const [notes, setNotes]           = useState("");

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (prioritat != null) fd.set("prioritat", String(prioritat));
    if (impacte != null) fd.set("impacte", String(impacte));
    if (urgencia != null) fd.set("urgencia", String(urgencia));
    if (esforc != null) fd.set("esforc", String(esforc));
    startTransition(async () => {
      const { id } = await saveObjectiu(fd);
      router.push(`/dashboard/bruixola/objectius/${id}`);
    });
  }

  function handleAI() {
    if (!ideaIA.trim()) return;
    setAiError("");
    startAITransition(async () => {
      try {
        const result = await generarObjectiuSMART(ideaIA);
        if (result.problema) {
          setAiError(result.problema);
          return;
        }
        if (result.titol) setTitol(result.titol);
        if (result.descripcio) setDescripcio(result.descripcio);
        if (result.metrica) setMetrica(result.metrica);
        if (result.valor_objectiu != null) setValorObj(String(result.valor_objectiu));
        if (result.data_objectiu) setDataObj(result.data_objectiu);
        if (result.prioritat) setPrioritat(result.prioritat);
        if (result.impacte) setImpacte(result.impacte);
        if (result.esforc) setEsforc(result.esforc);
        if (result.seguent_accio) setSeguentAccio(result.seguent_accio);
        setIdeaIA("");
      } catch (err) {
        setAiError(err instanceof Error ? err.message : "Error IA");
      }
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-5 md:px-8 py-10 space-y-6">

      <div className="flex items-center gap-3">
        <Link href="/dashboard/bruixola/objectius" className="text-[10px] font-bold uppercase tracking-[0.2em] hover:opacity-70" style={{ color: LABEL }}>
          ← Objectius
        </Link>
      </div>

      <div>
        <h1 className="text-[24px] font-black" style={{ color: TEXT }}>Nou Objectiu</h1>
        <p className="text-[11px] mt-1" style={{ color: DIM }}>Defineix un objectiu mesurable i executable.</p>
      </div>

      {/* IA SMART helper */}
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${GOLD}30`, backgroundColor: CARD }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: `${GOLD}08`, borderBottom: `1px solid ${GOLD}20` }}>
          <div className="w-0.5 h-3 rounded-full" style={{ backgroundColor: GOLD }} />
          <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: GOLD }}>Convertir idea en objectiu SMART</p>
        </div>
        <div className="p-4 space-y-3">
          <textarea
            value={ideaIA} onChange={e => setIdeaIA(e.target.value)}
            placeholder="Escriu la idea o intenció en llenguatge natural… (ej: &quot;Volem créixer a Orient Mitjà&quot;)"
            rows={2}
            className="w-full outline-none resize-none text-[12px] leading-relaxed rounded-lg px-3 py-2"
            style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER2}`, color: TEXT }}
          />
          {aiError && <p className="text-[10px]" style={{ color: RED }}>{aiError}</p>}
          <button type="button" onClick={handleAI} disabled={!ideaIA.trim() || isAI}
            className="px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all disabled:opacity-40 hover:opacity-80"
            style={{ backgroundColor: `${GOLD}20`, color: GOLD, border: `1px solid ${GOLD}40` }}>
            {isAI ? <span className="flex items-center gap-1.5"><span className="animate-spin">◌</span> Processant…</span> : "Generar objectiu SMART →"}
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-5">

        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, backgroundColor: CARD }}>
          <div className="px-4 py-3" style={{ backgroundColor: SURFACE, borderBottom: `1px solid ${BORDER}` }}>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: GOLD }}>Definició</p>
          </div>
          <div className="p-5 space-y-4">
            <Field label="Títol executiu *">
              <DInput name="titol" value={titol} onChange={setTitol} placeholder="Objectiu clar i mesurable…" />
            </Field>
            <Field label="Descripció">
              <DTextarea name="descripcio" value={descripcio} onChange={setDescripcio} placeholder="Context i motivació estratègica…" />
            </Field>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="Tipus">
                <select name="tipus" value={tipus} onChange={e => setTipus(e.target.value)}
                  className="w-full outline-none text-[12px] rounded-lg px-3 py-2"
                  style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER2}`, color: TEXT }}>
                  {TIPUS_OPTS.map(t => <option key={t} value={t} style={{ backgroundColor: CARD }}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </Field>
              <Field label="Any">
                <DInput name="any" value={any} onChange={setAny} type="number" />
              </Field>
              {tipus === "trimestral" && (
                <Field label="Trimestre">
                  <select name="trimestre" value={trimestre} onChange={e => setTrimestre(e.target.value)}
                    className="w-full outline-none text-[12px] rounded-lg px-3 py-2"
                    style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER2}`, color: TEXT }}>
                    {["1","2","3","4"].map(t => <option key={t} value={t} style={{ backgroundColor: CARD }}>Q{t}</option>)}
                  </select>
                </Field>
              )}
            </div>
            <Field label="Estat">
              <div className="flex flex-wrap gap-2">
                {ESTAT_OPTS.map(e => (
                  <button key={e} type="button" onClick={() => setEstat(e)}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                    style={{ border: `1px solid ${estat === e ? BLUE : BORDER}`, backgroundColor: estat === e ? `${BLUE}18` : SURFACE, color: estat === e ? BLUE : LABEL }}>
                    {e.charAt(0).toUpperCase() + e.slice(1)}
                  </button>
                ))}
              </div>
              <input type="hidden" name="estat" value={estat} />
            </Field>
          </div>
        </div>

        {/* Mètrica */}
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, backgroundColor: CARD }}>
          <div className="px-4 py-3" style={{ backgroundColor: SURFACE, borderBottom: `1px solid ${BORDER}` }}>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: BLUE }}>Mètrica</p>
          </div>
          <div className="p-5 space-y-4">
            <Field label="Mètrica de mesura">
              <DInput name="metrica" value={metrica} onChange={setMetrica} placeholder="ej: leads, €, clients, %, dies…" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor objectiu">
                <DInput name="valor_objectiu" value={valorObj} onChange={setValorObj} type="number" placeholder="0" />
              </Field>
              <Field label="Data límit">
                <DInput name="data_objectiu" value={dataObj} onChange={setDataObj} type="date" />
              </Field>
            </div>
          </div>
        </div>

        {/* Prioritats */}
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, backgroundColor: CARD }}>
          <div className="px-4 py-3" style={{ backgroundColor: SURFACE, borderBottom: `1px solid ${BORDER}` }}>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: AMBER }}>Priorització</p>
          </div>
          <div className="p-5 space-y-3">
            <Scale5 name="prioritat" label="Prioritat" value={prioritat} onChange={setPrioritat} />
            <Scale5 name="impacte" label="Impacte" value={impacte} onChange={setImpacte} colorFn={n => n >= 4 ? GREEN : n >= 3 ? GOLD : LABEL} />
            <Scale5 name="urgencia" label="Urgència" value={urgencia} onChange={setUrgencia} />
            <Scale5 name="esforc" label="Esforç" value={esforc} onChange={setEsforc} colorFn={n => n >= 4 ? AMBER : n >= 3 ? GOLD : GREEN} />
          </div>
        </div>

        {/* Execució */}
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, backgroundColor: CARD }}>
          <div className="px-4 py-3" style={{ backgroundColor: SURFACE, borderBottom: `1px solid ${BORDER}` }}>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: GREEN }}>Execució</p>
          </div>
          <div className="p-5 space-y-4">
            <Field label="Següent acció">
              <DInput name="seguent_accio" value={seguentAccio} onChange={setSeguentAccio} placeholder="Primera acció concreta i immediata…" />
            </Field>
            <Field label="Notes">
              <DTextarea name="notes" value={notes} onChange={setNotes} placeholder="Context addicional, riscos, dependències…" />
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/dashboard/bruixola/objectius"
            className="px-5 py-2.5 rounded-xl text-[11px] font-semibold"
            style={{ backgroundColor: SURFACE, color: DIM, border: `1px solid ${BORDER2}` }}>
            Cancel·lar
          </Link>
          <button type="submit" disabled={!titol || isPending}
            className="px-6 py-2.5 rounded-xl text-[11px] font-bold transition-all disabled:opacity-40 hover:opacity-80"
            style={{ backgroundColor: GOLD, color: "#FFFFFF" }}>
            {isPending ? "Guardant…" : "Crear objectiu"}
          </button>
        </div>
      </form>
    </div>
  );
}
