"use client";

import { useState } from "react";
import Link from "next/link";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";

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

interface Props {
  activos: ActiveClient[];
  dormidos: DormantClient[];
}

const PAGE_SIZE = 25;

function fmtDate(iso: string | null) {
  if (!iso) return "Sin facturas";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function PaginationBar({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-[#F3F4F6] bg-[#F9FAFB]">
      <span className="text-[11px] text-[#9CA3AF]">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}</span>
      <div className="flex gap-1.5">
        <button disabled={page === 1} onClick={() => onPage(page - 1)} className="text-[11px] px-2.5 py-1 rounded border border-[#E5E7EB] text-[#6B7280] disabled:opacity-40 hover:border-[#0A0A0A] transition-colors bg-white">← Ant.</button>
        <button disabled={page === pages} onClick={() => onPage(page + 1)} className="text-[11px] px-2.5 py-1 rounded border border-[#E5E7EB] text-[#6B7280] disabled:opacity-40 hover:border-[#0A0A0A] transition-colors bg-white">Sig. →</button>
      </div>
    </div>
  );
}

export function ActividadClientesCard({ activos, dormidos }: Props) {
  const [activosPage, setActivosPage]   = useState(1);
  const [dormidosPage, setDormidosPage] = useState(1);

  const activosSlice  = activos.slice((activosPage - 1) * PAGE_SIZE, activosPage * PAGE_SIZE);
  const dormidosSlice = dormidos.slice((dormidosPage - 1) * PAGE_SIZE, dormidosPage * PAGE_SIZE);

  const badge = (
    <div className="flex gap-2">
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
        {activos.length} activo{activos.length !== 1 ? "s" : ""}
      </span>
      {dormidos.length > 0 && (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280]">
          {dormidos.length} dormido{dormidos.length !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );

  return (
    <CollapsibleCard title="Actividad clientes" subtitle="Últimos 30 días" badge={badge}>
      <div className="divide-y divide-[#F3F4F6]">
        {activos.length > 0 && (
          <div>
            <div className="px-5 py-2 bg-emerald-50">
              <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Activos últimos 30 días</span>
            </div>
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
          </div>
        )}

        {dormidos.length > 0 && (
          <div>
            <div className="px-5 py-2 bg-[#F9FAFB]">
              <span className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">Dormidos &gt;30 días</span>
            </div>
            <ul className="divide-y divide-[#F3F4F6]">
              {dormidosSlice.map(c => (
                <li key={c.clientId} className="flex items-center justify-between px-5 py-2.5 hover:bg-[#F9FAFB] transition-colors">
                  <Link href={`/dashboard/clientes/${c.clientId}`} className="text-sm font-medium text-[#0A0A0A] hover:text-[#8E0E1A] transition-colors truncate">
                    {c.name}
                  </Link>
                  <div className="shrink-0 text-right ml-4">
                    <p className="text-xs text-[#6B7280]">{fmtDate(c.lastActivity)}</p>
                    <p className="text-[10px] text-[#9CA3AF] font-medium">
                      {c.daysDormant >= 999 ? "Sin actividad" : `${c.daysDormant}d sin actividad`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <PaginationBar page={dormidosPage} total={dormidos.length} onPage={setDormidosPage} />
          </div>
        )}

        {activos.length === 0 && dormidos.length === 0 && (
          <p className="px-5 py-6 text-xs text-[#9CA3AF] text-center">Sin clientes asignados.</p>
        )}
      </div>
    </CollapsibleCard>
  );
}
