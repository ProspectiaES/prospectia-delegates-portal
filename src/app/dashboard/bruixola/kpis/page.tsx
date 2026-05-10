"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { getKPIs, saveKPI, addKPIValor, deleteKPI } from "@/app/actions/bruixola";
import type { KPI } from "@/app/actions/bruixola";

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
      className="w-full outline-none text-[12px] rounded-lg px-3 py-2"
      style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER2}`, color: TEXT }}
      onFocus={e => (e.target.style.borderColor = GOLD)}
      onBlur={e => (e.target.style.borderColor = BORDER2)} />
  );
}

// Minimal sparkline using SVG
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 24;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── KPI Form ─────────────────────────────────────────────────────────────────

function KPIForm({ kpi, onSave, onCancel }: {
  kpi?: KPI; onSave: () => void; onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [nom, setNom] = useState(kpi?.nom ?? "");
  const [categoria, setCategoria] = useState(kpi?.categoria ?? "");
  const [unitat, setUnitat] = useState(kpi?.unitat ?? "");
  const [valorObjectiu, setValorObjectiu] = useState(kpi?.valor_objectiu != null ? String(kpi.valor_objectiu) : "");
  const [valorActual, setValorActual] = useState(kpi?.valor_actual != null ? String(kpi.valor_actual) : "");
  const [frequencia, setFrequencia] = useState(kpi?.frequencia ?? "mensual");
  const [notes, setNotes] = useState(kpi?.notes ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    if (kpi?.id) fd.set("id", kpi.id);
    fd.set("nom", nom);
    fd.set("categoria", categoria);
    fd.set("unitat", unitat);
    fd.set("valor_objectiu", valorObjectiu);
    fd.set("valor_actual", valorActual);
    fd.set("frequencia", frequencia);
    fd.set("notes", notes);
    startTransition(async () => {
      await saveKPI(fd);
      onSave();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-3 rounded-xl"
      style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER2}` }}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nom *"><DInput name="nom" value={nom} onChange={setNom} placeholder="Nom del KPI…" /></Field>
        <Field label="Categoria"><DInput name="categoria" value={categoria} onChange={setCategoria} placeholder="Vendes, Finance, Ops…" /></Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Unitat"><DInput name="unitat" value={unitat} onChange={setUnitat} placeholder="€, %, leads…" /></Field>
        <Field label="Valor objectiu"><DInput name="valor_objectiu" value={valorObjectiu} onChange={setValorObjectiu} type="number" placeholder="0" /></Field>
        <Field label="Valor actual"><DInput name="valor_actual" value={valorActual} onChange={setValorActual} type="number" placeholder="0" /></Field>
      </div>
      <Field label="Freqüència">
        <div className="flex gap-2">
          {["diari", "setmanal", "mensual", "trimestral"].map(f => (
            <button key={f} type="button" onClick={() => setFrequencia(f)}
              className="px-3 py-1 rounded-lg text-[10px] font-semibold transition-all"
              style={{ border: `1px solid ${frequencia === f ? BLUE : BORDER}`, backgroundColor: frequencia === f ? `${BLUE}18` : CARD, color: frequencia === f ? BLUE : LABEL }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Notes">
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Context o fórmula de càlcul…"
          className="w-full outline-none resize-none text-[11px] leading-relaxed rounded-lg px-3 py-2"
          style={{ backgroundColor: CARD, border: `1px solid ${BORDER2}`, color: TEXT }} />
      </Field>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-lg text-[10px]" style={{ color: LABEL }}>Cancel·lar</button>
        <button type="submit" disabled={!nom || isPending} className="px-4 py-1.5 rounded-lg text-[10px] font-bold disabled:opacity-40"
          style={{ backgroundColor: GOLD, color: "#09090B" }}>
          {isPending ? "Guardant…" : kpi ? "Actualitzar" : "Crear KPI"}
        </button>
      </div>
    </form>
  );
}

// ─── Add Value Modal ───────────────────────────────────────────────────────────

function AddValueForm({ kpi, onSave, onCancel }: { kpi: KPI; onSave: () => void; onCancel: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [valor, setValor] = useState("");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await addKPIValor(kpi.id, parseFloat(valor), data, notes || null);
      onSave();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="p-3 space-y-3 rounded-xl mt-2"
      style={{ backgroundColor: CARD, border: `1px solid ${BORDER2}` }}>
      <p className="text-[10px] font-bold" style={{ color: GREEN }}>Afegir valor a {kpi.nom}</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-[9px] mb-1" style={{ color: LABEL }}>Valor {kpi.unitat ? `(${kpi.unitat})` : ""}</p>
          <input value={valor} onChange={e => setValor(e.target.value)} type="number" step="any" placeholder="0"
            className="w-full outline-none text-[12px] rounded-lg px-3 py-2"
            style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER2}`, color: TEXT }} />
        </div>
        <div>
          <p className="text-[9px] mb-1" style={{ color: LABEL }}>Data</p>
          <input value={data} onChange={e => setData(e.target.value)} type="date"
            className="w-full outline-none text-[12px] rounded-lg px-3 py-2"
            style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER2}`, color: TEXT }} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-lg text-[10px]" style={{ color: LABEL }}>Cancel·lar</button>
        <button type="submit" disabled={!valor || isPending} className="px-4 py-1.5 rounded-lg text-[10px] font-bold disabled:opacity-40"
          style={{ backgroundColor: GREEN, color: "#09090B" }}>
          {isPending ? "Guardant…" : "Afegir"}
        </button>
      </div>
    </form>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KPICard({ kpi, onEdit, onDelete, onAddValue }: {
  kpi: KPI; onEdit: () => void; onDelete: () => void; onAddValue: () => void;
}) {
  const actual = kpi.valor_actual ?? 0;
  const objectiu = kpi.valor_objectiu ?? 0;
  const pct = objectiu > 0 ? Math.min(100, Math.round((actual / objectiu) * 100)) : null;
  const desviacio = objectiu > 0 ? Math.round(((actual - objectiu) / objectiu) * 100) : null;
  const histData = kpi.historial?.map(h => h.valor) ?? [];
  const color = pct == null ? DIM : pct >= 90 ? GREEN : pct >= 60 ? GOLD : RED;

  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[13px] font-semibold" style={{ color: TEXT }}>{kpi.nom}</p>
            {kpi.categoria && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
                style={{ backgroundColor: `${BLUE}18`, color: BLUE }}>{kpi.categoria}</span>
            )}
            <span className="text-[8px]" style={{ color: LABEL }}>{kpi.frequencia}</span>
          </div>

          <div className="flex items-end gap-4 mt-2">
            <div>
              <p className="text-[24px] font-black tabular-nums leading-none" style={{ color }}>
                {actual.toLocaleString("ca-ES")}{kpi.unitat ? ` ${kpi.unitat}` : ""}
              </p>
              {objectiu > 0 && (
                <p className="text-[10px] mt-0.5" style={{ color: LABEL }}>
                  Obj: {objectiu.toLocaleString("ca-ES")}{kpi.unitat ? ` ${kpi.unitat}` : ""}
                  {desviacio != null && (
                    <span className="ml-2 font-bold" style={{ color: desviacio >= 0 ? GREEN : RED }}>
                      ({desviacio >= 0 ? "+" : ""}{desviacio}%)
                    </span>
                  )}
                </p>
              )}
            </div>
            {histData.length >= 2 && <Sparkline data={histData} color={color} />}
          </div>

          {pct != null && (
            <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ backgroundColor: BORDER2 }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: `1px solid ${BORDER}` }}>
        <button onClick={onAddValue} className="text-[10px] font-semibold hover:opacity-70" style={{ color: GREEN }}>+ Valor</button>
        <button onClick={onEdit} className="text-[10px] hover:opacity-70" style={{ color: LABEL }}>Editar</button>
        <button onClick={onDelete} className="text-[10px] hover:opacity-70 ml-auto" style={{ color: RED }}>Eliminar</button>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function KPIsPage() {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingKPI, setEditingKPI] = useState<KPI | undefined>();
  const [addingValueFor, setAddingValueFor] = useState<KPI | undefined>();
  const [, startTransition] = useTransition();

  async function reload() {
    const data = await getKPIs();
    setKpis(data);
    setLoading(false);
  }

  useEffect(() => { reload(); }, []);

  function handleSave() {
    setShowForm(false);
    setEditingKPI(undefined);
    reload();
  }

  function handleDelete(id: string, nom: string) {
    if (!confirm(`Eliminar KPI "${nom}"?`)) return;
    startTransition(async () => {
      await deleteKPI(id);
      reload();
    });
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-[12px]" style={{ color: LABEL }}>Carregant…</p>
    </div>
  );

  // Group by category
  const categories = Array.from(new Set(kpis.map(k => k.categoria ?? "Sense categoria")));
  const desviats = kpis.filter(k => {
    if (k.valor_actual == null || !k.valor_objectiu) return false;
    return (k.valor_actual / k.valor_objectiu) < 0.9;
  });

  return (
    <div className="max-w-4xl mx-auto px-5 md:px-10 py-10 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-4 mb-3">
            <Link href="/dashboard/bruixola" className="text-[10px] font-bold uppercase tracking-[0.2em] hover:opacity-70" style={{ color: LABEL }}>
              ← Brúixola
            </Link>
          </div>
          <h1 className="text-[26px] font-black leading-tight tracking-tight" style={{ color: TEXT }}>KPIs</h1>
          <p className="text-[11px] mt-1" style={{ color: DIM }}>
            {kpis.length} indicadors · {desviats.length} desviats
          </p>
        </div>
        <button onClick={() => { setShowForm(true); setEditingKPI(undefined); }}
          className="px-4 py-2.5 rounded-xl text-[11px] font-bold shrink-0 transition-all hover:opacity-80"
          style={{ backgroundColor: GOLD, color: "#09090B" }}>
          + Nou KPI
        </button>
      </div>

      {/* Alerts strip */}
      {desviats.length > 0 && (
        <div className="rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: `${RED}08`, border: `1px solid ${RED}20` }}>
          <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: RED }} />
          <div>
            <p className="text-[10px] font-bold" style={{ color: RED }}>
              {desviats.length} KPI{desviats.length > 1 ? "s" : ""} per sota del 90% de l&apos;objectiu
            </p>
            <p className="text-[9px] mt-0.5" style={{ color: DIM }}>
              {desviats.map(k => k.nom).join(" · ")}
            </p>
          </div>
        </div>
      )}

      {/* New / Edit form */}
      {(showForm || editingKPI) && (
        <KPIForm
          kpi={editingKPI}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingKPI(undefined); }}
        />
      )}

      {/* Empty */}
      {kpis.length === 0 && !showForm && (
        <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: CARD, border: `1px dashed ${BORDER2}` }}>
          <p className="text-[13px] font-bold mb-2" style={{ color: TEXT }}>Cap KPI definit</p>
          <p className="text-[11px] mb-6" style={{ color: DIM }}>Defineix els indicadors que mesuren la salut de l&apos;empresa.</p>
          <button onClick={() => setShowForm(true)}
            className="inline-block px-5 py-2.5 rounded-xl text-[11px] font-bold transition-all hover:opacity-80"
            style={{ backgroundColor: GOLD, color: "#09090B" }}>
            + Crear primer KPI
          </button>
        </div>
      )}

      {/* KPIs grouped by category */}
      {categories.map(cat => {
        const items = kpis.filter(k => (k.categoria ?? "Sense categoria") === cat);
        return (
          <div key={cat}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: GOLD }} />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: GOLD }}>
                {cat} ({items.length})
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {items.map(kpi => (
                <div key={kpi.id}>
                  <KPICard
                    kpi={kpi}
                    onEdit={() => { setEditingKPI(kpi); setShowForm(false); setAddingValueFor(undefined); }}
                    onDelete={() => handleDelete(kpi.id, kpi.nom)}
                    onAddValue={() => setAddingValueFor(addingValueFor?.id === kpi.id ? undefined : kpi)}
                  />
                  {addingValueFor?.id === kpi.id && (
                    <AddValueForm
                      kpi={kpi}
                      onSave={() => { setAddingValueFor(undefined); reload(); }}
                      onCancel={() => setAddingValueFor(undefined)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
