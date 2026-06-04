"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { AutofacturaButton } from "./AutofacturaButton";

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
  invoiceDate: string | null;
  paidAt: string | null;
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

interface PendienteRow {
  invoiceId: string;
  docNumber: string;
  contactName: string;
  total: number;
  dueDate: string | null;
  daysUntilDue: number | null;
}

interface VencidaRow {
  invoiceId: string;
  docNumber: string;
  contactName: string;
  total: number;
  dueDate: string;
  daysOverdue: number;
}

interface Props {
  blocks: CommissionBlock[];
  period: string;
  mesStr: string;        // YYYY-MM
  isCurrentMes: boolean;
  delegateId: string;
  delegateName: string;
  irpfPct: number;       // 0 | 7 | 15
  pendientes: PendienteRow[];
  vencidas: VencidaRow[];
  isOwner: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

const fmtRate = (rate: number, type: string) =>
  type === "amount" ? `${fmtEuro(rate)}/ud` : `${rate}%`;

function prevMes(mes: string): string {
  const [y, m] = mes.split("-").map(Number);
  return m === 1
    ? `${y - 1}-12`
    : `${y}-${String(m - 1).padStart(2, "0")}`;
}

function nextMes(mes: string): string {
  const [y, m] = mes.split("-").map(Number);
  return m === 12
    ? `${y + 1}-01`
    : `${y}-${String(m + 1).padStart(2, "0")}`;
}

// ─── Liquidación preview modal ────────────────────────────────────────────────

function LiquidacionPreview({
  blocks, period, mesStr, delegateId, delegateName, irpfPct,
  onClose,
}: {
  blocks: CommissionBlock[];
  period: string;
  mesStr: string;
  delegateId: string;
  delegateName: string;
  irpfPct: number;
  onClose: () => void;
}) {
  const grandTotal = blocks.reduce((s, b) => s + b.totalNetCommission, 0);
  const ivaPct     = 21;
  const ivaAmount  = Math.round(grandTotal * ivaPct / 100 * 100) / 100;
  const irpfAmount = Math.round(grandTotal * irpfPct / 100 * 100) / 100;
  const totalPayable = Math.round((grandTotal + ivaAmount - irpfAmount) * 100) / 100;

  const downloadUrl = `/api/delegados/${delegateId}/liquidacion${mesStr ? `?mes=${mesStr}` : ""}`;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] bg-[#F9FAFB] shrink-0">
          <div>
            <h2 className="text-base font-bold text-[#0A0A0A]">Previsualización liquidación</h2>
            <p className="text-xs text-[#6B7280] mt-0.5 capitalize">{delegateName} · {period}</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg bg-[#8E0E1A] text-white hover:bg-[#7A0C17] transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 2v9M5 8l3 3 3-3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 13h10" strokeLinecap="round"/>
              </svg>
              Descargar PDF
            </a>
            <button onClick={onClose} className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F3F4F6] transition-colors">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Content — scrollable */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          {blocks.map((block) => (
            <div key={block.role}>
              {/* Block header */}
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">
                  Liquidación {block.role}
                </h3>
                <span className="text-sm font-bold text-[#0A0A0A] tabular-nums">
                  {fmtEuro(block.totalNetCommission)}
                </span>
              </div>

              {/* Invoices */}
              <div className="border border-[#E5E7EB] rounded-xl overflow-hidden divide-y divide-[#F3F4F6]">
                {block.invoices.map((inv) => (
                  <div key={inv.invoiceId} className="px-4 py-3 space-y-2">
                    {/* Invoice header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#0A0A0A] truncate">
                          {inv.docNumber} — {inv.contactName}
                        </p>
                        <p className="text-[10px] text-[#9CA3AF] mt-0.5">
                          {inv.invoiceDate ? `Emisión: ${fmtDate(inv.invoiceDate)}` : ""}
                          {inv.paidAt ? ` · Cobro: ${fmtDate(inv.paidAt)}` : ""}
                        </p>
                      </div>
                      <span className="text-xs font-bold tabular-nums text-[#0A0A0A] shrink-0">
                        {fmtEuro(inv.netCommission)}
                      </span>
                    </div>

                    {/* Lines */}
                    {inv.lines.length > 0 && (
                      <div className="bg-[#F9FAFB] rounded-lg px-3 py-2 space-y-1">
                        {inv.lines.map((l, i) => (
                          <div key={i} className="flex items-center justify-between text-[11px]">
                            <span className="text-[#6B7280] truncate mr-2">
                              {l.productName}
                              {l.sku ? ` (${l.sku})` : ""}
                              {" · "}{l.units} ud × {fmtEuro(l.unitPrice)}
                              {l.discountPct > 0 ? ` -${l.discountPct}%` : ""}
                              {" · tasa "}{fmtRate(l.commissionRate, l.commissionType)}
                            </span>
                            <span className="tabular-nums font-semibold text-[#374151] shrink-0">
                              {fmtEuro(l.commissionAmount)}
                            </span>
                          </div>
                        ))}
                        {inv.recommenderDeduction > 0 && (
                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#E5E7EB] mt-1">
                            <span className="text-amber-600">− Deducción recomendador ({inv.recommenderName})</span>
                            <span className="tabular-nums text-amber-600">{fmtEuro(-inv.recommenderDeduction)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {block.invoices.length === 0 && (
                  <div className="px-4 py-6 text-center text-xs text-[#9CA3AF]">
                    Sin facturas cobradas en este período
                  </div>
                )}

                {/* Block total */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#F9FAFB]">
                  <span className="text-xs font-bold text-[#374151]">Total comisión {block.role}</span>
                  <span className="text-sm font-bold tabular-nums text-[#0A0A0A]">{fmtEuro(block.totalNetCommission)}</span>
                </div>
              </div>
            </div>
          ))}

          {/* Fiscal summary */}
          <div className="border border-[#E5E7EB] rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <h3 className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">Resumen fiscal</h3>
            </div>
            <div className="divide-y divide-[#F3F4F6]">
              {[
                { label: "Base imponible (comisión neta)", value: grandTotal, cls: "text-[#0A0A0A]" },
                { label: `+ IVA ${ivaPct}%`, value: ivaAmount, cls: "text-[#374151]" },
                ...(irpfPct > 0 ? [{ label: `− Retención IRPF ${irpfPct}%`, value: -irpfAmount, cls: "text-amber-600" }] : []),
              ].map(({ label, value, cls }) => (
                <div key={label} className="flex items-center justify-between px-4 py-2.5">
                  <span className={`text-xs ${cls}`}>{label}</span>
                  <span className={`text-xs font-semibold tabular-nums ${cls}`}>{fmtEuro(value)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-4 py-3 bg-[#0A0A0A]">
                <span className="text-sm font-bold text-white">TOTAL A PERCIBIR</span>
                <span className="text-lg font-bold tabular-nums text-white">{fmtEuro(totalPayable)}</span>
              </div>
            </div>
          </div>

          {irpfPct === 0 && (
            <p className="text-[10px] text-[#9CA3AF] text-center">
              Sin retención IRPF. Si procede, configúralo en el perfil del delegado.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Month navigation ─────────────────────────────────────────────────────────

function MonthNav({
  mesStr, isCurrentMes, period, delegateId, delegateName, irpfPct,
  isOwner, hasCommissions, blocks,
}: {
  mesStr: string; isCurrentMes: boolean; period: string;
  delegateId: string; delegateName: string; irpfPct: number;
  isOwner: boolean; hasCommissions: boolean;
  blocks: CommissionBlock[];
}) {
  const router   = useRouter();
  const pathname = usePathname();
  const [showPreview, setShowPreview] = useState(false);

  function go(mes: string) {
    const nowMes = (() => {
      const n = new Date();
      return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
    })();
    router.push(pathname + (mes === nowMes ? "" : `?mes=${mes}`));
  }

  const prev = prevMes(mesStr);
  const next = nextMes(mesStr);

  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
      <button
        onClick={() => go(prev)}
        className="flex items-center gap-1 text-xs font-medium text-[#6B7280] hover:text-[#8E0E1A] transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M10 4L6 8l4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Mes anterior
      </button>

      <div className="text-center">
        <p className="text-sm font-bold text-[#0A0A0A] capitalize">{period}</p>
        {isCurrentMes && (
          <p className="text-[10px] text-[#8E0E1A] font-semibold uppercase tracking-wide">Mes en curso</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {!isCurrentMes && (
          <button
            onClick={() => go(nextMes(mesStr))}
            className="flex items-center gap-1 text-xs font-medium text-[#6B7280] hover:text-[#8E0E1A] transition-colors"
          >
            Mes siguiente
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <button
          onClick={() => setShowPreview(true)}
          className="flex items-center gap-1 text-xs font-semibold text-[#8E0E1A] border border-[#8E0E1A] rounded-[5px] px-2.5 py-1 hover:bg-[#8E0E1A] hover:text-white transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <path d="M8 2v9M5 8l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 13h10" strokeLinecap="round" />
          </svg>
          Liquidación
        </button>
        {showPreview && (
          <LiquidacionPreview
            blocks={blocks}
            period={period}
            mesStr={isCurrentMes ? "" : mesStr}
            delegateId={delegateId}
            delegateName={delegateName}
            irpfPct={irpfPct}
            onClose={() => setShowPreview(false)}
          />
        )}
        {isOwner && hasCommissions && (
          <AutofacturaButton delegateId={delegateId} defaultMes={mesStr} />
        )}
      </div>
    </div>
  );
}

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
              {` · Emisión: ${fmtDate(inv.invoiceDate)}`}
              {` · Cobro: ${fmtDate(inv.paidAt)}`}
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

// ─── Pending invoices section ─────────────────────────────────────────────────

function PendientesSection({ rows }: { rows: PendienteRow[] }) {
  const [open, setOpen] = useState(false);
  const total = rows.reduce((s, r) => s + r.total, 0);

  return (
    <div className="border-t border-[#E5E7EB]">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#F9FAFB] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
            className={`shrink-0 text-[#9CA3AF] transition-transform ${open ? "rotate-90" : ""}`} aria-hidden>
            <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-[#374151]">
              Facturas pendientes
              <span className="ml-2 text-xs font-normal text-[#9CA3AF]">{rows.length} factura{rows.length !== 1 ? "s" : ""} · no liquidables hasta cobro</span>
            </p>
          </div>
        </div>
        <span className="text-sm font-bold text-[#374151] tabular-nums shrink-0 ml-4">{fmtEuro(total)}</span>
      </button>

      {open && (
        <div className="overflow-x-auto border-t border-[#F3F4F6]">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                {["Factura", "Cliente", "Vencimiento", "Días", "Importe"].map(h => (
                  <th key={h} className="px-5 py-2 text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {rows.map(r => (
                <tr key={r.invoiceId} className="hover:bg-[#F9FAFB] transition-colors">
                  <td className="px-5 py-2.5 font-mono font-semibold text-[#0A0A0A] whitespace-nowrap">
                    <Link href={`/dashboard/facturas/${r.invoiceId}`} className="hover:text-[#8E0E1A] transition-colors">
                      {r.docNumber}
                    </Link>
                  </td>
                  <td className="px-5 py-2.5 text-[#374151] max-w-[180px] truncate">{r.contactName}</td>
                  <td className="px-5 py-2.5 text-[#6B7280] whitespace-nowrap tabular-nums">{fmtDate(r.dueDate)}</td>
                  <td className="px-5 py-2.5 whitespace-nowrap">
                    {r.daysUntilDue != null ? (
                      <span className={r.daysUntilDue < 0 ? "text-[#8E0E1A] font-semibold" : r.daysUntilDue <= 7 ? "text-amber-600 font-semibold" : "text-[#6B7280]"}>
                        {r.daysUntilDue < 0 ? `${Math.abs(r.daysUntilDue)} d vencida` : `${r.daysUntilDue} d`}
                      </span>
                    ) : <span className="text-[#D1D5DB]">—</span>}
                  </td>
                  <td className="px-5 py-2.5 tabular-nums font-semibold text-[#0A0A0A] text-right whitespace-nowrap">{fmtEuro(r.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-[#E5E7EB] bg-[#F9FAFB]">
                <td colSpan={4} className="px-5 py-2.5 text-xs text-[#6B7280]">Total pendiente de cobro</td>
                <td className="px-5 py-2.5 text-right text-sm font-bold text-[#0A0A0A] tabular-nums">{fmtEuro(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Overdue invoices section ─────────────────────────────────────────────────

function VencidasSection({ rows }: { rows: VencidaRow[] }) {
  const [open, setOpen] = useState(false);
  const total = rows.reduce((s, r) => s + r.total, 0);

  return (
    <div className="border-t border-[#E5E7EB]">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#F9FAFB] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
            className={`shrink-0 text-[#9CA3AF] transition-transform ${open ? "rotate-90" : ""}`} aria-hidden>
            <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-[#8E0E1A]">
              Facturas vencidas
              <span className="ml-2 text-xs font-normal text-[#9CA3AF]">{rows.length} factura{rows.length !== 1 ? "s" : ""} · requieren seguimiento</span>
            </p>
          </div>
        </div>
        <span className="text-sm font-bold text-[#8E0E1A] tabular-nums shrink-0 ml-4">{fmtEuro(total)}</span>
      </button>

      {open && (
        <div className="overflow-x-auto border-t border-[#F3F4F6]">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-red-50 border-b border-red-100">
                {["Factura", "Cliente", "Vencida el", "Días vencida", "Importe"].map(h => (
                  <th key={h} className="px-5 py-2 text-left text-[10px] font-semibold text-[#8E0E1A] uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {rows.map(r => (
                <tr key={r.invoiceId} className="hover:bg-red-50/50 transition-colors">
                  <td className="px-5 py-2.5 font-mono font-semibold text-[#0A0A0A] whitespace-nowrap">
                    <Link href={`/dashboard/facturas/${r.invoiceId}`} className="hover:text-[#8E0E1A] transition-colors">
                      {r.docNumber}
                    </Link>
                  </td>
                  <td className="px-5 py-2.5 text-[#374151] max-w-[180px] truncate">{r.contactName}</td>
                  <td className="px-5 py-2.5 text-[#8E0E1A] whitespace-nowrap tabular-nums">{fmtDate(r.dueDate)}</td>
                  <td className="px-5 py-2.5 whitespace-nowrap">
                    <span className="font-semibold text-[#8E0E1A]">{r.daysOverdue} días</span>
                  </td>
                  <td className="px-5 py-2.5 tabular-nums font-bold text-[#8E0E1A] text-right whitespace-nowrap">{fmtEuro(r.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-red-100 bg-red-50">
                <td colSpan={4} className="px-5 py-2.5 text-xs font-semibold text-[#8E0E1A]">Total vencido</td>
                <td className="px-5 py-2.5 text-right text-sm font-bold text-[#8E0E1A] tabular-nums">{fmtEuro(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

function BlockPaginationBar({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-5 py-2 border-t border-[#F3F4F6] bg-white">
      <span className="text-[11px] text-[#9CA3AF]">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total} facturas</span>
      <div className="flex gap-1.5">
        <button disabled={page === 1} onClick={() => onPage(page - 1)} className="text-[11px] px-2.5 py-1 rounded border border-[#E5E7EB] text-[#6B7280] disabled:opacity-40 hover:border-[#0A0A0A] transition-colors bg-white">← Ant.</button>
        <button disabled={page === pages} onClick={() => onPage(page + 1)} className="text-[11px] px-2.5 py-1 rounded border border-[#E5E7EB] text-[#6B7280] disabled:opacity-40 hover:border-[#0A0A0A] transition-colors bg-white">Sig. →</button>
      </div>
    </div>
  );
}

export function ComisionesCard({ blocks, period, mesStr, isCurrentMes, delegateId, delegateName, irpfPct, pendientes, vencidas, isOwner }: Props) {
  const [blockPages, setBlockPages] = useState<Record<string, number>>({});
  function getPage(role: string) { return blockPages[role] ?? 1; }
  function setPage(role: string, p: number) { setBlockPages(prev => ({ ...prev, [role]: p })); }

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
      {/* Month navigation + preview */}
      <MonthNav
        mesStr={mesStr} isCurrentMes={isCurrentMes} period={period}
        delegateId={delegateId} delegateName={delegateName} irpfPct={irpfPct}
        isOwner={isOwner} hasCommissions={grandTotal > 0}
        blocks={blocks}
      />

      {/* Commission blocks */}
      {blocks.every(b => b.invoices.length === 0) ? (
        <p className="px-5 py-6 text-xs text-[#9CA3AF] text-center">
          Sin facturas cobradas en {period}.
        </p>
      ) : (
        <div className="divide-y divide-[#E5E7EB]">
          {blocks.map((block) => (
            <div key={block.role}>
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
              ) : (() => {
                const pg = getPage(block.role);
                const slice = block.invoices.slice((pg - 1) * PAGE_SIZE, pg * PAGE_SIZE);
                return (
                  <>
                    {slice.map((inv) => (
                      <InvoiceRow key={inv.invoiceId} inv={inv} />
                    ))}
                    <BlockPaginationBar page={pg} total={block.invoices.length} onPage={(p) => setPage(block.role, p)} />
                    <div className="px-5 py-3 flex items-center justify-between bg-[#F9FAFB] border-t border-[#E5E7EB]">
                      <span className="text-xs font-semibold text-[#374151]">Total comisión {block.role}</span>
                      <span className="text-base font-bold text-[#0A0A0A] tabular-nums">{fmtEuro(block.totalNetCommission)}</span>
                    </div>
                  </>
                );
              })()}
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

      {/* Facturas pendientes */}
      {pendientes.length > 0 && <PendientesSection rows={pendientes} />}

      {/* Facturas vencidas */}
      {vencidas.length > 0 && <VencidasSection rows={vencidas} />}

    </CollapsibleCard>
  );
}
