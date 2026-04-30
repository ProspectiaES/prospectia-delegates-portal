"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";

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

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

const typeLabel:   Record<number, string>                                          = { 0: "Contacto", 1: "Cliente", 2: "Proveedor", 3: "Acreedor", 4: "Deudor" };
const typeVariant: Record<number, "default" | "success" | "warning" | "neutral"> = { 0: "neutral",  1: "success", 2: "default",   3: "warning",  4: "warning" };

const TASK_LABELS = [
  "Llamar al cliente",
  "Enviar email de seguimiento",
  "Enviar muestra o catálogo",
  "Proponer reunión o visita",
  "Informar de novedades del catálogo",
] as const;
type TaskKey = typeof TASK_LABELS[number];

const KEY_QUESTIONS = [
  { q: "¿Cuándo fue la última vez que contactaste a cada cliente dormido?", hint: "El primer paso para recuperarlos es volver a conectar. Una llamada de 5 minutos puede reactivar meses de pedidos." },
  { q: "¿Sabes por qué dejaron de comprar?", hint: "Un cliente que no compra tiene una razón: precio, servicio, competencia, o simplemente se olvidó de ti." },
  { q: "¿Qué novedad puedes ofrecer que no hayas mencionado antes?", hint: "Los nuevos lanzamientos o cambios de catálogo son la excusa perfecta para retomar el contacto." },
  { q: "¿Ha cambiado el responsable de compras en alguno de tus clientes?", hint: "La persona con quien tenías relación puede haberse ido. Un nuevo contacto es una nueva oportunidad." },
  { q: "¿Cuánta comisión generarías si reactivaras solo el 20% de tus dormidos?", hint: "Calcula el potencial — suele ser más de lo que imaginas, y ayuda a priorizar a quién llamar primero." },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function dormantSeverity(days: number | null): { label: string; badgeCls: string; rowCls: string; dotCls: string; urgency: string; urgencyCls: string } {
  if (days === null || days >= 999)
    return { label: "Sin actividad", badgeCls: "bg-[#F3F4F6] text-[#6B7280]",       rowCls: "bg-[#F9FAFB]",    dotCls: "bg-[#9CA3AF]",  urgency: "Atención",  urgencyCls: "text-[#6B7280] bg-[#F3F4F6]" };
  if (days > 90)
    return { label: `${days}d`,      badgeCls: "bg-red-50 text-[#8E0E1A]",           rowCls: "bg-red-50/40",    dotCls: "bg-[#8E0E1A]",  urgency: "Crítico",   urgencyCls: "text-[#8E0E1A] bg-red-50" };
  if (days > 60)
    return { label: `${days}d`,      badgeCls: "bg-orange-50 text-orange-700",        rowCls: "bg-orange-50/30", dotCls: "bg-orange-500", urgency: "Urgente",   urgencyCls: "text-orange-600 bg-orange-50" };
  return   { label: `${days}d`,      badgeCls: "bg-amber-50 text-amber-700",          rowCls: "bg-amber-50/30",  dotCls: "bg-amber-500",  urgency: "Atención",  urgencyCls: "text-amber-600 bg-amber-50" };
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function PaginationBar({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-5 py-2.5 border-t border-[#F3F4F6] bg-[#F9FAFB] rounded-b-xl">
      <span className="text-[11px] text-[#9CA3AF]">
        {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}
      </span>
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

// ─── Section header (collapsible) ─────────────────────────────────────────────

function SectionToggle({
  open, onToggle, icon, title, count, badgeCls, children: extraBadge,
}: {
  open: boolean; onToggle: () => void;
  icon: React.ReactNode; title: string; count: number; badgeCls: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[#F9FAFB] transition-colors text-left"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"
        className={`shrink-0 text-[#9CA3AF] transition-transform duration-200 ${open ? "rotate-90" : ""}`}>
        <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {icon}
      <span className="text-sm font-semibold text-[#374151] flex-1">{title}</span>
      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${badgeCls}`}>{count}</span>
      {extraBadge}
    </button>
  );
}

// ─── Contact rows ──────────────────────────────────────────────────────────────

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
      <td className="px-4 py-2.5">
        <Link href={`/dashboard/clientes/${c.id}`} className="text-xs text-[#6B7280] hover:text-[#8E0E1A]">Ver →</Link>
      </td>
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
      <td className="px-4 py-2.5">
        <Link href={`/dashboard/clientes/${c.id}`} className="text-xs text-[#6B7280] hover:text-[#8E0E1A]">Ver →</Link>
      </td>
    </tr>
  );
}

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
        <tbody className="divide-y divide-[#F3F4F6]">
          {rows.map(c => renderRow(c))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Card 1: Summary metrics ──────────────────────────────────────────────────

function SummaryCard({ total, activos, dormidos, nuevos, monthLabel }: {
  total: number; activos: number; dormidos: number; nuevos: number; monthLabel: string;
}) {
  const rows = [
    { label: "Total",             value: String(total),    sub: "asignados",       color: "text-[#0A0A0A]" },
    { label: "Activos",           value: String(activos),  sub: "últ. 30 días",    color: "text-emerald-600" },
    { label: "Dormidos",          value: String(dormidos), sub: ">30 días",         color: dormidos > 0 ? "text-amber-600" : "text-[#0A0A0A]" },
    { label: `Nuevos en ${monthLabel}`, value: String(nuevos), sub: "primer pedido", color: nuevos > 0 ? "text-blue-600" : "text-[#0A0A0A]" },
  ] as const;

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] mb-1">Clientes</p>
      {rows.map(({ label, value, sub, color }) => (
        <div key={label} className="flex items-center justify-between py-2.5 border-b border-[#F3F4F6] last:border-0">
          <span className="text-xs text-[#6B7280]">{label}</span>
          <div className="text-right">
            <span className={`text-sm font-semibold tabular-nums ${color}`}>{value}</span>
            <span className="ml-1.5 text-xs text-[#9CA3AF]">{sub}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Card 2: Dormant tasks checklist ─────────────────────────────────────────

function ClientChecklist({ id, name, days }: { id: string; name: string; days: number | null }) {
  const [open,    setOpen]    = useState(false);
  const [checked, setChecked] = useState<Set<TaskKey>>(new Set());

  const toggle = (task: TaskKey) =>
    setChecked(prev => { const n = new Set(prev); n.has(task) ? n.delete(task) : n.add(task); return n; });

  const done  = checked.size;
  const total = TASK_LABELS.length;
  const sev   = dormantSeverity(days);

  return (
    <div className="border-t border-[#F3F4F6] first:border-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[#F9FAFB] transition-colors text-left"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"
          className={`shrink-0 text-[#9CA3AF] transition-transform duration-150 ${open ? "rotate-90" : ""}`}>
          <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="flex-1 text-sm font-medium text-[#0A0A0A] truncate">{name}</span>
        {done > 0 && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 shrink-0">
            {done}/{total}
          </span>
        )}
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${sev.urgencyCls}`}>
          {sev.urgency} · {sev.label}
        </span>
      </button>
      {open && (
        <div className="px-5 pb-4 pt-0.5 bg-[#FAFAFA] border-t border-[#F3F4F6]">
          <ul className="mt-2 space-y-1">
            {TASK_LABELS.map(task => {
              const isChecked = checked.has(task);
              return (
                <li key={task}>
                  <label className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-white transition-colors cursor-pointer border border-transparent hover:border-[#E5E7EB]">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggle(task)}
                      className="w-4 h-4 rounded border-[#D1D5DB] cursor-pointer shrink-0 accent-[#8E0E1A]"
                    />
                    <span className={`text-sm ${isChecked ? "line-through text-[#9CA3AF]" : "text-[#374151]"}`}>
                      {task}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex items-center justify-between">
            {done === total ? (
              <span className="text-xs font-semibold text-emerald-600">¡Todas las tareas completadas!</span>
            ) : (
              <span className="text-xs text-[#9CA3AF]">{total - done} tarea{total - done !== 1 ? "s" : ""} pendiente{total - done !== 1 ? "s" : ""}</span>
            )}
            <Link href={`/dashboard/clientes/${id}`} className="text-xs font-medium text-[#8E0E1A] hover:underline">Ver ficha →</Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ClientesActivityList({ contacts, periodStart, periodEnd }: Props) {
  const nuevos   = contacts.filter(c => c.firstInvoiceDate && c.firstInvoiceDate >= periodStart && c.firstInvoiceDate <= periodEnd);
  const activos  = contacts.filter(c => c.daysSinceActivity !== null && c.daysSinceActivity <= 30);
  const dormidos = contacts.filter(c => c.daysSinceActivity === null || c.daysSinceActivity > 30)
    .sort((a, b) => (b.daysSinceActivity ?? 9999) - (a.daysSinceActivity ?? 9999));

  const [nuevosOpen,   setNuevosOpen]   = useState(true);
  const [activosOpen,  setActivosOpen]  = useState(true);
  const [dormidosOpen, setDormidosOpen] = useState(true);
  const [nuevosPage,   setNuevosPage]   = useState(1);
  const [activosPage,  setActivosPage]  = useState(1);
  const [dormidosPage, setDormidosPage] = useState(1);

  const nuevosSlice   = nuevos.slice((nuevosPage - 1)   * PAGE_SIZE, nuevosPage   * PAGE_SIZE);
  const activosSlice  = activos.slice((activosPage - 1)  * PAGE_SIZE, activosPage  * PAGE_SIZE);
  const dormidosSlice = dormidos.slice((dormidosPage - 1) * PAGE_SIZE, dormidosPage * PAGE_SIZE);

  const criticalCount = dormidos.filter(c => (c.daysSinceActivity ?? 999) > 90).length;
  const monthLabel    = new Date(periodStart).toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  // Badge for dormant tasks card
  const dormTasksBadge = criticalCount > 0
    ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-[#8E0E1A]">{dormidos.length} dormido{dormidos.length !== 1 ? "s" : ""}</span>
    : dormidos.length > 0
      ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">{dormidos.length} dormido{dormidos.length !== 1 ? "s" : ""}</span>
      : null;

  return (
    <div className="space-y-4">

      {/* Card 1 — Summary metrics */}
      <SummaryCard
        total={contacts.length}
        activos={activos.length}
        dormidos={dormidos.length}
        nuevos={nuevos.length}
        monthLabel={monthLabel}
      />

      {/* Card 2 — Tareas para clientes dormidos */}
      {dormidos.length > 0 && (
        <CollapsibleCard title="Tareas — clientes dormidos" subtitle="Lista de acciones por cliente" badge={dormTasksBadge}>
          <div>
            {dormidos.slice(0, 8).map(c => (
              <ClientChecklist key={c.id} id={c.id} name={c.name} days={c.daysSinceActivity} />
            ))}
            {dormidos.length > 8 && (
              <div className="border-t border-[#F3F4F6] px-5 py-3 text-center">
                <span className="text-xs text-[#9CA3AF]">Mostrando los 8 más urgentes de {dormidos.length} dormidos</span>
              </div>
            )}
          </div>
        </CollapsibleCard>
      )}

      {/* Card 3 — Key questions / suggestions */}
      {dormidos.length > 0 && (
        <CollapsibleCard title="Preguntas clave" subtitle="Para reflexionar y actuar">
          <ul className="divide-y divide-[#F3F4F6]">
            {KEY_QUESTIONS.map(({ q, hint }, i) => (
              <li key={i} className="px-5 py-4">
                <p className="text-sm font-semibold text-[#0A0A0A] leading-snug">{q}</p>
                <p className="mt-1.5 text-xs text-[#6B7280] leading-relaxed">{hint}</p>
              </li>
            ))}
          </ul>
        </CollapsibleCard>
      )}

      {/* Nuevos en período */}
      {nuevos.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
          <SectionToggle
            open={nuevosOpen} onToggle={() => setNuevosOpen(o => !o)}
            icon={<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#059669" strokeWidth="1.6"><circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 1" strokeLinecap="round"/></svg>}
            title={`Nuevos en ${monthLabel}`}
            count={nuevos.length}
            badgeCls="bg-blue-50 text-blue-700"
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
          title="Clientes activos"
          count={activos.length}
          badgeCls="bg-emerald-50 text-emerald-700"
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

      {/* Dormidos */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
        <SectionToggle
          open={dormidosOpen} onToggle={() => setDormidosOpen(o => !o)}
          icon={<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke={criticalCount > 0 ? "#8E0E1A" : "#F59E0B"} strokeWidth="1.6"><path d="M8 2v2M8 12v2M3.5 3.5l1.5 1.5M11 11l1.5 1.5M2 8h2M12 8h2M3.5 12.5L5 11M11 5l1.5-1.5" strokeLinecap="round"/></svg>}
          title="Clientes dormidos"
          count={dormidos.length}
          badgeCls={criticalCount > 0 ? "bg-red-50 text-[#8E0E1A]" : "bg-amber-50 text-amber-700"}
        >
          {criticalCount > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-[#8E0E1A] ml-1">
              {criticalCount} crítico{criticalCount !== 1 ? "s" : ""} &gt;90d
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
  );
}
