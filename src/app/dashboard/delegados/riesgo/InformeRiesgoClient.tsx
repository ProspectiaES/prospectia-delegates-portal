"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InvRiesgo {
  id: string;
  docNumber: string;
  contactId: string | null;
  contactName: string;
  total: number;
  outstanding: number;
  dueDate: string | null;
  daysOverdue?: number;
  daysUntilDue?: number;
}

export interface DelegateRiesgo {
  id: string;
  name: string;
  vencidas: InvRiesgo[];
  pendientes: InvRiesgo[];
}

interface Props {
  delegates: DelegateRiesgo[];
  lastSyncAt: string | null;
  isOwner: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

const fmtDateTime = (s: string | null) =>
  s ? new Date(s).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

function overdueBadge(days: number): { cls: string; label: string } {
  if (days > 60) return { cls: "bg-[#8E0E1A] text-white",   label: `+${days}d` };
  if (days > 30) return { cls: "bg-red-200 text-red-900",   label: `+${days}d` };
  return               { cls: "bg-red-100 text-[#8E0E1A]",  label: `+${days}d` };
}

function pendingBadge(days: number | null | undefined): { cls: string; label: string } {
  if (days == null)  return { cls: "bg-[#F3F4F6] text-[#6B7280]",  label: "—" };
  if (days <= 0)     return { cls: "bg-[#8E0E1A] text-white",       label: "Hoy" };
  if (days <= 7)     return { cls: "bg-red-100 text-[#8E0E1A]",     label: `${days}d` };
  if (days <= 30)    return { cls: "bg-amber-100 text-amber-700",   label: `${days}d` };
  return                    { cls: "bg-green-100 text-green-700",   label: `${days}d` };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function VencidasTable({ rows }: { rows: InvRiesgo[] }) {
  const total = rows.reduce((s, r) => s + r.outstanding, 0);
  return (
    <div>
      <div className="flex items-center justify-between px-4 py-2 bg-red-50 border-b border-red-100">
        <span className="text-[10px] font-bold text-[#8E0E1A] uppercase tracking-wider">Vencidas</span>
        <span className="text-xs font-bold text-[#8E0E1A] tabular-nums">{fmtEuro(total)}</span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
            {["Factura", "Cliente", "Total factura", "Pendiente real", "F. Vencimiento", "Días vencida"].map(h => (
              <th key={h} className="px-4 py-2 text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F3F4F6]">
          {rows.map(r => {
            const badge = overdueBadge(r.daysOverdue ?? 0);
            return (
              <tr key={r.id} className="hover:bg-red-50/40 transition-colors">
                <td className="px-4 py-2.5 font-mono text-xs font-semibold text-[#0A0A0A] whitespace-nowrap">
                  <Link href={`/dashboard/facturas/${r.id}`} className="hover:text-[#8E0E1A] print:no-underline">
                    {r.docNumber}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-[#374151] max-w-[180px] truncate">
                  {r.contactId
                    ? <Link href={`/dashboard/clientes/${r.contactId}`} className="hover:text-[#8E0E1A] print:no-underline">{r.contactName}</Link>
                    : r.contactName}
                </td>
                <td className="px-4 py-2.5 text-[#6B7280] tabular-nums whitespace-nowrap">{fmtEuro(r.total)}</td>
                <td className="px-4 py-2.5 tabular-nums whitespace-nowrap">
                  <span className="font-semibold text-[#0A0A0A]">{fmtEuro(r.outstanding)}</span>
                  {r.total > r.outstanding + 0.02 && (
                    <p className="text-[9px] text-[#9CA3AF]">pag. parcial</p>
                  )}
                </td>
                <td className="px-4 py-2.5 text-[#6B7280] whitespace-nowrap tabular-nums">{fmtDate(r.dueDate)}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.cls}`}>
                    {badge.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PendientesTable({ rows }: { rows: InvRiesgo[] }) {
  const total = rows.reduce((s, r) => s + r.outstanding, 0);
  return (
    <div>
      <div className="flex items-center justify-between px-4 py-2 bg-amber-50 border-b border-amber-100">
        <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Pendientes</span>
        <span className="text-xs font-bold text-amber-700 tabular-nums">{fmtEuro(total)}</span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
            {["Factura", "Cliente", "Total factura", "Pendiente real", "F. Vencimiento", "Faltan"].map(h => (
              <th key={h} className="px-4 py-2 text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F3F4F6]">
          {rows.map(r => {
            const badge = pendingBadge(r.daysUntilDue);
            return (
              <tr key={r.id} className="hover:bg-amber-50/40 transition-colors">
                <td className="px-4 py-2.5 font-mono text-xs font-semibold text-[#0A0A0A] whitespace-nowrap">
                  <Link href={`/dashboard/facturas/${r.id}`} className="hover:text-[#8E0E1A] print:no-underline">
                    {r.docNumber}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-[#374151] max-w-[180px] truncate">
                  {r.contactId
                    ? <Link href={`/dashboard/clientes/${r.contactId}`} className="hover:text-[#8E0E1A] print:no-underline">{r.contactName}</Link>
                    : r.contactName}
                </td>
                <td className="px-4 py-2.5 text-[#6B7280] tabular-nums whitespace-nowrap">{fmtEuro(r.total)}</td>
                <td className="px-4 py-2.5 tabular-nums whitespace-nowrap">
                  <span className="font-semibold text-[#0A0A0A]">{fmtEuro(r.outstanding)}</span>
                  {r.total > r.outstanding + 0.02 && (
                    <p className="text-[9px] text-[#9CA3AF]">pag. parcial</p>
                  )}
                </td>
                <td className="px-4 py-2.5 text-[#6B7280] whitespace-nowrap tabular-nums">{fmtDate(r.dueDate)}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.cls}`}>
                    {badge.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function InformeRiesgoClient({ delegates, lastSyncAt, isOwner }: Props) {
  const [selected, setSelected] = useState<string>("all");

  const visible = useMemo(
    () => selected === "all" ? delegates : delegates.filter(d => d.id === selected),
    [delegates, selected]
  );

  const kpis = useMemo(() => {
    let vencido = 0, pendiente = 0, critico = 0;
    for (const d of visible) {
      for (const inv of d.vencidas)   vencido   += inv.outstanding;
      for (const inv of d.pendientes) {
        pendiente += inv.outstanding;
        if ((inv.daysUntilDue ?? 999) <= 7) critico++;
      }
    }
    return { vencido, pendiente, critico, total: vencido + pendiente };
  }, [visible]);

  const delegatesWithRisk = visible.filter(d => d.vencidas.length > 0 || d.pendientes.length > 0);

  return (
    <>
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          @page { margin: 1.5cm; size: A4; }
          body { font-size: 10px; }
        }
      `}</style>

      <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 print:hidden">
          <Link href="/dashboard/delegados" className="text-xs text-[#9CA3AF] hover:text-[#8E0E1A] transition-colors">
            ← Delegados
          </Link>
          <div className="flex items-center gap-2">
            {isOwner && delegates.length > 1 && (
              <>
                <select
                  value={selected}
                  onChange={e => setSelected(e.target.value)}
                  className="h-9 text-sm border border-[#E5E7EB] rounded-lg px-3 bg-white focus:outline-none focus:ring-1 focus:ring-[#8E0E1A]"
                >
                  <option value="all">Tots els delegats</option>
                  {delegates.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <span className="text-xs text-[#6B7280] whitespace-nowrap">
                  {selected === "all" ? delegates.length : 1} delegado{delegates.length !== 1 ? "s" : ""}
                </span>
              </>
            )}
            <button
              onClick={() => window.print()}
              className="h-9 px-4 rounded-lg border border-[#E5E7EB] text-sm font-medium text-[#374151] hover:bg-[#F9FAFB] transition-colors flex items-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Imprimir
            </button>
          </div>
        </div>

        {/* Report header */}
        <div className="border-b-2 border-[#0A0A0A] pb-4">
          <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Informe de riesgo</h1>
          <p className="text-xs text-[#9CA3AF] mt-1">
            Reflejo exacto de Holded
            {lastSyncAt && ` · ${fmtDateTime(lastSyncAt)}`}
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border-2 border-red-200 px-4 py-3">
            <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Vencido</p>
            <p className="mt-1 text-2xl font-bold text-[#8E0E1A] tabular-nums leading-tight">{fmtEuro(kpis.vencido)}</p>
            <p className="text-[10px] text-[#9CA3AF] mt-0.5">
              {visible.reduce((s, d) => s + d.vencidas.length, 0)} factura{visible.reduce((s, d) => s + d.vencidas.length, 0) !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="rounded-xl border-2 border-amber-200 px-4 py-3">
            <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Pendiente</p>
            <p className="mt-1 text-2xl font-bold text-amber-700 tabular-nums leading-tight">{fmtEuro(kpis.pendiente)}</p>
            <p className="text-[10px] text-[#9CA3AF] mt-0.5">
              {visible.reduce((s, d) => s + d.pendientes.length, 0)} factura{visible.reduce((s, d) => s + d.pendientes.length, 0) !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="rounded-xl border-2 border-[#E5E7EB] px-4 py-3">
            <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Crítico (&lt;7 días)</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums leading-tight ${kpis.critico > 0 ? "text-[#8E0E1A]" : "text-[#9CA3AF]"}`}>
              {kpis.critico}
            </p>
            <p className="text-[10px] text-[#9CA3AF] mt-0.5">próximas a vencer</p>
          </div>
          <div className="rounded-xl border-2 border-[#0A0A0A] px-4 py-3">
            <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Exposición total</p>
            <p className="mt-1 text-2xl font-bold text-[#0A0A0A] tabular-nums leading-tight">{fmtEuro(kpis.total)}</p>
            <p className="text-[10px] text-[#9CA3AF] mt-0.5">saldo pendiente real</p>
          </div>
        </div>

        {/* No risk */}
        {delegatesWithRisk.length === 0 && (
          <div className="rounded-xl border border-[#E5E7EB] bg-white px-6 py-12 text-center">
            <p className="text-sm font-medium text-[#0A0A0A]">Sin facturas de riesgo.</p>
            <p className="mt-1 text-xs text-[#9CA3AF]">Todas las facturas están al corriente de pago.</p>
          </div>
        )}

        {/* Per-delegate sections */}
        {delegatesWithRisk.map(d => {
          const totalV = d.vencidas.reduce((s, r) => s + r.outstanding, 0);
          const totalP = d.pendientes.reduce((s, r) => s + r.outstanding, 0);
          return (
            <section key={d.id} className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
              {/* Delegate header */}
              <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  {d.id === "unassigned" ? (
                    <span className="text-sm font-bold text-[#0A0A0A]">{d.name}</span>
                  ) : (
                    <Link
                      href={`/dashboard/delegados/${d.id}`}
                      className="text-sm font-bold text-[#0A0A0A] hover:text-[#8E0E1A] transition-colors print:no-underline"
                    >
                      {d.name}
                    </Link>
                  )}
                  {d.vencidas.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-[#8E0E1A]">
                      {d.vencidas.length} vencida{d.vencidas.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  {d.pendientes.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      {d.pendientes.length} pendiente{d.pendientes.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs tabular-nums">
                  {totalV > 0 && <span className="font-semibold text-[#8E0E1A]">{fmtEuro(totalV)} vencido</span>}
                  {totalP > 0 && <span className="font-semibold text-amber-700">{fmtEuro(totalP)} pendiente</span>}
                  <span className="font-bold text-[#0A0A0A]">{fmtEuro(totalV + totalP)} total</span>
                  {d.id !== "unassigned" && (
                    <Link
                      href={`/dashboard/delegados/${d.id}/riesgo`}
                      className="text-[10px] font-medium text-[#9CA3AF] hover:text-[#8E0E1A] transition-colors print:hidden"
                    >
                      Informe →
                    </Link>
                  )}
                </div>
              </div>

              {/* Tables */}
              <div className="divide-y divide-[#F3F4F6]">
                {d.vencidas.length > 0  && <VencidasTable  rows={d.vencidas} />}
                {d.pendientes.length > 0 && <PendientesTable rows={d.pendientes} />}
              </div>
            </section>
          );
        })}

        {/* Print footer */}
        <div className="hidden print:block border-t border-[#E5E7EB] pt-4 text-[10px] text-[#9CA3AF]">
          Informe de riesgo · {new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })} · Prospectia Delegates Portal
        </div>

      </div>
    </>
  );
}
