"use client";

import { useState } from "react";
import Link from "next/link";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";

function daysUntilCls(days: number | null) {
  if (days === null) return "bg-[#F3F4F6] text-[#6B7280]";
  if (days <= 7)  return "bg-red-100 text-[#8E0E1A]";
  if (days <= 30) return "bg-amber-100 text-amber-700";
  return "bg-green-100 text-green-700";
}

function daysOverdueCls(days: number) {
  if (days > 60)  return "bg-[#8E0E1A] text-white";
  if (days > 30)  return "bg-red-200 text-red-900";
  return "bg-red-100 text-[#8E0E1A]";
}

export interface VencidaRow {
  invoiceId: string;
  docNumber: string;
  contactId: string | null;
  contactName: string;
  /** Outstanding amount (may be less than invoiceTotal if partial payment) */
  total: number;
  invoiceTotal?: number;
  dueDate: string;
  daysOverdue: number;
}

export interface PendienteRow {
  invoiceId: string;
  docNumber: string;
  contactId: string | null;
  contactName: string;
  /** Outstanding amount (may be less than invoiceTotal if partial payment) */
  total: number;
  invoiceTotal?: number;
  dueDate: string | null;
  daysUntilDue: number | null;
}

interface Props {
  delegateId: string;
  vencidas: VencidaRow[];
  pendientes: PendienteRow[];
}

const PAGE_SIZE = 25;

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function PaginationBar({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  return (
    <tr className="border-t border-[#F3F4F6] bg-[#F9FAFB]">
      <td colSpan={5} className="px-4 py-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[#9CA3AF]">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}</span>
          <div className="flex gap-1.5">
            <button disabled={page === 1} onClick={() => onPage(page - 1)} className="text-[11px] px-2.5 py-1 rounded border border-[#E5E7EB] text-[#6B7280] disabled:opacity-40 hover:border-[#0A0A0A] transition-colors bg-white">← Ant.</button>
            <button disabled={page === pages} onClick={() => onPage(page + 1)} className="text-[11px] px-2.5 py-1 rounded border border-[#E5E7EB] text-[#6B7280] disabled:opacity-40 hover:border-[#0A0A0A] transition-colors bg-white">Sig. →</button>
          </div>
        </div>
      </td>
    </tr>
  );
}

export function RiesgoClientesCard({ delegateId, vencidas, pendientes }: Props) {
  const [vencidasPage, setVencidasPage]     = useState(1);
  const [pendientesPage, setPendientesPage] = useState(1);

  const vencidasSlice   = vencidas.slice((vencidasPage - 1) * PAGE_SIZE, vencidasPage * PAGE_SIZE);
  const pendientesSlice = pendientes.slice((pendientesPage - 1) * PAGE_SIZE, pendientesPage * PAGE_SIZE);

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
                  {vencidasSlice.map(r => (
                    <tr key={r.invoiceId} className="hover:bg-[#FEF2F2] transition-colors">
                      <td className="px-4 py-2.5 font-mono font-semibold text-[#0A0A0A] whitespace-nowrap">
                        <Link href={`/dashboard/facturas/${r.invoiceId}`} className="hover:text-[#8E0E1A] transition-colors">{r.docNumber}</Link>
                      </td>
                      <td className="px-4 py-2.5 text-[#374151] max-w-[160px] truncate">
                        {r.contactId ? <Link href={`/dashboard/clientes/${r.contactId}`} className="hover:text-[#8E0E1A]">{r.contactName}</Link> : r.contactName}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums whitespace-nowrap">
                        <span className="font-semibold text-[#0A0A0A]">{fmtEuro(r.total)}</span>
                        {r.invoiceTotal && r.invoiceTotal > r.total + 0.02 && (
                          <p className="text-[9px] text-[#9CA3AF]">de {fmtEuro(r.invoiceTotal)}</p>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[#6B7280] whitespace-nowrap">{fmtDate(r.dueDate)}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${daysOverdueCls(r.daysOverdue)}`}>
                          +{r.daysOverdue}d
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <PaginationBar page={vencidasPage} total={vencidas.length} onPage={setVencidasPage} />
                </tfoot>
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
                    {["Factura", "Cliente", "Importe", "Vencimiento", "Días p/ vencer"].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {pendientesSlice.map(r => (
                    <tr key={r.invoiceId} className="hover:bg-amber-50/50 transition-colors">
                      <td className="px-4 py-2.5 font-mono font-semibold text-[#0A0A0A] whitespace-nowrap">
                        <Link href={`/dashboard/facturas/${r.invoiceId}`} className="hover:text-[#8E0E1A]">{r.docNumber}</Link>
                      </td>
                      <td className="px-4 py-2.5 text-[#374151] max-w-[160px] truncate">
                        {r.contactId ? <Link href={`/dashboard/clientes/${r.contactId}`} className="hover:text-[#8E0E1A]">{r.contactName}</Link> : r.contactName}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums whitespace-nowrap">
                        <span className="font-semibold text-[#0A0A0A]">{fmtEuro(r.total)}</span>
                        {r.invoiceTotal && r.invoiceTotal > r.total + 0.02 && (
                          <p className="text-[9px] text-[#9CA3AF]">de {fmtEuro(r.invoiceTotal)}</p>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[#6B7280] whitespace-nowrap">
                        {r.dueDate ? fmtDate(r.dueDate) : <span className="text-[#D1D5DB]">—</span>}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${daysUntilCls(r.daysUntilDue)}`}>
                          {r.daysUntilDue !== null ? `${r.daysUntilDue}d` : "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <PaginationBar page={pendientesPage} total={pendientes.length} onPage={setPendientesPage} />
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
      {(vencidas.length > 0 || pendientes.length > 0) && (
        <div className="px-5 py-3 border-t border-[#E5E7EB] flex justify-end">
          <Link
            href={`/dashboard/delegados/${delegateId}/riesgo`}
            className="text-xs font-semibold text-[#8E0E1A] hover:underline"
          >
            Ver informe completo →
          </Link>
        </div>
      )}
    </CollapsibleCard>
  );
}
