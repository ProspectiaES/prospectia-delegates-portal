"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateProspectoStage } from "@/app/actions/prospectos";
import { addActivity } from "@/app/actions/prospectos";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CRMActivity = {
  id: string;
  type: string;
  title: string;
  notes: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
};

export interface ClienteCRMPanelProps {
  prospectoId: string;
  initialStage: string;
  activities: CRMActivity[];
  notes: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGES = [
  { key: "nuevo",       label: "Nuevo",       active: "bg-[#F3F4F6] text-[#374151] border-[#9CA3AF]" },
  { key: "contactado",  label: "Contactado",  active: "bg-blue-50 text-blue-700 border-blue-400" },
  { key: "interesado",  label: "Interesado",  active: "bg-amber-50 text-amber-700 border-amber-400" },
  { key: "propuesta",   label: "Propuesta",   active: "bg-orange-50 text-orange-700 border-orange-400" },
  { key: "negociacion", label: "Negociación", active: "bg-purple-50 text-purple-700 border-purple-400" },
  { key: "ganado",      label: "Cliente",     active: "bg-emerald-50 text-emerald-700 border-emerald-500" },
  { key: "perdido",     label: "Perdido",     active: "bg-red-50 text-[#8E0E1A] border-[#8E0E1A]" },
];

const ACTIVITY_TYPES = [
  { value: "call",    label: "Llamada" },
  { value: "meeting", label: "Visita / reunión" },
  { value: "email",   label: "Email" },
  { value: "task",    label: "Tarea" },
  { value: "note",    label: "Nota" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtRelDate(iso: string | null): string {
  if (!iso) return "—";
  const ts    = new Date(iso).getTime();
  const diff  = Date.now() - ts;
  const days  = Math.floor(Math.abs(diff) / 86_400_000);
  if (diff < 0) {
    if (days === 0) return "hoy";
    if (days === 1) return "mañana";
    return `en ${days}d`;
  }
  if (days === 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 30)  return `hace ${days}d`;
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function ActivityIcon({ type, done }: { type: string; done: boolean }) {
  const base = `shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${done ? "bg-emerald-100 text-emerald-600" : "bg-[#F3F4F6] text-[#9CA3AF]"}`;
  const paths: Record<string, React.ReactElement> = {
    call:    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M13.5 10.5c-.8-.8-1.9-1.3-3-1.3-.5 0-.9.1-1.3.3L7.8 8.1C8 7.7 8.1 7.3 8.1 6.8c0-1.1-.5-2.2-1.3-3L5.2 2.2c-.4-.4-1-.4-1.4 0L2.4 3.6c-.8.8-.8 2.1 0 3l9 9c.8.8 2.1.8 3 0l1.4-1.4c.4-.4.4-1 0-1.4l-2.3-2.3z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    meeting: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="4" width="12" height="10" rx="2"/><path d="M5 4V3a1 1 0 012 0v1M9 4V3a1 1 0 012 0v1M2 8h12" strokeLinecap="round"/></svg>,
    email:   <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="4" width="12" height="9" rx="2"/><path d="M2 5l6 5 6-5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    task:    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2.5 8.5l4 4 7-8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    note:    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="2" width="10" height="12" rx="2"/><path d="M6 6h4M6 9h2" strokeLinecap="round"/></svg>,
  };
  return <span className={base}>{paths[type] ?? paths.note}</span>;
}

// ─── Create prospecto button (used when no prospecto exists yet) ──────────────

export function CreateProspectoButton({ contactId, contactName }: { contactId: string; contactName: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const create = async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/followup/create-prospecto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_id: contactId, contact_name: contactName }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={create}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#8E0E1A] hover:bg-[#7a0c16] disabled:opacity-50 text-white text-sm font-semibold transition-colors"
    >
      {loading
        ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
        : <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10" strokeLinecap="round"/></svg>
      }
      {loading ? "Creando…" : "Crear prospecto en CRM"}
    </button>
  );
}

// ─── Main CRM panel ───────────────────────────────────────────────────────────

export function ClienteCRMPanel({ prospectoId, initialStage, activities, notes }: ClienteCRMPanelProps) {
  const [stage,          setStage]          = useState(initialStage);
  const [showForm,       setShowForm]       = useState(false);
  const [savingStage,    setSavingStage]    = useState(false);
  const [addingActivity, setAddingActivity] = useState(false);
  const router = useRouter();

  const changeStage = async (key: string) => {
    if (key === stage) return;
    setStage(key);
    setSavingStage(true);
    await updateProspectoStage(prospectoId, key as Parameters<typeof updateProspectoStage>[1]);
    setSavingStage(false);
  };

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddingActivity(true);
    const fd = new FormData(e.currentTarget);
    await addActivity(prospectoId, fd);
    setAddingActivity(false);
    setShowForm(false);
    router.refresh();
  };

  return (
    <div className="space-y-6">

      {/* ── Pipeline ────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">Pipeline</p>
          {savingStage && <span className="text-[10px] text-[#9CA3AF]">Guardando…</span>}
        </div>
        {/* Progress bar */}
        <div className="flex gap-px mb-3 h-1.5 rounded-full overflow-hidden">
          {STAGES.filter(s => s.key !== "perdido").map((s, i) => {
            const idx = STAGES.findIndex(x => x.key === stage);
            const sIdx = STAGES.findIndex(x => x.key === s.key);
            const filled = stage !== "perdido" && sIdx <= idx;
            return <div key={s.key} className={`flex-1 transition-colors duration-300 ${filled ? "bg-emerald-500" : "bg-[#E5E7EB]"}`} />;
          })}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STAGES.map(s => (
            <button
              key={s.key}
              onClick={() => changeStage(s.key)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border-2 transition-all ${
                stage === s.key
                  ? s.active
                  : "bg-white text-[#9CA3AF] border-[#E5E7EB] hover:border-[#9CA3AF] hover:text-[#6B7280]"
              }`}
            >
              {stage === s.key && <span className="mr-1">●</span>}{s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Activities ──────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
            Actividades{activities.length > 0 && ` (${activities.length})`}
          </p>
          <button
            onClick={() => setShowForm(o => !o)}
            className="flex items-center gap-1 text-xs font-semibold text-[#8E0E1A] hover:underline"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3v10M3 8h10" strokeLinecap="round"/>
            </svg>
            Nueva
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleAdd} className="mb-4 p-4 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <select
                name="type"
                required
                defaultValue="call"
                className="h-9 rounded-lg border border-[#E5E7EB] bg-white px-2.5 text-sm text-[#374151] focus:border-[#8E0E1A] focus:outline-none"
              >
                {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <input
                name="scheduled_at"
                type="datetime-local"
                className="h-9 rounded-lg border border-[#E5E7EB] bg-white px-2.5 text-sm text-[#374151] focus:border-[#8E0E1A] focus:outline-none"
              />
            </div>
            <input
              name="title"
              required
              placeholder="Título de la actividad…"
              className="w-full h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none"
            />
            <textarea
              name="notes"
              rows={2}
              placeholder="Notas (opcional)…"
              className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none resize-none"
            />
            <div className="flex items-center gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="text-xs text-[#6B7280] hover:text-[#0A0A0A] px-2 py-1.5">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={addingActivity}
                className="px-4 py-1.5 rounded-lg bg-[#8E0E1A] hover:bg-[#7a0c16] text-white text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                {addingActivity ? "Guardando…" : "Añadir"}
              </button>
            </div>
          </form>
        )}

        {activities.length === 0 && !showForm ? (
          <p className="text-xs text-[#9CA3AF]">Sin actividades. Usa el botón «Nueva» para registrar una llamada, visita o tarea.</p>
        ) : (
          <ul className="space-y-2.5">
            {activities.map(a => (
              <li key={a.id} className="flex items-start gap-3">
                <ActivityIcon type={a.type} done={!!a.completed_at} />
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className={`text-sm leading-snug ${a.completed_at ? "line-through text-[#9CA3AF]" : "font-medium text-[#374151]"}`}>
                    {a.title}
                  </p>
                  {a.notes && <p className="text-xs text-[#9CA3AF] mt-0.5 truncate">{a.notes}</p>}
                </div>
                <span className="text-[11px] text-[#9CA3AF] shrink-0 mt-0.5 tabular-nums">
                  {fmtRelDate(a.completed_at ?? a.scheduled_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Notes ───────────────────────────────────────────────────── */}
      {notes && (
        <div className="pt-4 border-t border-[#F3F4F6]">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] mb-2">Notas CRM</p>
          <p className="text-sm text-[#374151] leading-relaxed whitespace-pre-wrap">{notes}</p>
        </div>
      )}

      {/* ── Link to full page ────────────────────────────────────────── */}
      <div className="pt-2 border-t border-[#F3F4F6] flex justify-end">
        <Link
          href={`/dashboard/prospectos/${prospectoId}`}
          className="text-xs font-semibold text-[#8E0E1A] hover:underline flex items-center gap-1"
        >
          Ficha CRM completa
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 13L13 3M13 3H8M13 3v5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
      </div>
    </div>
  );
}
