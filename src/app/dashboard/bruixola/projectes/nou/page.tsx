"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveProjecte } from "@/app/actions/bruixola";

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

const ESTAT_OPTS = ["actiu", "pendent", "congelat", "completat", "cancelat"];
const ESTAT_COLOR: Record<string, string> = { actiu: BLUE, completat: GREEN, congelat: LABEL, cancelat: RED, pendent: DIM };
const TIPUS_OPTS = ["estratègic", "operatiu", "innovació", "millora", "altres"];

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
      <p className="text-[11px] w-36 shrink-0" style={{ color: TEXT }}>{label}</p>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" onClick={() => onChange(n)}
            className="w-7 h-7 rounded-lg text-[10px] font-bold transition-all"
            style={{
              backgroundColor: value === n ? getC(n) : SURFACE,
              border: `1px solid ${value === n ? getC(n) : BORDER2}`,
              color: value === n ? "#09090B" : DIM,
            }}>
            {n}
          </button>
        ))}
      </div>
      <input type="hidden" name={name} value={value ?? ""} />
    </div>
  );
}

export default function NouProjectePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [nom, setNom]                   = useState("");
  const [descripcio, setDescripcio]     = useState("");
  const [tipus, setTipus]               = useState("estratègic");
  const [estat, setEstat]               = useState("actiu");
  const [dataInici, setDataInici]       = useState("");
  const [dataObj, setDataObj]           = useState("");
  const [prioritat, setPrioritat]       = useState<number | null>(3);
  const [impacte, setImpacte]           = useState<number | null>(null);
  const [urgencia, setUrgencia]         = useState<number | null>(null);
  const [esforc, setEsforc]             = useState<number | null>(null);
  const [alineacio, setAlineacio]       = useState<number | null>(null);
  const [seguentAccio, setSeguentAccio] = useState("");
  const [decisio, setDecisio]           = useState("");
  const [risc, setRisc]                 = useState("");
  const [notes, setNotes]               = useState("");

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (prioritat != null) fd.set("prioritat", String(prioritat));
    if (impacte != null)   fd.set("impacte", String(impacte));
    if (urgencia != null)  fd.set("urgencia", String(urgencia));
    if (esforc != null)    fd.set("esforc", String(esforc));
    if (alineacio != null) fd.set("alineacio_estrategica", String(alineacio));
    startTransition(async () => {
      const { id } = await saveProjecte(fd);
      router.push(`/dashboard/bruixola/projectes/${id}`);
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-5 md:px-8 py-10 space-y-6">

      <div className="flex items-center gap-3">
        <Link href="/dashboard/bruixola/projectes" className="text-[10px] font-bold uppercase tracking-[0.2em] hover:opacity-70" style={{ color: LABEL }}>
          ← Projectes
        </Link>
      </div>

      <div>
        <h1 className="text-[24px] font-black" style={{ color: TEXT }}>Nou Projecte</h1>
        <p className="text-[11px] mt-1" style={{ color: DIM }}>Defineix un projecte estratègic o operatiu.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">

        {/* Definició */}
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, backgroundColor: CARD }}>
          <div className="px-4 py-3" style={{ backgroundColor: SURFACE, borderBottom: `1px solid ${BORDER}` }}>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: GOLD }}>Definició</p>
          </div>
          <div className="p-5 space-y-4">
            <Field label="Nom del projecte *">
              <DInput name="nom" value={nom} onChange={setNom} placeholder="Nom clar i concís…" />
            </Field>
            <Field label="Descripció">
              <DTextarea name="descripcio" value={descripcio} onChange={setDescripcio} placeholder="Objectiu i abast del projecte…" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipus">
                <select name="tipus" value={tipus} onChange={e => setTipus(e.target.value)}
                  className="w-full outline-none text-[12px] rounded-lg px-3 py-2"
                  style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER2}`, color: TEXT }}>
                  {TIPUS_OPTS.map(t => <option key={t} value={t} style={{ backgroundColor: CARD }}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </Field>
              <Field label="Estat">
                <select name="estat" value={estat} onChange={e => setEstat(e.target.value)}
                  className="w-full outline-none text-[12px] rounded-lg px-3 py-2"
                  style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER2}`, color: TEXT }}>
                  {ESTAT_OPTS.map(e => (
                    <option key={e} value={e} style={{ backgroundColor: CARD, color: ESTAT_COLOR[e] ?? DIM }}>
                      {e.charAt(0).toUpperCase() + e.slice(1)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data inici">
                <DInput name="data_inici" value={dataInici} onChange={setDataInici} type="date" />
              </Field>
              <Field label="Data objectiu">
                <DInput name="data_objectiu" value={dataObj} onChange={setDataObj} type="date" />
              </Field>
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
            <Field label="Següent acció">
              <DInput name="seguent_accio" value={seguentAccio} onChange={setSeguentAccio} placeholder="Primera acció concreta…" />
            </Field>
            <Field label="Decisió pendent">
              <DInput name="decisio_pendent" value={decisio} onChange={setDecisio} placeholder="Decisió que s'ha de prendre…" />
            </Field>
            <Field label="Risc principal">
              <DInput name="risc_text" value={risc} onChange={setRisc} placeholder="Principal risc identificat…" />
            </Field>
            <Field label="Notes">
              <DTextarea name="notes" value={notes} onChange={setNotes} placeholder="Context addicional…" />
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/dashboard/bruixola/projectes"
            className="px-5 py-2.5 rounded-xl text-[11px] font-semibold"
            style={{ backgroundColor: SURFACE, color: DIM, border: `1px solid ${BORDER2}` }}>
            Cancel·lar
          </Link>
          <button type="submit" disabled={!nom || isPending}
            className="px-6 py-2.5 rounded-xl text-[11px] font-bold transition-all disabled:opacity-40 hover:opacity-80"
            style={{ backgroundColor: GOLD, color: "#09090B" }}>
            {isPending ? "Guardant…" : "Crear projecte"}
          </button>
        </div>
      </form>
    </div>
  );
}
