import { redirect } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { getHistoricoData } from "@/lib/bruixola/historicoData";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 100));

export default async function HistoricoFacturacionPage() {
  const profile = await getProfile();
  if (!profile || (profile.role !== "OWNER" && profile.role !== "CONSIGLIERE")) {
    redirect("/dashboard");
  }

  const { totalIntl, totalOtros, countIntl, countOtros, total, invoiceCount, byYear, firstDate, lastDate } = await getHistoricoData();

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Link href="/dashboard/bruixola" className="text-xs text-[#6B7280] hover:text-[#111827] mb-1 inline-block">← Brúixola</Link>
            <h1 className="text-2xl font-bold text-[#111827]">Facturación histórica</h1>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              {firstDate && lastDate
                ? `Desde ${firstDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" })} hasta ${lastDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" })} · ${invoiceCount} facturas`
                : "Sin datos"}
            </p>
          </div>
          <a
            href="/api/bruixola/historico/word"
            className="h-9 px-4 rounded-lg text-sm font-medium text-white bg-[#8E0E1A] hover:bg-[#6B0A14] transition-colors flex items-center gap-2"
          >
            Descargar Word →
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl p-5 border border-[#8E0E1A] bg-[#8E0E1A]">
            <p className="text-xs font-medium mb-1 text-[#FECDD3]">Total facturado</p>
            <p className="text-2xl font-bold text-white">{fmt(total)}</p>
            <p className="text-xs mt-1 font-medium text-[#FCA5A5]">{invoiceCount} facturas</p>
          </div>
          <div className="rounded-xl p-5 border border-[#E5E7EB] bg-white shadow-sm">
            <p className="text-xs font-medium mb-1 text-[#6B7280]">Internacional</p>
            <p className="text-2xl font-bold text-[#111827]">{fmt(totalIntl)}</p>
            <p className="text-xs mt-1 font-medium text-[#6B7280]">{pct(totalIntl, total)}% del total · {countIntl} facturas</p>
          </div>
          <div className="rounded-xl p-5 border border-[#E5E7EB] bg-white shadow-sm">
            <p className="text-xs font-medium mb-1 text-[#6B7280]">Otros</p>
            <p className="text-2xl font-bold text-[#111827]">{fmt(totalOtros)}</p>
            <p className="text-xs mt-1 font-medium text-[#6B7280]">{pct(totalOtros, total)}% del total · {countOtros} facturas</p>
          </div>
        </div>

        <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#F3F4F6] bg-[#FAFAFA]">
            <p className="text-sm font-semibold text-[#111827]">Por año</p>
            <p className="text-[10px] text-[#9CA3AF] mt-0.5">Base imponible, facturas emitidas (no borrador, no anuladas)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#F3F4F6]">
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Año</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Internacional</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Otros</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F9FAFB]">
                {byYear.map(b => (
                  <tr key={b.year} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#111827]">{b.year}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-[#111827]">{fmt(b.intl)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-[#111827]">{fmt(b.otros)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold text-[#8E0E1A]">{fmt(b.intl + b.otros)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#E5E7EB] bg-[#F9FAFB]">
                  <td className="px-4 py-3 font-bold text-[#111827]">TOTAL</td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-[#111827]">{fmt(totalIntl)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-[#111827]">{fmt(totalOtros)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-[#8E0E1A]">{fmt(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <Link href="/dashboard/bruixola/internacional" className="inline-block text-sm text-[#8E0E1A] hover:underline">Ver detalle mensual Internacional →</Link>
      </div>
    </div>
  );
}
