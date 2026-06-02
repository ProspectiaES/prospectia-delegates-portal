import { redirect } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { getRemeses } from "@/lib/remeses/service";
import GenerarRemesaButton from "./GenerarRemesaButton";
import type { RemesaConResum, EstatRemesa } from "@/lib/remeses/types";

export const metadata = { title: "Remeses — Prospectia" };

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("ca-ES", { style: "currency", currency: "EUR" }).format(n);

const fmtDate = (s: string) =>
  new Date(s + "T00:00:00").toLocaleDateString("ca-ES", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

const ESTAT_BADGE: Record<EstatRemesa, string> = {
  esborrany: "bg-gray-100 text-gray-600",
  generada:  "bg-blue-50 text-blue-700",
  transmesa: "bg-amber-50 text-amber-700",
  cobrada:   "bg-emerald-50 text-emerald-700",
  retornada: "bg-red-50 text-red-700",
};

const ESTAT_LABEL: Record<EstatRemesa, string> = {
  esborrany: "Esborrany",
  generada:  "Generada",
  transmesa: "Transmesa",
  cobrada:   "Cobrada",
  retornada: "Retornada",
};

export default async function RemesesPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const remeses = await getRemeses();

  // Summary KPIs
  const totalMes = remeses
    .filter((r) => r.setmana_inici >= new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10))
    .reduce((s, r) => s + r.import_total, 0);
  const pendentsTransmetre = remeses.filter((r) => r.estat === "generada").length;
  const totalPendent = remeses.filter((r) => r.estat === "transmesa").reduce((s, r) => s + r.import_total, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0A0A0A]">Remeses</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Gestió de rebuts SEPA per a CaixaGuissona (Norma 19 / pain.008.001.02)
          </p>
        </div>
        <GenerarRemesaButton />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Import mes actual", value: fmtEuro(totalMes), sub: "factures del mes" },
          { label: "Pendents de transmetre", value: String(pendentsTransmetre), sub: "remeses generades", warn: pendentsTransmetre > 0 },
          { label: "En trànsit", value: fmtEuro(totalPendent), sub: "transmeses, pendent cobrament" },
        ].map((kpi) => (
          <div key={kpi.label} className={`rounded-xl border p-4 ${kpi.warn ? "border-amber-200 bg-amber-50" : "border-[#E5E7EB] bg-white"}`}>
            <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">{kpi.label}</p>
            <p className="text-2xl font-bold text-[#0A0A0A] mt-1 tabular-nums">{kpi.value}</p>
            <p className="text-[11px] text-[#9CA3AF] mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#E5E7EB] overflow-hidden bg-white">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
              {["Setmana", "Data remesa", "Cobrament est.", "Factures", "Import", "Estat", ""].map((h) => (
                <th key={h} className="text-left text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-4 py-2.5">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F4F6]">
            {remeses.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-[#9CA3AF] py-10">
                  Encara no hi ha remeses. Clica "Generar remesa" per crear-ne una.
                </td>
              </tr>
            )}
            {remeses.map((r) => (
              <tr key={r.id} className="hover:bg-[#FAFAFA] transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-[#0A0A0A]">
                    {fmtDate(r.setmana_inici)} – {fmtDate(r.setmana_fi)}
                  </p>
                </td>
                <td className="px-4 py-3 text-[#374151]">{fmtDate(r.data_remesa)}</td>
                <td className="px-4 py-3 text-[#374151]">{fmtDate(r.data_cobrament_estandard)}</td>
                <td className="px-4 py-3 text-center">
                  <span className="font-semibold text-[#0A0A0A]">{r.num_linies}</span>
                  {r.num_ampliat > 0 && (
                    <span className="ml-1 text-[#9CA3AF]">(+{r.num_ampliat} amp.)</span>
                  )}
                </td>
                <td className="px-4 py-3 font-semibold tabular-nums text-[#0A0A0A]">
                  {fmtEuro(r.import_total)}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${ESTAT_BADGE[r.estat]}`}>
                    {ESTAT_LABEL[r.estat]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/dashboard/remeses/${r.id}`}
                    className="text-[#8E0E1A] font-semibold hover:underline"
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
