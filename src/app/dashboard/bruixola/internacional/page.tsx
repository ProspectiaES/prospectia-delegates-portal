import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
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
  const hist13Start = new Date(Date.UTC(selY - 1, selM - 1, 1)).toISOString();

  const admin = createAdminClient();

  // Font de veritat: is_internacional = true
  const { data: intlContactsRaw } = await admin
    .from("holded_contacts")
    .select("id, name, country")
    .eq("is_internacional", true)
    .is("merged_into_id", null)
    .order("name");
  const intlContacts = intlContactsRaw ?? [];
  const intlIds = intlContacts.map(c => c.id);

  if (intlIds.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <Link href="/dashboard/bruixola" className="text-xs text-[#6B7280] hover:text-[#111827] mb-2 inline-block">← Brúixola</Link>
          <h1 className="text-2xl font-bold text-[#111827] mb-6">Internacional</h1>
          <div className="rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] p-12 text-center">
            <p className="text-[#6B7280]">Sense clients marcats com a Internacional.</p>
            <Link href="/dashboard/admin/asignaciones" className="mt-4 inline-block text-sm font-medium text-[#8E0E1A] hover:underline">
              Anar a Asignaciones →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const [
    { data: curInvs },
    { data: prevInvs },
    { data: yoyInvs },
    { data: histInvs },
    { data: twoYearInvs },
    { data: pendingInvs },
  ] = await Promise.all([
    // Totes les factures del període (emeses, no notes de crèdit)
    admin
      .from("holded_invoices")
      .select("id, doc_number, contact_id, contact_name, date, date_paid, total, subtotal, status, is_credit_note, description, raw")
      .in("contact_id", intlIds)
      .eq("is_credit_note", false)
      .gte("date", periodStart)
      .lt("date", periodEnd)
      .order("date", { ascending: false }),

    // Mes anterior
    admin
      .from("holded_invoices")
      .select("total, subtotal")
      .in("contact_id", intlIds)
      .eq("status", 3)
      .eq("is_credit_note", false)
      .gte("date_paid", new Date(Date.UTC(selY, selM - 2, 1)).toISOString())
      .lt("date_paid", periodStart),

    // Any anterior (mateix mes)
    admin
      .from("holded_invoices")
      .select("total, subtotal")
      .in("contact_id", intlIds)
      .eq("status", 3)
      .eq("is_credit_note", false)
      .gte("date_paid", new Date(Date.UTC(selY - 1, selM - 1, 1)).toISOString())
      .lt("date_paid", new Date(Date.UTC(selY - 1, selM, 1)).toISOString()),

    // Historial 13 mesos
    admin
      .from("holded_invoices")
      .select("contact_id, date_paid, total, subtotal")
      .in("contact_id", intlIds)
      .eq("status", 3)
      .eq("is_credit_note", false)
      .gte("date_paid", hist13Start)
      .lt("date_paid", periodEnd),

    // Taula dos anys — totes les factures emeses (sense filtre d'estat)
    admin
      .from("holded_invoices")
      .select("contact_id, date, date_paid, total, subtotal, status")
      .in("contact_id", intlIds)
      .eq("is_credit_note", false)
      .gte("date", new Date(Date.UTC(selY - 1, 0, 1)).toISOString())
      .lt("date", new Date(Date.UTC(selY + 1, 0, 1)).toISOString()),

    // Pendents
    admin
      .from("holded_invoices")
      .select("id, doc_number, contact_id, contact_name, date, due_date, total, status, description")
      .in("contact_id", intlIds)
      .in("status", [1, 2])
      .eq("is_credit_note", false)
      .order("due_date", { ascending: true }),
  ]);

  // ─── Aggregations ──────────────────────────────────────────────────────────

  const sumInvs = (rows: { subtotal?: number | null; total?: number | null }[] | null) =>
    (rows ?? []).reduce((s, i) => s + (i.subtotal ?? i.total ?? 0), 0);

  const curRevenue  = sumInvs(curInvs);
  const prevRevenue = sumInvs(prevInvs);
  const yoyRevenue  = sumInvs(yoyInvs);
  const revDelta = prevRevenue === 0 ? null : Math.round(((curRevenue - prevRevenue) / prevRevenue) * 100);
  const revYoY   = yoyRevenue  === 0 ? null : Math.round(((curRevenue - yoyRevenue)  / yoyRevenue)  * 100);
  const pendingTotal = (pendingInvs ?? []).reduce((s, i) => s + (i.total ?? 0), 0);
  const activeClients = new Set((curInvs ?? []).map((i) => i.contact_id)).size;
  const invoiceCount = (curInvs ?? []).length;

  // Per client (mes seleccionat)
  interface ClientAgg { id: string; name: string; country: string | null; revenue: number; invoiceCount: number; }
  const clientMap = new Map<string, ClientAgg>();
  for (const c of intlContacts) {
    clientMap.set(c.id, { id: c.id, name: c.name, country: c.country, revenue: 0, invoiceCount: 0 });
  }
  for (const inv of (curInvs ?? [])) {
    const agg = clientMap.get(inv.contact_id!);
    if (!agg) continue;
    agg.revenue      += inv.subtotal ?? inv.total ?? 0;
    agg.invoiceCount += 1;
  }
  const clientsWithRevenue = [...clientMap.values()].filter(c => c.revenue > 0).sort((a, b) => b.revenue - a.revenue);

  // Gràfic 12 mesos
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
  const maxRev = Math.max(...buckets.map(b => b.revenue), 1);

  // Taula dos anys
  const byClientYear: Record<string, Record<number, number[]>> = {};
  for (const c of intlContacts) {
    byClientYear[c.id] = {
      [selY - 1]: Array(12).fill(0),
      [selY]:     Array(12).fill(0),
    };
  }
  for (const inv of (twoYearInvs ?? [])) {
    if (!inv.date || !inv.contact_id) continue;
    const d = new Date(inv.date);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    if (!byClientYear[inv.contact_id]?.[y]) continue;
    byClientYear[inv.contact_id][y][m] += inv.subtotal ?? inv.total ?? 0;
  }
  const totals: Record<number, number[]> = {
    [selY - 1]: Array(12).fill(0),
    [selY]:     Array(12).fill(0),
  };
  for (const cid of intlIds) {
    for (const yr of [selY - 1, selY]) {
      for (let m = 0; m < 12; m++) {
        totals[yr][m] += byClientYear[cid]?.[yr]?.[m] ?? 0;
      }
    }
  }
  const annualTotal = (yr: number) => totals[yr].reduce((s, v) => s + v, 0);

  function getCurrency(raw: Record<string, unknown> | null): string {
    const cur = (raw as { currency?: string } | null)?.currency;
    return cur && cur !== "EUR" ? cur : "EUR";
  }

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
            <p className="text-xs text-[#9CA3AF] mt-0.5">Divisió Internacional · {mesLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <BruixolaPeriodNav mesStr={mesStr} basePath="/dashboard/bruixola/internacional" />
            <Link
              href="/dashboard/admin/asignaciones"
              className="text-xs font-medium text-[#6B7280] hover:text-[#111827] border border-[#E5E7EB] rounded-lg px-3 py-1.5 hover:bg-[#F9FAFB] transition-colors"
            >
              Asignaciones
            </Link>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Facturació",
              value: fmt(curRevenue),
              sub: revDelta !== null ? `${revDelta >= 0 ? "+" : ""}${revDelta}% vs mes ant.` : "Primer mes",
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
              sub: yoyRevenue > 0 ? `${fmt(yoyRevenue)} ${selY - 1}` : `Sense dades ${selY - 1}`,
              subColor: revYoY === null ? "#6B7280" : revYoY >= 0 ? "#059669" : "#DC2626",
            },
            {
              label: "Pendent cobrament",
              value: fmt(pendingTotal),
              sub: `${(pendingInvs ?? []).length} factura${(pendingInvs ?? []).length !== 1 ? "es" : ""} oberta${(pendingInvs ?? []).length !== 1 ? "es" : ""}`,
              subColor: pendingTotal > 0 ? "#D97706" : "#6B7280",
            },
          ].map((k) => (
            <div key={k.label} className={`rounded-xl p-5 border ${k.accent ? "border-[#8E0E1A] bg-[#8E0E1A]" : "border-[#E5E7EB] bg-white shadow-sm"}`}>
              <p className={`text-xs font-medium mb-1 ${k.accent ? "text-[#FECDD3]" : "text-[#6B7280]"}`}>{k.label}</p>
              <p className={`text-2xl font-bold ${k.accent ? "text-white" : "text-[#111827]"}`}>{k.value}</p>
              <p className="text-xs mt-1 font-medium" style={{ color: k.accent ? "#FCA5A5" : k.subColor }}>{k.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Gràfic 12 mesos ── */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm p-5">
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
                    style={{ height: `${Math.max(h, b.revenue > 0 ? 4 : 0)}%`, backgroundColor: isCur ? "#8E0E1A" : "#E5E7EB", minHeight: b.revenue > 0 ? "4px" : "0px" }}
                  />
                  <span className="text-[9px] text-[#9CA3AF]">{b.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Rànquing clients del mes ── */}
        {clientsWithRevenue.length > 0 && (
          <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm p-5">
            <p className="text-sm font-semibold text-[#111827] mb-4">Clients actius · {mesLabel}</p>
            <div className="space-y-2">
              {clientsWithRevenue.map((c, i) => (
                <div key={c.id}>
                  <div className="flex justify-between items-center mb-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-bold text-[#9CA3AF] w-4 shrink-0">{i + 1}</span>
                      <Link href={`/dashboard/clientes/${c.id}`} className="text-xs font-medium text-[#111827] truncate hover:text-[#8E0E1A]">{c.name}</Link>
                    </div>
                    <span className="text-[11px] font-semibold text-[#111827] shrink-0 ml-2">{fmt(c.revenue)}</span>
                  </div>
                  <div className="h-1 bg-[#F3F4F6] rounded-full overflow-hidden">
                    <div className="h-full bg-[#8E0E1A] rounded-full" style={{ width: `${pct(c.revenue, curRevenue)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Taula dos anys ── */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#F3F4F6] bg-[#FAFAFA]">
            <p className="text-sm font-semibold text-[#111827]">Facturació per client · {selY - 1} – {selY}</p>
            <p className="text-[10px] text-[#9CA3AF] mt-0.5">Factures cobrades per mes, base imposable</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#F3F4F6]">
                  <th className="px-3 py-2 text-left font-semibold text-[#6B7280] uppercase tracking-wider sticky left-0 bg-[#F9FAFB] min-w-[160px]">Client</th>
                  {[selY - 1, selY].map(yr =>
                    MONTHS_CA.map((m, mi) => (
                      <th key={`${yr}-${mi}`} className={`px-2 py-2 text-right font-semibold uppercase tracking-wider min-w-[52px] ${yr === selY && mi === selM - 1 ? "text-[#8E0E1A]" : "text-[#6B7280]"}`}>
                        {m}&apos;{String(yr).slice(2)}
                      </th>
                    ))
                  )}
                  <th className="px-3 py-2 text-right font-semibold text-[#6B7280] uppercase tracking-wider min-w-[72px]">{selY - 1}</th>
                  <th className="px-3 py-2 text-right font-semibold text-[#6B7280] uppercase tracking-wider min-w-[72px]">{selY}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F9FAFB]">
                {[...clientMap.values()]
                  .sort((a, b) => {
                    const ta = (byClientYear[a.id]?.[selY] ?? []).reduce((s, v) => s + v, 0);
                    const tb = (byClientYear[b.id]?.[selY] ?? []).reduce((s, v) => s + v, 0);
                    return tb - ta;
                  })
                  .map((c) => {
                    const prevYearTotal = (byClientYear[c.id]?.[selY - 1] ?? []).reduce((s, v) => s + v, 0);
                    const curYearTotal  = (byClientYear[c.id]?.[selY]     ?? []).reduce((s, v) => s + v, 0);
                    if (prevYearTotal === 0 && curYearTotal === 0) return null;
                    return (
                      <tr key={c.id} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="px-3 py-2 sticky left-0 bg-white hover:bg-[#FAFAFA] font-medium text-[#111827]">
                          <Link href={`/dashboard/clientes/${c.id}`} className="hover:text-[#8E0E1A]">{c.name}</Link>
                        </td>
                        {[selY - 1, selY].map(yr =>
                          MONTHS_CA.map((_, mi) => {
                            const v = byClientYear[c.id]?.[yr]?.[mi] ?? 0;
                            const isCurMes = yr === selY && mi === selM - 1;
                            return (
                              <td key={`${yr}-${mi}`} className={`px-2 py-2 text-right tabular-nums ${isCurMes ? "font-semibold text-[#8E0E1A]" : v > 0 ? "text-[#111827]" : "text-[#D1D5DB]"}`}>
                                {v > 0 ? fmt(v) : "—"}
                              </td>
                            );
                          })
                        )}
                        <td className="px-3 py-2 text-right font-semibold text-[#374151] tabular-nums">
                          {prevYearTotal > 0 ? fmt(prevYearTotal) : <span className="text-[#D1D5DB]">—</span>}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-[#111827] tabular-nums">
                          {curYearTotal > 0 ? fmt(curYearTotal) : <span className="text-[#D1D5DB]">—</span>}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#E5E7EB] bg-[#F9FAFB]">
                  <td className="px-3 py-2.5 sticky left-0 bg-[#F9FAFB] font-bold text-[#111827]">TOTAL</td>
                  {[selY - 1, selY].map(yr =>
                    MONTHS_CA.map((_, mi) => {
                      const v = totals[yr][mi];
                      const isCurMes = yr === selY && mi === selM - 1;
                      return (
                        <td key={`${yr}-${mi}`} className={`px-2 py-2.5 text-right font-semibold tabular-nums ${isCurMes ? "text-[#8E0E1A]" : v > 0 ? "text-[#111827]" : "text-[#D1D5DB]"}`}>
                          {v > 0 ? fmt(v) : "—"}
                        </td>
                      );
                    })
                  )}
                  <td className="px-3 py-2.5 text-right font-bold text-[#374151] tabular-nums">{fmt(annualTotal(selY - 1))}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-[#8E0E1A] tabular-nums">{fmt(annualTotal(selY))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── Totes les factures del mes ── */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#F3F4F6] bg-[#FAFAFA] flex items-center justify-between">
            <p className="text-sm font-semibold text-[#111827]">Factures · {mesLabel}</p>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280]">{invoiceCount}</span>
          </div>
          {(curInvs ?? []).length === 0 ? (
            <p className="px-5 py-8 text-sm text-[#9CA3AF] text-center">Sense factures aquest mes.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#F3F4F6]">
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Factura</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Client</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Concepte</th>
                    <th className="px-4 py-2.5 text-center text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Estat</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Base imp.</th>
                    <th className="px-4 py-2.5 text-center text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Moneda</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F9FAFB]">
                  {(curInvs ?? []).map((inv) => {
                    const currency = getCurrency(inv.raw as Record<string, unknown> | null);
                    const isForeign = currency !== "EUR";
                    const statusLabel =
                      inv.status === 3 ? { text: "Cobrada", cls: "bg-green-100 text-green-700" } :
                      inv.status === 2 ? { text: "Vençuda", cls: "bg-red-100 text-red-700" } :
                      inv.status === 1 ? { text: "Pendent", cls: "bg-amber-100 text-amber-700" } :
                                         { text: "Esborrany", cls: "bg-gray-100 text-gray-600" };
                    return (
                      <tr key={inv.id} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="px-4 py-3 font-mono text-[#6B7280]">{inv.doc_number ?? "—"}</td>
                        <td className="px-4 py-3">
                          <Link href={`/dashboard/clientes/${inv.contact_id}`} className="font-medium text-[#111827] hover:text-[#8E0E1A]">{inv.contact_name ?? "—"}</Link>
                        </td>
                        <td className="px-4 py-3 text-[#6B7280] max-w-[240px] truncate" title={inv.description ?? undefined}>{inv.description ?? "—"}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${statusLabel.cls}`}>{statusLabel.text}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-[#111827]">{fmtDec(inv.subtotal ?? inv.total ?? 0)}</td>
                        <td className="px-4 py-3 text-center">
                          {isForeign
                            ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FEF3C7] text-[#92400E]">{currency}</span>
                            : <span className="text-[10px] text-[#9CA3AF]">EUR</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[#E5E7EB] bg-[#FAFAFA]">
                    <td colSpan={4} className="px-4 py-3 text-xs font-semibold text-[#111827]">Total</td>
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
                          <Link href={`/dashboard/clientes/${inv.contact_id}`} className="font-medium text-[#111827] hover:text-[#8E0E1A]">{inv.contact_name ?? "—"}</Link>
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

        {/* ── Directori Internacional ── */}
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
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F9FAFB]">
                {[...clientMap.values()].sort((a, b) => b.revenue - a.revenue).map((c) => (
                  <tr key={c.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/clientes/${c.id}`} className="font-medium text-[#111827] hover:text-[#8E0E1A]">{c.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">{c.country ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#111827]">
                      {c.revenue > 0 ? fmt(c.revenue) : <span className="text-[#D1D5DB]">—</span>}
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
