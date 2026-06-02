import Link from "next/link";
import { getRemesesByClient } from "@/lib/remeses/service";
import type { RemesaTraca } from "@/lib/remeses/service";
import type { EstatRemesa } from "@/lib/remeses/types";

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("ca-ES", { style: "currency", currency: "EUR" }).format(n);

const fmtDate = (s: string) =>
  new Date(s + "T00:00:00").toLocaleDateString("ca-ES", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

const ESTAT_BADGE: Record<EstatRemesa, string> = {
  esborrany: "bg-gray-100 text-gray-500",
  generada:  "bg-blue-50 text-blue-700",
  transmesa: "bg-amber-50 text-amber-700",
  cobrada:   "bg-emerald-50 text-emerald-700",
  retornada: "bg-red-50 text-red-700",
};

const ESTAT_LABEL: Record<EstatRemesa, string> = {
  esborrany: "Esborrany", generada: "Generada", transmesa: "Transmesa",
  cobrada: "Cobrada", retornada: "Retornada",
};

export default async function RemesesClientPanel({ contactId }: { contactId: string }) {
  let traces: RemesaTraca[] = [];
  try {
    traces = await getRemesesByClient(contactId);
  } catch {
    return null;
  }

  if (traces.length === 0) return null;

  const totalCobrat    = traces.filter((t) => t.estat_linia === "cobrada").reduce((s, t) => s + t.import, 0);
  const totalRetornat  = traces.filter((t) => t.estat_linia === "retornada").reduce((s, t) => s + t.import, 0);
  const totalPendent   = traces.filter((t) => t.estat_linia === "pendent").reduce((s, t) => s + t.import, 0);

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total cobrat",   value: fmtEuro(totalCobrat),   cls: "text-emerald-600" },
          { label: "Total retornat", value: fmtEuro(totalRetornat), cls: "text-red-600" },
          { label: "En trànsit",     value: fmtEuro(totalPendent),  cls: "text-amber-600" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3">
            <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">{kpi.label}</p>
            <p className={`text-base font-bold mt-0.5 tabular-nums ${kpi.cls}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#E5E7EB] overflow-hidden bg-white">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <th className="text-left text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-4 py-2.5">Setmana</th>
              <th className="text-left text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-4 py-2.5">Cobrament</th>
              <th className="text-right text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-4 py-2.5">Import</th>
              <th className="text-center text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-4 py-2.5">Venciment</th>
              <th className="text-center text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-4 py-2.5">Estat</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F4F6]">
            {traces.map((t) => (
              <tr key={`${t.remesa_id}-${t.data_cobrament}`} className="hover:bg-[#FAFAFA]">
                <td className="px-4 py-2.5 text-[#374151]">
                  {fmtDate(t.setmana_inici)} – {fmtDate(t.setmana_fi)}
                </td>
                <td className="px-4 py-2.5 text-[#374151]">{fmtDate(t.data_cobrament)}</td>
                <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{fmtEuro(t.import)}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 capitalize">
                    {t.tipus_venciment}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ESTAT_BADGE[t.estat_remesa]}`}>
                    {ESTAT_LABEL[t.estat_remesa]}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Link
                    href={`/dashboard/remeses/${t.remesa_id}`}
                    className="text-[#8E0E1A] font-semibold hover:underline text-[10px]"
                  >
                    Veure →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
