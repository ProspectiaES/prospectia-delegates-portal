"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ContactWithActivity {
  id: string;
  name: string;
  code: string | null;
  email: string | null;
  phone: string | null;
  type: number | null;
  city: string | null;
  tags: string[];
  lastActivityDate: string | null;
  firstInvoiceDate: string | null;
  daysSinceActivity: number | null;
}

interface Props {
  contacts:    ContactWithActivity[];
  periodStart: string;
  periodEnd:   string;
}

// ─── CRM types ────────────────────────────────────────────────────────────────

const TASK_LABELS = [
  "Llamar al cliente",
  "Enviar WhatsApp / mensaje",
  "Enviar email de seguimiento",
  "Enviar muestra o catálogo",
  "Proponer reunión o visita",
  "Hacer visita presencial",
  "Enviar propuesta de precio especial",
  "Informar de novedades del catálogo",
  "Solicitar feedback sobre últimos pedidos",
] as const;
type TaskKey = typeof TASK_LABELS[number];

const KEY_QUESTIONS = [
  "¿Cuál fue la última conversación que tuviste con este cliente y qué quedó pendiente?",
  "¿Qué necesidad específica puedes resolver hoy con tu catálogo actual?",
  "¿Has presentado alguna novedad de producto que pueda despertar su interés?",
  "¿Existe alguna razón concreta por la que este cliente dejó de comprar?",
  "¿Podrías ofrecer una condición especial para reactivar la relación este mes?",
  "¿Cuándo fue la última vez que contactaste a este cliente de forma proactiva?",
] as const;

type CRMStatus = "sin_contactar" | "en_seguimiento" | "reactivado";
interface CRMState {
  tasks:        Set<TaskKey>;
  otrosChecked: boolean;
  otrosText:    string;
  notes:        string;
  status:       CRMStatus;
}

const STATUS_OPTIONS: { value: CRMStatus; label: string; activeCls: string; dotCls: string }[] = [
  { value: "sin_contactar",  label: "Sin contactar",  activeCls: "border-[#9CA3AF] bg-[#F3F4F6] text-[#374151]", dotCls: "bg-[#9CA3AF]" },
  { value: "en_seguimiento", label: "En seguimiento", activeCls: "border-blue-400 bg-blue-50 text-blue-700",      dotCls: "bg-blue-400" },
  { value: "reactivado",     label: "Reactivado",     activeCls: "border-emerald-500 bg-emerald-50 text-emerald-700", dotCls: "bg-emerald-500" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const typeLabel:   Record<number, string>                                          = { 0: "Contacto", 1: "Cliente", 2: "Proveedor", 3: "Acreedor", 4: "Deudor" };
const typeVariant: Record<number, "default" | "success" | "warning" | "neutral"> = { 0: "neutral",  1: "success", 2: "default",   3: "warning",  4: "warning" };

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function dormantSeverity(days: number | null) {
  if (days === null || days >= 999)
    return { label: "Sin actividad", badgeCls: "bg-[#F3F4F6] text-[#6B7280]",       rowCls: "bg-[#F9FAFB]",    dotCls: "bg-[#9CA3AF]",  stripCls: "bg-[#E5E7EB]" };
  if (days > 90)
    return { label: `${days}d`,      badgeCls: "bg-red-100 text-[#8E0E1A]",          rowCls: "bg-red-50/40",    dotCls: "bg-[#8E0E1A]",  stripCls: "bg-[#8E0E1A]" };
  if (days > 60)
    return { label: `${days}d`,      badgeCls: "bg-orange-100 text-orange-700",       rowCls: "bg-orange-50/30", dotCls: "bg-orange-500", stripCls: "bg-orange-500" };
  return   { label: `${days}d`,      badgeCls: "bg-amber-100 text-amber-700",         rowCls: "bg-amber-50/30",  dotCls: "bg-amber-500",  stripCls: "bg-amber-500" };
}

const PAGE_SIZE = 25;

// ─── Pagination ───────────────────────────────────────────────────────────────

function PaginationBar({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-5 py-2.5 border-t border-[#F3F4F6] bg-[#F9FAFB] rounded-b-xl">
      <span className="text-[11px] text-[#9CA3AF]">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}</span>
      <div className="flex gap-1.5">
        <button disabled={page === 1} onClick={() => onPage(page - 1)}
          className="text-[11px] px-2.5 py-1 rounded border border-[#E5E7EB] text-[#6B7280] disabled:opacity-40 hover:border-[#0A0A0A] transition-colors bg-white">
          ← Ant.
        </button>
        <button disabled={page === pages} onClick={() => onPage(page + 1)}
          className="text-[11px] px-2.5 py-1 rounded border border-[#E5E7EB] text-[#6B7280] disabled:opacity-40 hover:border-[#0A0A0A] transition-colors bg-white">
          Sig. →
        </button>
      </div>
    </div>
  );
}

// ─── Section toggle ───────────────────────────────────────────────────────────

function SectionToggle({ open, onToggle, icon, title, count, badgeCls, children: extra }: {
  open: boolean; onToggle: () => void; icon: React.ReactNode;
  title: string; count: number; badgeCls: string; children?: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onToggle}
      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[#F9FAFB] transition-colors text-left">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"
        className={`shrink-0 text-[#9CA3AF] transition-transform duration-200 ${open ? "rotate-90" : ""}`}>
        <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {icon}
      <span className="text-sm font-semibold text-[#374151] flex-1">{title}</span>
      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${badgeCls}`}>{count}</span>
      {extra}
    </button>
  );
}

// ─── Table rows ───────────────────────────────────────────────────────────────

const TABLE_HEADS = ["Nombre", "Código", "Email", "Localidad", "Tipo", "Actividad", ""];

function ContactTable({ rows, renderRow }: { rows: ContactWithActivity[]; renderRow: (c: ContactWithActivity) => React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#E5E7EB]">
            {TABLE_HEADS.map(h => (
              <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap first:px-5">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F3F4F6]">{rows.map(c => renderRow(c))}</tbody>
      </table>
    </div>
  );
}

function ActiveRow({ c }: { c: ContactWithActivity }) {
  return (
    <tr className="hover:bg-[#F9FAFB] transition-colors">
      <td className="px-5 py-2.5 font-medium text-[#0A0A0A] max-w-[180px] truncate">
        <Link href={`/dashboard/clientes/${c.id}`} className="hover:text-[#8E0E1A] transition-colors">{c.name}</Link>
      </td>
      <td className="px-4 py-2.5 text-xs font-mono text-[#6B7280] whitespace-nowrap">{c.code ?? <span className="text-[#D1D5DB]">—</span>}</td>
      <td className="px-4 py-2.5 text-xs text-[#6B7280] max-w-[160px] truncate">
        {c.email ? <a href={`mailto:${c.email}`} className="hover:text-[#8E0E1A]">{c.email}</a> : <span className="text-[#D1D5DB]">—</span>}
      </td>
      <td className="px-4 py-2.5 text-xs text-[#6B7280] whitespace-nowrap">{c.city ?? <span className="text-[#D1D5DB]">—</span>}</td>
      <td className="px-4 py-2.5 whitespace-nowrap">
        {c.type != null ? <Badge variant={typeVariant[c.type] ?? "neutral"}>{typeLabel[c.type] ?? `T${c.type}`}</Badge> : <span className="text-[#D1D5DB] text-xs">—</span>}
      </td>
      <td className="px-4 py-2.5 text-right whitespace-nowrap">
        <span className="text-xs text-emerald-600 font-semibold tabular-nums">hace {c.daysSinceActivity}d</span>
        <p className="text-[10px] text-[#9CA3AF]">{fmtDate(c.lastActivityDate) ?? "—"}</p>
      </td>
      <td className="px-4 py-2.5"><Link href={`/dashboard/clientes/${c.id}`} className="text-xs text-[#6B7280] hover:text-[#8E0E1A]">Ver →</Link></td>
    </tr>
  );
}

function DormantRow({ c }: { c: ContactWithActivity }) {
  const sev = dormantSeverity(c.daysSinceActivity);
  return (
    <tr className={`transition-colors hover:brightness-95 ${sev.rowCls}`}>
      <td className="px-5 py-2.5 font-medium text-[#0A0A0A] max-w-[180px] truncate">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sev.dotCls}`} />
          <Link href={`/dashboard/clientes/${c.id}`} className="hover:text-[#8E0E1A] transition-colors truncate">{c.name}</Link>
        </div>
      </td>
      <td className="px-4 py-2.5 text-xs font-mono text-[#6B7280] whitespace-nowrap">{c.code ?? <span className="text-[#D1D5DB]">—</span>}</td>
      <td className="px-4 py-2.5 text-xs text-[#6B7280] max-w-[160px] truncate">
        {c.email ? <a href={`mailto:${c.email}`} className="hover:text-[#8E0E1A]">{c.email}</a> : <span className="text-[#D1D5DB]">—</span>}
      </td>
      <td className="px-4 py-2.5 text-xs text-[#6B7280] whitespace-nowrap">{c.city ?? <span className="text-[#D1D5DB]">—</span>}</td>
      <td className="px-4 py-2.5 whitespace-nowrap">
        {c.type != null ? <Badge variant={typeVariant[c.type] ?? "neutral"}>{typeLabel[c.type] ?? `T${c.type}`}</Badge> : <span className="text-[#D1D5DB] text-xs">—</span>}
      </td>
      <td className="px-4 py-2.5 text-right whitespace-nowrap">
        <span className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-full ${sev.badgeCls}`}>{sev.label}</span>
        <p className="text-[10px] text-[#9CA3AF] mt-0.5">{fmtDate(c.lastActivityDate) ?? "Sin facturas"}</p>
      </td>
      <td className="px-4 py-2.5"><Link href={`/dashboard/clientes/${c.id}`} className="text-xs text-[#6B7280] hover:text-[#8E0E1A]">Ver →</Link></td>
    </tr>
  );
}

// ─── CRM Card (dormant client) ────────────────────────────────────────────────

function DormantCRMCard({ c, crm, onOpen }: { c: ContactWithActivity; crm: CRMState; onOpen: () => void }) {
  const sev         = dormantSeverity(c.daysSinceActivity);
  const done        = crm.tasks.size + (crm.otrosChecked ? 1 : 0);
  const total       = TASK_LABELS.length + 1; // +1 for Otros
  const statusOpt   = STATUS_OPTIONS.find(o => o.value === crm.status)!;

  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-xl border border-[#E5E7EB] bg-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden group"
    >
      {/* Urgency strip */}
      <div className={`h-1 w-full ${sev.stripCls}`} />

      <div className="p-4">
        {/* Name + badge */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-semibold text-[#0A0A0A] leading-snug truncate">{c.name}</p>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${sev.badgeCls}`}>{sev.label}</span>
        </div>
        {c.city && <p className="text-[11px] text-[#9CA3AF] mb-3">{c.city}</p>}

        {/* Last activity */}
        <p className="text-[11px] text-[#9CA3AF] mb-3 truncate">
          {c.lastActivityDate ? `Último pedido: ${fmtDate(c.lastActivityDate)}` : "Sin actividad registrada"}
        </p>

        {/* Task progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-[#6B7280]">Tareas de seguimiento</span>
            <span className={`text-[11px] font-semibold tabular-nums ${done === total ? "text-emerald-600" : done > 0 ? "text-blue-600" : "text-[#9CA3AF]"}`}>
              {done}/{total}
            </span>
          </div>
          <div className="flex gap-0.5">
            {TASK_LABELS.map((task, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${crm.tasks.has(task) ? "bg-emerald-500" : "bg-[#E5E7EB]"}`} />
            ))}
            <div className={`h-1.5 flex-1 rounded-full transition-colors ${crm.otrosChecked ? "bg-emerald-500" : "bg-[#E5E7EB]"}`} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[#F3F4F6]">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${statusOpt.dotCls}`} />
            <span className="text-[11px] text-[#6B7280]">{statusOpt.label}</span>
          </div>
          <span className="text-[11px] font-semibold text-[#8E0E1A] flex items-center gap-1 group-hover:gap-2 transition-all">
            Abrir
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 13L13 3M13 3H8M13 3v5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── CRM Full-screen modal ────────────────────────────────────────────────────

function ClientCRMModal({ c, crm, onUpdate, onClose }: {
  c: ContactWithActivity;
  crm: CRMState;
  onUpdate: (u: Partial<CRMState>) => void;
  onClose: () => void;
}) {
  const sev   = dormantSeverity(c.daysSinceActivity);
  const done  = crm.tasks.size + (crm.otrosChecked ? 1 : 0);
  const total = TASK_LABELS.length + 1; // +1 for Otros

  const [questionsOpen, setQuestionsOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const toggleTask = (task: TaskKey) => {
    const t = new Set(crm.tasks);
    t.has(task) ? t.delete(task) : t.add(task);
    onUpdate({ tasks: t });
  };

  const allDone = done === total;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">

      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-[#E5E7EB] bg-white shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-sm text-[#6B7280] hover:text-[#0A0A0A] transition-colors font-medium shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M10 4L6 8l4 4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Volver
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-[#0A0A0A] truncate">{c.name}</h2>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sev.badgeCls}`}>{sev.label}</span>
          </div>
          <p className="text-xs text-[#9CA3AF] truncate mt-0.5">
            {[c.city, c.email, c.phone].filter(Boolean).join(" · ")}
          </p>
        </div>

        <Link
          href={`/dashboard/clientes/${c.id}`}
          className="shrink-0 text-xs font-medium text-[#8E0E1A] hover:underline flex items-center gap-1"
        >
          Ver ficha
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 13L13 3M13 3H8M13 3v5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto bg-[#F9FAFB]">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

          {/* Status */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] mb-3">Estado del seguimiento</p>
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onUpdate({ status: opt.value })}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
                    crm.status === opt.value
                      ? opt.activeCls
                      : "bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#9CA3AF]"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${opt.dotCls}`} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Key questions — BEFORE tasks */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
            <button
              type="button"
              onClick={() => setQuestionsOpen(o => !o)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#FFFBF5] transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#D97706" strokeWidth="1.8">
                    <path d="M8 2a6 6 0 100 12A6 6 0 008 2z"/>
                    <path d="M8 7v1.5M8 11h.01" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#374151]">Key questions</p>
                  <p className="text-[11px] font-semibold text-amber-600 mt-0.5">⚠ LEER antes de proceder</p>
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"
                className={`shrink-0 text-[#9CA3AF] transition-transform duration-200 ${questionsOpen ? "rotate-180" : ""}`}>
                <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {questionsOpen && (
              <ol className="divide-y divide-[#F3F4F6] border-t border-[#E5E7EB]">
                {KEY_QUESTIONS.map((q, i) => (
                  <li key={i} className="flex items-start gap-4 px-5 py-4">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-[#374151] leading-relaxed">{q}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Tasks */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">Tareas de seguimiento</p>
              <span className={`text-xs font-semibold tabular-nums px-2.5 py-1 rounded-full ${
                allDone ? "bg-emerald-50 text-emerald-700" : done > 0 ? "bg-blue-50 text-blue-700" : "bg-[#F3F4F6] text-[#9CA3AF]"
              }`}>
                {done}/{total} completadas
              </span>
            </div>

            {/* Progress bar */}
            <div className="flex gap-1 mb-5">
              {TASK_LABELS.map((task, i) => (
                <div key={i} className={`h-2 flex-1 rounded-full transition-colors duration-200 ${crm.tasks.has(task) ? "bg-emerald-500" : "bg-[#E5E7EB]"}`} />
              ))}
              <div className={`h-2 flex-1 rounded-full transition-colors duration-200 ${crm.otrosChecked ? "bg-emerald-500" : "bg-[#E5E7EB]"}`} />
            </div>

            <ul className="space-y-2">
              {TASK_LABELS.map(task => {
                const isChecked = crm.tasks.has(task);
                return (
                  <li key={task}>
                    <label className={`flex items-center gap-4 rounded-xl px-4 py-4 border-2 cursor-pointer transition-all ${
                      isChecked
                        ? "border-emerald-200 bg-emerald-50/50"
                        : "border-[#E5E7EB] bg-white hover:border-[#8E0E1A]/30 hover:bg-[#F9FAFB]"
                    }`}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleTask(task)}
                        className="w-5 h-5 rounded accent-[#8E0E1A] cursor-pointer shrink-0"
                      />
                      <span className={`text-sm flex-1 ${isChecked ? "line-through text-[#9CA3AF]" : "text-[#374151] font-medium"}`}>
                        {task}
                      </span>
                      {isChecked && (
                        <svg className="shrink-0 text-emerald-500" width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M2.5 8.5l4 4 7-8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </label>
                  </li>
                );
              })}

              {/* Otros */}
              <li>
                <div className={`rounded-xl border-2 transition-all ${
                  crm.otrosChecked
                    ? "border-emerald-200 bg-emerald-50/50"
                    : "border-[#E5E7EB] bg-white"
                }`}>
                  <label className="flex items-center gap-4 px-4 py-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={crm.otrosChecked}
                      onChange={() => onUpdate({ otrosChecked: !crm.otrosChecked })}
                      className="w-5 h-5 rounded accent-[#8E0E1A] cursor-pointer shrink-0"
                    />
                    <span className={`text-sm flex-1 font-medium ${crm.otrosChecked ? "text-[#374151]" : "text-[#374151]"}`}>
                      Otros
                    </span>
                    {crm.otrosChecked && (
                      <svg className="shrink-0 text-emerald-500" width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M2.5 8.5l4 4 7-8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </label>
                  {crm.otrosChecked && (
                    <div className="px-4 pb-4">
                      <input
                        type="text"
                        value={crm.otrosText}
                        onChange={e => onUpdate({ otrosText: e.target.value })}
                        placeholder="Describe la acción realizada…"
                        className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm text-[#374151] placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-all bg-white"
                      />
                    </div>
                  )}
                </div>
              </li>
            </ul>

            {allDone && (
              <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-center">
                <p className="text-sm font-semibold text-emerald-700">¡Todas las tareas completadas!</p>
                <p className="text-xs text-emerald-600 mt-0.5">Considera actualizar el estado a «Reactivado» si hubo respuesta positiva.</p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] mb-3">Notas de seguimiento</p>
            <textarea
              value={crm.notes}
              onChange={e => onUpdate({ notes: e.target.value })}
              placeholder="Anota el resultado de la llamada, compromisos acordados, próximos pasos..."
              rows={5}
              className="w-full rounded-xl border border-[#E5E7EB] px-4 py-3 text-sm text-[#374151] placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-all resize-none"
            />
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({ total, activos, dormidos, nuevos, monthLabel, enSeguimiento, reactivados }: {
  total: number; activos: number; dormidos: number; nuevos: number; monthLabel: string;
  enSeguimiento: number; reactivados: number;
}) {
  const activosPct  = total > 0 ? Math.round(activos  / total * 100) : 0;
  const dormidosPct = total > 0 ? Math.round(dormidos / total * 100) : 0;

  const mainTiles = [
    { value: total,    label: "Total",    sub: "clientes",     numCls: "text-[#0A0A0A]",   bg: "bg-white",            border: "border-[#E5E7EB]" },
    { value: activos,  label: "Activos",  sub: "últ. 30 días", numCls: "text-emerald-600", bg: "bg-emerald-50",        border: "border-emerald-100" },
    { value: dormidos, label: "Dormidos", sub: ">30 días",      numCls: dormidos > 0 ? (dormidos / total > 0.6 ? "text-[#8E0E1A]" : "text-amber-600") : "text-[#0A0A0A]",
      bg: dormidos > 0 ? "bg-amber-50" : "bg-white", border: dormidos > 0 ? "border-amber-100" : "border-[#E5E7EB]" },
    { value: nuevos,   label: "Nuevos",   sub: monthLabel,     numCls: nuevos > 0 ? "text-blue-600" : "text-[#9CA3AF]", bg: nuevos > 0 ? "bg-blue-50" : "bg-white", border: nuevos > 0 ? "border-blue-100" : "border-[#E5E7EB]" },
  ] as const;

  return (
    <div className="space-y-3">

      {/* Row 1 — main KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {mainTiles.map(({ value, label, sub, numCls, bg, border }) => (
          <div key={label} className={`rounded-xl border ${border} ${bg} px-4 py-4 flex flex-col items-center text-center shadow-sm`}>
            <p className={`text-3xl font-bold tabular-nums leading-none ${numCls}`}>{value}</p>
            <p className="text-xs font-semibold text-[#374151] mt-2">{label}</p>
            <p className="text-[10px] text-[#9CA3AF] mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Row 2 — ratio + CRM stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

        {/* Ratio bar */}
        <div className="sm:col-span-1 rounded-xl border border-[#E5E7EB] bg-white px-4 py-4 shadow-sm">
          <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-2.5">Distribución</p>
          <div className="h-3 rounded-full overflow-hidden flex">
            <div style={{ width: `${activosPct}%` }} className="bg-emerald-400 transition-all" />
            <div style={{ width: `${dormidosPct}%` }} className="bg-amber-400 transition-all" />
            {activosPct + dormidosPct < 100 && <div className="flex-1 bg-[#E5E7EB]" />}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[11px] font-semibold text-emerald-600">{activosPct}% activos</span>
            <span className="text-[11px] font-semibold text-amber-600">{dormidosPct}% dormidos</span>
          </div>
        </div>

        {/* En seguimiento */}
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-4 flex flex-col items-center text-center shadow-sm">
          <p className="text-3xl font-bold tabular-nums text-blue-600 leading-none">{enSeguimiento}</p>
          <p className="text-xs font-semibold text-[#374151] mt-2">En seguimiento</p>
          <p className="text-[10px] text-[#9CA3AF] mt-0.5">CRM activo</p>
        </div>

        {/* Reactivados */}
        <div className={`rounded-xl border ${reactivados > 0 ? "border-emerald-100 bg-emerald-50" : "border-[#E5E7EB] bg-white"} px-4 py-4 flex flex-col items-center text-center shadow-sm`}>
          <p className={`text-3xl font-bold tabular-nums leading-none ${reactivados > 0 ? "text-emerald-600" : "text-[#9CA3AF]"}`}>{reactivados}</p>
          <p className="text-xs font-semibold text-[#374151] mt-2">Reactivados</p>
          <p className="text-[10px] text-[#9CA3AF] mt-0.5">marcados en CRM</p>
        </div>

      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ClientesActivityList({ contacts, periodStart, periodEnd }: Props) {
  const nuevos   = contacts.filter(c => c.firstInvoiceDate && c.firstInvoiceDate >= periodStart && c.firstInvoiceDate <= periodEnd);
  const activos  = contacts.filter(c => c.daysSinceActivity !== null && c.daysSinceActivity <= 30);
  const dormidos = contacts.filter(c => c.daysSinceActivity === null || c.daysSinceActivity > 30)
    .sort((a, b) => (b.daysSinceActivity ?? 9999) - (a.daysSinceActivity ?? 9999));

  const [crmData, setCrmData] = useState<Map<string, CRMState>>(
    () => new Map(contacts.map(c => [c.id, { tasks: new Set<TaskKey>(), otrosChecked: false, otrosText: "", notes: "", status: "sin_contactar" as CRMStatus }]))
  );
  const [modalId,      setModalId]      = useState<string | null>(null);
  const [nuevosOpen,   setNuevosOpen]   = useState(true);
  const [activosOpen,  setActivosOpen]  = useState(true);
  const [dormidosOpen, setDormidosOpen] = useState(false);
  const [nuevosPage,   setNuevosPage]   = useState(1);
  const [activosPage,  setActivosPage]  = useState(1);
  const [dormidosPage, setDormidosPage] = useState(1);

  const nuevosSlice   = nuevos.slice((nuevosPage - 1)   * PAGE_SIZE, nuevosPage   * PAGE_SIZE);
  const activosSlice  = activos.slice((activosPage - 1)  * PAGE_SIZE, activosPage  * PAGE_SIZE);
  const dormidosSlice = dormidos.slice((dormidosPage - 1) * PAGE_SIZE, dormidosPage * PAGE_SIZE);

  const criticalCount  = dormidos.filter(c => (c.daysSinceActivity ?? 999) > 90).length;
  const monthLabel     = new Date(periodStart).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  const enSeguimiento  = [...crmData.values()].filter(s => s.status === "en_seguimiento").length;
  const reactivados    = [...crmData.values()].filter(s => s.status === "reactivado").length;

  const emptyCRM = (): CRMState => ({ tasks: new Set<TaskKey>(), otrosChecked: false, otrosText: "", notes: "", status: "sin_contactar" as CRMStatus });

  const updateCRM = (id: string, update: Partial<CRMState>) =>
    setCrmData(prev => {
      const next = new Map(prev);
      const cur  = next.get(id) ?? emptyCRM();
      next.set(id, { ...cur, ...update });
      return next;
    });

  const modalClient = modalId ? contacts.find(c => c.id === modalId) ?? null : null;
  const modalCRM    = modalId ? (crmData.get(modalId) ?? emptyCRM()) : null;

  return (
    <>
      {/* Full-screen CRM modal */}
      {modalClient && modalCRM && (
        <ClientCRMModal
          c={modalClient}
          crm={modalCRM}
          onUpdate={u => updateCRM(modalClient.id, u)}
          onClose={() => setModalId(null)}
        />
      )}

      <div className="space-y-4">

        {/* Card 1 — Summary */}
        <SummaryCard
          total={contacts.length}
          activos={activos.length}
          dormidos={dormidos.length}
          nuevos={nuevos.length}
          monthLabel={monthLabel}
          enSeguimiento={enSeguimiento}
          reactivados={reactivados}
        />

        {/* Card 2 — CRM grid for dormant clients */}
        {dormidos.length > 0 && (
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F3F4F6]">
              <div>
                <p className="text-sm font-semibold text-[#374151]">Seguimiento — clientes dormidos</p>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5">Haz clic en un cliente para gestionar sus tareas</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {criticalCount > 0 && (
                  <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-red-50 text-[#8E0E1A]">
                    {criticalCount} crítico{criticalCount !== 1 ? "s" : ""}
                  </span>
                )}
                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
                  {dormidos.length} dormido{dormidos.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {dormidos.map(c => (
                <DormantCRMCard
                  key={c.id}
                  c={c}
                  crm={crmData.get(c.id) ?? emptyCRM()}
                  onOpen={() => setModalId(c.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Nuevos en período */}
        {nuevos.length > 0 && (
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
            <SectionToggle
              open={nuevosOpen} onToggle={() => setNuevosOpen(o => !o)}
              icon={<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#2563EB" strokeWidth="1.6"><circle cx="8" cy="8" r="6"/><path d="M5 8l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              title={`Nuevos en ${monthLabel}`} count={nuevos.length} badgeCls="bg-blue-50 text-blue-700"
            />
            {nuevosOpen && (
              <>
                <ContactTable rows={nuevosSlice} renderRow={c => <ActiveRow key={c.id} c={c} />} />
                <PaginationBar page={nuevosPage} total={nuevos.length} onPage={setNuevosPage} />
              </>
            )}
          </div>
        )}

        {/* Activos */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
          <SectionToggle
            open={activosOpen} onToggle={() => setActivosOpen(o => !o)}
            icon={<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#059669" strokeWidth="1.6"><path d="M2 10l4-4 3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            title="Clientes activos" count={activos.length} badgeCls="bg-emerald-50 text-emerald-700"
          >
            <span className="text-[10px] text-[#9CA3AF] ml-1">últ. 30 días</span>
          </SectionToggle>
          {activosOpen && activos.length > 0 && (
            <>
              <ContactTable rows={activosSlice} renderRow={c => <ActiveRow key={c.id} c={c} />} />
              <PaginationBar page={activosPage} total={activos.length} onPage={setActivosPage} />
            </>
          )}
          {activosOpen && activos.length === 0 && (
            <p className="px-5 py-6 text-xs text-[#9CA3AF] text-center">Ningún cliente con actividad en los últimos 30 días.</p>
          )}
        </div>

        {/* Dormidos — tabla de referencia */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
          <SectionToggle
            open={dormidosOpen} onToggle={() => setDormidosOpen(o => !o)}
            icon={<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke={criticalCount > 0 ? "#8E0E1A" : "#F59E0B"} strokeWidth="1.6"><path d="M8 2v2M8 12v2M3.5 3.5l1.5 1.5M11 11l1.5 1.5M2 8h2M12 8h2M3.5 12.5L5 11M11 5l1.5-1.5" strokeLinecap="round"/></svg>}
            title="Clientes dormidos" count={dormidos.length}
            badgeCls={criticalCount > 0 ? "bg-red-50 text-[#8E0E1A]" : "bg-amber-50 text-amber-700"}
          >
            {criticalCount > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-[#8E0E1A] ml-1">
                {criticalCount} &gt;90d
              </span>
            )}
          </SectionToggle>
          {dormidosOpen && dormidos.length > 0 && (
            <>
              <ContactTable rows={dormidosSlice} renderRow={c => <DormantRow key={c.id} c={c} />} />
              <PaginationBar page={dormidosPage} total={dormidos.length} onPage={setDormidosPage} />
            </>
          )}
          {dormidosOpen && dormidos.length === 0 && (
            <p className="px-5 py-6 text-xs text-[#9CA3AF] text-center">Todos los clientes tienen actividad reciente.</p>
          )}
        </div>

      </div>
    </>
  );
}
