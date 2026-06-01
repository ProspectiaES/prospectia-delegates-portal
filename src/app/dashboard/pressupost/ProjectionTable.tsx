"use client";

export interface MonthRow {
  label: string;       // "gen. 2025"
  yearMonth: string;   // "2025-01"
  cobrat: number | null;  // null = future
  facturat: number | null;
  beRevenue: number;
  isCurrentMonth: boolean;
}

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

function Semafar({ cobrat, be }: { cobrat: number | null; be: number }) {
  if (cobrat === null) return <span className="text-[10px] text-[#9CA3AF] font-medium">—</span>;
  const ratio = be > 0 ? cobrat / be : 1;
  if (ratio >= 1)    return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Per sobre</span>;
  if (ratio >= 0.8)  return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Proper</span>;
  return                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Sota</span>;
}

export default function ProjectionTable({ rows, beRevenue }: { rows: MonthRow[]; beRevenue: number }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-bold text-[#0A0A0A]">Projecció 12 mesos</h2>
        <p className="text-xs text-[#6B7280] mt-0.5">
          Últims 6 mesos reals + 6 mesos estimats. Break-even referència:
          <span className="font-semibold text-[#0A0A0A] ml-1">{fmtEuro(beRevenue)}/mes</span>.
        </p>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] overflow-hidden bg-white">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <th className="text-left text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-4 py-2.5">Mes</th>
              <th className="text-right text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-3 py-2.5">Facturat</th>
              <th className="text-right text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-3 py-2.5">Cobrat</th>
              <th className="text-right text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-3 py-2.5">Break-even</th>
              <th className="text-center text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-3 py-2.5">Estat</th>
              <th className="text-right text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-3 py-2.5">Marge €</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F4F6]">
            {rows.map((row) => {
              const isFuture = row.cobrat === null;
              const margin   = row.cobrat !== null ? row.cobrat - row.beRevenue : null;
              const rowCls   = row.isCurrentMonth
                ? "bg-[#FEF9F9]"
                : isFuture
                  ? "opacity-60"
                  : "";

              return (
                <tr key={row.yearMonth} className={`${rowCls} transition-colors hover:bg-[#FAFAFA]`}>
                  <td className="px-4 py-2.5">
                    <span className={`font-medium capitalize ${row.isCurrentMonth ? "text-[#8E0E1A]" : "text-[#374151]"}`}>
                      {row.label}
                    </span>
                    {row.isCurrentMonth && (
                      <span className="ml-2 text-[9px] font-bold text-[#8E0E1A] uppercase tracking-wider bg-[#FEF2F2] px-1.5 py-0.5 rounded-full">Actual</span>
                    )}
                    {isFuture && (
                      <span className="ml-2 text-[9px] font-semibold text-[#9CA3AF] uppercase tracking-wider">estimat</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-[#374151]">
                    {row.facturat !== null ? fmtEuro(row.facturat) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-[#0A0A0A]">
                    {row.cobrat !== null ? fmtEuro(row.cobrat) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-[#6B7280]">
                    {fmtEuro(row.beRevenue)}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <Semafar cobrat={row.cobrat} be={row.beRevenue} />
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold">
                    {margin !== null ? (
                      <span className={margin >= 0 ? "text-emerald-600" : "text-red-600"}>
                        {margin >= 0 ? "+" : ""}{fmtEuro(margin)}
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
