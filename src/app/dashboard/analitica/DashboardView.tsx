"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnalyticsChat } from "./AnalyticsChat";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Period { year: number; month: number; label: string; isNow: boolean; mesStr: string; }
interface Kpis {
  units: number; focUnits: number; revenue: number; invoiceCount: number;
  activeDelegates: number; activeClients: number; newClients: number; grossMargin: number;
}
interface MonthBar { label: string; year: number; month: number; units: number; revenue: number; newClients: number; }
interface Network { totalDelegates: number; kolCount: number; coordCount: number; totalClients: number; activeThisMonth: number; newThisMonth: number; }
interface TopDelegate { name: string; units: number; }

interface Props {
  period: Period;
  kpis: Kpis;
  history: MonthBar[];
  network: Network;
  topDelegates: TopDelegate[];
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const fmtK = (n: number) => n >= 1000 ? `€${(n / 1000).toFixed(1)}k` : `€${Math.round(n)}`;

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? "#22C55E" : pct >= 50 ? "#F59E0B" : "#EF4444";
  return (
    <div className="w-full h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }} />
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon, pct, accent = false,
}: {
  label: string; value: string; sub?: string; icon: React.ReactNode;
  pct?: number; accent?: boolean;
}) {
  return (
    <div className={["rounded-2xl border p-4 space-y-3", accent ? "bg-[#8E0E1A] border-[#6B0A14]" : "bg-white border-[#E5E7EB]"].join(" ")}>
      <div className="flex items-center justify-between">
        <span className={["text-[10px] font-bold uppercase tracking-widest", accent ? "text-white/70" : "text-[#9CA3AF]"].join(" ")}>{label}</span>
        <span className={accent ? "text-white/60" : "text-[#D1D5DB]"}>{icon}</span>
      </div>
      <div>
        <p className={["text-2xl font-bold tabular-nums leading-none", accent ? "text-white" : "text-[#0A0A0A]"].join(" ")}>{value}</p>
        {sub && <p className={["text-[11px] mt-1", accent ? "text-white/60" : "text-[#9CA3AF]"].join(" ")}>{sub}</p>}
      </div>
      {pct !== undefined && (
        <div className="space-y-1">
          <ProgressBar pct={pct} />
        </div>
      )}
    </div>
  );
}

// ─── Bar Chart (SVG) ──────────────────────────────────────────────────────────

function BarChart({
  data, getValue, color = "#8E0E1A", currentMonth,
}: {
  data: MonthBar[];
  getValue: (d: MonthBar) => number;
  color?: string;
  currentMonth: number;
}) {
  const values = data.map(getValue);
  const maxVal = Math.max(...values, 1);
  const W = 100, H = 60;
  const barW = W / data.length - 1;

  return (
    <svg viewBox={`0 0 ${W} ${H + 14}`} className="w-full" preserveAspectRatio="none">
      {data.map((d, i) => {
        const h = Math.max(2, (values[i] / maxVal) * H);
        const x = i * (W / data.length);
        const isCurrent = d.month === currentMonth + 1 && d.year === data[data.length - 1].year;
        return (
          <g key={i}>
            <rect
              x={x + 0.5} y={H - h} width={barW} height={h}
              rx="1.5"
              fill={isCurrent ? color : "#E5E7EB"}
            />
            {(i === 0 || i === data.length - 1 || isCurrent) && (
              <text x={x + barW / 2} y={H + 10} textAnchor="middle" fontSize="5.5" fill="#9CA3AF" fontFamily="sans-serif">
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Section title ────────────────────────────────────────────────────────────

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 space-y-4">
      <div>
        <p className="text-sm font-bold text-[#0A0A0A]">{title}</p>
        {sub && <p className="text-[11px] text-[#9CA3AF] mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── Month navigator (pure client) ───────────────────────────────────────────

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

export function DashboardView({ period, kpis, history, network, topDelegates }: Props) {
  const [chatOpen, setChatOpen] = useState(false);

  const maxUnits   = Math.max(...history.map(h => h.units), 1);
  const topUnits   = history[history.length - 1].units;
  const topRevenue = history[history.length - 1].revenue;

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 pt-5 pb-8 space-y-5 max-w-[1400px] mx-auto">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#0A0A0A]">Cuadro de Mando</h1>
            <p className="text-sm text-[#9CA3AF] mt-0.5">
              {period.label}{period.isNow ? " · En Curso" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <MonthNav mesStr={period.mesStr} />
            <button
              onClick={() => setChatOpen(true)}
              className="h-9 px-3 rounded-xl bg-[#8E0E1A] text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-[#6B0A14] transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v3a2.5 2.5 0 0 1-2.5 2.5H7l-3 2v-2H4A2.5 2.5 0 0 1 1.5 7.5v-3A2.5 2.5 0 0 1 4 2h5.5Z" strokeLinejoin="round"/>
              </svg>
              Analítica IA
            </button>
          </div>
        </div>

        {/* ── KPI row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard
            label="Unidades"
            value={String(kpis.units)}
            sub={kpis.focUnits > 0 ? `+${kpis.focUnits} FOC` : `${kpis.invoiceCount} facturas`}
            icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 5l6-3 6 3v6l-6 3-6-3V5z" strokeLinejoin="round"/><path d="M8 2v13M2 5l6 3 6-3" strokeLinejoin="round"/></svg>}
          />
          <KpiCard
            label="Facturación"
            value={fmtK(kpis.revenue)}
            sub={`Margen ${fmtEuro(kpis.grossMargin)}`}
            accent
            icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M5 8h6M5 10.5h3" strokeLinecap="round"/></svg>}
          />
          <KpiCard
            label="Delegados activos"
            value={String(kpis.activeDelegates)}
            sub={`de ${network.totalDelegates} en cartera`}
            pct={network.totalDelegates > 0 ? Math.round((kpis.activeDelegates / network.totalDelegates) * 100) : 0}
            icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="5.5" r="2.5"/><path d="M2 13c0-2.761 2.686-5 6-5s6 2.239 6 5" strokeLinecap="round"/></svg>}
          />
          <KpiCard
            label="Clientes activos"
            value={String(kpis.activeClients)}
            sub={`de ${network.totalClients} total`}
            icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6" cy="5" r="2.5"/><path d="M1 13c0-2.485 2.239-4.5 5-4.5"/><circle cx="11.5" cy="9" r="2"/><path d="M14.5 14c0-1.657-1.343-3-3-3s-3 1.343-3 3" strokeLinecap="round"/></svg>}
          />
          <KpiCard
            label="Clientes nuevos"
            value={`+${kpis.newClients}`}
            sub="incorporados este mes"
            icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="5.5" r="2.5"/><path d="M1 13c0-2.761 2.239-5 6-5"/><path d="M12 9v5M9.5 11.5h5" strokeLinecap="round"/></svg>}
          />
        </div>

        {/* ── Charts row ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Section title="Unidades · 12 meses" sub={`${kpis.units} ud este mes`}>
            <BarChart data={history} getValue={d => d.units} currentMonth={period.month} />
          </Section>
          <Section title="Facturación · 12 meses" sub={fmtEuro(kpis.revenue)}>
            <BarChart data={history} getValue={d => d.revenue} currentMonth={period.month} />
          </Section>
          <Section title="Clientes nuevos · 12 meses" sub={`+${kpis.newClients} este mes`}>
            <BarChart data={history} getValue={d => d.newClients} color="#6366F1" currentMonth={period.month} />
          </Section>
        </div>

        {/* ── Bottom row: Network + Top delegates ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

          {/* Network */}
          <Section title="Red Prospectia">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "DELEGADOS", value: String(network.totalDelegates), sub: "equipo activo" },
                { label: "CLIENTES TOTALES", value: String(network.totalClients), sub: "en cartera" },
                { label: "ACTIVOS ESTE MES", value: String(network.activeThisMonth), sub: undefined },
                { label: "NUEVOS ESTE MES", value: `+${network.newThisMonth}`, sub: "incorporados", green: true },
              ].map(({ label, value, sub, green }) => (
                <div key={label}>
                  <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">{label}</p>
                  <p className={["text-3xl font-bold mt-1 leading-none", green ? "text-emerald-600" : "text-[#0A0A0A]"].join(" ")}>{value}</p>
                  {sub && <p className="text-[11px] text-[#9CA3AF] mt-0.5">{sub}</p>}
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-[#F3F4F6] flex gap-4 text-xs text-[#6B7280]">
              <span><strong className="text-[#0A0A0A]">{network.kolCount}</strong> KOL{network.kolCount !== 1 ? "s" : ""}</span>
              <span><strong className="text-[#0A0A0A]">{network.coordCount}</strong> Coordinador{network.coordCount !== 1 ? "es" : ""}</span>
            </div>
          </Section>

          {/* Top delegados */}
          <Section title="Top delegados" sub="Unidades este mes">
            {topDelegates.length === 0 ? (
              <p className="text-sm text-[#9CA3AF] text-center py-4">Sin ventas registradas</p>
            ) : (
              <div className="space-y-3">
                {topDelegates.map((d, i) => {
                  const pct = maxUnits > 0 ? Math.round((d.units / maxUnits) * 100) : 0;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2">
                          <span className="text-[#9CA3AF] w-4">{i + 1}</span>
                          <span className="font-medium text-[#0A0A0A]">{d.name}</span>
                        </span>
                        <span className="font-semibold tabular-nums text-[#8E0E1A]">{d.units} ud</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#8E0E1A] transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="pt-3 border-t border-[#F3F4F6] text-center">
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
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F3F4F6] shrink-0">
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
