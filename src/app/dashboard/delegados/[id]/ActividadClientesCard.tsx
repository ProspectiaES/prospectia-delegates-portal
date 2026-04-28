"use client";

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

function fmtDate(iso: string | null) {
  if (!iso) return "Sin facturas";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function ActividadClientesCard({ activos, dormidos }: Props) {
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
              {activos.map(c => (
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
          </div>
        )}

        {dormidos.length > 0 && (
          <div>
            <div className="px-5 py-2 bg-[#F9FAFB]">
              <span className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">Dormidos &gt;30 días</span>
            </div>
            <ul className="divide-y divide-[#F3F4F6]">
              {dormidos.map(c => (
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
          </div>
        )}

        {activos.length === 0 && dormidos.length === 0 && (
          <p className="px-5 py-6 text-xs text-[#9CA3AF] text-center">Sin clientes asignados.</p>
        )}
      </div>
    </CollapsibleCard>
  );
}
