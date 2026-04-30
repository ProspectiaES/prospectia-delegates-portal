"use client";

import { useState } from "react";
import Link from "next/link";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActiveClient {
  clientId: string;
  name: string;
  lastActivity: string;
  daysAgo: number;
}

export interface DormantClient {
  clientId: string;
  name: string;
  lastActivity: string | null;
  daysDormant: number;
}

export interface NuevoClient {
  clientId: string;
  name: string;
  firstInvoiceDate: string;
}

interface Props {
  activos:     ActiveClient[];
  dormidos:    DormantClient[];
  nuevos:      NuevoClient[];
  periodLabel: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return "Sin facturas";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function dormantSeverity(days: number): { dotCls: string; textCls: string; bgCls: string } {
  if (days > 90)  return { dotCls: "bg-[#8E0E1A]",   textCls: "text-[#8E0E1A]",   bgCls: "bg-red-50/60" };
  if (days > 60)  return { dotCls: "bg-orange-500",  textCls: "text-orange-600",  bgCls: "bg-orange-50/40" };
  if (days > 30)  return { dotCls: "bg-amber-500",   textCls: "text-amber-600",   bgCls: "bg-amber-50/40" };
  return               { dotCls: "bg-[#9CA3AF]",   textCls: "text-[#6B7280]",   bgCls: "" };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PaginationBar({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-[#F3F4F6] bg-[#F9FAFB]">
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

function InnerSection({
  title, count, badgeCls, defaultOpen = true, children,
}: {
  title: string; count: number; badgeCls: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-[#F3F4F6] first:border-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-5 py-2.5 hover:bg-[#F9FAFB] transition-colors text-left"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"
          className={`shrink-0 text-[#9CA3AF] transition-transform duration-150 ${open ? "rotate-90" : ""}`}>
          <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-xs font-semibold text-[#374151] flex-1">{title}</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeCls}`}>{count}</span>
      </button>
      {open && children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ActividadClientesCard({ activos, dormidos, nuevos, periodLabel }: Props) {
  const [activosPage,  setActivosPage]  = useState(1);
  const [dormidosPage, setDormidosPage] = useState(1);
  const [nuevosPage,   setNuevosPage]   = useState(1);

  const activosSlice  = activos.slice((activosPage - 1)  * PAGE_SIZE, activosPage  * PAGE_SIZE);
  const dormidosSlice = dormidos.slice((dormidosPage - 1) * PAGE_SIZE, dormidosPage * PAGE_SIZE);
  const nuevosSlice   = nuevos.slice((nuevosPage - 1)    * PAGE_SIZE, nuevosPage   * PAGE_SIZE);

  const criticalCount = dormidos.filter(c => c.daysDormant > 90).length;

  const badge = (
    <div className="flex gap-1.5">
      {nuevos.length > 0 && (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
          {nuevos.length} nuevo{nuevos.length !== 1 ? "s" : ""}
        </span>
      )}
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
        {activos.length} activo{activos.length !== 1 ? "s" : ""}
      </span>
      {dormidos.length > 0 && (
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${criticalCount > 0 ? "bg-red-50 text-[#8E0E1A]" : "bg-[#F3F4F6] text-[#6B7280]"}`}>
          {dormidos.length} dormido{dormidos.length !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );

  if (activos.length === 0 && dormidos.length === 0 && nuevos.length === 0) {
    return (
      <CollapsibleCard title="Actividad clientes" subtitle="Resumen">
        <p className="px-5 py-6 text-xs text-[#9CA3AF] text-center">Sin clientes asignados.</p>
      </CollapsibleCard>
    );
  }

  return (
    <CollapsibleCard title="Actividad clientes" subtitle="Resumen" badge={badge}>
      <div>

        {/* Nuevos en período */}
        {nuevos.length > 0 && (
          <InnerSection title={`Nuevos en ${periodLabel}`} count={nuevos.length} badgeCls="bg-blue-50 text-blue-700">
            <ul className="divide-y divide-[#F3F4F6]">
              {nuevosSlice.map(c => (
                <li key={c.clientId} className="flex items-center justify-between px-5 py-2.5 hover:bg-[#F9FAFB] transition-colors">
                  <Link href={`/dashboard/clientes/${c.clientId}`} className="text-sm font-medium text-[#0A0A0A] hover:text-[#8E0E1A] transition-colors truncate">
                    {c.name}
                  </Link>
                  <div className="shrink-0 text-right ml-4">
                    <p className="text-[10px] font-semibold text-blue-600">Primer pedido</p>
                    <p className="text-[10px] text-[#9CA3AF]">{fmtDate(c.firstInvoiceDate)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <PaginationBar page={nuevosPage} total={nuevos.length} onPage={setNuevosPage} />
          </InnerSection>
        )}

        {/* Activos */}
        <InnerSection title="Activos" count={activos.length} badgeCls="bg-emerald-50 text-emerald-700">
          {activos.length === 0 ? (
            <p className="px-5 py-4 text-xs text-[#9CA3AF] text-center">Ningún cliente activo en los últimos 30 días.</p>
          ) : (
            <>
              <ul className="divide-y divide-[#F3F4F6]">
                {activosSlice.map(c => (
                  <li key={c.clientId} className="flex items-center justify-between px-5 py-2.5 hover:bg-[#F9FAFB] transition-colors">
                    <Link href={`/dashboard/clientes/${c.clientId}`} className="text-sm font-medium text-[#0A0A0A] hover:text-[#8E0E1A] transition-colors truncate">
                      {c.name}
                    </Link>
                    <div className="shrink-0 text-right ml-4">
                      <p className="text-xs text-[#6B7280]">{fmtDate(c.lastActivity)}</p>
                      <p className="text-[10px] text-emerald-600 font-medium">hace {c.daysAgo}d</p>
                    </div>
                  </li>
                ))}
              </ul>
              <PaginationBar page={activosPage} total={activos.length} onPage={setActivosPage} />
            </>
          )}
        </InnerSection>

        {/* Dormidos */}
        <InnerSection
          title="Dormidos"
          count={dormidos.length}
          badgeCls={criticalCount > 0 ? "bg-red-50 text-[#8E0E1A]" : dormidos.length > 0 ? "bg-amber-50 text-amber-700" : "bg-[#F3F4F6] text-[#6B7280]"}
          defaultOpen={false}
        >
          {dormidos.length === 0 ? (
            <p className="px-5 py-4 text-xs text-[#9CA3AF] text-center">Todos los clientes tienen actividad reciente.</p>
          ) : (
            <>
              {criticalCount > 0 && (
                <div className="mx-5 mt-2 mb-1 rounded-lg bg-red-50 border border-red-100 px-3 py-2">
                  <span className="text-xs font-semibold text-[#8E0E1A]">
                    {criticalCount} cliente{criticalCount !== 1 ? "s" : ""} sin actividad &gt;90 días
                  </span>
                </div>
              )}
              <ul className="divide-y divide-[#F3F4F6]">
                {dormidosSlice.map(c => {
                  const sev = dormantSeverity(c.daysDormant);
                  return (
                    <li key={c.clientId} className={`flex items-center justify-between px-5 py-2.5 transition-all ${sev.bgCls}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sev.dotCls}`} />
                        <Link href={`/dashboard/clientes/${c.clientId}`} className="text-sm font-medium text-[#0A0A0A] hover:text-[#8E0E1A] transition-colors truncate">
                          {c.name}
                        </Link>
                      </div>
                      <div className="shrink-0 text-right ml-4">
                        <p className="text-[10px] text-[#9CA3AF]">{fmtDate(c.lastActivity)}</p>
                        <p className={`text-[10px] font-semibold ${sev.textCls}`}>
                          {c.daysDormant >= 999 ? "Sin actividad" : `${c.daysDormant}d`}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <PaginationBar page={dormidosPage} total={dormidos.length} onPage={setDormidosPage} />
            </>
          )}
        </InnerSection>

      </div>
    </CollapsibleCard>
  );
}
