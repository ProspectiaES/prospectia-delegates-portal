"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getObjectiu, saveObjectiu, deleteObjectiu } from "@/app/actions/bruixola";
import type { Objectiu } from "@/app/actions/bruixola";

const CARD    = "#0F1013";
const SURFACE = "#141720";
const BORDER  = "#1C2030";
const BORDER2 = "#252B3A";
const TEXT    = "#E8EAF0";
const DIM     = "#8892A0";
const LABEL   = "#525E70";
const GOLD    = "#C4A84A";
const BLUE    = "#4A7EC4";
const GREEN   = "#4A9C6A";
const RED     = "#C44A4A";
const AMBER   = "#C48040";

const ESTAT_COLOR: Record<string, string> = { actiu: BLUE, assolit: GREEN, bloquejat: RED, desviat: AMBER, cancelat: LABEL, pendent: DIM };
const ESTAT_OPTS = ["actiu", "pendent", "bloquejat", "desviat", "assolit", "cancelat"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: LABEL }}>{label}</p>
      {children}
    </div>
  );
}

function DInput({ name, value, onChange, type = "text", placeholder }: {
  name: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <input name={name} value={value} onChange={e => onChange(e.target.value)} type={type} placeholder={placeholder}
      className="w-full outline-none text-[13px] rounded-lg px-3 py-2"
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

export default function ObjectiuDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [o, setO] = useState<Objectiu | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [titol, setTitol]           = useState("");
  const [descripcio, setDescripcio] = useState("");
  const [tipus, setTipus]           = useState("trimestral");
  const [any, setAny]               = useState(String(new Date().getFullYear()));
  const [trimestre, setTrimestre]   = useState("2");
  const [estat, setEstat]           = useState("actiu");
  const [metrica, setMetrica]       = useState("");
  const [valorObj, setValorObj]     = useState("");
  const [valorAct, setValorAct]     = useState("");
  const [dataObj, setDataObj]       = useState("");
  const [progress, setProgress]     = useState(0);
  const [prioritat, setPrioritat]   = useState<number | null>(null);
  const [impacte, setImpacte]       = useState<number | null>(null);
  const [urgencia, setUrgencia]     = useState<number | null>(null);
  const [esforc, setEsforc]         = useState<number | null>(null);
  const [seguentAccio, setSeguentAccio] = useState("");
  const [decisio, setDecisio]       = useState("");
  const [risc, setRisc]             = useState("");
  const [notes, setNotes]           = useState("");

  useEffect(() => {
    getObjectiu(params.id as string).then(data => {
      if (!data) { router.push("/dashboard/bruixola/objectius"); return; }
      setO(data);
      setTitol(data.titol);
      setDescripcio(data.descripcio ?? "");
      setTipus(data.tipus);
      setAny(String(data.any ?? new Date().getFullYear()));
      setTrimestre(String(data.trimestre ?? 2));
      setEstat(data.estat);
      setMetrica(data.metrica ?? "");
      setValorObj(data.valor_objectiu != null ? String(data.valor_objectiu) : "");
      setValorAct(data.valor_actual != null ? String(data.valor_actual) : "");
      setDataObj(data.data_objectiu ?? "");
      setProgress(data.progress ?? 0);
      setPrioritat(data.prioritat);
      setImpacte(data.impacte);
      setUrgencia(data.urgencia);
      setEsforc(data.esforc);
      setSeguentAccio(data.seguent_accio ?? "");
      setDecisio(data.decisio_pendent ?? "");
      setRisc(data.risc_text ?? "");
      setNotes(data.notes ?? "");
      setLoading(false);
    });
  }, [params.id, router]);

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("id", params.id as string);
    if (prioritat != null) fd.set("prioritat", String(prioritat));
    if (impacte != null) fd.set("impacte", String(impacte));
    if (urgencia != null) fd.set("urgencia", String(urgencia));
    if (esforc != null) fd.set("esforc", String(esforc));
    fd.set("progress", String(progress));
    startTransition(async () => {
      await saveObjectiu(fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  function handleDelete() {
    if (!confirm(`Eliminar "${titol}"?`)) return;
    startTransition(async () => {
      await deleteObjectiu(params.id as string);
      router.push("/dashboard/bruixola/objectius");
    });
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-[12px]" style={{ color: LABEL }}>Carregant…</p>
    </div>
  );

  const c = ESTAT_COLOR[estat] ?? DIM;
  const pct = progress;

  return (
    <div className="max-w-2xl mx-auto px-5 md:px-8 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/bruixola/objectius" className="text-[10px] font-bold uppercase tracking-[0.2em] hover:opacity-70" style={{ color: LABEL }}>
          ← Objectius
        </Link>
        <button onClick={handleDelete} className="text-[10px] hover:opacity-70" style={{ color: LABEL }}>Eliminar</button>
      </div>

      {/* Progress hero */}
      <div className="rounded-2xl p-6" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
              style={{ backgroundColor: `${c}18`, color: c, border: `1px solid ${c}30` }}>
              {estat.charAt(0).toUpperCase() + estat.slice(1)}
            </span>
            <p className="text-[20px] font-black mt-2 leading-tight" style={{ color: TEXT }}>{titol}</p>
          </div>
          <p className="text-[32px] font-black tabular-nums shrink-0" style={{ color: c }}>{pct}%</p>
        </div>
        {/* Progress control */}
        <div className="space-y-2">
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: BORDER2 }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: c }} />
          </div>
          <input type="range" min="0" max="100" value={progress} onChange={e => setProgress(Number(e.target.value))}
            className="w-full accent-amber-500" style={{ accentColor: GOLD }} />
        </div>
        {o?.metrica && (
          <p className="text-[10px] mt-3" style={{ color: DIM }}>
            {o.valor_actual ?? "–"} / {o.valor_objectiu} {o.metrica}
          </p>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-5">

        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, backgroundColor: CARD }}>
          <div className="px-4 py-3" style={{ backgroundColor: SURFACE, borderBottom: `1px solid ${BORDER}` }}>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: GOLD }}>Definició</p>
          </div>
          <div className="p-5 space-y-4">
            <Field label="Títol"><DInput name="titol" value={titol} onChange={setTitol} /></Field>
            <Field label="Descripció"><DTextarea name="descripcio" value={descripcio} onChange={setDescripcio} rows={2} /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Tipus">
                <select name="tipus" value={tipus} onChange={e => setTipus(e.target.value)}
                  className="w-full outline-none text-[12px] rounded-lg px-2 py-2"
                  style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER2}`, color: TEXT }}>
                  {["anual","trimestral","mensual"].map(t => <option key={t} value={t} style={{ backgroundColor: CARD }}>{t}</option>)}
                </select>
              </Field>
              <Field label="Any"><DInput name="any" value={any} onChange={setAny} type="number" /></Field>
              {tipus === "trimestral" && (
                <Field label="Trimestre">
                  <select name="trimestre" value={trimestre} onChange={e => setTrimestre(e.target.value)}
                    className="w-full outline-none text-[12px] rounded-lg px-2 py-2"
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
                    className="px-3 py-1 rounded-lg text-[10px] font-semibold transition-all"
                    style={{ border: `1px solid ${estat === e ? ESTAT_COLOR[e] ?? DIM : BORDER}`, backgroundColor: estat === e ? `${ESTAT_COLOR[e] ?? DIM}18` : SURFACE, color: estat === e ? ESTAT_COLOR[e] ?? DIM : LABEL }}>
                    {e.charAt(0).toUpperCase() + e.slice(1)}
                  </button>
                ))}
              </div>
              <input type="hidden" name="estat" value={estat} />
            </Field>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, backgroundColor: CARD }}>
          <div className="px-4 py-3" style={{ backgroundColor: SURFACE, borderBottom: `1px solid ${BORDER}` }}>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: BLUE }}>Mètrica</p>
          </div>
          <div className="p-5 space-y-4">
            <Field label="Mètrica"><DInput name="metrica" value={metrica} onChange={setMetrica} placeholder="leads, €, clients…" /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Valor objectiu"><DInput name="valor_objectiu" value={valorObj} onChange={setValorObj} type="number" /></Field>
              <Field label="Valor actual"><DInput name="valor_actual" value={valorAct} onChange={setValorAct} type="number" /></Field>
              <Field label="Data límit"><DInput name="data_objectiu" value={dataObj} onChange={setDataObj} type="date" /></Field>
            </div>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, backgroundColor: CARD }}>
          <div className="px-4 py-3" style={{ backgroundColor: SURFACE, borderBottom: `1px solid ${BORDER}` }}>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: GREEN }}>Execució</p>
          </div>
          <div className="p-5 space-y-4">
            <Field label="Següent acció"><DInput name="seguent_accio" value={seguentAccio} onChange={setSeguentAccio} placeholder="Primera acció concreta…" /></Field>
            <Field label="Decisió pendent"><DInput name="decisio_pendent" value={decisio} onChange={setDecisio} placeholder="Decisió que s'ha de prendre…" /></Field>
            <Field label="Risc"><DInput name="risc_text" value={risc} onChange={setRisc} placeholder="Principal risc identificat…" /></Field>
            <Field label="Notes"><DTextarea name="notes" value={notes} onChange={setNotes} placeholder="Context addicional…" rows={2} /></Field>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] font-semibold transition-opacity" style={{ color: GREEN, opacity: saved ? 1 : 0 }}>✓ Guardat</span>
          <button type="submit" disabled={!titol || isPending}
            className="px-6 py-2.5 rounded-xl text-[11px] font-bold transition-all disabled:opacity-40 hover:opacity-80"
            style={{ backgroundColor: GOLD, color: "#09090B" }}>
            {isPending ? "Guardant…" : "Guardar canvis"}
          </button>
        </div>
      </form>
    </div>
  );
}
