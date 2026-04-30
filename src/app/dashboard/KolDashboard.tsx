import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserProfile } from "@/lib/profile";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DelegateStats {
  id: string;
  name: string;
  isSelf: boolean;
  clients: number;
  emitted: number;
  emittedCount: number;
  collected: number;
  collectedCount: number;
  pending: number;
  overdue: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

function fmtMonth(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

function prevMonth(year: number, month: number) {
  const d = new Date(year, month - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function nextMonth(year: number, month: number) {
  const d = new Date(year, month, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ─── Data loader ──────────────────────────────────────────────────────────────

export async function loadKolData(profile: UserProfile, year: number, month: number) {
  const admin = createAdminClient();
  const now = new Date();
  const periodStart = new Date(Date.UTC(year, month - 1, 1)).toISOString();
  const periodEnd   = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).toISOString();
  const thirtyAgo   = new Date(now.getTime() - 30 * 86_400_000).toISOString();

  // 1. Network: self + delegates assigned to this KOL
  const { data: networkProfiles } = await admin
    .from("profiles")
    .select("id, full_name, delegate_name")
    .or(`id.eq.${profile.id},kol_id.eq.${profile.id}`)
    .order("full_name");

  const networkIds = (networkProfiles ?? []).map(p => p.id);

  // 2. contact_delegates for all network members
  const { data: cdRows } = await admin
    .from("contact_delegates")
    .select("delegate_id, contact_id")
    .in("delegate_id", networkIds);

  const cd = cdRows ?? [];

  // 3. All contact IDs in the network (unique)
  const allContactIds = [...new Set(cd.map(r => r.contact_id as string))];

  // 4. Invoices for all network contacts
  const { data: invRows } = await admin
    .from("holded_invoices")
    .select("contact_id, date, date_paid, due_date, total, status")
    .in("contact_id", allContactIds)
    .eq("is_credit_note", false);

  const invs = invRows ?? [];

  // ── Network KPIs ────────────────────────────────────────────────────────────
  const networkClients = allContactIds.length;

  const networkEmitted = invs
    .filter(i => i.date >= periodStart && i.date <= periodEnd && i.status > 0);
  const networkCollected = invs
    .filter(i => i.date_paid && i.date_paid >= periodStart && i.date_paid <= periodEnd && i.status === 3);
  const networkPending = invs.filter(i => i.status === 1);
  const networkOverdue = invs.filter(i => i.status === 2);

  const networkKpis = {
    clients:          networkClients,
    emittedAmt:       networkEmitted.reduce((s, i) => s + (i.total ?? 0), 0),
    emittedCount:     networkEmitted.length,
    collectedAmt:     networkCollected.reduce((s, i) => s + (i.total ?? 0), 0),
    collectedCount:   networkCollected.length,
    pendingAmt:       networkPending.reduce((s, i) => s + (i.total ?? 0), 0),
    pendingCount:     networkPending.length,
    overdueAmt:       networkOverdue.reduce((s, i) => s + (i.total ?? 0), 0),
    overdueCount:     networkOverdue.length,
  };

  // ── Per-delegate stats ──────────────────────────────────────────────────────
  const delegateStats: DelegateStats[] = (networkProfiles ?? []).map(p => {
    const myContactIds = cd.filter(r => r.delegate_id === p.id).map(r => r.contact_id as string);
    const myInvs = invs.filter(i => myContactIds.includes(i.contact_id));

    const emitted   = myInvs.filter(i => i.date >= periodStart && i.date <= periodEnd && i.status > 0);
    const collected = myInvs.filter(i => i.date_paid && i.date_paid >= periodStart && i.date_paid <= periodEnd && i.status === 3);
    const pending   = myInvs.filter(i => i.status === 1);
    const overdue   = myInvs.filter(i => i.status === 2);

    return {
      id:             p.id,
      name:           p.delegate_name ?? p.full_name,
      isSelf:         p.id === profile.id,
      clients:        myContactIds.length,
      emitted:        emitted.reduce((s, i) => s + (i.total ?? 0), 0),
      emittedCount:   emitted.length,
      collected:      collected.reduce((s, i) => s + (i.total ?? 0), 0),
      collectedCount: collected.length,
      pending:        pending.reduce((s, i) => s + (i.total ?? 0), 0),
      overdue:        overdue.reduce((s, i) => s + (i.total ?? 0), 0),
    };
  });

  // ── Personal activity (Isabel as delegate) ──────────────────────────────────
  const selfContactIds = cd.filter(r => r.delegate_id === profile.id).map(r => r.contact_id as string);
  const selfInvs = invs.filter(i => selfContactIds.includes(i.contact_id));

  const selfClientActivity: Record<string, string> = {};
  const selfClientFirst: Record<string, string> = {};
  for (const inv of selfInvs) {
    if (!inv.contact_id || !inv.date) continue;
    if (!selfClientActivity[inv.contact_id] || inv.date > selfClientActivity[inv.contact_id])
      selfClientActivity[inv.contact_id] = inv.date;
    if (!selfClientFirst[inv.contact_id] || inv.date < selfClientFirst[inv.contact_id])
      selfClientFirst[inv.contact_id] = inv.date;
  }

  const selfNewCount     = selfContactIds.filter(id => selfClientFirst[id] && selfClientFirst[id] >= periodStart && selfClientFirst[id] <= periodEnd).length;
  const selfDormantCount = selfContactIds.filter(id => !selfClientActivity[id] || selfClientActivity[id] < thirtyAgo).length;

  const selfEmitted   = selfInvs.filter(i => i.date >= periodStart && i.date <= periodEnd && i.status > 0);
  const selfCollected = selfInvs.filter(i => i.date_paid && i.date_paid >= periodStart && i.date_paid <= periodEnd && i.status === 3);
  const selfPending   = selfInvs.filter(i => i.status === 1);
  const selfOverdue   = selfInvs.filter(i => i.status === 2);

  const personal = {
    clients:        selfContactIds.length,
    newInPeriod:    selfNewCount,
    dormant:        selfDormantCount,
    emittedAmt:     selfEmitted.reduce((s, i) => s + (i.total ?? 0), 0),
    emittedCount:   selfEmitted.length,
    collectedAmt:   selfCollected.reduce((s, i) => s + (i.total ?? 0), 0),
    collectedCount: selfCollected.length,
    pendingAmt:     selfPending.reduce((s, i) => s + (i.total ?? 0), 0),
    pendingCount:   selfPending.length,
    overdueAmt:     selfOverdue.reduce((s, i) => s + (i.total ?? 0), 0),
    overdueCount:   selfOverdue.length,
  };

  return { networkKpis, delegateStats, personal, networkSize: networkIds.length };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  profile:  UserProfile;
  year:     number;
  month:    number;
  data:     Awaited<ReturnType<typeof loadKolData>>;
}

export function KolDashboard({ profile, year, month, data }: Props) {
  const { networkKpis: k, delegateStats, personal: p, networkSize } = data;
  const now      = new Date();
  const isNow    = year === now.getFullYear() && month === now.getMonth() + 1;
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-8">

      {/* ── Header + period nav ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Mi red</h1>
          <p className="mt-0.5 text-sm text-[#6B7280] capitalize">{fmtMonth(year, month)}</p>
        </div>
        <div className="flex items-center gap-1">
          <Link href={`/dashboard?month=${prevMonth(year, month)}`}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E5E7EB] hover:border-[#8E0E1A] hover:text-[#8E0E1A] transition-colors text-[#6B7280]">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 4L6 8l4 4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <span className="px-3 text-sm font-semibold text-[#0A0A0A] capitalize min-w-[120px] text-center">
            {fmtMonth(year, month)}
          </span>
          <Link href={isNow ? "#" : `/dashboard?month=${nextMonth(year, month)}`}
            className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors ${isNow ? "border-[#F3F4F6] text-[#D1D5DB] cursor-default" : "border-[#E5E7EB] hover:border-[#8E0E1A] hover:text-[#8E0E1A] text-[#6B7280]"}`}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
      </div>

      {/* ── Network KPIs ────────────────────────────────────────────────── */}
      <section>
        <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest mb-3">Red — Resumen del período</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Clientes en red",    value: k.clients,        sub: "total universo",                color: "text-[#0A0A0A]" },
            { label: "Facturación emitida",value: fmt(k.emittedAmt),   sub: `${k.emittedCount} facturas`,  color: "text-[#0A0A0A]" },
            { label: "Cobrado en período", value: fmt(k.collectedAmt), sub: `${k.collectedCount} facturas`, color: "text-emerald-600" },
            { label: "Vencidas (red)",
              value: k.overdueCount,
              sub: fmt(k.overdueAmt),
              color: k.overdueCount > 0 ? "text-[#8E0E1A]" : "text-[#0A0A0A]" },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-xl border border-[#E5E7EB] p-5">
              <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1">{card.label}</p>
              <p className={`text-3xl font-bold tabular-nums ${card.color}`}>{card.value}</p>
              <p className="text-xs text-[#9CA3AF] mt-1">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Alert: pending invoices */}
        {k.pendingCount > 0 && (
          <div className="mt-3 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-4 py-2.5">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M8 2l6 11H2L8 2z" strokeLinejoin="round"/>
              <path d="M8 7v3M8 11.5v.5" strokeLinecap="round"/>
            </svg>
            <span>{k.pendingCount} {k.pendingCount === 1 ? "factura pendiente" : "facturas pendientes"} por <strong>{fmt(k.pendingAmt)}</strong> en toda la red</span>
          </div>
        )}
      </section>

      {/* ── Delegates table ─────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest">Delegados</p>
          <span className="text-xs text-[#9CA3AF]">{networkSize} en tu red</span>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F3F4F6]">
                {["Delegado","Clientes","Emitido","Cobrado","Pendiente","Vencido",""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F9FAFB]">
              {delegateStats.map(d => (
                <tr key={d.id} className="hover:bg-[#FAFAFA] transition-colors">
                  <td className="px-4 py-3 font-medium text-[#0A0A0A] whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {d.name}
                      {d.isSelf && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#FEF2F2] text-[#8E0E1A] uppercase tracking-wide">yo</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums text-[#374151] font-medium">{d.clients}</td>
                  <td className="px-4 py-3 tabular-nums text-[#374151] whitespace-nowrap">
                    <span className="font-medium">{fmt(d.emitted)}</span>
                    {d.emittedCount > 0 && <span className="text-[#9CA3AF] text-[10px] ml-1">{d.emittedCount}</span>}
                  </td>
                  <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                    <span className={d.collected > 0 ? "font-medium text-emerald-600" : "text-[#9CA3AF]"}>{fmt(d.collected)}</span>
                  </td>
                  <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                    <span className={d.pending > 0 ? "font-medium text-amber-600" : "text-[#9CA3AF]"}>{d.pending > 0 ? fmt(d.pending) : "—"}</span>
                  </td>
                  <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                    <span className={d.overdue > 0 ? "font-medium text-[#8E0E1A]" : "text-[#9CA3AF]"}>{fmt(d.overdue)}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link href={`/dashboard/delegados/${d.id}`}
                      className="text-xs font-medium text-[#9CA3AF] hover:text-[#8E0E1A] transition-colors">
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#E5E7EB] bg-[#F9FAFB]">
                <td className="px-4 py-3 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Total red</td>
                <td className="px-4 py-3 text-center font-bold text-[#0A0A0A]">{k.clients}</td>
                <td className="px-4 py-3 font-bold text-[#0A0A0A] tabular-nums">{fmt(k.emittedAmt)}</td>
                <td className="px-4 py-3 font-bold text-emerald-600 tabular-nums">{fmt(k.collectedAmt)}</td>
                <td className="px-4 py-3 font-bold tabular-nums">
                  <span className={k.pendingAmt > 0 ? "text-amber-600" : "text-[#9CA3AF]"}>{fmt(k.pendingAmt)}</span>
                </td>
                <td className="px-4 py-3 font-bold tabular-nums">
                  <span className={k.overdueAmt > 0 ? "text-[#8E0E1A]" : "text-[#9CA3AF]"}>{fmt(k.overdueAmt)}</span>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* ── Personal activity ────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-3">
          <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest">Mi actividad</p>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#8E0E1A]">actuando como delegada</span>
        </div>
        <div className="space-y-4">
          {/* Client KPIs */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Mis clientes",      value: p.clients,     sub: "asignados a mí",           bg: "bg-white" },
              { label: "Nuevos en período", value: p.newInPeriod, sub: "alta en el mes",            bg: "bg-white" },
              { label: "Dormidos",          value: p.dormant,     sub: "sin actividad 30 días",     bg: "bg-white" },
            ].map(c => (
              <div key={c.label} className={`${c.bg} rounded-xl border border-[#E5E7EB] p-4`}>
                <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1">{c.label}</p>
                <p className="text-3xl font-bold text-[#0A0A0A] tabular-nums">{c.value}</p>
                <p className="text-xs text-[#9CA3AF] mt-1">{c.sub}</p>
              </div>
            ))}
          </div>

          {/* Invoice KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Emitidas",   value: fmt(p.emittedAmt),   sub: `${p.emittedCount} fact.`,    color: "text-[#0A0A0A]" },
              { label: "Cobradas",   value: fmt(p.collectedAmt), sub: `${p.collectedCount} fact.`,  color: "text-emerald-600" },
              { label: "Pendientes", value: fmt(p.pendingAmt),   sub: `${p.pendingCount} fact.`,    color: p.pendingCount > 0 ? "text-amber-600" : "text-[#0A0A0A]" },
              { label: "Vencidas",   value: fmt(p.overdueAmt),   sub: `${p.overdueCount} fact.`,    color: p.overdueCount > 0 ? "text-[#8E0E1A]" : "text-[#0A0A0A]" },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-xl border border-[#E5E7EB] p-4">
                <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1">{c.label}</p>
                <p className={`text-2xl font-bold tabular-nums ${c.color}`}>{c.value}</p>
                <p className="text-xs text-[#9CA3AF] mt-1">{c.sub}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Link href={`/dashboard/delegados/${profile.id}?mes=${monthStr}`}
              className="text-xs font-medium text-[#8E0E1A] hover:underline">
              Ver ficha completa →
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
