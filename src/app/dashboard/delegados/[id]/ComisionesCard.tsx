"use client";

import { useState } from "react";
import Link from "next/link";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";

// ─── Types (serializable props) ────────────────────────────────────────────────

export interface CommissionLine {
  productName: string;
  sku: string | null;
  units: number;
  unitPrice: number;
  discountPct: number;
  lineNet: number;
  commissionRate: number;
  commissionType: string;
  commissionAmount: number;
}

export interface InvoiceCommission {
  invoiceId: string;
  docNumber: string;
  contactId: string | null;
  contactName: string;
  invoiceTotal: number;
  lines: CommissionLine[];
  subtotalCommission: number;
  recommenderName: string | null;
  recommenderDeduction: number;
  netCommission: number;
}

export interface CommissionBlock {
  role: string;
  invoices: InvoiceCommission[];
  totalNetCommission: number;
}

interface Props {
  blocks: CommissionBlock[];
  period: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

const fmtRate = (rate: number, type: string) =>
  type === "amount" ? `${fmtEuro(rate)}/ud` : `${rate}%`;

// ─── Invoice row (expandable) ─────────────────────────────────────────────────

function InvoiceRow({ inv }: { inv: InvoiceCommission }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-[#F3F4F6] last:border-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-[#F9FAFB] transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <svg
            width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
            className={`shrink-0 text-[#9CA3AF] transition-transform ${open ? "rotate-90" : ""}`}
            aria-hidden
          >
            <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#0A0A0A]">
              <Link
                href={`/dashboard/facturas/${inv.invoiceId}`}
                onClick={(e) => e.stopPropagation()}
                className="hover:text-[#8E0E1A] transition-colors font-mono"
              >
                {inv.docNumber}
              </Link>
              <span className="ml-2 text-xs font-normal text-[#6B7280]">— {inv.contactName}</span>
            </p>
            <p className="text-xs text-[#9CA3AF]">
              {inv.lines.length} producto{inv.lines.length !== 1 ? "s" : ""}
              {inv.recommenderName && ` · Rec: ${inv.recommenderName}`}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right ml-4">
          <p className="text-sm font-bold text-[#0A0A0A] tabular-nums">{fmtEuro(inv.netCommission)}</p>
          {inv.recommenderDeduction > 0 && (
            <p className="text-[10px] text-[#9CA3AF]">−{fmtEuro(inv.recommenderDeduction)} rec.</p>
          )}
        </div>
      </button>

      {open && (
        <div className="bg-[#F9FAFB] px-5 pb-3 pt-1 space-y-1">
          {inv.lines.length === 0 ? (
            <p className="text-xs text-[#9CA3AF] py-2">Sin productos reconocidos en esta factura.</p>
          ) : (
            <>
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    {["Producto", "Uds", "P.Unit.", "Dto", "Neto línea", "Tasa", "Comisión"].map(h => (
                      <th key={h} className="py-1.5 text-left text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider pr-3 last:pr-0 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {inv.lines.map((line, i) => (
                    <tr key={i}>
                      <td className="py-1.5 pr-3 font-medium text-[#374151] max-w-[160px]">
                        <p className="truncate">{line.productName}</p>
                        {line.sku && <p className="text-[10px] text-[#9CA3AF] font-mono">{line.sku}</p>}
                      </td>
                      <td className="py-1.5 pr-3 tabular-nums text-[#374151] whitespace-nowrap">{line.units}</td>
                      <td className="py-1.5 pr-3 tabular-nums text-[#374151] whitespace-nowrap">{fmtEuro(line.unitPrice)}</td>
                      <td className="py-1.5 pr-3 tabular-nums text-[#6B7280] whitespace-nowrap">
                        {line.discountPct > 0 ? `${line.discountPct}%` : "—"}
                      </td>
                      <td className="py-1.5 pr-3 tabular-nums text-[#374151] whitespace-nowrap">{fmtEuro(line.lineNet)}</td>
                      <td className="py-1.5 pr-3 tabular-nums text-[#6B7280] whitespace-nowrap">
                        {fmtRate(line.commissionRate, line.commissionType)}
                      </td>
                      <td className="py-1.5 tabular-nums font-semibold text-[#0A0A0A] whitespace-nowrap">{fmtEuro(line.commissionAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-2 border-t border-[#E5E7EB] space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#6B7280]">Subtotal comisión</span>
                  <span className="tabular-nums font-medium text-[#374151]">{fmtEuro(inv.subtotalCommission)}</span>
                </div>
                {inv.recommenderDeduction > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-[#9CA3AF]">Deducción recomendador ({inv.recommenderName})</span>
                    <span className="tabular-nums text-[#8E0E1A]">−{fmtEuro(inv.recommenderDeduction)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-[#0A0A0A]">Comisión neta factura</span>
                  <span className="tabular-nums text-[#0A0A0A]">{fmtEuro(inv.netCommission)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ComisionesCard({ blocks, period }: Props) {
  const grandTotal = blocks.reduce((s, b) => s + b.totalNetCommission, 0);

  const badge = (
    <span className="text-xs font-bold text-[#0A0A0A] tabular-nums">{fmtEuro(grandTotal)}</span>
  );

  return (
    <CollapsibleCard
      title="Comisiones liquidables"
      subtitle={`Facturas cobradas en ${period}`}
      badge={badge}
    >
      {blocks.every(b => b.invoices.length === 0) ? (
        <p className="px-5 py-6 text-xs text-[#9CA3AF] text-center">
          Sin facturas cobradas en {period}.
        </p>
      ) : (
        <div className="divide-y divide-[#E5E7EB]">
          {blocks.map((block) => (
            <div key={block.role}>
              {/* Block header */}
              <div className="px-5 py-3 bg-[#F9FAFB] flex items-center justify-between">
                <span className="text-xs font-bold text-[#374151] uppercase tracking-wide">
                  Liquidación {block.role}
                </span>
                <span className="text-sm font-bold text-[#0A0A0A] tabular-nums">
                  {fmtEuro(block.totalNetCommission)}
                </span>
              </div>

              {block.invoices.length === 0 ? (
                <p className="px-5 py-4 text-xs text-[#9CA3AF]">Sin facturas cobradas este mes para este rol.</p>
              ) : (
                <>
                  {block.invoices.map((inv) => (
                    <InvoiceRow key={inv.invoiceId} inv={inv} />
                  ))}
                  <div className="px-5 py-3 flex items-center justify-between bg-[#F9FAFB] border-t border-[#E5E7EB]">
                    <span className="text-xs font-semibold text-[#374151]">Total comisión {block.role}</span>
                    <span className="text-base font-bold text-[#0A0A0A] tabular-nums">{fmtEuro(block.totalNetCommission)}</span>
                  </div>
                </>
              )}
            </div>
          ))}

          {blocks.length > 1 && (
            <div className="px-5 py-4 flex items-center justify-between bg-[#0A0A0A]">
              <span className="text-sm font-bold text-white uppercase tracking-wide">Comisión total liquidable</span>
              <span className="text-lg font-bold text-white tabular-nums">{fmtEuro(grandTotal)}</span>
            </div>
          )}
        </div>
      )}
    </CollapsibleCard>
  );
}
