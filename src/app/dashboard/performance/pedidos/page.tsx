import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
const fmtEuro2 = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);
const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

function monthKey(dateStr: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1).toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
}
function lastNMonthKeys(n: number): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

const STATUS_LABEL: Record<number, string> = {
  0: "Borrador", 1: "Pendiente", 2: "Aceptado", 3: "Facturado", [-1]: "Cancelado",
};
const STATUS_CLS: Record<number, string> = {
  0: "bg-[#F3F4F6] text-[#6B7280]",
  1: "bg-amber-50 text-amber-700",
  2: "bg-blue-50 text-blue-700",
  3: "bg-emerald-50 text-emerald-700",
  [-1]: "bg-red-50 text-red-700",
};
const STATUS_BAR_COLOR: Record<number, string> = {
  0: "#9CA3AF", 1: "#F59E0B", 2: "#3B82F6", 3: "#10B981", [-1]: "#EF4444",
};

const MEDALS = ["🥇", "🥈", "🥉"];

// ─── SVG Bar Chart ─────────────────────────────────────────────────────────────

function MonthlyBarChart({ data }: { data: { key: string; total: number }[] }) {
  const maxVal = Math.max(...data.map(d => d.total), 1);
  const W = 480, H = 80, barW = 28, gap = 12;
  const totalW = data.length * (barW + gap);
  const offsetX = (W - totalW + gap) / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full" style={{ overflow: "visible" }}>
      {data.map((d, i) => {
        const barH = Math.max(2, Math.round((d.total / maxVal) * H));
        const x = offsetX + i * (barW + gap);
        const y = H - barH;
        return (
          <g key={d.key}>
            <rect x={x} y={y} width={barW} height={barH} rx="3" fill={d.total > 0 ? "#8E0E1A" : "#F3F4F6"} />
            {d.total > 0 && (
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="7" fill="#6B7280" fontFamily="system-ui">
                {d.total >= 1000 ? `${(d.total / 1000).toFixed(0)}k` : Math.round(d.total)}
              </text>
            )}
            <text x={x + barW / 2} y={H + 14} textAnchor="middle" fontSize="7.5" fill="#9CA3AF" fontFamily="system-ui">
              {monthLabel(d.key)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface Order {
  id: string;
  doc_number: string | null;
  contact_id: string;
  contact_name: string | null;
  date: string | null;
  total: number;
  status: number;
  shipping_status: number | null;
}

interface DelegatePerf {
  id: string;
  name: string;
  email: string | null;
  totalEuros: number;
  totalCount: number;
  byStatus: Record<number, { count: number; euros: number }>;
  orders: Order[];
}

export default async function PedidosPerformancePage() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const admin = createAdminClient();

  const [delegatesRes, cdRes, ordersRes] = await Promise.all([
    admin.from("profiles")
      .select("id, full_name, delegate_name, email")
      .in("role", ["DELEGATE", "KOL", "COORDINATOR"])
      .order("full_name"),

    admin.from("contact_delegates").select("delegate_id, contact_id"),

    admin.from("holded_salesorders")
      .select("id, doc_number, contact_id, contact_name, date, total, status, shipping_status")
      .order("date", { ascending: false }),
  ]);

  const delegates = (delegatesRes.data ?? []) as {
    id: string; full_name: string; delegate_name: string | null; email: string | null;
  }[];
  const cdRows = (cdRes.data ?? []) as { delegate_id: string; contact_id: string }[];
  const allOrders = (ordersRes.data ?? []) as Order[];

  // Map contact_id → delegate_ids
  const contactToDelegates: Record<string, string[]> = {};
  for (const cd of cdRows) {
    if (!contactToDelegates[cd.contact_id]) contactToDelegates[cd.contact_id] = [];
    contactToDelegates[cd.contact_id].push(cd.delegate_id);
  }

  // Build delegate perf map
  const delegateMap: Record<string, DelegatePerf> = {};
  for (const d of delegates) {
    delegateMap[d.id] = {
      id: d.id,
      name: d.delegate_name ?? d.full_name,
      email: d.email,
      totalEuros: 0,
      totalCount: 0,
      byStatus: {},
      orders: [],
    };
  }

  for (const order of allOrders) {
    const delIds = contactToDelegates[order.contact_id] ?? [];
    for (const did of delIds) {
      if (!delegateMap[did]) continue;
      const dp = delegateMap[did];
      dp.totalEuros += order.total ?? 0;
      dp.totalCount++;
      const s = order.status ?? 0;
      if (!dp.byStatus[s]) dp.byStatus[s] = { count: 0, euros: 0 };
      dp.byStatus[s].count++;
      dp.byStatus[s].euros += order.total ?? 0;
      dp.orders.push(order);
    }
  }

  const rows = Object.values(delegateMap).sort((a, b) => b.totalEuros - a.totalEuros);

  // Monthly chart — last 12 months, based on order creation date
  const monthKeys = lastNMonthKeys(12);
  const monthlyTotals: Record<string, number> = {};
  for (const k of monthKeys) monthlyTotals[k] = 0;
  for (const order of allOrders) {
    const k = monthKey(order.date);
    if (k in monthlyTotals) monthlyTotals[k] += order.total ?? 0;
  }
  const chartData = monthKeys.map(k => ({ key: k, total: monthlyTotals[k] }));

  // Global KPIs
  const totalEuros   = allOrders.reduce((s, o) => s + (o.total ?? 0), 0);
  const totalOrders  = allOrders.length;
  const byStatusAll: Record<number, number> = {};
  for (const o of allOrders) {
    byStatusAll[o.status ?? 0] = (byStatusAll[o.status ?? 0] ?? 0) + 1;
  }
  const activeRows  = rows.filter(r => r.totalCount > 0);

  const SHIPPING_LABEL: Record<number, string> = {
    0: "—", 1: "Recepcionado", 2: "Preparado", 3: "Facturado", 4: "Enviado", 5: "Recibido",
  };

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6" style={{ background: "#FAF9F7" }}>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/dashboard/performance" className="text-xs text-[#9CA3AF] hover:text-[#8E0E1A] transition-colors">← Performance</Link>
          </div>
          <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Pedidos por delegado</h1>
          <p className="mt-1 text-sm text-[#6B7280]">Comandes de venda a Holded agrupades per delegat</p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Total pedidos",
            value: totalOrders.toString(),
            sub: `${activeRows.length} delegats amb comandes`,
            accent: "#8E0E1A",
          },
          {
            label: "Import total",
            value: fmtEuro(totalEuros),
            sub: totalOrders > 0 ? `mitj. ${fmtEuro(totalEuros / totalOrders)} per comanda` : "—",
            accent: "#059669",
          },
          {
            label: "Pendiente / Aceptado",
            value: `${(byStatusAll[1] ?? 0) + (byStatusAll[2] ?? 0)}`,
            sub: `${byStatusAll[1] ?? 0} pendients · ${byStatusAll[2] ?? 0} acceptats`,
            accent: "#F59E0B",
          },
          {
            label: "Facturado",
            value: `${byStatusAll[3] ?? 0}`,
            sub: `${byStatusAll[0] ?? 0} esborrany · ${byStatusAll[-1] ?? 0} cancel·lat`,
            accent: "#2563EB",
          },
        ].map(({ label, value, sub, accent }) => (
          <div key={label} className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
            <div style={{ backgroundColor: accent, height: 3 }} />
            <div className="px-4 py-3">
              <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">{label}</p>
              <p className="mt-1 text-xl font-bold text-[#0A0A0A] tabular-nums">{value}</p>
              <p className="mt-1 text-xs text-[#6B7280]">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Monthly chart */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm px-5 py-4">
        <p className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wider mb-4">Evolució temporal — últims 12 mesos (€ per mes)</p>
        <MonthlyBarChart data={chartData} />
      </div>

      {/* Rankings */}
      {activeRows.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-[#0A0A0A] mb-3">Rànquing de delegats</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* By euros */}
            <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
                <p className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wider">Per import (€)</p>
              </div>
              <div className="divide-y divide-[#F3F4F6]">
                {activeRows.slice(0, 5).map((r, i) => (
                  <div key={r.id} className="px-4 py-2.5 flex items-center gap-3">
                    <span className="text-base shrink-0 w-6 text-center">{MEDALS[i] ?? `${i + 1}.`}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0A0A0A] truncate">{r.name}</p>
                      <p className="text-xs font-bold text-[#8E0E1A] tabular-nums">{fmtEuro(r.totalEuros)}</p>
                      <p className="text-[10px] text-[#9CA3AF]">{r.totalCount} pedidos</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* By count */}
            <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
                <p className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wider">Per nombre de pedidos</p>
              </div>
              <div className="divide-y divide-[#F3F4F6]">
                {[...activeRows].sort((a, b) => b.totalCount - a.totalCount).slice(0, 5).map((r, i) => (
                  <div key={r.id} className="px-4 py-2.5 flex items-center gap-3">
                    <span className="text-base shrink-0 w-6 text-center">{MEDALS[i] ?? `${i + 1}.`}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0A0A0A] truncate">{r.name}</p>
                      <p className="text-xs font-bold text-[#8E0E1A] tabular-nums">{r.totalCount} pedidos</p>
                      <p className="text-[10px] text-[#9CA3AF] tabular-nums">{fmtEuro(r.totalEuros)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* By ticket moyen */}
            <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
                <p className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wider">Tiquet mig més alt</p>
              </div>
              <div className="divide-y divide-[#F3F4F6]">
                {[...activeRows]
                  .map(r => ({ ...r, avg: r.totalCount > 0 ? r.totalEuros / r.totalCount : 0 }))
                  .sort((a, b) => b.avg - a.avg)
                  .slice(0, 5)
                  .map((r, i) => (
                    <div key={r.id} className="px-4 py-2.5 flex items-center gap-3">
                      <span className="text-base shrink-0 w-6 text-center">{MEDALS[i] ?? `${i + 1}.`}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#0A0A0A] truncate">{r.name}</p>
                        <p className="text-xs font-bold text-[#8E0E1A] tabular-nums">{fmtEuro(r.avg)} / comanda</p>
                        <p className="text-[10px] text-[#9CA3AF]">{r.totalCount} pedidos</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary table */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
          <p className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wider">Resum per delegat</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                {["Delegat", "Pedidos", "Import total", "Borrador", "Pendiente", "Aceptado", "Facturado", "Cancel·lat"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider text-left whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {rows.map((r, i) => (
                <tr key={r.id} className={`hover:bg-[#F9FAFB] transition-colors ${r.totalCount === 0 ? "opacity-50" : ""}`}>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {i < 3 && r.totalCount > 0 && <span className="text-xs">{MEDALS[i]}</span>}
                      <a href={`#delegate-${r.id}`} className="font-medium text-[#0A0A0A] hover:text-[#8E0E1A] transition-colors">
                        {r.name}
                      </a>
                    </div>
                    {r.email && <p className="text-[10px] text-[#9CA3AF]">{r.email}</p>}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-[#374151] text-xs">{r.totalCount || <span className="text-[#D1D5DB]">—</span>}</td>
                  <td className="px-3 py-2.5 tabular-nums font-semibold text-[#0A0A0A] whitespace-nowrap">
                    {r.totalEuros > 0 ? fmtEuro(r.totalEuros) : <span className="text-[#D1D5DB] font-normal">—</span>}
                  </td>
                  {([-1, 0, 1, 2, 3] as const).filter(s => s !== -1).map(s => (
                    <td key={s} className="px-3 py-2.5 tabular-nums text-center text-xs">
                      {r.byStatus[s]?.count
                        ? <span className={`px-1.5 py-0.5 rounded-full font-semibold ${STATUS_CLS[s]}`}>{r.byStatus[s].count}</span>
                        : <span className="text-[#D1D5DB]">—</span>}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 tabular-nums text-center text-xs">
                    {r.byStatus[-1]?.count
                      ? <span className={`px-1.5 py-0.5 rounded-full font-semibold ${STATUS_CLS[-1]}`}>{r.byStatus[-1].count}</span>
                      : <span className="text-[#D1D5DB]">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#0A0A0A] text-white">
                <td className="px-3 py-2.5 text-xs font-semibold">{rows.length} delegats</td>
                <td className="px-3 py-2.5 tabular-nums text-xs font-bold">{totalOrders}</td>
                <td className="px-3 py-2.5 tabular-nums font-bold whitespace-nowrap">{fmtEuro(totalEuros)}</td>
                {([0, 1, 2, 3] as const).map(s => (
                  <td key={s} className="px-3 py-2.5 tabular-nums text-center text-xs">{byStatusAll[s] ?? 0}</td>
                ))}
                <td className="px-3 py-2.5 tabular-nums text-center text-xs">{byStatusAll[-1] ?? 0}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Per-delegate detail (accordion via <details>) */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-[#0A0A0A]">Detall de comandes per delegat</h2>
        {rows.filter(r => r.totalCount > 0).map(r => (
          <details key={r.id} id={`delegate-${r.id}`} className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden group">
            <summary className="px-5 py-4 flex items-center justify-between cursor-pointer list-none hover:bg-[#F9FAFB] transition-colors select-none">
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-semibold text-[#0A0A0A] text-sm">{r.name}</p>
                  {r.email && <p className="text-[10px] text-[#9CA3AF]">{r.email}</p>}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {Object.entries(r.byStatus).map(([s, d]) => (
                    <span key={s} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_CLS[Number(s)]}`}>
                      {STATUS_LABEL[Number(s)]}: {d.count}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <p className="text-sm font-bold text-[#0A0A0A] tabular-nums">{fmtEuro(r.totalEuros)}</p>
                  <p className="text-[10px] text-[#9CA3AF]">{r.totalCount} pedidos</p>
                </div>
                <svg className="w-4 h-4 text-[#9CA3AF] transition-transform group-open:rotate-180" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </summary>

            <div className="border-t border-[#E5E7EB] overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                    {["Pedido", "Client", "Data", "Import", "Estat", "Etapa"].map(h => (
                      <th key={h} className="px-4 py-2 text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider text-left whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {r.orders.map(o => (
                    <tr key={o.id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs font-semibold text-[#0A0A0A] whitespace-nowrap">
                        {o.doc_number ?? <span className="text-[#9CA3AF] font-sans font-normal">esborrany</span>}
                        {o.status === 0 && (
                          <Link
                            href={`/dashboard/pedidos/${o.id}/edit`}
                            className="ml-2 text-[10px] font-sans font-medium text-[#8E0E1A] hover:underline"
                          >
                            editar
                          </Link>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[#374151] text-xs whitespace-nowrap">{o.contact_name ?? "—"}</td>
                      <td className="px-4 py-2.5 text-[#6B7280] text-xs whitespace-nowrap tabular-nums">{fmtDate(o.date)}</td>
                      <td className="px-4 py-2.5 tabular-nums font-semibold text-[#0A0A0A] text-xs whitespace-nowrap">
                        {fmtEuro2(o.total ?? 0)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${STATUS_CLS[o.status ?? 0]}`}>
                          {STATUS_LABEL[o.status ?? 0] ?? String(o.status)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {o.shipping_status != null && o.shipping_status > 0 ? (
                          <span className="text-[10px] font-medium text-[#374151] whitespace-nowrap">
                            {SHIPPING_LABEL[o.shipping_status] ?? String(o.shipping_status)}
                          </span>
                        ) : (
                          <span className="text-[#D1D5DB] text-[10px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#F3F4F6]">
                    <td colSpan={3} className="px-4 py-2 text-xs font-semibold text-[#6B7280]">{r.totalCount} pedidos</td>
                    <td className="px-4 py-2 tabular-nums font-bold text-[#0A0A0A] text-xs">{fmtEuro2(r.totalEuros)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </details>
        ))}

        {rows.filter(r => r.totalCount === 0).length > 0 && (
          <details className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
            <summary className="px-5 py-3 text-xs font-medium text-[#9CA3AF] cursor-pointer list-none hover:bg-[#F9FAFB] select-none">
              {rows.filter(r => r.totalCount === 0).length} delegats sense pedidos ▸
            </summary>
            <div className="px-5 pb-3 pt-1 flex flex-wrap gap-2">
              {rows.filter(r => r.totalCount === 0).map(r => (
                <span key={r.id} className="text-xs text-[#6B7280] px-2 py-0.5 rounded-full bg-[#F3F4F6]">{r.name}</span>
              ))}
            </div>
          </details>
        )}
      </div>

    </div>
  );
}
