"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";

export interface ClientRow {
  id: string;
  name: string;
  code: string | null;
  email: string | null;
  city: string | null;
  type: number | null;
}

interface Props {
  clients: ClientRow[];
}

const PAGE_SIZE = 25;

const contactTypeLabel: Record<number, string> = { 0: "Empresa", 1: "Autónomo", 2: "Particular" };
const contactTypeVariant: Record<number, "neutral" | "default" | "warning" | "success"> = { 0: "neutral", 1: "success", 2: "default" };

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

export function ClientsSection({ clients }: Props) {
  const [page, setPage] = useState(1);
  const slice = clients.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <CollapsibleCard
      title="Clientes"
      subtitle={`${clients.length} cliente${clients.length !== 1 ? "s" : ""} asociados`}
    >
      {clients.length === 0 ? (
        <p className="px-5 py-6 text-xs text-[#9CA3AF] text-center">Sin clientes asignados.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  {["Nombre", "Código", "Email", "Localidad", "Tipo", ""].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {slice.map((c) => (
                  <tr key={c.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-4 py-3 font-medium text-[#0A0A0A] whitespace-nowrap max-w-[160px] truncate">
                      <Link href={`/dashboard/clientes/${c.id}`} className="hover:text-[#8E0E1A] transition-colors">
                        {c.name || <span className="text-[#9CA3AF]">—</span>}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-[#6B7280] whitespace-nowrap">
                      {c.code || <span className="text-[#D1D5DB]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#6B7280] whitespace-nowrap max-w-[160px] truncate">
                      {c.email || <span className="text-[#D1D5DB]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#6B7280] whitespace-nowrap">
                      {c.city || <span className="text-[#D1D5DB]">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {c.type != null ? (
                        <Badge variant={contactTypeVariant[c.type] ?? "neutral"}>
                          {contactTypeLabel[c.type] ?? `Tipo ${c.type}`}
                        </Badge>
                      ) : (
                        <span className="text-[#D1D5DB] text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link href={`/dashboard/clientes/${c.id}`} className="text-xs font-medium text-[#6B7280] hover:text-[#8E0E1A] transition-colors">
                        Ver →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationBar page={page} total={clients.length} onPage={setPage} />
        </>
      )}
    </CollapsibleCard>
  );
}
