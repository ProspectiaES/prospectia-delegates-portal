"use client";

import { useState, useTransition } from "react";
import { updateProspectoStage, updateProspecto, addActivity, convertToHolded, deleteProspecto } from "@/app/actions/prospectos";
import type { ProspectoStage } from "@/app/actions/prospectos";
import { STAGES, stageCfg } from "../ProspectosClient";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActivityRow {
  id: string;
  type: string;
  title: string;
  notes: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  created_at: string;
  delegate_name: string | null;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  body_text: string | null;
}

export interface ProspectoDetail {
  id: string;
  delegate_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  city: string | null;
  country: string | null;
  stage: ProspectoStage;
  notes: string | null;
  source: string | null;
  holded_contact_id: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTIVITY_TYPES = [
  { key: "note",     label: "Nota",        icon: "📝" },
  { key: "call",     label: "Llamada",     icon: "📞" },
  { key: "meeting",  label: "Reunión",     icon: "🤝" },
  { key: "email",    label: "Email",       icon: "✉️" },
  { key: "task",     label: "Tarea",       icon: "✅" },
];

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

// ─── Stage selector ───────────────────────────────────────────────────────────

function StageSelector({ current, prospectoId }: { current: ProspectoStage; prospectoId: string }) {
  const [pending, startT] = useTransition();
  const [stage, setStage] = useState(current);
  const cfg = stageCfg(stage);

  function change(s: ProspectoStage) {
    setStage(s);
    startT(() => updateProspectoStage(prospectoId, s));
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Etapa del pipeline</p>
      <div className="flex flex-wrap gap-1.5">
        {STAGES.map(s => (
          <button
            key={s.key}
            onClick={() => change(s.key)}
            disabled={pending}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${stage === s.key ? `${s.bg} ${s.color} border-transparent shadow-sm` : "bg-white border-[#E5E7EB] text-[#9CA3AF] hover:border-[#9CA3AF]"}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {s.label}
          </button>
        ))}
      </div>
      {pending && <p className="text-[10px] text-[#9CA3AF]">Guardando…</p>}
    </div>
  );
}

// ─── Edit form ────────────────────────────────────────────────────────────────

function EditForm({ p, onClose }: { p: ProspectoDetail; onClose: () => void }) {
  const [pending, startT] = useTransition();

  return (
    <form
      action={(fd) => startT(() => { updateProspecto(p.id, fd); onClose(); })}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-[#374151] mb-1.5">Nombre *</label>
          <input name="name" required defaultValue={p.name}
            className="w-full h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 shadow-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#374151] mb-1.5">Email</label>
          <input name="email" type="email" defaultValue={p.email ?? ""}
            className="w-full h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 shadow-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#374151] mb-1.5">Teléfono</label>
          <input name="phone" type="tel" defaultValue={p.phone ?? ""}
            className="w-full h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 shadow-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#374151] mb-1.5">Empresa</label>
          <input name="company" defaultValue={p.company ?? ""}
            className="w-full h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 shadow-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#374151] mb-1.5">Ciudad</label>
          <input name="city" defaultValue={p.city ?? ""}
            className="w-full h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 shadow-sm" />
        </div>
        <input type="hidden" name="stage" value={p.stage} />
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-[#374151] mb-1.5">Notas</label>
          <textarea name="notes" rows={3} defaultValue={p.notes ?? ""}
            className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 shadow-sm resize-none" />
        </div>
      </div>
      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={onClose}
          className="h-8 px-3 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#6B7280] hover:bg-[#F9FAFB]">
          Cancelar
        </button>
        <button type="submit" disabled={pending}
          className="h-8 px-3 rounded-lg bg-[#8E0E1A] text-xs font-semibold text-white hover:bg-[#6B0A14] transition-colors disabled:opacity-50">
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}

// ─── Activity form ────────────────────────────────────────────────────────────

function ActivityForm({ prospectoId }: { prospectoId: string }) {
  const [pending, startT] = useTransition();
  const [type, setType]   = useState("note");
  const [open, setOpen]   = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[#E5E7EB] text-xs font-medium text-[#9CA3AF] hover:border-[#8E0E1A] hover:text-[#8E0E1A] transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 2v8M2 6h8" strokeLinecap="round"/>
        </svg>
        Añadir actividad
      </button>
    );
  }

  return (
    <form
      action={(fd) => startT(async () => { await addActivity(prospectoId, fd); setOpen(false); })}
      className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-3 space-y-3"
    >
      <div className="flex gap-1.5 flex-wrap">
        {ACTIVITY_TYPES.map(t => (
          <button
            key={t.key} type="button"
            onClick={() => setType(t.key)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${type === t.key ? "bg-[#8E0E1A] text-white border-transparent" : "bg-white border-[#E5E7EB] text-[#6B7280] hover:border-[#9CA3AF]"}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      <input type="hidden" name="type" value={type} />

      <input name="title" required placeholder="Título o resumen…"
        className="w-full h-8 rounded-lg border border-[#E5E7EB] bg-white px-3 text-xs focus:border-[#8E0E1A] focus:outline-none shadow-sm" />

      <textarea name="notes" rows={2} placeholder="Detalles (opcional)…"
        className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-xs focus:border-[#8E0E1A] focus:outline-none shadow-sm resize-none" />

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="block text-[10px] text-[#9CA3AF] mb-1">Fecha/hora (opcional)</label>
          <input type="datetime-local" name="scheduled_at"
            className="h-8 rounded-lg border border-[#E5E7EB] bg-white px-2 text-xs focus:border-[#8E0E1A] focus:outline-none shadow-sm" />
        </div>
        <label className="flex items-center gap-1.5 text-xs text-[#6B7280] cursor-pointer mt-3">
          <input type="checkbox" name="completed" value="true" className="rounded" />
          Completado
        </label>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)}
          className="h-7 px-3 text-xs text-[#6B7280] hover:text-[#0A0A0A]">Cancelar</button>
        <button type="submit" disabled={pending}
          className="h-7 px-3 rounded-lg bg-[#8E0E1A] text-xs font-semibold text-white hover:bg-[#6B0A14] disabled:opacity-50">
          {pending ? "…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}

// ─── Email sender ─────────────────────────────────────────────────────────────

function EmailSender({ prospectoId, email, templates }: { prospectoId: string; email: string | null; templates: EmailTemplate[] }) {
  const [open, setOpen]     = useState(false);
  const [tplId, setTplId]   = useState<string>("");
  const [subject, setSubject] = useState("");
  const [body, setBody]     = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  function applyTemplate(id: string) {
    setTplId(id);
    const t = templates.find(t => t.id === id);
    if (t) { setSubject(t.subject); setBody(t.body_text ?? t.body_html.replace(/<[^>]+>/g, "")); }
  }

  async function send() {
    if (!email || !subject || !body) return;
    setSending(true);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email, subject, body, prospectoId, templateId: tplId || null }),
      });
      const json = await res.json() as { ok?: boolean; error?: string };
      setStatus(json.ok ? "Email enviado correctamente" : `Error: ${json.error}`);
      if (json.ok) { setOpen(false); setSubject(""); setBody(""); }
    } finally {
      setSending(false);
    }
  }

  if (!email) return (
    <div className="text-xs text-[#9CA3AF] italic">Sin email — añade uno para poder enviar.</div>
  );

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#374151] hover:border-[#8E0E1A] hover:text-[#8E0E1A] bg-white transition-colors shadow-sm"
    >
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="3" width="11" height="8" rx="1"/>
        <path d="M1 3l5.5 4L12 3"/>
      </svg>
      Enviar email
    </button>
  );

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[#374151]">Enviar email a {email}</p>
        <button onClick={() => setOpen(false)} className="text-[#9CA3AF] hover:text-[#374151]">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3l8 8M11 3l-8 8" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
      {templates.length > 0 && (
        <div>
          <label className="block text-[10px] text-[#9CA3AF] mb-1">Plantilla</label>
          <select value={tplId} onChange={e => applyTemplate(e.target.value)}
            className="w-full h-8 rounded-lg border border-[#E5E7EB] bg-white px-3 text-xs focus:border-[#8E0E1A] focus:outline-none shadow-sm">
            <option value="">Sin plantilla (email libre)</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      )}
      {templates.length === 0 && (
        <p className="text-[10px] text-[#9CA3AF]">Sin plantillas — el Owner puede crearlas en «Plantillas email».</p>
      )}
      <div>
        <label className="block text-[10px] text-[#9CA3AF] mb-1">Asunto *</label>
        <input value={subject} onChange={e => setSubject(e.target.value)}
          className="w-full h-8 rounded-lg border border-[#E5E7EB] bg-white px-3 text-xs focus:border-[#8E0E1A] focus:outline-none shadow-sm" />
      </div>
      <div>
        <label className="block text-[10px] text-[#9CA3AF] mb-1">Cuerpo *</label>
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={5}
          placeholder="Texto del email…"
          className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-xs focus:border-[#8E0E1A] focus:outline-none shadow-sm resize-none" />
      </div>
      {status && <p className={`text-xs ${status.startsWith("Error") ? "text-red-600" : "text-emerald-700"}`}>{status}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={() => setOpen(false)} className="h-7 px-3 text-xs text-[#6B7280] hover:text-[#0A0A0A]">Cancelar</button>
        <button onClick={send} disabled={sending || !subject || !body}
          className="h-7 px-3 rounded-lg bg-[#8E0E1A] text-xs font-semibold text-white hover:bg-[#6B0A14] disabled:opacity-50 transition-colors">
          {sending ? "Enviando…" : "Enviar"}
        </button>
      </div>
    </div>
  );
}

// ─── Convert to Holded button ─────────────────────────────────────────────────

function ConvertButton({ prospectoId, already }: { prospectoId: string; already: boolean }) {
  const [pending, startT] = useTransition();
  const [result, setResult] = useState<{ ok?: boolean; error?: string } | null>(null);

  if (already) return (
    <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 7l3 3 6-6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Convertido en Holded
    </span>
  );

  return (
    <div className="space-y-1">
      <button
        disabled={pending}
        onClick={() => startT(async () => {
          const r = await convertToHolded(prospectoId);
          setResult({ ok: r?.success, error: r?.error });
        })}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M7 1l4 4-4 4M11 5H3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {pending ? "Enviando a Holded…" : "Convertir a cliente Holded"}
      </button>
      {result?.error && <p className="text-xs text-red-600">{result.error}</p>}
    </div>
  );
}

// ─── Delete button ────────────────────────────────────────────────────────────

function DeleteButton({ prospectoId }: { prospectoId: string }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, startT]     = useTransition();

  if (!confirm) return (
    <button onClick={() => setConfirm(true)}
      className="text-xs text-[#9CA3AF] hover:text-red-600 transition-colors">
      Eliminar prospecto
    </button>
  );

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[#374151]">¿Confirmar?</span>
      <button onClick={() => setConfirm(false)} className="text-xs text-[#6B7280] hover:text-[#0A0A0A]">No</button>
      <button
        disabled={pending}
        onClick={() => startT(() => deleteProspecto(prospectoId))}
        className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
      >
        {pending ? "…" : "Sí, eliminar"}
      </button>
    </div>
  );
}

// ─── Activity icon ────────────────────────────────────────────────────────────

function activityIcon(type: string) {
  const map: Record<string, string> = { note: "📝", call: "📞", meeting: "🤝", email: "✉️", task: "✅" };
  return map[type] ?? "•";
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  prospecto: ProspectoDetail;
  activities: ActivityRow[];
  templates: EmailTemplate[];
  canEdit: boolean;
  isOwner: boolean;
}

export function ProspectoDetailClient({ prospecto: p, activities, templates, canEdit, isOwner }: Props) {
  const [editMode, setEditMode] = useState(false);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Left column — info + actions */}
      <div className="lg:col-span-1 space-y-4">

        {/* Stage */}
        {canEdit && <StageSelector current={p.stage} prospectoId={p.id} />}

        {/* Card */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-bold text-[#0A0A0A] leading-tight">{p.name}</h2>
              {p.company && <p className="text-sm text-[#6B7280] mt-0.5">{p.company}</p>}
            </div>
            {canEdit && !editMode && (
              <button onClick={() => setEditMode(true)}
                className="text-xs text-[#9CA3AF] hover:text-[#8E0E1A] transition-colors px-2 py-1 rounded border border-[#E5E7EB] hover:border-[#8E0E1A]">
                Editar
              </button>
            )}
          </div>

          {editMode ? (
            <EditForm p={p} onClose={() => setEditMode(false)} />
          ) : (
            <dl className="space-y-2">
              {p.email && (
                <div>
                  <dt className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Email</dt>
                  <dd className="text-xs text-[#374151] mt-0.5 break-all">{p.email}</dd>
                </div>
              )}
              {p.phone && (
                <div>
                  <dt className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Teléfono</dt>
                  <dd className="text-xs text-[#374151] mt-0.5">{p.phone}</dd>
                </div>
              )}
              {p.city && (
                <div>
                  <dt className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Ciudad</dt>
                  <dd className="text-xs text-[#374151] mt-0.5">{p.city}</dd>
                </div>
              )}
              <div>
                <dt className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Fuente</dt>
                <dd className="text-xs text-[#374151] mt-0.5 capitalize">{p.source ?? "manual"}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Alta</dt>
                <dd className="text-xs text-[#374151] mt-0.5">{fmtDate(p.created_at)}</dd>
              </div>
              {p.notes && (
                <div>
                  <dt className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Notas</dt>
                  <dd className="text-xs text-[#374151] mt-0.5 whitespace-pre-wrap">{p.notes}</dd>
                </div>
              )}
            </dl>
          )}
        </div>

        {/* Actions */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-3">
          <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Acciones</p>
          <EmailSender prospectoId={p.id} email={p.email} templates={templates} />
          <ConvertButton prospectoId={p.id} already={!!p.holded_contact_id} />
          {(canEdit || isOwner) && <DeleteButton prospectoId={p.id} />}
        </div>
      </div>

      {/* Right column — activity feed */}
      <div className="lg:col-span-2 space-y-4">

        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[#0A0A0A]">Actividad</p>
          <span className="text-xs text-[#9CA3AF]">{activities.length} evento{activities.length !== 1 ? "s" : ""}</span>
        </div>

        {canEdit && <ActivityForm prospectoId={p.id} />}

        {activities.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E5E7EB] py-12 text-center">
            <p className="text-sm text-[#9CA3AF]">Sin actividad registrada.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activities.map(a => (
              <div key={a.id} className="bg-white rounded-xl border border-[#E5E7EB] p-3 flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-[#F9FAFB] flex items-center justify-center text-base">
                  {activityIcon(a.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-[#0A0A0A]">{a.title}</p>
                    <span className="text-[10px] text-[#9CA3AF] whitespace-nowrap tabular-nums shrink-0">{fmtDateTime(a.created_at)}</span>
                  </div>
                  {a.notes && <p className="mt-1 text-xs text-[#6B7280] whitespace-pre-wrap">{a.notes}</p>}
                  <div className="mt-1.5 flex items-center gap-3 flex-wrap">
                    {a.scheduled_at && (
                      <span className="text-[10px] text-[#9CA3AF]">
                        📅 {fmtDateTime(a.scheduled_at)}
                      </span>
                    )}
                    {a.completed_at && (
                      <span className="text-[10px] text-emerald-600 font-medium">✓ Completado</span>
                    )}
                    {a.delegate_name && (
                      <span className="text-[10px] text-[#9CA3AF]">{a.delegate_name}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
