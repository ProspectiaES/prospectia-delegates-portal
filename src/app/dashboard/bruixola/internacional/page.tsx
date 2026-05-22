import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { BruixolaPeriodNav } from "@/components/BruixolaPeriodNav";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
const fmtDec = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 100));

const MONTHS_CA = ["Gen","Feb","Mar","Abr","Mai","Jun","Jul","Ago","Set","Oct","Nov","Des"];

export default async function InternacionalPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const profile = await getProfile();
  if (!profile || (profile.role !== "OWNER" && profile.role !== "CONSIGLIERE")) {
    redirect("/dashboard");
  }

  const { mes } = await searchParams;
  const now = new Date();
  const [selY, selM] = mes
    ? mes.split("-").map(Number)
    : [now.getUTCFullYear(), now.getUTCMonth() + 1];
  const mesStr = `${selY}-${String(selM).padStart(2, "0")}`;

  const periodStart = new Date(Date.UTC(selY, selM - 1, 1)).toISOString();
  const periodEnd   = new Date(Date.UTC(selY, selM, 1)).toISOString();

  // 13 months back for YoY
  const hist13Start = new Date(Date.UTC(selY - 1, selM - 1, 1)).toISOString();

  const admin = createAdminClient();
  const supabase = await createClient();

  // Load internacional contacts
  const { data: intlContacts } = await admin
    .from("holded_contacts")
    .select("id, name, country, country_code, is_internacional")
    .eq("is_internacional", true);

  const intlIds = (intlContacts ?? []).map((c) => c.id);

  if (intlIds.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="mb-8">
            <Link href="/dashboard/bruixola" className="text-xs text-[#6B7280] hover:text-[#111827] mb-2 inline-block">← Brúixola</Link>
            <h1 className="text-2xl font-bold text-[#111827]">Internacional</h1>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] p-12 text-center">
            <p className="text-[#6B7280] mb-2">No hi ha clients marcats com a Internacional.</p>
            <p className="text-xs text-[#9CA3AF]">
              Ves a la fitxa d'un client i activa la Divisió Internacional per veure les mètriques aquí.
            </p>
            <Link href="/dashboard/clientes" className="mt-4 inline-block text-sm font-medium text-[#8E0E1A] hover:underline">
              Anar a Clients →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Fetch invoices for international contacts — current period
  const { data: curInvs } = await admin
    .from("holded_invoices")
    .select("id, doc_number, contact_id, contact_name, date, date_paid, total, subtotal, status, is_credit_note, description, raw")
    .in("contact_id", intlIds)
    .eq("status", 3)
    .eq("is_credit_note", false)
    .gte("date_paid", periodStart)
    .lt("date_paid", periodEnd)
    .order("date_paid", { ascending: false });

  // Prev month for delta
  const prevStart = new Date(Date.UTC(selY, selM - 2, 1)).toISOString();
  const prevEnd   = periodStart;
  const { data: prevInvs } = await admin
    .from("holded_invoices")
    .select("contact_id, total, subtotal")
    .in("contact_id", intlIds)
    .eq("status", 3)
    .eq("is_credit_note", false)
    .gte("date_paid", prevStart)
    .lt("date_paid", prevEnd);

  // YoY month
  const yoyStart = new Date(Date.UTC(selY - 1, selM - 1, 1)).toISOString();
  const yoyEnd   = new Date(Date.UTC(selY - 1, selM, 1)).toISOString();
  const { data: yoyInvs } = await admin
    .from("holded_invoices")
    .select("contact_id, total, subtotal")
    .in("contact_id", intlIds)
    .eq("status", 3)
    .eq("is_credit_note", false)
    .gte("date_paid", yoyStart)
    .lt("date_paid", yoyEnd);

  // 13 months history
  const { data: histInvs } = await admin
    .from("holded_invoices")
    .select("contact_id, date_paid, total, subtotal")
    .in("contact_id", intlIds)
    .eq("status", 3)
    .eq("is_credit_note", false)
    .gte("date_paid", hist13Start)
    .lt("date_paid", periodEnd);

  // ─── Aggregations ─────────────────────────────────────────────────────────

  const sumInvs = (rows: { subtotal?: number | null; total?: number | null }[] | null) =>
    (rows ?? []).reduce((s, i) => s + (i.subtotal ?? i.total ?? 0), 0);

  const curRevenue  = sumInvs(curInvs);
  const prevRevenue = sumInvs(prevInvs);
  const yoyRevenue  = sumInvs(yoyInvs);
  const revDelta    = prevRevenue === 0 ? null : Math.round(((curRevenue - prevRevenue) / prevRevenue) * 100);
  const revYoY      = yoyRevenue  === 0 ? null : Math.round(((curRevenue - yoyRevenue)  / yoyRevenue)  * 100);

  // Active clients this period
  const activeContactIds = new Set((curInvs ?? []).map((i) => i.contact_id));
  const activeClients    = activeContactIds.size;

  // Invoice count
  const invoiceCount = (curInvs ?? []).length;

  // Per-client aggregation
  interface ClientAgg {
    id: string;
    name: string;
    country: string | null;
    revenue: number;
    invoiceCount: number;
    invoices: typeof curInvs;
  }
  const clientMap = new Map<string, ClientAgg>();
  for (const c of (intlContacts ?? [])) {
    clientMap.set(c.id, { id: c.id, name: c.name, country: c.country, revenue: 0, invoiceCount: 0, invoices: [] });
  }
  for (const inv of (curInvs ?? [])) {
    const agg = clientMap.get(inv.contact_id!);
    if (!agg) continue;
    agg.revenue     += inv.subtotal ?? inv.total ?? 0;
    agg.invoiceCount += 1;
    agg.invoices!.push(inv);
  }
  const clientsWithRevenue = [...clientMap.values()]
    .filter((c) => c.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue);

  // Monthly history buckets (12 months ending in selM-1)
  interface MonthBucket { label: string; revenue: number }
  const buckets: MonthBucket[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(selY, selM - 1 - i, 1));
    buckets.push({ label: MONTHS_CA[d.getUTCMonth()], revenue: 0 });
  }
  for (const inv of (histInvs ?? [])) {
    if (!inv.date_paid) continue;
    const d = new Date(inv.date_paid);
    const diff = (selY - d.getUTCFullYear()) * 12 + (selM - 1 - d.getUTCMonth());
    if (diff < 0 || diff > 11) continue;
    buckets[11 - diff].revenue += inv.subtotal ?? inv.total ?? 0;
  }

  const maxRev = Math.max(...buckets.map((b) => b.revenue), 1);

  // Currency detection from raw
  function getCurrency(raw: Record<string, unknown> | null): string {
    if (!raw) return "EUR";
    const cur = (raw as { currency?: string }).currency;
    return cur && cur !== "EUR" ? cur : "EUR";
  }

  // Pending (non-paid) invoices
  const { data: pendingInvs } = await admin
    .from("holded_invoices")
    .select("id, doc_number, contact_id, contact_name, date, due_date, total, status, description")
    .in("contact_id", intlIds)
    .in("status", [1, 2])
    .eq("is_credit_note", false)
    .order("due_date", { ascending: true });

  const pendingTotal = (pendingInvs ?? []).reduce((s, i) => s + (i.total ?? 0), 0);

  const mesLabel = `${MONTHS_CA[selM - 1]} ${selY}`;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <Link href="/dashboard/bruixola" className="text-xs text-[#6B7280] hover:text-[#111827] mb-1 inline-block">← Brúixola</Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[#111827]">Internacional</h1>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E]">
                {intlIds.length} client{intlIds.length !== 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-sm text-[#6B7280] mt-0.5">{mesLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <BruixolaPeriodNav mesStr={mesStr} basePath="/dashboard/bruixola/internacional" />
            <Link
              href="/dashboard/clientes"
              className="text-xs font-medium text-[#6B7280] hover:text-[#111827] border border-[#E5E7EB] rounded-lg px-3 py-1.5 hover:bg-[#F9FAFB] transition-colors"
            >
              Gestionar clients
            </Link>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Facturació",
              value: fmt(curRevenue),
              sub: revDelta !== null
                ? `${revDelta >= 0 ? "+" : ""}${revDelta}% vs mes ant.`
                : "Primer mes",
              subColor: revDelta === null ? "#6B7280" : revDelta >= 0 ? "#059669" : "#DC2626",
              accent: true,
            },
            {
              label: "Factures pagades",
              value: String(invoiceCount),
              sub: `${activeClients} client${activeClients !== 1 ? "s" : ""} actiu${activeClients !== 1 ? "s" : ""}`,
              subColor: "#6B7280",
            },
            {
              label: "Variació interanual",
              value: revYoY !== null ? `${revYoY >= 0 ? "+" : ""}${revYoY}%` : "—",
              sub: yoyRevenue > 0 ? `${fmt(yoyRevenue)} ${selY - 1}` : "Sense dades any ant.",
              subColor: revYoY === null ? "#6B7280" : revYoY >= 0 ? "#059669" : "#DC2626",
            },
            {
              label: "Pendent cobrament",
              value: fmt(pendingTotal),
              sub: `${(pendingInvs ?? []).length} factura${(pendingInvs ?? []).length !== 1 ? "es" : ""} oberta${(pendingInvs ?? []).length !== 1 ? "es" : ""}`,
              subColor: pendingTotal > 0 ? "#D97706" : "#6B7280",
            },
          ].map((k) => (
            <div
              key={k.label}
              className={`rounded-xl p-5 border ${k.accent ? "border-[#8E0E1A] bg-[#8E0E1A]" : "border-[#E5E7EB] bg-white shadow-sm"}`}
            >
              <p className={`text-xs font-medium mb-1 ${k.accent ? "text-[#FECDD3]" : "text-[#6B7280]"}`}>{k.label}</p>
              <p className={`text-2xl font-bold ${k.accent ? "text-white" : "text-[#111827]"}`}>{k.value}</p>
              <p className="text-xs mt-1 font-medium" style={{ color: k.accent ? "#FCA5A5" : k.subColor }}>{k.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Chart + Client Ranking ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* 12-month bar chart */}
          <div className="lg:col-span-2 rounded-xl border border-[#E5E7EB] bg-white shadow-sm p-5">
            <p className="text-sm font-semibold text-[#111827] mb-4">Evolució 12 mesos · Facturació</p>
            <div className="flex items-end gap-1 h-28">
              {buckets.map((b, i) => {
                const h = maxRev === 0 ? 0 : Math.round((b.revenue / maxRev) * 100);
                const isCur = i === 11;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-[#6B7280] hidden group-hover:block whitespace-nowrap bg-white border border-[#E5E7EB] px-1.5 py-0.5 rounded shadow-sm z-10">
                      {fmt(b.revenue)}
                    </div>
                    <div
                      className="w-full rounded-sm transition-all"
                      style={{
                        height: `${Math.max(h, b.revenue > 0 ? 4 : 0)}%`,
                        backgroundColor: isCur ? "#8E0E1A" : "#E5E7EB",
                        minHeight: b.revenue > 0 ? "4px" : "0px",
                      }}
                    />
                    <span className="text-[9px] text-[#9CA3AF]">{b.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Client ranking */}
          <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm p-5">
            <p className="text-sm font-semibold text-[#111827] mb-4">Clients · {mesLabel}</p>
            {clientsWithRevenue.length === 0 ? (
              <p className="text-xs text-[#9CA3AF] text-center py-6">Sense facturació aquest mes.</p>
            ) : (
              <div className="space-y-2">
                {clientsWithRevenue.map((c, i) => {
                  const barPct = pct(c.revenue, curRevenue);
                  return (
                    <div key={c.id}>
                      <div className="flex justify-between items-center mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[10px] font-bold text-[#9CA3AF] w-4 shrink-0">{i + 1}</span>
                          <Link href={`/dashboard/clientes/${c.id}`} className="text-xs font-medium text-[#111827] truncate hover:text-[#8E0E1A]">
                            {c.name}
                          </Link>
                        </div>
                        <span className="text-[11px] font-semibold text-[#111827] shrink-0 ml-2">{fmt(c.revenue)}</span>
                      </div>
                      <div className="h-1 bg-[#F3F4F6] rounded-full overflow-hidden">
                        <div className="h-full bg-[#8E0E1A] rounded-full" style={{ width: `${barPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Facturas del mes ── */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#F3F4F6] bg-[#FAFAFA] flex items-center justify-between">
            <p className="text-sm font-semibold text-[#111827]">Factures cobrades · {mesLabel}</p>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280]">{invoiceCount}</span>
          </div>
          {(curInvs ?? []).length === 0 ? (
            <p className="px-5 py-8 text-sm text-[#9CA3AF] text-center">Sense factures cobrades aquest mes.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#F3F4F6]">
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Factura</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Client</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Concepte</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Base imp.</th>
                    <th className="px-4 py-2.5 text-center text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Moneda</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F9FAFB]">
                  {(curInvs ?? []).map((inv) => {
                    const currency = getCurrency(inv.raw as Record<string, unknown> | null);
                    const isForeign = currency !== "EUR";
                    return (
                      <tr key={inv.id} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="px-4 py-3 font-mono text-[#6B7280]">{inv.doc_number ?? "—"}</td>
                        <td className="px-4 py-3">
                          <Link href={`/dashboard/clientes/${inv.contact_id}`} className="font-medium text-[#111827] hover:text-[#8E0E1A]">
                            {inv.contact_name ?? "—"}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-[#6B7280] max-w-[240px] truncate" title={inv.description ?? undefined}>
                          {inv.description ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-[#111827]">
                          {fmtDec(inv.subtotal ?? inv.total ?? 0)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isForeign ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FEF3C7] text-[#92400E]">{currency}</span>
                          ) : (
                            <span className="text-[10px] text-[#9CA3AF]">EUR</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[#E5E7EB] bg-[#FAFAFA]">
                    <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-[#111827]">Total</td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-[#111827]">{fmtDec(curRevenue)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* ── Factures pendents ── */}
        {(pendingInvs ?? []).length > 0 && (
          <div className="rounded-xl border border-[#F59E0B]/40 bg-[#FFFBEB] shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F59E0B]/30 flex items-center justify-between">
              <p className="text-sm font-semibold text-[#92400E]">Pendent cobrament</p>
              <span className="text-xs font-bold text-[#92400E]">{fmt(pendingTotal)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#F59E0B]/20">
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#92400E] uppercase tracking-wider">Factura</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#92400E] uppercase tracking-wider">Client</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#92400E] uppercase tracking-wider">Estat</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#92400E] uppercase tracking-wider">Venciment</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-[#92400E] uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F59E0B]/10">
                  {(pendingInvs ?? []).map((inv) => {
                    const isOverdue = inv.status === 2;
                    const dueStr = inv.due_date ? new Date(inv.due_date).toLocaleDateString("ca-ES", { day: "2-digit", month: "short", year: "numeric" }) : "—";
                    return (
                      <tr key={inv.id} className="hover:bg-[#FEF3C7]/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-[#92400E]">{inv.doc_number ?? "—"}</td>
                        <td className="px-4 py-3">
                          <Link href={`/dashboard/clientes/${inv.contact_id}`} className="font-medium text-[#111827] hover:text-[#8E0E1A]">
                            {inv.contact_name ?? "—"}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isOverdue ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                            {isOverdue ? "Vençuda" : "Pendent"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#6B7280]">{dueStr}</td>
                        <td className="px-4 py-3 text-right font-semibold text-[#111827]">{fmt(inv.total ?? 0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tots els clients internacionals ── */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#F3F4F6] bg-[#FAFAFA] flex items-center justify-between">
            <p className="text-sm font-semibold text-[#111827]">Directori Internacional</p>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280]">{intlIds.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#F3F4F6]">
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Client</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">País</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Fact. mes</th>
                  <th className="px-4 py-2.5 text-center text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Factures</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F9FAFB]">
                {[...clientMap.values()]
                  .sort((a, b) => b.revenue - a.revenue)
                  .map((c) => (
                    <tr key={c.id} className="hover:bg-[#FAFAFA] transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/clientes/${c.id}`} className="font-medium text-[#111827] hover:text-[#8E0E1A]">
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[#6B7280]">{c.country ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-semibold text-[#111827]">
                        {c.revenue > 0 ? fmt(c.revenue) : <span className="text-[#D1D5DB]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-[#6B7280]">
                        {c.invoiceCount > 0 ? c.invoiceCount : <span className="text-[#D1D5DB]">—</span>}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
