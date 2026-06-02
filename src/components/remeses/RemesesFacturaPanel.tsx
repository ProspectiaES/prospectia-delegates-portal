import Link from "next/link";
import { getRemesesByFactura } from "@/lib/remeses/service";
import type { RemesaTraca } from "@/lib/remeses/service";
import type { EstatRemesa } from "@/lib/remeses/types";

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("ca-ES", { style: "currency", currency: "EUR" }).format(n);

const fmtDate = (s: string) =>
  new Date(s + "T00:00:00").toLocaleDateString("ca-ES", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

const ESTAT_REMESA_BADGE: Record<EstatRemesa, string> = {
  esborrany: "bg-gray-100 text-gray-500",
  generada:  "bg-blue-50 text-blue-700",
  transmesa: "bg-amber-50 text-amber-700",
  cobrada:   "bg-emerald-50 text-emerald-700",
  retornada: "bg-red-50 text-red-700",
};

const ESTAT_LINIA_BADGE: Record<string, string> = {
  pendent:  "bg-amber-50 text-amber-700",
  cobrada:  "bg-emerald-50 text-emerald-700",
  retornada:"bg-red-50 text-red-700",
};

const ESTAT_REMESA_LABEL: Record<EstatRemesa, string> = {
  esborrany: "Esborrany", generada: "Generada", transmesa: "Transmesa",
  cobrada: "Cobrada", retornada: "Retornada",
};

export default async function RemesesFacturaPanel({ facturaId }: { facturaId: string }) {
  let traces: RemesaTraca[] = [];
  try {
    traces = await getRemesesByFactura(facturaId);
  } catch {
    return null;
  }

  if (traces.length === 0) return null;

  const lastTrace = traces[0];

  return (
    <div className="rounded-xl border border-[#E5E7EB] overflow-hidden bg-white">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#F3F4F6] bg-[#FAFAFA]">
        <h3 className="text-xs font-bold text-[#374151]">Historial de remeses SEPA</h3>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ESTAT_LINIA_BADGE[lastTrace.estat_linia] ?? ""}`}>
          {lastTrace.estat_linia.charAt(0).toUpperCase() + lastTrace.estat_linia.slice(1)}
        </span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[#F3F4F6]">
            <th className="text-left text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-5 py-2">Setmana</th>
            <th className="text-left text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-5 py-2">Data cobrament</th>
            <th className="text-right text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-5 py-2">Import</th>
            <th className="text-center text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-5 py-2">Estat línia</th>
            <th className="text-center text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-5 py-2">Estat remesa</th>
            <th className="px-5 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F3F4F6]">
          {traces.map((t) => (
            <tr key={t.remesa_id} className="hover:bg-[#FAFAFA]">
              <td className="px-5 py-2.5 text-[#374151]">
                {fmtDate(t.setmana_inici)} – {fmtDate(t.setmana_fi)}
              </td>
              <td className="px-5 py-2.5 text-[#374151]">{fmtDate(t.data_cobrament)}</td>
              <td className="px-5 py-2.5 text-right font-semibold tabular-nums">{fmtEuro(t.import)}</td>
              <td className="px-5 py-2.5 text-center">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ESTAT_LINIA_BADGE[t.estat_linia] ?? ""}`}>
                  {t.estat_linia.charAt(0).toUpperCase() + t.estat_linia.slice(1)}
                </span>
              </td>
              <td className="px-5 py-2.5 text-center">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ESTAT_REMESA_BADGE[t.estat_remesa]}`}>
                  {ESTAT_REMESA_LABEL[t.estat_remesa]}
                </span>
              </td>
              <td className="px-5 py-2.5 text-right">
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
  );
}
