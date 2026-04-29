"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

export interface DelegateInvoice {
  id: string;
  doc_number: string | null;
  contact_id: string | null;
  contact_name: string | null;
  date: string | null;
  due_date: string | null;
  date_paid: string | null;
  total: number;
  status: number;
}

interface Props {
  invoices: DelegateInvoice[];
  periodStart: string;
  periodEnd: string;
}

const statusLabel: Record<number, string> = { 0: "Borrador", 1: "Pendiente", 2: "Vencida", 3: "Cobrada" };
const statusVariant: Record<number, "neutral" | "warning" | "danger" | "success"> = {
  0: "neutral", 1: "warning", 2: "danger", 3: "success",
};

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

type Tab = "todas" | "cobradas" | "periodo" | "pendientes" | "vencidas";

const TABS: { key: Tab; label: string }[] = [
  { key: "todas",      label: "Todas"               },
  { key: "cobradas",   label: "Cobradas"             },
  { key: "periodo",    label: "Cobradas este mes"    },
  { key: "pendientes", label: "Pendientes"           },
  { key: "vencidas",   label: "Vencidas"             },
];

export function InvoiceTabs({ invoices, periodStart, periodEnd }: Props) {
  const [tab, setTab] = useState<Tab>("todas");

  const filtered = invoices.filter((inv) => {
    if (tab === "cobradas")   return inv.status === 3;
    if (tab === "periodo")    return inv.status === 3 && !!inv.date_paid && inv.date_paid >= periodStart && inv.date_paid <= periodEnd;
    if (tab === "pendientes") return inv.status === 1;
    if (tab === "vencidas")   return inv.status === 2;
    return true;
  });

  const sumFiltered = filtered.reduce((s, inv) => s + inv.total, 0);

  return (
    <div>
      {/* Tab bar */}
      <div className="border-b border-[#E5E7EB] px-5 flex gap-1 overflow-x-auto">
        {TABS.map(({ key, label }) => {
          const count = key === "todas" ? invoices.length : invoices.filter((inv) => {
            if (key === "cobradas")   return inv.status === 3;
            if (key === "periodo")    return inv.status === 3 && !!inv.date_paid && inv.date_paid >= periodStart && inv.date_paid <= periodEnd;
            if (key === "pendientes") return inv.status === 1;
            if (key === "vencidas")   return inv.status === 2;
            return false;
          }).length;

          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={[
                "relative shrink-0 px-3 py-3 text-xs font-medium transition-colors whitespace-nowrap",
                tab === key
                  ? "text-[#8E0E1A] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#8E0E1A] after:rounded-t"
                  : "text-[#6B7280] hover:text-[#0A0A0A]",
              ].join(" ")}
            >
              {label}
              <span className={[
                "ml-1.5 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold min-w-[18px]",
                tab === key ? "bg-[#FEF2F2] text-[#8E0E1A]" : "bg-[#F3F4F6] text-[#6B7280]",
              ].join(" ")}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="px-5 py-8 text-xs text-[#9CA3AF] text-center">Sin facturas en esta categoría.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  {["N.º Factura", "Cliente", "Fecha", "Vencimiento", "Importe", "Estado", ""].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-4 py-3 tabular-nums whitespace-nowrap font-semibold font-mono text-xs text-[#0A0A0A]">
                      <Link href={`/dashboard/facturas/${inv.id}`} className="hover:text-[#8E0E1A] transition-colors">
                        {inv.doc_number ?? inv.id.slice(0, 8) + "…"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap max-w-[180px]">
                      {inv.contact_id ? (
                        <Link href={`/dashboard/clientes/${inv.contact_id}`} className="text-sm font-medium text-[#0A0A0A] hover:text-[#8E0E1A] truncate block transition-colors">
                          {inv.contact_name ?? "—"}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium text-[#0A0A0A] truncate block">
                          {inv.contact_name ?? "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums whitespace-nowrap text-xs text-[#6B7280]">
                      {fmtDate(inv.date)}
                    </td>
                    <td className="px-4 py-3 tabular-nums whitespace-nowrap text-xs">
                      <span className={inv.status === 2 ? "text-[#8E0E1A] font-medium" : "text-[#6B7280]"}>
                        {fmtDate(inv.due_date)}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums whitespace-nowrap text-right font-semibold text-[#0A0A0A]">
                      {fmtCurrency(inv.total)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant={statusVariant[inv.status] ?? "neutral"}>
                        {statusLabel[inv.status] ?? `Estado ${inv.status}`}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link href={`/dashboard/facturas/${inv.id}`} className="text-xs font-medium text-[#6B7280] hover:text-[#8E0E1A] transition-colors">
                        Ver →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-[#E5E7EB] bg-[#F9FAFB]">
                  <td colSpan={4} className="px-4 py-2.5 text-xs text-[#6B7280]">{filtered.length} factura{filtered.length !== 1 ? "s" : ""}</td>
                  <td className="px-4 py-2.5 text-right text-sm font-bold text-[#0A0A0A] tabular-nums">{fmtCurrency(sumFiltered)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
