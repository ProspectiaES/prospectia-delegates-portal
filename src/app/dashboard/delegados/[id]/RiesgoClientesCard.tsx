"use client";

import Link from "next/link";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";

export interface VencidaRow {
  invoiceId: string;
  docNumber: string;
  contactId: string | null;
  contactName: string;
  total: number;
  dueDate: string;
  daysOverdue: number;
}

export interface PendienteRow {
  invoiceId: string;
  docNumber: string;
  contactId: string | null;
  contactName: string;
  total: number;
  dueDate: string | null;
  daysUntilDue: number | null;
}

interface Props {
  vencidas: VencidaRow[];
  pendientes: PendienteRow[];
}

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function RiesgoClientesCard({ vencidas, pendientes }: Props) {
  const totalVencido   = vencidas.reduce((s, r) => s + r.total, 0);
  const totalPendiente = pendientes.reduce((s, r) => s + r.total, 0);

  const badge = (
    <div className="flex gap-2">
      {vencidas.length > 0 && (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-[#8E0E1A]">
          {vencidas.length} vencida{vencidas.length !== 1 ? "s" : ""}
        </span>
      )}
      {pendientes.length > 0 && (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
          {pendientes.length} pendiente{pendientes.length !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );

  return (
    <CollapsibleCard title="Riesgo clientes" subtitle="Facturas vencidas y pendientes" badge={badge}>
      {vencidas.length === 0 && pendientes.length === 0 ? (
        <p className="px-5 py-6 text-xs text-[#9CA3AF] text-center">Sin facturas de riesgo.</p>
      ) : (
        <div className="divide-y divide-[#F3F4F6]">
          {vencidas.length > 0 && (
            <div>
              <div className="px-5 py-2 bg-red-50 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#8E0E1A] uppercase tracking-wider">Vencidas — {fmtEuro(totalVencido)}</span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#F9FAFB]">
                    {["Factura", "Cliente", "Importe", "Venc.", "Días vencida"].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {vencidas.map(r => (
                    <tr key={r.invoiceId} className="hover:bg-[#FEF2F2] transition-colors">
                      <td className="px-4 py-2.5 font-mono font-semibold text-[#0A0A0A] whitespace-nowrap">
                        <Link href={`/dashboard/facturas/${r.invoiceId}`} className="hover:text-[#8E0E1A] transition-colors">{r.docNumber}</Link>
                      </td>
                      <td className="px-4 py-2.5 text-[#374151] max-w-[160px] truncate">
                        {r.contactId ? <Link href={`/dashboard/clientes/${r.contactId}`} className="hover:text-[#8E0E1A]">{r.contactName}</Link> : r.contactName}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums font-semibold text-[#0A0A0A] whitespace-nowrap">{fmtEuro(r.total)}</td>
                      <td className="px-4 py-2.5 text-[#6B7280] whitespace-nowrap">{fmtDate(r.dueDate)}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-[#8E0E1A]">
                          {r.daysOverdue}d
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pendientes.length > 0 && (
            <div>
              <div className="px-5 py-2 bg-amber-50 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Pendientes — {fmtEuro(totalPendiente)}</span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#F9FAFB]">
                    {["Factura", "Cliente", "Importe", "Vencimiento"].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {pendientes.map(r => (
                    <tr key={r.invoiceId} className="hover:bg-amber-50/50 transition-colors">
                      <td className="px-4 py-2.5 font-mono font-semibold text-[#0A0A0A] whitespace-nowrap">
                        <Link href={`/dashboard/facturas/${r.invoiceId}`} className="hover:text-[#8E0E1A]">{r.docNumber}</Link>
                      </td>
                      <td className="px-4 py-2.5 text-[#374151] max-w-[160px] truncate">
                        {r.contactId ? <Link href={`/dashboard/clientes/${r.contactId}`} className="hover:text-[#8E0E1A]">{r.contactName}</Link> : r.contactName}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums font-semibold text-[#0A0A0A] whitespace-nowrap">{fmtEuro(r.total)}</td>
                      <td className="px-4 py-2.5 text-[#6B7280] whitespace-nowrap">
                        {r.dueDate ? fmtDate(r.dueDate) : <span className="text-[#D1D5DB]">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </CollapsibleCard>
  );
}
