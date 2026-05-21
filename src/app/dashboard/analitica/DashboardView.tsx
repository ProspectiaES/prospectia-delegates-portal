"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnalyticsChat } from "./AnalyticsChat";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Period { year: number; month: number; label: string; isNow: boolean; mesStr: string; }
interface Kpis {
  units: number; allUnits: number; focUnits: number; revenue: number; invoiceCount: number;
  activeDelegates: number; activeClients: number; newClients: number; grossMargin: number;
}
interface MonthBar {
  label: string; year: number; month: number;
  units: number; allUnits: number; focUnits: number;
  revenue: number; newClients: number; activeClients: number; count: number;
}
interface Network { totalDelegates: number; kolCount: number; coordCount: number; totalClients: number; activeThisMonth: number; newThisMonth: number; }
interface TopDelegate { name: string; units: number; }
interface SkuRow { sku: string; name: string; units: number; }

interface Props {
  period: Period;
  kpis: Kpis;
  history: MonthBar[];
  network: Network;
  topDelegates: TopDelegate[];
  skuBreakdown: SkuRow[];
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const fmtK = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k €` : `${Math.round(n)} €`;

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? "#22C55E" : pct >= 50 ? "#F59E0B" : "#EF4444";
  return (
    <div className="w-full h-1 bg-[#F3F4F6] rounded-full overflow-hidden mt-2">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }} />
    </div>
  );
}

// ─── KPI Card (compact) ───────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, pct, accent = false,
}: {
  label: string; value: string; sub?: string; pct?: number; accent?: boolean;
}) {
  return (
    <div className={[
      "rounded-xl border px-4 py-3",
      accent ? "bg-[#8E0E1A] border-[#6B0A14]" : "bg-white border-[#E5E7EB]",
    ].join(" ")}>
      <p className={["text-[10px] font-bold uppercase tracking-widest", accent ? "text-white/60" : "text-[#9CA3AF]"].join(" ")}>{label}</p>
      <p className={["text-xl font-bold tabular-nums leading-tight mt-0.5", accent ? "text-white" : "text-[#0A0A0A]"].join(" ")}>{value}</p>
      {sub && <p className={["text-[11px] mt-0.5", accent ? "text-white/60" : "text-[#9CA3AF]"].join(" ")}>{sub}</p>}
      {pct !== undefined && <ProgressBar pct={pct} />}
    </div>
  );
}

// ─── Bar Chart (SVG) ──────────────────────────────────────────────────────────

function BarChart({
  data, getValue, color = "#8E0E1A", currentYear, currentMonth,
}: {
  data: MonthBar[];
  getValue: (d: MonthBar) => number;
  color?: string;
  currentYear: number;
  currentMonth: number;
}) {
  const values = data.map(getValue);
  const maxVal = Math.max(...values, 1);
  const W = 100, H = 52;
  const barW = W / data.length - 1;

  return (
    <svg viewBox={`0 0 ${W} ${H + 12}`} className="w-full h-16" preserveAspectRatio="none">
      {data.map((d, i) => {
        const h = Math.max(2, (values[i] / maxVal) * H);
        const x = i * (W / data.length);
        const isCurrent = d.month === currentMonth + 1 && d.year === currentYear;
        return (
          <g key={i}>
            <rect
              x={x + 0.5} y={H - h} width={barW} height={h}
              rx="1.5"
              fill={isCurrent ? color : "#E5E7EB"}
            />
            {(i === 0 || i === data.length - 1 || isCurrent) && (
              <text x={x + barW / 2} y={H + 9} textAnchor="middle" fontSize="5" fill="#9CA3AF" fontFamily="sans-serif">
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── SKU breakdown table ──────────────────────────────────────────────────────

function SkuTable({ rows }: { rows: SkuRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-[#9CA3AF] py-2">Sin datos este mes</p>;
  const maxUnits = rows[0].units;
  return (
    <div className="divide-y divide-[#F9FAFB]">
      {rows.map(r => (
        <div key={r.sku} className="flex items-center gap-3 py-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#0A0A0A] truncate">{r.name || r.sku}</p>
            <p className="text-[10px] text-[#9CA3AF] font-mono">{r.sku}</p>
          </div>
          <div className="w-24 hidden sm:block">
            <div className="w-full h-1 bg-[#F3F4F6] rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-[#8E0E1A]" style={{ width: `${Math.round((r.units / maxUnits) * 100)}%` }} />
            </div>
          </div>
          <span className="text-sm font-bold tabular-nums text-[#0A0A0A] w-10 text-right">{r.units}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Year evolution table ─────────────────────────────────────────────────────

const ALL_MONTH_LABELS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function YearTable({ history, year, currentMonth }: { history: MonthBar[]; year: number; currentMonth: number }) {
  const months = ALL_MONTH_LABELS.map((label, i) => {
    const found = history.find(h => h.year === year && h.month === i + 1);
    const isFuture = i > currentMonth;
    return { isFuture, ...(found ?? { units: 0, allUnits: 0, focUnits: 0, revenue: 0, newClients: 0, activeClients: 0, count: 0 }), label, month: i + 1 };
  });

  const totalUnits   = months.filter(m => !m.isFuture).reduce((s, m) => s + m.allUnits, 0);
  const totalFoc     = months.filter(m => !m.isFuture).reduce((s, m) => s + m.focUnits, 0);
  const totalRevenue = months.filter(m => !m.isFuture).reduce((s, m) => s + m.revenue, 0);
  const totalNew     = months.filter(m => !m.isFuture).reduce((s, m) => s + m.newClients, 0);

  const cell = "text-right py-2 px-2 tabular-nums";
  const futureCell = "text-right py-2 px-2 text-[#D1D5DB]";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs min-w-[700px]">
        <thead>
          <tr className="border-b border-[#E5E7EB]">
            <th className="text-left py-2 pr-4 text-[#9CA3AF] font-semibold w-32">Métrica</th>
            {months.map(m => (
              <th key={m.month} className={["text-right py-2 px-2 font-semibold w-14", m.isFuture ? "text-[#D1D5DB]" : "text-[#9CA3AF]"].join(" ")}>
                {m.label}
              </th>
            ))}
            <th className="text-right py-2 pl-3 text-[#9CA3AF] font-semibold border-l border-[#E5E7EB] w-16">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F9FAFB]">
          <tr className="hover:bg-[#FAFAFA]">
            <td className="py-2 pr-4 text-[#374151] font-medium">Unidades</td>
            {months.map(m => (
              <td key={m.month} className={m.isFuture ? futureCell : cell}>
                {m.isFuture ? "—" : m.allUnits > 0 ? m.allUnits : <span className="text-[#D1D5DB]">0</span>}
              </td>
            ))}
            <td className="text-right py-2 pl-3 font-bold text-[#0A0A0A] border-l border-[#E5E7EB]">{totalUnits}</td>
          </tr>
          <tr className="hover:bg-[#FAFAFA]">
            <td className="py-2 pr-4 text-[#374151] font-medium">FOC</td>
            {months.map(m => (
              <td key={m.month} className={m.isFuture ? futureCell : ["text-right py-2 px-2 tabular-nums text-[#6B7280]"].join(" ")}>
                {m.isFuture ? "—" : m.focUnits > 0 ? m.focUnits : <span className="text-[#D1D5DB]">0</span>}
              </td>
            ))}
            <td className="text-right py-2 pl-3 font-bold text-[#6B7280] border-l border-[#E5E7EB]">{totalFoc}</td>
          </tr>
          <tr className="hover:bg-[#FAFAFA]">
            <td className="py-2 pr-4 text-[#374151] font-medium">Facturación</td>
            {months.map(m => (
              <td key={m.month} className={m.isFuture ? futureCell : cell}>
                {m.isFuture ? "—" : m.revenue > 0 ? fmtK(m.revenue) : <span className="text-[#D1D5DB]">—</span>}
              </td>
            ))}
            <td className="text-right py-2 pl-3 font-bold text-[#8E0E1A] border-l border-[#E5E7EB]">{fmtK(totalRevenue)}</td>
          </tr>
          <tr className="hover:bg-[#FAFAFA]">
            <td className="py-2 pr-4 text-[#374151] font-medium">Clientes nuevos</td>
            {months.map(m => (
              <td key={m.month} className={m.isFuture ? futureCell : ["text-right py-2 px-2 tabular-nums text-[#6B7280]"].join(" ")}>
                {m.isFuture ? "—" : m.newClients > 0 ? `+${m.newClients}` : <span className="text-[#D1D5DB]">0</span>}
              </td>
            ))}
            <td className="text-right py-2 pl-3 font-bold text-[#6B7280] border-l border-[#E5E7EB]">+{totalNew}</td>
          </tr>
          <tr className="hover:bg-[#FAFAFA]">
            <td className="py-2 pr-4 text-[#374151] font-medium">Clientes activos</td>
            {months.map(m => (
              <td key={m.month} className={m.isFuture ? futureCell : cell}>
                {m.isFuture ? "—" : m.activeClients > 0 ? m.activeClients : <span className="text-[#D1D5DB]">0</span>}
              </td>
            ))}
            <td className="text-right py-2 pl-3 text-[#9CA3AF] border-l border-[#E5E7EB]">—</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-3">
      <div>
        <p className="text-sm font-bold text-[#0A0A0A]">{title}</p>
        {sub && <p className="text-[11px] text-[#9CA3AF] mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── Month navigator ──────────────────────────────────────────────────────────

function MonthNav({ mesStr }: { mesStr: string }) {
  const router = useRouter();

  function navigate(delta: number) {
    const [y, m] = mesStr.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    const next = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    router.push(`/dashboard/analitica?mes=${next}`);
  }

  return (
    <div className="flex items-center gap-1">
      <button onClick={() => navigate(-1)} className="h-7 w-7 rounded-lg flex items-center justify-center text-[#6B7280] hover:bg-[#F3F4F6] transition-colors">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 3L5 7l4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      <button onClick={() => navigate(1)} className="h-7 w-7 rounded-lg flex items-center justify-center text-[#6B7280] hover:bg-[#F3F4F6] transition-colors">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function DashboardView({ period, kpis, history, network, topDelegates, skuBreakdown }: Props) {
  const [chatOpen, setChatOpen] = useState(false);

  const maxTopUnits = topDelegates.length > 0 ? topDelegates[0].units : 1;

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-5 pt-4 pb-8 space-y-4 max-w-[1400px] mx-auto">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-[#0A0A0A]">Cuadro de Mando</h1>
            <p className="text-xs text-[#9CA3AF]">{period.label}{period.isNow ? " · En Curso" : ""}</p>
          </div>
          <div className="flex items-center gap-2">
            <MonthNav mesStr={period.mesStr} />
            <button
              onClick={() => setChatOpen(true)}
              className="h-8 px-3 rounded-lg bg-[#8E0E1A] text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-[#6B0A14] transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v3a2.5 2.5 0 0 1-2.5 2.5H7l-3 2v-2H4A2.5 2.5 0 0 1 1.5 7.5v-3A2.5 2.5 0 0 1 4 2h5.5Z" strokeLinejoin="round"/>
              </svg>
              Analítica IA
            </button>
          </div>
        </div>

        {/* ── KPI row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <KpiCard
            label="Ud. totales"
            value={String(kpis.allUnits)}
            sub={kpis.focUnits > 0 ? `+${kpis.focUnits} FOC` : `${kpis.invoiceCount} facturas`}
          />
          <KpiCard
            label="Facturación"
            value={fmtK(kpis.revenue)}
            sub={`Margen ${fmtEuro(kpis.grossMargin)}`}
            accent
          />
          <KpiCard
            label="Delegados activos"
            value={String(kpis.activeDelegates)}
            sub={`de ${network.totalDelegates}`}
            pct={network.totalDelegates > 0 ? Math.round((kpis.activeDelegates / network.totalDelegates) * 100) : 0}
          />
          <KpiCard
            label="Clientes activos"
            value={String(kpis.activeClients)}
            sub={`de ${network.totalClients}`}
          />
          <KpiCard
            label="Clientes nuevos"
            value={`+${kpis.newClients}`}
            sub="este mes"
          />
          <KpiCard
            label="Facturas"
            value={String(kpis.invoiceCount)}
            sub={`${kpis.units} ud spray`}
          />
        </div>

        {/* ── Charts row ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Section title="Unidades · 12m" sub={`${kpis.allUnits} ud este mes`}>
            <BarChart data={history} getValue={d => d.allUnits} currentYear={period.year} currentMonth={period.month} />
          </Section>
          <Section title="Facturación · 12m" sub={fmtEuro(kpis.revenue)}>
            <BarChart data={history} getValue={d => d.revenue} currentYear={period.year} currentMonth={period.month} />
          </Section>
          <Section title="Clientes nuevos · 12m" sub={`+${kpis.newClients} este mes`}>
            <BarChart data={history} getValue={d => d.newClients} color="#6366F1" currentYear={period.year} currentMonth={period.month} />
          </Section>
        </div>

        {/* ── SKU breakdown ───────────────────────────────────────────── */}
        <Section title={`Unidades por producto · ${period.label}`} sub="Todas las líneas de factura del mes">
          <SkuTable rows={skuBreakdown} />
        </Section>

        {/* ── Year evolution table ─────────────────────────────────────── */}
        <Section title={`Evolución ${period.year}`} sub="Enero–Diciembre · acumulado del año">
          <YearTable history={history} year={period.year} currentMonth={period.month} />
        </Section>

        {/* ── Bottom row: Network + Top delegates ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">

          {/* Network */}
          <Section title="Red Prospectia">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "DELEGADOS", value: String(network.totalDelegates), sub: "en red" },
                { label: "CLIENTES TOTALES", value: String(network.totalClients), sub: "en cartera" },
                { label: "ACTIVOS ESTE MES", value: String(network.activeThisMonth), sub: undefined },
                { label: "NUEVOS ESTE MES", value: `+${network.newThisMonth}`, sub: "incorporados", green: true },
              ].map(({ label, value, sub, green }) => (
                <div key={label}>
                  <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">{label}</p>
                  <p className={["text-2xl font-bold mt-0.5 leading-none", green ? "text-emerald-600" : "text-[#0A0A0A]"].join(" ")}>{value}</p>
                  {sub && <p className="text-[11px] text-[#9CA3AF] mt-0.5">{sub}</p>}
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-[#F3F4F6] flex gap-4 text-xs text-[#6B7280]">
              <span><strong className="text-[#0A0A0A]">{network.kolCount}</strong> KOL{network.kolCount !== 1 ? "s" : ""}</span>
              <span><strong className="text-[#0A0A0A]">{network.coordCount}</strong> Coordinador{network.coordCount !== 1 ? "es" : ""}</span>
            </div>
          </Section>

          {/* Top delegados */}
          <Section title="Top delegados" sub="Unidades spray este mes">
            {topDelegates.length === 0 ? (
              <p className="text-sm text-[#9CA3AF] text-center py-4">Sin ventas registradas</p>
            ) : (
              <div className="space-y-2.5">
                {topDelegates.map((d, i) => {
                  const pct = maxTopUnits > 0 ? Math.round((d.units / maxTopUnits) * 100) : 0;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2">
                          <span className="text-[#9CA3AF] w-4">{i + 1}</span>
                          <span className="font-medium text-[#0A0A0A]">{d.name}</span>
                        </span>
                        <span className="font-semibold tabular-nums text-[#8E0E1A]">{d.units} ud</span>
                      </div>
                      <div className="w-full h-1 bg-[#F3F4F6] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#8E0E1A] transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="pt-2 border-t border-[#F3F4F6] text-center">
              <a href="/dashboard/performance" className="text-xs text-[#8E0E1A] hover:underline font-medium">
                Ver Performance completo →
              </a>
            </div>
          </Section>
        </div>

      </div>

      {/* ── AI Chat overlay ──────────────────────────────────────────── */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30 backdrop-blur-[2px]" onClick={() => setChatOpen(false)} />
          <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col h-full">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#F3F4F6] shrink-0">
              <div>
                <p className="text-sm font-bold text-[#0A0A0A]">Analítica IA</p>
                <p className="text-[11px] text-[#9CA3AF]">Datos en tiempo real · claude-sonnet-4-6</p>
              </div>
              <button onClick={() => setChatOpen(false)} className="p-1.5 rounded-lg text-[#9CA3AF] hover:bg-[#F3F4F6]">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 2l10 10M12 2L2 12" strokeLinecap="round"/></svg>
              </button>
            </div>
            <AnalyticsChat />
          </div>
        </div>
      )}
    </div>
  );
}
