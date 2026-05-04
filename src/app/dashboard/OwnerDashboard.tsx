"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SyncButton } from "@/components/SyncButton";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OverdueStats { count: number; total: number; oldestDays: number; avgDays: number }

export interface DelegateRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  is_private: boolean;
  created_at: string;
  clientCount: number;
  affiliateCount: number;
  totalBilled: number;
  pendingAmt: number;
  overdueAmt: number;
}

export interface OwnerKpis {
  period: { year: number; month: number };

  contacts: {
    total:       number;
    active:      number;   // invoice in last 30d
    newInPeriod: number;
    dormant:     number;   // no invoice in last 30d
  };

  billing: {
    emitted: { count: number; total: number };   // date in period, status > 0
    paid:    { count: number; total: number };   // date_paid in period
    pending: { count: number; total: number };   // status = 1
    overdue: OverdueStats;                       // status = 2
  };

  orders: {
    periodCount: number;   // created in period
    inProcess:   number;   // status = 1 (pending)
    shipped:     number;   // status = 2 (approved)
  };

  delegates: {
    total:       number;
    active:      number;   // clients with invoice in last 30d
    newInPeriod: number;
    dormant:     number;
  };

  annual: {
    year:    number;
    units:   number;
    unitsFoc: number;
    base:    number;       // sum subtotal, all emitted YTD
    paid:    { count: number; total: number };
    pending: { count: number; total: number };
    overdue: OverdueStats;
  };

  delegateRows: DelegateRow[];
  lastSyncedAt: string | null;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const fmtNum  = (n: number) => new Intl.NumberFormat("es-ES").format(n);

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

function monthParam(y: number, m: number) {
  return `${y}-${String(m).padStart(2, "0")}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricRow({
  label, value, sub, color = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  color?: "default" | "green" | "amber" | "red" | "muted";
}) {
  const valueClass: Record<string, string> = {
    default: "text-[#0A0A0A]",
    green:   "text-emerald-600",
    amber:   "text-amber-600",
    red:     "text-[#8E0E1A]",
    muted:   "text-[#6B7280]",
  };
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#F3F4F6] last:border-0">
      <span className="text-xs text-[#6B7280]">{label}</span>
      <div className="text-right">
        <span className={`text-sm font-semibold tabular-nums ${valueClass[color]}`}>{value}</span>
        {sub && <span className="ml-1.5 text-xs text-[#9CA3AF]">{sub}</span>}
      </div>
    </div>
  );
}

function SectionCard({ title, children, accent }: {
  title: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm px-5 py-4 flex flex-col gap-0">
      <p className={`text-[11px] font-semibold uppercase tracking-wider mb-1 ${accent ?? "text-[#6B7280]"}`}>
        {title}
      </p>
      {children}
    </div>
  );
}

function AnnualMetric({ label, value, sub, color = "default" }: {
  label: string; value: string; sub?: string;
  color?: "default" | "green" | "amber" | "red" | "muted";
}) {
  const cls: Record<string, string> = {
    default: "text-[#0A0A0A]",
    green:   "text-emerald-600",
    amber:   "text-amber-600",
    red:     "text-[#8E0E1A]",
    muted:   "text-[#6B7280]",
  };
  return (
    <div className="bg-[#F9FAFB] rounded-lg px-4 py-3">
      <p className="text-[11px] text-[#6B7280] uppercase tracking-wide truncate">{label}</p>
      <p className={`mt-1 text-lg font-bold tabular-nums ${cls[color]}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-[#9CA3AF]">{sub}</p>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export function OwnerDashboard({ kpis }: { kpis: OwnerKpis }) {
  const { period, contacts, billing, orders, delegates, annual, delegateRows, lastSyncedAt } = kpis;
  const router = useRouter();

  const now      = new Date();
  const isCurrent = period.year === now.getFullYear() && period.month === now.getMonth() + 1;
  const nowParam  = monthParam(now.getFullYear(), now.getMonth() + 1);
  const curParam  = monthParam(period.year, period.month);

  const prev = period.month === 1
    ? { year: period.year - 1, month: 12 }
    : { year: period.year, month: period.month - 1 };
  const next = period.month === 12
    ? { year: period.year + 1, month: 1 }
    : { year: period.year, month: period.month + 1 };

  function goToMonth(value: string) {
    if (/^\d{4}-\d{2}$/.test(value)) {
      router.push(value === nowParam ? "/dashboard" : `/dashboard?month=${value}`);
    }
  }

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-8">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-[#6B7280] capitalize">{monthLabel(period.year, period.month)}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period navigator */}
          <div className="flex items-center rounded-lg border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
            <Link
              href={`/dashboard?month=${monthParam(prev.year, prev.month)}`}
              className="h-9 w-8 flex items-center justify-center text-[#6B7280] hover:bg-[#F3F4F6] transition-colors border-r border-[#E5E7EB]"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8.5 10.5L5 7l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <div className="relative w-[140px]">
              <span className="h-9 px-3 text-xs font-semibold text-[#374151] capitalize flex items-center pointer-events-none select-none">
                {monthLabel(period.year, period.month)}
              </span>
              <input
                type="month"
                value={curParam}
                max={nowParam}
                onChange={(e) => goToMonth(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </div>
            <Link
              href={`/dashboard?month=${monthParam(next.year, next.month)}`}
              className={[
                "h-9 w-8 flex items-center justify-center text-[#6B7280] transition-colors border-l border-[#E5E7EB]",
                isCurrent ? "opacity-30 pointer-events-none" : "hover:bg-[#F3F4F6]",
              ].join(" ")}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M5.5 10.5L9 7 5.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
          {!isCurrent && (
            <Link
              href="/dashboard"
              className="h-9 px-3 rounded-lg border border-[#E5E7EB] bg-white text-xs font-medium text-[#6B7280] hover:text-[#0A0A0A] hover:border-[#0A0A0A] transition-colors shadow-sm flex items-center"
            >
              Hoy
            </Link>
          )}
          <SyncButton lastSyncedAt={lastSyncedAt} endpoint="/api/holded/sync" label="Sincronizar" />
        </div>
      </div>

      {/* ── KPI Grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Clientes */}
        <SectionCard title="Clientes">
          <MetricRow label="Total"           value={fmtNum(contacts.total)} />
          <MetricRow label="Activos"         value={fmtNum(contacts.active)}      color="green" sub="últ. 30 días" />
          <MetricRow label="Nuevos en mes"   value={fmtNum(contacts.newInPeriod)} />
          <MetricRow label="Dormidos"        value={fmtNum(contacts.dormant)}     color={contacts.dormant > 0 ? "amber" : "default"} sub=">30 días" />
        </SectionCard>

        {/* Facturación */}
        <SectionCard title="Facturación" accent="text-[#6B7280]">
          <MetricRow
            label="Emitidas en período"
            value={fmtEuro(billing.emitted.total)}
            sub={`${fmtNum(billing.emitted.count)} fact.`}
          />
          <MetricRow
            label="Cobradas en período"
            value={fmtEuro(billing.paid.total)}
            sub={`${fmtNum(billing.paid.count)} fact.`}
            color="green"
          />
          <MetricRow
            label="Pendientes"
            value={fmtEuro(billing.pending.total)}
            sub={`${fmtNum(billing.pending.count)} fact.`}
            color="amber"
          />
          <MetricRow
            label="Vencidas"
            value={fmtEuro(billing.overdue.total)}
            sub={billing.overdue.count > 0
              ? `${billing.overdue.count} · ${billing.overdue.oldestDays}d máx · ${billing.overdue.avgDays}d media`
              : "0 fact."}
            color={billing.overdue.count > 0 ? "red" : "default"}
          />
        </SectionCard>

        {/* Pedidos */}
        <SectionCard title="Pedidos">
          <MetricRow label="Introducidos en período" value={fmtNum(orders.periodCount)} />
          <MetricRow label="En proceso"              value={fmtNum(orders.inProcess)}   color="amber" />
          <MetricRow label="Aprobados / listos"      value={fmtNum(orders.shipped)}     color="green" />
        </SectionCard>

        {/* Delegados */}
        <SectionCard title="Delegados">
          <MetricRow label="Total"         value={fmtNum(delegates.total)} />
          <MetricRow label="Activos"       value={fmtNum(delegates.active)}      color="green" sub="clientes c/ actividad" />
          <MetricRow label="Nuevos en mes" value={fmtNum(delegates.newInPeriod)} />
          <MetricRow label="Dormidos"      value={fmtNum(delegates.dormant)}     color={delegates.dormant > 0 ? "amber" : "default"} />
        </SectionCard>
      </div>

      {/* ── Anual ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] mb-4">
          Acumulado {annual.year} — desde 1 de enero
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <AnnualMetric
            label="Unidades vendidas"
            value={fmtNum(annual.units)}
          />
          <AnnualMetric
            label="Unidades FOC"
            value={fmtNum(annual.unitsFoc)}
            color="muted"
          />
          <AnnualMetric
            label="Base imponible total"
            value={fmtEuro(annual.base)}
          />
          <AnnualMetric
            label="Cobradas"
            value={fmtEuro(annual.paid.total)}
            sub={`${fmtNum(annual.paid.count)} facturas`}
            color="green"
          />
          <AnnualMetric
            label="Pendientes"
            value={fmtEuro(annual.pending.total)}
            sub={`${fmtNum(annual.pending.count)} facturas`}
            color="amber"
          />
          <AnnualMetric
            label="Vencidas"
            value={fmtEuro(annual.overdue.total)}
            sub={annual.overdue.count > 0
              ? `${annual.overdue.count} · ${annual.overdue.oldestDays}d máx · ${annual.overdue.avgDays}d med.`
              : "0 facturas"}
            color={annual.overdue.count > 0 ? "red" : "default"}
          />
        </div>
      </div>

      {/* ── Tabla de delegados ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F3F4F6]">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">Delegados</p>
          <Link href="/dashboard/delegados" className="text-xs font-medium text-[#8E0E1A] hover:underline">
            Ver todos →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                {["Nombre", "Contacto", "Clientes", "Afiliados", "Total facturado", "Pendiente", "Vencido", "Alta", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {delegateRows.map(d => (
                <tr key={d.id} className="hover:bg-[#F9FAFB] transition-colors">
                  <td className="px-4 py-3 font-medium text-[#0A0A0A] whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/delegados/${d.id}`} className="hover:text-[#8E0E1A] transition-colors">
                        {d.name}
                      </Link>
                      {d.is_private && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#F3F4F6] text-[#6B7280] uppercase tracking-wide">Privado</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6B7280]">
                    {d.email && <p>{d.email}</p>}
                    {d.phone && <p>{d.phone}</p>}
                    {!d.email && !d.phone && <span className="text-[#D1D5DB]">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center rounded-full bg-[#F3F4F6] text-[#374151] text-xs font-semibold px-2.5 py-0.5 min-w-[28px]">
                      {d.clientCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center rounded-full bg-[#F3F4F6] text-[#374151] text-xs font-semibold px-2.5 py-0.5 min-w-[28px]">
                      {d.affiliateCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums whitespace-nowrap font-semibold text-[#0A0A0A]">
                    {fmtEuro(d.totalBilled)}
                  </td>
                  <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                    <span className={d.pendingAmt > 0 ? "text-[#F59E0B] font-medium" : "text-[#9CA3AF]"}>
                      {fmtEuro(d.pendingAmt)}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                    <span className={d.overdueAmt > 0 ? "text-[#8E0E1A] font-medium" : "text-[#9CA3AF]"}>
                      {fmtEuro(d.overdueAmt)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6B7280] whitespace-nowrap">{fmtDate(d.created_at)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link href={`/dashboard/delegados/${d.id}`} className="text-xs font-medium text-[#6B7280] hover:text-[#8E0E1A] transition-colors">
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Accesos rápidos ───────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/clientes" className="h-9 px-5 rounded-lg border border-[#E5E7EB] text-sm font-medium text-[#374151] hover:bg-[#F3F4F6] transition-colors">
          Ver clientes →
        </Link>
        <Link href="/dashboard/facturas" className="h-9 px-5 rounded-lg border border-[#E5E7EB] text-sm font-medium text-[#374151] hover:bg-[#F3F4F6] transition-colors">
          Ver facturas →
        </Link>
      </div>

    </div>
  );
}
