"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getProjecte, saveProjecte, deleteProjecte } from "@/app/actions/bruixola";
import type { Projecte } from "@/app/actions/bruixola";

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

const ESTAT_COLOR: Record<string, string> = { actiu: BLUE, completat: GREEN, congelat: LABEL, cancelat: RED, pendent: DIM };
const ESTAT_OPTS = ["actiu", "pendent", "congelat", "completat", "cancelat"];
const TIPUS_OPTS = ["estratègic", "operatiu", "innovació", "millora", "altres"];

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

function Scale5({ name, label, value, onChange, colorFn }: {
  name: string; label: string; value: number | null; onChange: (v: number) => void;
  colorFn?: (n: number) => string;
}) {
  const defColor = (n: number) => n >= 4 ? RED : n === 3 ? AMBER : LABEL;
  const getC = colorFn ?? defColor;
  return (
    <div className="flex items-center gap-3">
      <p className="text-[11px] w-36 shrink-0" style={{ color: TEXT }}>{label}</p>
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

export default function ProjecteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [p, setP] = useState<Projecte | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [nom, setNom]                   = useState("");
  const [descripcio, setDescripcio]     = useState("");
  const [tipus, setTipus]               = useState("estratègic");
  const [estat, setEstat]               = useState("actiu");
  const [dataInici, setDataInici]       = useState("");
  const [dataObj, setDataObj]           = useState("");
  const [progress, setProgress]         = useState(0);
  const [prioritat, setPrioritat]       = useState<number | null>(null);
  const [impacte, setImpacte]           = useState<number | null>(null);
  const [urgencia, setUrgencia]         = useState<number | null>(null);
  const [esforc, setEsforc]             = useState<number | null>(null);
  const [alineacio, setAlineacio]       = useState<number | null>(null);
  const [seguentAccio, setSeguentAccio] = useState("");
  const [decisio, setDecisio]           = useState("");
  const [risc, setRisc]                 = useState("");
  const [notes, setNotes]               = useState("");

  useEffect(() => {
    getProjecte(params.id as string).then(data => {
      if (!data) { router.push("/dashboard/bruixola/projectes"); return; }
      setP(data);
      setNom(data.nom);
      setDescripcio(data.descripcio ?? "");
      setTipus(data.tipus);
      setEstat(data.estat);
      setDataInici(data.data_inici ?? "");
      setDataObj(data.data_objectiu ?? "");
      setProgress(data.progress ?? 0);
      setPrioritat(data.prioritat);
      setImpacte(data.impacte);
      setUrgencia(data.urgencia);
      setEsforc(data.esforc);
      setAlineacio(data.alineacio_estrategica);
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
    if (impacte != null)   fd.set("impacte", String(impacte));
    if (urgencia != null)  fd.set("urgencia", String(urgencia));
    if (esforc != null)    fd.set("esforc", String(esforc));
    if (alineacio != null) fd.set("alineacio_estrategica", String(alineacio));
    fd.set("progress", String(progress));
    startTransition(async () => {
      await saveProjecte(fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  function handleDelete() {
    if (!confirm(`Eliminar "${nom}"?`)) return;
    startTransition(async () => {
      await deleteProjecte(params.id as string);
      router.push("/dashboard/bruixola/projectes");
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
        <Link href="/dashboard/bruixola/projectes" className="text-[10px] font-bold uppercase tracking-[0.2em] hover:opacity-70" style={{ color: LABEL }}>
          ← Projectes
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
            <p className="text-[20px] font-black mt-2 leading-tight" style={{ color: TEXT }}>{nom}</p>
            {p?.tipus && (
              <p className="text-[9px] mt-1 uppercase tracking-wider font-semibold" style={{ color: LABEL }}>{p.tipus}</p>
            )}
          </div>
          <p className="text-[32px] font-black tabular-nums shrink-0" style={{ color: c }}>{pct}%</p>
        </div>

        {/* Scores */}
        {(p?.impacte != null || p?.esforc != null) && (
          <div className="flex gap-4 mb-4">
            {p?.impacte != null && (
              <div className="text-center">
                <p className="text-[18px] font-black" style={{ color: p.impacte >= 4 ? GREEN : p.impacte >= 3 ? GOLD : DIM }}>{p.impacte}</p>
                <p className="text-[7px] uppercase tracking-wider" style={{ color: LABEL }}>Impacte</p>
              </div>
            )}
            {p?.urgencia != null && (
              <div className="text-center">
                <p className="text-[18px] font-black" style={{ color: p.urgencia >= 4 ? RED : p.urgencia >= 3 ? AMBER : DIM }}>{p.urgencia}</p>
                <p className="text-[7px] uppercase tracking-wider" style={{ color: LABEL }}>Urgència</p>
              </div>
            )}
            {p?.esforc != null && (
              <div className="text-center">
                <p className="text-[18px] font-black" style={{ color: p.esforc >= 4 ? AMBER : p.esforc >= 3 ? GOLD : GREEN }}>{p.esforc}</p>
                <p className="text-[7px] uppercase tracking-wider" style={{ color: LABEL }}>Esforç</p>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: BORDER2 }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: c }} />
          </div>
          <input type="range" min="0" max="100" value={progress} onChange={e => setProgress(Number(e.target.value))}
            className="w-full" style={{ accentColor: GOLD }} />
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">

        {/* Definició */}
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, backgroundColor: CARD }}>
          <div className="px-4 py-3" style={{ backgroundColor: SURFACE, borderBottom: `1px solid ${BORDER}` }}>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: GOLD }}>Definició</p>
          </div>
          <div className="p-5 space-y-4">
            <Field label="Nom"><DInput name="nom" value={nom} onChange={setNom} /></Field>
            <Field label="Descripció"><DTextarea name="descripcio" value={descripcio} onChange={setDescripcio} rows={2} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipus">
                <select name="tipus" value={tipus} onChange={e => setTipus(e.target.value)}
                  className="w-full outline-none text-[12px] rounded-lg px-2 py-2"
                  style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER2}`, color: TEXT }}>
                  {TIPUS_OPTS.map(t => <option key={t} value={t} style={{ backgroundColor: CARD }}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </Field>
              <Field label="Estat">
                <select name="estat" value={estat} onChange={e => setEstat(e.target.value)}
                  className="w-full outline-none text-[12px] rounded-lg px-2 py-2"
                  style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER2}`, color: TEXT }}>
                  {ESTAT_OPTS.map(e => (
                    <option key={e} value={e} style={{ backgroundColor: CARD }}>
                      {e.charAt(0).toUpperCase() + e.slice(1)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data inici"><DInput name="data_inici" value={dataInici} onChange={setDataInici} type="date" /></Field>
              <Field label="Data objectiu"><DInput name="data_objectiu" value={dataObj} onChange={setDataObj} type="date" /></Field>
            </div>
          </div>
        </div>

        {/* Priorització */}
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, backgroundColor: CARD }}>
          <div className="px-4 py-3" style={{ backgroundColor: SURFACE, borderBottom: `1px solid ${BORDER}` }}>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: AMBER }}>Priorització</p>
          </div>
          <div className="p-5 space-y-3">
            <Scale5 name="prioritat" label="Prioritat" value={prioritat} onChange={setPrioritat} />
            <Scale5 name="impacte" label="Impacte" value={impacte} onChange={setImpacte}
              colorFn={n => n >= 4 ? GREEN : n >= 3 ? GOLD : LABEL} />
            <Scale5 name="urgencia" label="Urgència" value={urgencia} onChange={setUrgencia} />
            <Scale5 name="esforc" label="Esforç" value={esforc} onChange={setEsforc}
              colorFn={n => n >= 4 ? AMBER : n >= 3 ? GOLD : GREEN} />
            <Scale5 name="alineacio_estrategica" label="Alineació estratègica" value={alineacio} onChange={setAlineacio}
              colorFn={n => n >= 4 ? BLUE : n >= 3 ? GOLD : LABEL} />
          </div>
        </div>

        {/* Execució */}
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, backgroundColor: CARD }}>
          <div className="px-4 py-3" style={{ backgroundColor: SURFACE, borderBottom: `1px solid ${BORDER}` }}>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: GREEN }}>Execució</p>
          </div>
          <div className="p-5 space-y-4">
            <Field label="Següent acció"><DInput name="seguent_accio" value={seguentAccio} onChange={setSeguentAccio} placeholder="Primera acció concreta…" /></Field>
            <Field label="Decisió pendent"><DInput name="decisio_pendent" value={decisio} onChange={setDecisio} placeholder="Decisió que s'ha de prendre…" /></Field>
            <Field label="Risc principal"><DInput name="risc_text" value={risc} onChange={setRisc} placeholder="Principal risc identificat…" /></Field>
            <Field label="Notes"><DTextarea name="notes" value={notes} onChange={setNotes} placeholder="Context addicional…" rows={2} /></Field>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] font-semibold transition-opacity" style={{ color: GREEN, opacity: saved ? 1 : 0 }}>✓ Guardat</span>
          <button type="submit" disabled={!nom || isPending}
            className="px-6 py-2.5 rounded-xl text-[11px] font-bold transition-all disabled:opacity-40 hover:opacity-80"
            style={{ backgroundColor: GOLD, color: "#FFFFFF" }}>
            {isPending ? "Guardant…" : "Guardar canvis"}
          </button>
        </div>
      </form>
    </div>
  );
}
