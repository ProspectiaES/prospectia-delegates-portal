import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";
import { MonthPicker } from "@/app/dashboard/delegados/[id]/MonthPicker";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const fmtPct = (n: number) =>
  `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

function monthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month, 1)).toISOString();
  const end   = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)).toISOString();
  return { start, end };
}

function prevMonth(year: number, month: number) {
  return month === 0 ? { y: year - 1, m: 11 } : { y: year, m: month - 1 };
}

// ─── Signal ───────────────────────────────────────────────────────────────────

function signal(billed: number, activity: number, growth: number | null): "green" | "amber" | "red" {
  if (billed === 0) return "red";
  if (activity >= 0.3 && (growth === null || growth >= 0)) return "green";
  if (activity >= 0.15 || billed > 0) return "amber";
  return "red";
}

const signalBadge: Record<"green" | "amber" | "red", { label: string; cls: string }> = {
  green: { label: "Rentable",  cls: "bg-green-50 text-green-700" },
  amber: { label: "Regular",   cls: "bg-amber-50  text-amber-700" },
  red:   { label: "Bajo",      cls: "bg-red-50    text-red-700"   },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface DelegateRow {
  id: string;
  name: string;
  email: string | null;
  is_kol: boolean;
  totalClients: number;
  newClients: number;
  activeClients: number;
  activityRate: number;
  billedCurrent: number;
  billedPrev: number;
  invoiceCount: number;
  ticketMedio: number;
  pendiente: number;
  vencido: number;
  growth: number | null;
  sig: "green" | "amber" | "red";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function RendimientoPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const sp = await searchParams;
  const now = new Date();
  let pYear  = now.getFullYear();
  let pMonth = now.getMonth();

  if (sp.mes && /^\d{4}-\d{2}$/.test(sp.mes)) {
    const [y, m] = sp.mes.split("-").map(Number);
    pYear = y; pMonth = m - 1;
  }

  const mesStr       = `${pYear}-${String(pMonth + 1).padStart(2, "0")}`;
  const nowStr       = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const isCurrentMes = mesStr === nowStr;

  const { start: curStart, end: curEnd } = monthRange(pYear, pMonth);
  const { y: py, m: pm } = prevMonth(pYear, pMonth);
  const { start: prevStart, end: prevEnd } = monthRange(py, pm);

  const periodLabel = new Date(pYear, pMonth).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  const prevLabel   = new Date(py, pm).toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  const admin = createAdminClient();

  // Fetch delegates + all mapping data in parallel
  const [delegatesRes, cdRes, curInvRes, prevInvRes, pendRes, vencRes] = await Promise.all([
    admin.from("profiles")
      .select("id, full_name, delegate_name, email, is_kol")
      .in("role", ["DELEGATE", "KOL", "COORDINATOR"])
      .order("full_name"),

    admin.from("contact_delegates")
      .select("delegate_id, contact_id, assigned_at"),

    // Paid invoices current period
    admin.from("holded_invoices")
      .select("contact_id, total")
      .eq("status", 3)
      .eq("is_credit_note", false)
      .gte("date_paid", curStart)
      .lte("date_paid", curEnd),

    // Paid invoices previous period
    admin.from("holded_invoices")
      .select("contact_id, total")
      .eq("status", 3)
      .eq("is_credit_note", false)
      .gte("date_paid", prevStart)
      .lte("date_paid", prevEnd),

    // Pending
    admin.from("holded_invoices")
      .select("contact_id, total")
      .eq("status", 1),

    // Overdue
    admin.from("holded_invoices")
      .select("contact_id, total")
      .eq("status", 2),
  ]);

  type InvRow = { contact_id: string; total: number };
  type CdRow  = { delegate_id: string; contact_id: string; assigned_at: string };

  const delegates = (delegatesRes.data ?? []) as { id: string; full_name: string; delegate_name: string | null; email: string | null; is_kol: boolean }[];
  const cdRows    = (cdRes.data ?? []) as CdRow[];
  const curInvs   = (curInvRes.data ?? []) as InvRow[];
  const prevInvs  = (prevInvRes.data ?? []) as InvRow[];
  const pendInvs  = (pendRes.data ?? []) as InvRow[];
  const vencInvs  = (vencRes.data ?? []) as InvRow[];

  // Build per-delegate index
  const delegateContacts: Record<string, Set<string>> = {};
  const newContactsInPeriod: Record<string, Set<string>> = {};

  for (const cd of cdRows) {
    if (!delegateContacts[cd.delegate_id]) delegateContacts[cd.delegate_id] = new Set();
    delegateContacts[cd.delegate_id].add(cd.contact_id);

    if (cd.assigned_at >= curStart && cd.assigned_at <= curEnd) {
      if (!newContactsInPeriod[cd.delegate_id]) newContactsInPeriod[cd.delegate_id] = new Set();
      newContactsInPeriod[cd.delegate_id].add(cd.contact_id);
    }
  }

  // Invoice aggregates by contact
  function byContact(invs: InvRow[]) {
    const totals: Record<string, number> = {};
    const counts: Record<string, number> = {};
    for (const inv of invs) {
      totals[inv.contact_id] = (totals[inv.contact_id] ?? 0) + inv.total;
      counts[inv.contact_id] = (counts[inv.contact_id] ?? 0) + 1;
    }
    return { totals, counts };
  }

  const cur  = byContact(curInvs);
  const prev = byContact(prevInvs);
  const pend = byContact(pendInvs);
  const venc = byContact(vencInvs);

  const rows: DelegateRow[] = delegates.map((d) => {
    const contacts = delegateContacts[d.id] ?? new Set<string>();
    const newClients = (newContactsInPeriod[d.id] ?? new Set()).size;

    let billedCurrent = 0, billedPrev = 0, activeSet = new Set<string>(), invoiceCount = 0;
    let pendiente = 0, vencido = 0;

    for (const cid of contacts) {
      billedCurrent += cur.totals[cid] ?? 0;
      billedPrev    += prev.totals[cid] ?? 0;
      invoiceCount  += cur.counts[cid] ?? 0;
      pendiente     += pend.totals[cid] ?? 0;
      vencido       += venc.totals[cid] ?? 0;
      if (cur.totals[cid]) activeSet.add(cid);
    }

    const totalClients  = contacts.size;
    const activeClients = activeSet.size;
    const activityRate  = totalClients > 0 ? activeClients / totalClients : 0;
    const ticketMedio   = invoiceCount > 0 ? billedCurrent / invoiceCount : 0;
    const growth        = billedPrev > 0 ? ((billedCurrent - billedPrev) / billedPrev) * 100 : null;
    const sig           = signal(billedCurrent, activityRate, growth);

    return {
      id: d.id,
      name: d.delegate_name ?? d.full_name,
      email: d.email,
      is_kol: d.is_kol,
      totalClients,
      newClients,
      activeClients,
      activityRate,
      billedCurrent,
      billedPrev,
      invoiceCount,
      ticketMedio,
      pendiente,
      vencido,
      growth,
      sig,
    };
  });

  // Sort by billed desc
  rows.sort((a, b) => b.billedCurrent - a.billedCurrent);

  // Summary totals
  const totalBilled  = rows.reduce((s, r) => s + r.billedCurrent, 0);
  const totalPrev    = rows.reduce((s, r) => s + r.billedPrev,    0);
  const totalGrowth  = totalPrev > 0 ? ((totalBilled - totalPrev) / totalPrev) * 100 : null;
  const activeCount  = rows.filter(r => r.billedCurrent > 0).length;
  const newClients   = rows.reduce((s, r) => s + r.newClients, 0);
  const avgTicket    = rows.filter(r => r.invoiceCount > 0).length > 0
    ? rows.reduce((s, r) => s + r.billedCurrent, 0) / rows.reduce((s, r) => s + r.invoiceCount, 0)
    : 0;

  const greenCount = rows.filter(r => r.sig === "green").length;
  const redCount   = rows.filter(r => r.sig === "red").length;

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Rendimiento de delegados</h1>
          <p className="mt-1 text-sm text-[#6B7280] capitalize">
            {periodLabel} · comparado con {prevLabel}
          </p>
        </div>
        <MonthPicker mesStr={mesStr} isCurrentMes={isCurrentMes} />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Facturación período",
            value: fmtEuro(totalBilled),
            sub: totalGrowth !== null
              ? <span className={totalGrowth >= 0 ? "text-green-600" : "text-red-600"}>{fmtPct(totalGrowth)} vs {prevLabel}</span>
              : <span className="text-[#9CA3AF]">sin período anterior</span>,
            accent: "#8E0E1A",
          },
          {
            label: "Delegados activos",
            value: `${activeCount} / ${rows.length}`,
            sub: <span>{greenCount} rentables · {redCount} bajo rendimiento</span>,
            accent: "#059669",
          },
          {
            label: "Clientes nuevos",
            value: String(newClients),
            sub: <span>asignados en {periodLabel}</span>,
            accent: "#2563EB",
          },
          {
            label: "Ticket medio",
            value: fmtEuro(avgTicket),
            sub: <span>por factura cobrada</span>,
            accent: "#7C3AED",
          },
        ].map(({ label, value, sub, accent }) => (
          <div key={label} className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
            <div style={{ backgroundColor: accent, height: 3 }} />
            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">{label}</p>
              <p className="mt-1 text-2xl font-bold text-[#0A0A0A] tabular-nums">{value}</p>
              <p className="mt-1 text-xs text-[#6B7280]">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Delegate table */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                {[
                  "Delegado",
                  "Clientes",
                  "Nuevos",
                  "Activos",
                  "% Actividad",
                  `Facturación (${mesStr.slice(0,7)})`,
                  `vs ${String(pm + 1).padStart(2,"0")}/${py}`,
                  "Nº Fac.",
                  "Ticket medio",
                  "Pendiente",
                  "Vencido",
                  "Señal",
                ].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {rows.map(r => {
                const sb = signalBadge[r.sig];
                return (
                  <tr key={r.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Link href={`/dashboard/rendimiento/${r.id}`} className="font-medium text-[#0A0A0A] hover:text-[#8E0E1A] transition-colors">
                          {r.name}
                        </Link>
                        {r.is_kol && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700">KOL</span>
                        )}
                        <Link href={`/dashboard/delegados/${r.id}`} className="text-[10px] text-[#9CA3AF] hover:text-[#8E0E1A] transition-colors" title="Ir al dashboard del delegado">
                          ↗
                        </Link>
                      </div>
                      {r.email && (
                        <p className="text-xs text-[#9CA3AF]">{r.email}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-center font-medium text-[#374151]">{r.totalClients}</td>
                    <td className="px-4 py-3 tabular-nums text-center">
                      {r.newClients > 0
                        ? <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">+{r.newClients}</span>
                        : <span className="text-[#D1D5DB]">—</span>}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-center text-[#374151]">{r.activeClients}</td>
                    <td className="px-4 py-3 tabular-nums text-center">
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden min-w-[40px]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.round(r.activityRate * 100)}%`,
                              backgroundColor: r.activityRate >= 0.3 ? "#059669" : r.activityRate >= 0.15 ? "#D97706" : "#EF4444",
                            }}
                          />
                        </div>
                        <span className="text-xs text-[#374151] tabular-nums w-8 text-right">
                          {Math.round(r.activityRate * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums whitespace-nowrap font-semibold text-[#0A0A0A]">
                      {r.billedCurrent > 0 ? fmtEuro(r.billedCurrent) : <span className="text-[#D1D5DB] font-normal">—</span>}
                    </td>
                    <td className="px-4 py-3 tabular-nums whitespace-nowrap text-center">
                      {r.growth !== null
                        ? <span className={`text-xs font-semibold ${r.growth >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {fmtPct(r.growth)}
                          </span>
                        : <span className="text-[#D1D5DB] text-xs">n/d</span>}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-center text-[#6B7280]">{r.invoiceCount || "—"}</td>
                    <td className="px-4 py-3 tabular-nums whitespace-nowrap text-[#374151]">
                      {r.ticketMedio > 0 ? fmtEuro(r.ticketMedio) : <span className="text-[#D1D5DB]">—</span>}
                    </td>
                    <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                      {r.pendiente > 0
                        ? <span className="text-amber-700 font-medium">{fmtEuro(r.pendiente)}</span>
                        : <span className="text-[#D1D5DB]">—</span>}
                    </td>
                    <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                      {r.vencido > 0
                        ? <span className="text-red-600 font-semibold">{fmtEuro(r.vencido)}</span>
                        : <span className="text-[#D1D5DB]">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${sb.cls}`}>
                        {sb.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table footer: totals */}
        <div className="border-t border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-[#6B7280]">{rows.length} delegados</span>
          <div className="flex items-center gap-8 text-xs">
            <span className="text-[#6B7280]">Total facturación período:
              <span className="ml-2 font-bold text-[#0A0A0A] tabular-nums">{fmtEuro(totalBilled)}</span>
            </span>
            <span className="text-[#6B7280]">Pendiente:
              <span className="ml-2 font-semibold text-amber-700 tabular-nums">
                {fmtEuro(rows.reduce((s, r) => s + r.pendiente, 0))}
              </span>
            </span>
            <span className="text-[#6B7280]">Vencido:
              <span className="ml-2 font-semibold text-red-600 tabular-nums">
                {fmtEuro(rows.reduce((s, r) => s + r.vencido, 0))}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-[#6B7280]">
        <span className="font-semibold text-[#9CA3AF] uppercase tracking-wider">Señal:</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />Rentable — actividad ≥ 30% y facturación creciente</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1" />Regular — actividad baja o decreciendo</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" />Bajo — sin facturación en el período</span>
      </div>
    </div>
  );
}
