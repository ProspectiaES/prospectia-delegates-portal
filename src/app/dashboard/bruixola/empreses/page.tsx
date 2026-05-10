"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import {
  getEmpreses, saveEmpresa, deleteEmpresa,
  getActors, saveActor, deleteActor,
} from "@/app/actions/bruixola";
import type { Empresa, Actor } from "@/app/actions/bruixola";

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

function Scale5({ label, value, onChange, colorFn }: {
  label: string; value: number | null; onChange: (v: number) => void;
  colorFn?: (n: number) => string;
}) {
  const defColor = (n: number) => n >= 4 ? RED : n === 3 ? AMBER : LABEL;
  const getC = colorFn ?? defColor;
  return (
    <div className="flex items-center gap-3">
      <p className="text-[10px] w-32 shrink-0" style={{ color: DIM }}>{label}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" onClick={() => onChange(n)}
            className="w-6 h-6 rounded text-[9px] font-bold transition-all"
            style={{
              backgroundColor: value === n ? getC(n) : SURFACE,
              border: `1px solid ${value === n ? getC(n) : BORDER2}`,
              color: value === n ? "#FFFFFF" : DIM,
            }}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Empresa Form ──────────────────────────────────────────────────────────────

function EmpresaForm({ empresa, onSave, onCancel }: {
  empresa?: Empresa; onSave: () => void; onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [nom, setNom] = useState(empresa?.nom ?? "");
  const [tipus, setTipus] = useState(empresa?.tipus ?? "");
  const [sector, setSector] = useState(empresa?.sector ?? "");
  const [descripcio, setDescripcio] = useState(empresa?.descripcio ?? "");
  const [activa, setActiva] = useState(empresa?.activa ?? true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    if (empresa?.id) fd.set("id", empresa.id);
    fd.set("nom", nom);
    fd.set("tipus", tipus);
    fd.set("sector", sector);
    fd.set("descripcio", descripcio);
    fd.set("activa", String(activa));
    startTransition(async () => {
      await saveEmpresa(fd);
      onSave();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-3"
      style={{ backgroundColor: SURFACE, borderRadius: "12px", border: `1px solid ${BORDER2}` }}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nom *"><DInput name="nom" value={nom} onChange={setNom} placeholder="Nom de l'empresa…" /></Field>
        <Field label="Tipus"><DInput name="tipus" value={tipus} onChange={setTipus} placeholder="SL, marca, divisió…" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Sector"><DInput name="sector" value={sector} onChange={setSector} placeholder="Immobiliàri, tech…" /></Field>
        <Field label="Estat">
          <div className="flex gap-2 pt-1">
            {[true, false].map(v => (
              <button key={String(v)} type="button" onClick={() => setActiva(v)}
                className="px-3 py-1 rounded-lg text-[10px] font-semibold transition-all"
                style={{ border: `1px solid ${activa === v ? (v ? GREEN : RED) : BORDER}`, backgroundColor: activa === v ? `${v ? GREEN : RED}18` : SURFACE, color: activa === v ? (v ? GREEN : RED) : LABEL }}>
                {v ? "Activa" : "Inactiva"}
              </button>
            ))}
          </div>
        </Field>
      </div>
      <Field label="Descripció">
        <textarea value={descripcio} onChange={e => setDescripcio(e.target.value)} rows={2} placeholder="Descripció breu…"
          className="w-full outline-none resize-none text-[11px] leading-relaxed rounded-lg px-3 py-2"
          style={{ backgroundColor: CARD, border: `1px solid ${BORDER2}`, color: TEXT }} />
      </Field>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-lg text-[10px]" style={{ color: LABEL }}>Cancel·lar</button>
        <button type="submit" disabled={!nom || isPending} className="px-4 py-1.5 rounded-lg text-[10px] font-bold disabled:opacity-40"
          style={{ backgroundColor: GOLD, color: "#FFFFFF" }}>
          {isPending ? "Guardant…" : empresa ? "Actualitzar" : "Crear empresa"}
        </button>
      </div>
    </form>
  );
}

// ─── Actor Form ───────────────────────────────────────────────────────────────

function ActorForm({ actor, empreses, onSave, onCancel }: {
  actor?: Actor; empreses: Empresa[]; onSave: () => void; onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [nom, setNom] = useState(actor?.nom ?? "");
  const [empresaId, setEmpresaId] = useState(actor?.empresa_id ?? "");
  const [rolFormal, setRolFormal] = useState(actor?.rol_formal ?? "");
  const [rolReal, setRolReal] = useState(actor?.rol_real ?? "");
  const [area, setArea] = useState(actor?.area ?? "");
  const [extern, setExtern] = useState(actor?.extern ?? false);
  const [poderDecisio, setPoderDecisio] = useState<number | null>(actor?.poder_decisio ?? null);
  const [capacitat, setCapacitat] = useState<number | null>(actor?.capacitat_execucio ?? null);
  const [carrega, setCarrega] = useState<number | null>(actor?.carrega_actual ?? null);
  const [notes, setNotes] = useState(actor?.notes ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    if (actor?.id) fd.set("id", actor.id);
    fd.set("nom", nom);
    fd.set("empresa_id", empresaId);
    fd.set("rol_formal", rolFormal);
    fd.set("rol_real", rolReal);
    fd.set("area", area);
    fd.set("extern", String(extern));
    if (poderDecisio != null) fd.set("poder_decisio", String(poderDecisio));
    if (capacitat != null) fd.set("capacitat_execucio", String(capacitat));
    if (carrega != null) fd.set("carrega_actual", String(carrega));
    fd.set("notes", notes);
    startTransition(async () => {
      await saveActor(fd);
      onSave();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-3"
      style={{ backgroundColor: SURFACE, borderRadius: "12px", border: `1px solid ${BORDER2}` }}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nom *"><DInput name="nom" value={nom} onChange={setNom} placeholder="Nom complet…" /></Field>
        <Field label="Empresa">
          <select value={empresaId} onChange={e => setEmpresaId(e.target.value)}
            className="w-full outline-none text-[12px] rounded-lg px-3 py-2"
            style={{ backgroundColor: CARD, border: `1px solid ${BORDER2}`, color: TEXT }}>
            <option value="">Cap empresa</option>
            {empreses.map(emp => <option key={emp.id} value={emp.id} style={{ backgroundColor: CARD }}>{emp.nom}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Rol formal"><DInput name="rol_formal" value={rolFormal} onChange={setRolFormal} placeholder="CEO, Director…" /></Field>
        <Field label="Rol real"><DInput name="rol_real" value={rolReal} onChange={setRolReal} placeholder="Qui realment decideix…" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Àrea"><DInput name="area" value={area} onChange={setArea} placeholder="Vendes, Tech…" /></Field>
        <Field label="Tipus">
          <div className="flex gap-2 pt-1">
            {[false, true].map(v => (
              <button key={String(v)} type="button" onClick={() => setExtern(v)}
                className="px-3 py-1 rounded-lg text-[10px] font-semibold transition-all"
                style={{ border: `1px solid ${extern === v ? BLUE : BORDER}`, backgroundColor: extern === v ? `${BLUE}18` : SURFACE, color: extern === v ? BLUE : LABEL }}>
                {v ? "Extern" : "Intern"}
              </button>
            ))}
          </div>
        </Field>
      </div>
      <div className="space-y-2">
        <Scale5 label="Poder decisió" value={poderDecisio} onChange={setPoderDecisio}
          colorFn={n => n >= 4 ? RED : n >= 3 ? AMBER : DIM} />
        <Scale5 label="Capacitat execució" value={capacitat} onChange={setCapacitat}
          colorFn={n => n >= 4 ? GREEN : n >= 3 ? GOLD : DIM} />
        <Scale5 label="Càrrega actual" value={carrega} onChange={setCarrega}
          colorFn={n => n >= 4 ? RED : n >= 3 ? AMBER : GREEN} />
      </div>
      <Field label="Notes">
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Observacions…"
          className="w-full outline-none resize-none text-[11px] leading-relaxed rounded-lg px-3 py-2"
          style={{ backgroundColor: CARD, border: `1px solid ${BORDER2}`, color: TEXT }} />
      </Field>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-lg text-[10px]" style={{ color: LABEL }}>Cancel·lar</button>
        <button type="submit" disabled={!nom || isPending} className="px-4 py-1.5 rounded-lg text-[10px] font-bold disabled:opacity-40"
          style={{ backgroundColor: BLUE, color: "#FFFFFF" }}>
          {isPending ? "Guardant…" : actor ? "Actualitzar" : "Crear actor"}
        </button>
      </div>
    </form>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EmpresesPage() {
  const [empreses, setEmpreses] = useState<Empresa[]>([]);
  const [actors, setActors] = useState<Actor[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"empreses" | "actors">("empreses");
  const [showEmpresaForm, setShowEmpresaForm] = useState(false);
  const [showActorForm, setShowActorForm] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | undefined>();
  const [editingActor, setEditingActor] = useState<Actor | undefined>();
  const [, startTransition] = useTransition();

  async function reload() {
    const [e, a] = await Promise.all([getEmpreses(), getActors()]);
    setEmpreses(e);
    setActors(a);
    setLoading(false);
  }

  useEffect(() => { reload(); }, []);

  function handleSaveEmpresa() {
    setShowEmpresaForm(false);
    setEditingEmpresa(undefined);
    reload();
  }

  function handleSaveActor() {
    setShowActorForm(false);
    setEditingActor(undefined);
    reload();
  }

  function handleDeleteEmpresa(id: string, nom: string) {
    if (!confirm(`Eliminar empresa "${nom}"?`)) return;
    startTransition(async () => {
      await deleteEmpresa(id);
      reload();
    });
  }

  function handleDeleteActor(id: string, nom: string) {
    if (!confirm(`Eliminar actor "${nom}"?`)) return;
    startTransition(async () => {
      await deleteActor(id);
      reload();
    });
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-[12px]" style={{ color: LABEL }}>Carregant…</p>
    </div>
  );

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
          <h1 className="text-[26px] font-black leading-tight tracking-tight" style={{ color: TEXT }}>Empreses i Actors</h1>
          <p className="text-[11px] mt-1" style={{ color: DIM }}>
            {empreses.length} empreses · {actors.length} actors
          </p>
        </div>
        <button
          onClick={() => { if (tab === "empreses") { setShowEmpresaForm(true); setEditingEmpresa(undefined); } else { setShowActorForm(true); setEditingActor(undefined); } }}
          className="px-4 py-2.5 rounded-xl text-[11px] font-bold shrink-0 transition-all hover:opacity-80"
          style={{ backgroundColor: tab === "empreses" ? GOLD : BLUE, color: "#FFFFFF" }}>
          {tab === "empreses" ? "+ Nova empresa" : "+ Nou actor"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: SURFACE }}>
        {(["empreses", "actors"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-lg text-[11px] font-bold transition-all"
            style={{ backgroundColor: tab === t ? CARD : "transparent", color: tab === t ? TEXT : LABEL, border: tab === t ? `1px solid ${BORDER}` : "1px solid transparent" }}>
            {t.charAt(0).toUpperCase() + t.slice(1)} ({t === "empreses" ? empreses.length : actors.length})
          </button>
        ))}
      </div>

      {/* Empresa form */}
      {tab === "empreses" && (showEmpresaForm || editingEmpresa) && (
        <EmpresaForm
          empresa={editingEmpresa}
          onSave={handleSaveEmpresa}
          onCancel={() => { setShowEmpresaForm(false); setEditingEmpresa(undefined); }}
        />
      )}

      {/* Actor form */}
      {tab === "actors" && (showActorForm || editingActor) && (
        <ActorForm
          actor={editingActor}
          empreses={empreses}
          onSave={handleSaveActor}
          onCancel={() => { setShowActorForm(false); setEditingActor(undefined); }}
        />
      )}

      {/* Empreses list */}
      {tab === "empreses" && (
        <div className="space-y-2">
          {empreses.length === 0 && !showEmpresaForm && (
            <div className="rounded-2xl p-10 text-center" style={{ backgroundColor: CARD, border: `1px dashed ${BORDER2}` }}>
              <p className="text-[13px] font-bold mb-2" style={{ color: TEXT }}>Cap empresa definida</p>
              <p className="text-[11px]" style={{ color: DIM }}>Afegeix les empreses i marques del grup.</p>
            </div>
          )}
          {empreses.map(emp => (
            <div key={emp.id} className="rounded-xl p-4 flex items-start gap-3"
              style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-semibold" style={{ color: TEXT }}>{emp.nom}</p>
                  {emp.tipus && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${BLUE}18`, color: BLUE }}>{emp.tipus}</span>}
                  {!emp.activa && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${LABEL}18`, color: LABEL }}>Inactiva</span>}
                </div>
                {emp.sector && <p className="text-[10px] mt-0.5" style={{ color: DIM }}>{emp.sector}</p>}
                {emp.descripcio && <p className="text-[10px] mt-1 line-clamp-1" style={{ color: LABEL }}>{emp.descripcio}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => { setEditingEmpresa(emp); setShowEmpresaForm(false); }}
                  className="text-[10px] hover:opacity-70" style={{ color: LABEL }}>Editar</button>
                <button onClick={() => handleDeleteEmpresa(emp.id, emp.nom)}
                  className="text-[10px] hover:opacity-70" style={{ color: RED }}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actors list */}
      {tab === "actors" && (
        <div className="space-y-2">
          {actors.length === 0 && !showActorForm && (
            <div className="rounded-2xl p-10 text-center" style={{ backgroundColor: CARD, border: `1px dashed ${BORDER2}` }}>
              <p className="text-[13px] font-bold mb-2" style={{ color: TEXT }}>Cap actor definit</p>
              <p className="text-[11px]" style={{ color: DIM }}>Mapa qui decideix, qui executa i qui pot bloquejar.</p>
            </div>
          )}
          {actors.map(actor => {
            const empNom = empreses.find(e => e.id === actor.empresa_id)?.nom;
            return (
              <div key={actor.id} className="rounded-xl p-4"
                style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[13px] font-semibold" style={{ color: TEXT }}>{actor.nom}</p>
                      {actor.extern && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${AMBER}18`, color: AMBER }}>Extern</span>}
                      {empNom && <span className="text-[9px]" style={{ color: LABEL }}>{empNom}</span>}
                    </div>
                    {actor.rol_formal && (
                      <p className="text-[10px] mt-0.5" style={{ color: DIM }}>
                        {actor.rol_formal}
                        {actor.rol_real && actor.rol_real !== actor.rol_formal && (
                          <span style={{ color: AMBER }}> → {actor.rol_real}</span>
                        )}
                      </p>
                    )}
                    {(actor.poder_decisio != null || actor.capacitat_execucio != null || actor.carrega_actual != null) && (
                      <div className="flex gap-3 mt-2">
                        {actor.poder_decisio != null && (
                          <span className="text-[9px]" style={{ color: LABEL }}>
                            Decisió <span className="font-bold" style={{ color: actor.poder_decisio >= 4 ? RED : actor.poder_decisio >= 3 ? AMBER : DIM }}>{actor.poder_decisio}/5</span>
                          </span>
                        )}
                        {actor.capacitat_execucio != null && (
                          <span className="text-[9px]" style={{ color: LABEL }}>
                            Execució <span className="font-bold" style={{ color: actor.capacitat_execucio >= 4 ? GREEN : DIM }}>{actor.capacitat_execucio}/5</span>
                          </span>
                        )}
                        {actor.carrega_actual != null && (
                          <span className="text-[9px]" style={{ color: LABEL }}>
                            Càrrega <span className="font-bold" style={{ color: actor.carrega_actual >= 4 ? RED : actor.carrega_actual >= 3 ? AMBER : GREEN }}>{actor.carrega_actual}/5</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => { setEditingActor(actor); setShowActorForm(false); }}
                      className="text-[10px] hover:opacity-70" style={{ color: LABEL }}>Editar</button>
                    <button onClick={() => handleDeleteActor(actor.id, actor.nom)}
                      className="text-[10px] hover:opacity-70" style={{ color: RED }}>Eliminar</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
