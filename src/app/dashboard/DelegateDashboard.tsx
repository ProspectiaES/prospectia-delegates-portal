"use client";

import { useState } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InvoiceRow {
  id: string;
  doc_number: string | null;
  contact_id: string | null;
  contact_name: string | null;
  date: string;
  due_date: string | null;
  date_last_modified: string | null;
  date_paid: string | null;
  total: number;
  status: number;
}

export interface DelegateDashboardProps {
  period:          { year: number; month: number };
  totalClients:    number;
  newClients:      number;
  dormantClients:  number;
  emittedCount:    number;
  emittedTotal:    number;
  paidCount:       number;
  paidTotal:       number;
  overdueCount:    number;
  overdueTotal:    number;
  pendingCount:    number;
  pendingTotal:    number;
  ordersCount:     number;
  ordersBilled:    number;
  ordersInProcess: number;
  overdueRows:     InvoiceRow[];
  pendingRows:     InvoiceRow[];
  paidRows:        InvoiceRow[];
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const fmtNum = (n: number) => new Intl.NumberFormat("es-ES").format(n);

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function effectiveDue(row: InvoiceRow): Date {
  return new Date(row.due_date ?? row.date);
}

function daysAgo(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

function daysUntil(date: Date): number {
  return Math.floor((date.getTime() - Date.now()) / 86_400_000);
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

function prevMonth(year: number, month: number) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

function nextMonth(year: number, month: number) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

function monthParam(y: number, m: number) {
  return `${y}-${String(m).padStart(2, "0")}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, variant = "default", clickable = false, onClick,
}: {
  label: string;
  value: string;
  sub?: string;
  variant?: "default" | "danger" | "success" | "warning";
  clickable?: boolean;
  onClick?: () => void;
}) {
  const borderColor = {
    default: "border-[#E5E7EB]",
    danger:  "border-[#8E0E1A]/30",
    success: "border-emerald-200",
    warning: "border-amber-200",
  }[variant];

  const valueColor = {
    default: "text-[#0A0A0A]",
    danger:  "text-[#8E0E1A]",
    success: "text-emerald-700",
    warning: "text-amber-700",
  }[variant];

  const accent = {
    default: "",
    danger:  "bg-[#8E0E1A]",
    success: "bg-emerald-500",
    warning: "bg-amber-400",
  }[variant];

  return (
    <div
      onClick={onClick}
      className={[
        "relative rounded-xl border bg-white px-5 py-4 flex flex-col gap-2 overflow-hidden shadow-sm",
        borderColor,
        clickable ? "cursor-pointer hover:shadow-md transition-shadow" : "",
      ].join(" ")}
    >
      {variant !== "default" && accent && (
        <span className={`absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full ${accent}`} aria-hidden />
      )}
      <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest pl-1">{label}</p>
      <p className={`text-[1.75rem] font-bold leading-none tabular-nums ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-[#6B7280]">{sub}</p>}
      {clickable && (
        <svg className="absolute top-4 right-4 text-[#D1D5DB]" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4.5 9l3-3-3-3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest px-0.5">
      {children}
    </p>
  );
}

type AccordionKey = "overdue" | "pending" | "paid" | null;

function AccordionPanel({
  id, open, onToggle, title, badge, badgeVariant = "neutral", count, total, children,
}: {
  id: AccordionKey;
  open: boolean;
  onToggle: () => void;
  title: string;
  badge?: string;
  badgeVariant?: "danger" | "warning" | "success" | "neutral";
  count: number;
  total: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;

  const badgeColors = {
    danger:  "bg-[#FEF2F2] text-[#8E0E1A]",
    warning: "bg-amber-50 text-amber-700",
    success: "bg-emerald-50 text-emerald-700",
    neutral: "bg-[#F3F4F6] text-[#6B7280]",
  }[badgeVariant];

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#FAFAFA] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[#0A0A0A]">{title}</span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${badgeColors}`}>
            {count}
          </span>
          {badge && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${badgeColors}`}>
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-[#0A0A0A] tabular-nums">{fmtEuro(total)}</span>
          <svg
            width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor"
            strokeWidth="1.5" className={`text-[#9CA3AF] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          >
            <path d="M2.5 5.5l4.5 4 4.5-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="border-t border-[#F3F4F6] overflow-x-auto">
          {children}
        </div>
      )}
    </div>
  );
}

function InvoiceTable({
  rows,
  mode,
}: {
  rows: InvoiceRow[];
  mode: "overdue" | "pending" | "paid";
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-[#F3F4F6] bg-[#FAFAFA]">
          <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider whitespace-nowrap">Fecha</th>
          <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider whitespace-nowrap">Nº Factura</th>
          <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Cliente</th>
          <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider whitespace-nowrap">Importe</th>
          {mode === "overdue" && <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider whitespace-nowrap">Vencimiento</th>}
          {mode === "overdue" && <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider whitespace-nowrap">Días vencido</th>}
          {mode === "pending" && <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider whitespace-nowrap">Vencimiento</th>}
          {mode === "pending" && <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider whitespace-nowrap">Días restantes</th>}
          {mode === "paid"    && <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider whitespace-nowrap">Fecha cobro</th>}
        </tr>
      </thead>
      <tbody className="divide-y divide-[#F3F4F6]">
        {rows.map(row => {
          const due = effectiveDue(row);
          return (
            <tr key={row.id} className="hover:bg-[#FAFAFA] transition-colors">
              <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap tabular-nums">{fmtDate(row.date)}</td>
              <td className="px-4 py-3 font-mono text-[12px] font-semibold text-[#0A0A0A] whitespace-nowrap">
                {row.doc_number ?? <span className="text-[#D1D5DB]">—</span>}
              </td>
              <td className="px-4 py-3 text-[#374151] max-w-[180px] truncate">{row.contact_name ?? "—"}</td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums text-[#0A0A0A] whitespace-nowrap">{fmtEuro(row.total)}</td>

              {mode === "overdue" && (
                <>
                  <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap tabular-nums">{fmtDate(row.due_date ?? row.date)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF2F2] text-[#8E0E1A]">
                      {daysAgo(due)} días
                    </span>
                  </td>
                </>
              )}
              {mode === "pending" && (
                <>
                  <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap tabular-nums">{fmtDate(row.due_date ?? row.date)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {row.due_date ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700">
                        {Math.max(0, daysUntil(due))} días
                      </span>
                    ) : (
                      <span className="text-[#9CA3AF] text-xs">—</span>
                    )}
                  </td>
                </>
              )}
              {mode === "paid" && (
                <td className="px-4 py-3 text-emerald-700 whitespace-nowrap tabular-nums font-medium">
                  {fmtDate(row.date_paid ?? row.date_last_modified ?? null)}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DelegateDashboard(props: DelegateDashboardProps) {
  const {
    period,
    totalClients, newClients, dormantClients,
    emittedCount, emittedTotal,
    paidCount, paidTotal,
    overdueCount, overdueTotal,
    pendingCount, pendingTotal,
    ordersCount, ordersBilled, ordersInProcess,
    overdueRows, pendingRows, paidRows,
  } = props;

  const [openPanel, setOpenPanel] = useState<AccordionKey>(
    overdueCount > 0 ? "overdue" : null
  );

  function toggle(key: AccordionKey) {
    setOpenPanel(prev => prev === key ? null : key);
  }

  const prev = prevMonth(period.year, period.month);
  const next = nextMonth(period.year, period.month);
  const isCurrentMonth = (() => {
    const now = new Date();
    return period.year === now.getFullYear() && period.month === now.getMonth() + 1;
  })();

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-[#6B7280] capitalize">{monthLabel(period.year, period.month)}</p>
        </div>

        {/* Period navigator */}
        <div className="flex items-center gap-1 rounded-lg border border-[#E5E7EB] bg-white overflow-hidden shadow-sm">
          <Link
            href={`/dashboard?month=${monthParam(prev.year, prev.month)}`}
            className="h-8 w-8 flex items-center justify-center text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8.5 10.5L5 7l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
          <span className="px-3 text-xs font-semibold text-[#374151] capitalize whitespace-nowrap">
            {new Date(period.year, period.month - 1, 1).toLocaleDateString("es-ES", { month: "short", year: "2-digit" })}
          </span>
          <Link
            href={`/dashboard?month=${monthParam(next.year, next.month)}`}
            className={[
              "h-8 w-8 flex items-center justify-center text-[#6B7280] transition-colors",
              isCurrentMonth ? "opacity-30 pointer-events-none" : "hover:bg-[#F3F4F6]",
            ].join(" ")}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5.5 10.5L9 7 5.5 3.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
        </div>
      </div>

      {/* ── Clientes ─────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionLabel>Clientes</SectionLabel>
        <div className="grid grid-cols-3 gap-4">
          <KpiCard label="Clientes activos"  value={fmtNum(totalClients)}   sub="en cartera" />
          <KpiCard label="Nuevos en período" value={fmtNum(newClients)}     sub="alta en este mes" />
          <KpiCard label="Dormidos"          value={fmtNum(dormantClients)} sub="sin factura >90 días" variant={dormantClients > 0 ? "warning" : "default"} />
        </div>
      </section>

      {/* ── Facturación ──────────────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionLabel>Facturación</SectionLabel>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Emitidas en período" value={fmtNum(emittedCount)}  sub={fmtEuro(emittedTotal)} />
          <KpiCard label="Cobradas en período" value={fmtNum(paidCount)}     sub={fmtEuro(paidTotal)}   variant="success"
            clickable={paidCount > 0} onClick={() => toggle("paid")} />
          <KpiCard label="Pendientes"          value={fmtNum(pendingCount)}  sub={fmtEuro(pendingTotal)} variant="warning"
            clickable={pendingCount > 0} onClick={() => toggle("pending")} />
          <KpiCard label="Vencidas"            value={fmtNum(overdueCount)}  sub={fmtEuro(overdueTotal)} variant="danger"
            clickable={overdueCount > 0} onClick={() => toggle("overdue")} />
        </div>
      </section>

      {/* ── Pedidos ───────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionLabel>Pedidos</SectionLabel>
        <div className="grid grid-cols-3 gap-4">
          <KpiCard label="Introducidos en período" value={fmtNum(ordersCount)}     sub="total pedidos" />
          <KpiCard label="Facturados"              value={fmtNum(ordersBilled)}    sub="convertidos a factura" variant="success" />
          <KpiCard label="En proceso"              value={fmtNum(ordersInProcess)} sub="pendientes de facturar" />
        </div>
      </section>

      {/* ── Acciones rápidas ─────────────────────────────────────────── */}
      <section className="flex gap-3">
        <Link
          href="/dashboard/pedidos/nuevo"
          className="h-9 px-5 rounded-lg bg-[#8E0E1A] text-sm font-semibold text-white hover:bg-[#6B0A14] transition-colors shadow-sm flex items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path d="M7 2v10M2 7h10" strokeLinecap="round" />
          </svg>
          Crear pedido
        </Link>
        <Link
          href="/dashboard/clientes"
          className="h-9 px-5 rounded-lg border border-[#E5E7EB] text-sm font-medium text-[#374151] hover:bg-[#F3F4F6] transition-colors flex items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <circle cx="7" cy="5" r="2.5" />
            <path d="M2 12c0-2.761 2.239-5 5-5s5 2.239 5 5" strokeLinecap="round" />
          </svg>
          Nuevo cliente
        </Link>
      </section>

      {/* ── Listados desplegables ────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionLabel>Detalle de facturas</SectionLabel>

        {/* Vencidas */}
        <AccordionPanel
          id="overdue"
          open={openPanel === "overdue"}
          onToggle={() => toggle("overdue")}
          title="Facturas vencidas"
          badge="Requiere atención"
          badgeVariant="danger"
          count={overdueCount}
          total={overdueTotal}
        >
          <InvoiceTable rows={overdueRows} mode="overdue" />
        </AccordionPanel>

        {/* Pendientes */}
        <AccordionPanel
          id="pending"
          open={openPanel === "pending"}
          onToggle={() => toggle("pending")}
          title="Facturas pendientes de cobro"
          badgeVariant="warning"
          count={pendingCount}
          total={pendingTotal}
        >
          <InvoiceTable rows={pendingRows} mode="pending" />
        </AccordionPanel>

        {/* Cobradas en período */}
        <AccordionPanel
          id="paid"
          open={openPanel === "paid"}
          onToggle={() => toggle("paid")}
          title="Facturas cobradas en período"
          badgeVariant="success"
          count={paidCount}
          total={paidTotal}
        >
          <InvoiceTable rows={paidRows} mode="paid" />
        </AccordionPanel>

        {overdueCount === 0 && pendingCount === 0 && paidCount === 0 && (
          <div className="rounded-xl border border-[#E5E7EB] bg-white px-6 py-10 text-center shadow-sm">
            <p className="text-sm text-[#6B7280]">Sin facturas para este período.</p>
          </div>
        )}
      </section>
    </div>
  );
}
