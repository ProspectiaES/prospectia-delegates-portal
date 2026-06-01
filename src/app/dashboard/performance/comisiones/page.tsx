import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";
import { buildCommissionBlock } from "@/app/dashboard/delegados/[id]/commissionCalc";

export const metadata = { title: "Comissions a pagar — Prospectia" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const fmtPct = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n / 100);

function monthRange(year: number, month: number) {
  return {
    start: new Date(Date.UTC(year, month, 1)).toISOString(),
    end:   new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)).toISOString(),
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ComisionesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const sp  = await searchParams;
  const now = new Date();
  let pYear  = now.getFullYear();
  let pMonth = now.getMonth();

  if (sp.mes && /^\d{4}-\d{2}$/.test(sp.mes)) {
    const [y, m] = sp.mes.split("-").map(Number);
    pYear = y; pMonth = m - 1;
  }

  const mesStr  = `${pYear}-${String(pMonth + 1).padStart(2, "0")}`;
  const prevMes = pMonth === 0
    ? `${pYear - 1}-12`
    : `${pYear}-${String(pMonth).padStart(2, "0")}`;
  const nextMes = pMonth === 11
    ? `${pYear + 1}-01`
    : `${pYear}-${String(pMonth + 2).padStart(2, "0")}`;

  const { start: periodStart, end: periodEnd } = monthRange(pYear, pMonth);
  const periodLabel = new Date(pYear, pMonth).toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  const admin = createAdminClient();

  // ── Batch fetch ────────────────────────────────────────────────────────────
  const [delegatesRes, cdRes, contactsRes, paidInvRes, cnRes, productsRes, billedInvRes] = await Promise.all([
    admin.from("profiles")
      .select("id, full_name, delegate_name, role, is_kol, contact_id")
      .in("role", ["DELEGATE", "KOL"])
      .order("full_name"),

    admin.from("contact_delegates").select("contact_id, delegate_id"),

    admin.from("holded_contacts")
      .select("id, kol_id, recommender_id, recommender_commission_pct"),

    // Cobrat: paid this month
    admin.from("holded_invoices")
      .select("id, doc_number, contact_id, contact_name, date, total, raw")
      .eq("status", 3).eq("is_credit_note", false)
      .gte("date_paid", periodStart).lte("date_paid", periodEnd),

    // All credit notes (for CN exclusion)
    admin.from("holded_invoices")
      .select("from_invoice_id")
      .eq("is_credit_note", true).not("from_invoice_id", "is", null),

    // Products with cost data
    admin.from("holded_products")
      .select("id, name, sku, cost, commission_delegate, commission_delegate_type, commission_recommender, commission_recommender_type, commission_4, commission_4_type"),

    // Facturat: issued this month (any status, not CN)
    admin.from("holded_invoices")
      .select("id, total")
      .eq("is_credit_note", false)
      .gte("date", periodStart).lte("date", periodEnd),
  ]);

  type Profile = { id: string; full_name: string; delegate_name: string | null; role: string; is_kol: boolean; contact_id: string | null };
  type Contact = { id: string; kol_id: string | null; recommender_id: string | null; recommender_commission_pct: number | null };
  type PaidInv  = { id: string; doc_number: string | null; contact_id: string | null; contact_name: string | null; date: string | null; total: number; raw: Record<string, unknown> };
  type CommType = "percent" | "amount";
  type ProductComm = {
    id: string; name: string; sku: string | null; cost: number | null;
    commission_delegate: number | null; commission_delegate_type: CommType;
    commission_recommender: number | null; commission_recommender_type: CommType;
    commission_4: number | null; commission_4_type: CommType;
  };

  const delegates  = (delegatesRes.data ?? []) as Profile[];
  const cdRows     = (cdRes.data      ?? []) as { contact_id: string; delegate_id: string }[];
  const contacts   = (contactsRes.data ?? []) as Contact[];
  const allInvs    = (paidInvRes.data  ?? []) as PaidInv[];

  // ── Cancelled invoice IDs (CN exclusion) ──────────────────────────────────
  const cancelledIds = new Set(
    ((cnRes.data ?? []) as { from_invoice_id: string | null }[])
      .map(r => r.from_invoice_id).filter(Boolean) as string[]
  );
  const paidInvs = allInvs.filter(inv => !cancelledIds.has(inv.id));

  // ── Facturat net (issued this month, excluding cancelled-by-CN) ───────────
  const totalFacturat = ((billedInvRes.data ?? []) as { id: string; total: number }[])
    .filter(inv => !cancelledIds.has(inv.id))
    .reduce((s, inv) => s + Number(inv.total), 0);

  // ── Cobrat this month ──────────────────────────────────────────────────────
  const totalCobrat = paidInvs.reduce((s, inv) => s + Number(inv.total), 0);

  // ── Product map ────────────────────────────────────────────────────────────
  const productMap: Record<string, ProductComm> = {};
  for (const p of (productsRes.data ?? []) as ProductComm[]) productMap[p.id] = p;

  // ── COGS: product cost × units for paid invoices ──────────────────────────
  interface RawProduct {
    productId?: string; id?: string; name?: string;
    units?: number | string; qty?: number | string;
    price?: number | string; discount?: number | string;
  }
  function normName(n: string) { return n.trim().toLowerCase().replace(/\s*&\s*/g, " and ").replace(/\s+/g, " "); }
  const productByName: Record<string, ProductComm> = {};
  for (const p of Object.values(productMap)) {
    if (p.name) { const k = normName(p.name); if (!productByName[k]) productByName[k] = p; }
  }

  let totalCOGS = 0;
  let cogsLines = 0; // how many lines had cost data
  let totalLines = 0;

  for (const inv of paidInvs) {
    const rawProds = (((inv.raw as Record<string, unknown>)?.products ?? (inv.raw as Record<string, unknown>)?.items ?? []) as RawProduct[]);
    for (const rp of rawProds) {
      totalLines++;
      const prodId = rp.productId ?? rp.id;
      let prod = prodId ? productMap[prodId] : undefined;
      if (!prod && rp.name) prod = productByName[normName(rp.name)];
      if (!prod) continue;
      if (prod.cost == null || prod.cost <= 0) continue;
      const units = Number(rp.units ?? rp.qty ?? 1);
      const disc  = Number(rp.discount ?? 0);
      totalCOGS += prod.cost * units * (1 - disc / 100);
      cogsLines++;
    }
  }
  totalCOGS = Math.round(totalCOGS * 100) / 100;
  const cogsComplete = totalLines > 0 && cogsLines === totalLines; // all lines had cost

  // ── Index helpers ──────────────────────────────────────────────────────────
  const delegateToContacts = new Map<string, string[]>();
  for (const cd of cdRows) {
    const arr = delegateToContacts.get(cd.delegate_id) ?? [];
    arr.push(cd.contact_id);
    delegateToContacts.set(cd.delegate_id, arr);
  }

  const contactMeta = new Map<string, Contact>();
  for (const c of contacts) contactMeta.set(c.id, c);

  // Recommender names
  const recIds = [...new Set(contacts.map(c => c.recommender_id).filter(Boolean))] as string[];
  const recommenderNameMap: Record<string, string> = {};
  if (recIds.length > 0) {
    const { data: recContacts } = await admin.from("holded_contacts").select("id, name").in("id", recIds);
    for (const rc of recContacts ?? []) recommenderNameMap[rc.id] = rc.name;
  }

  // ── Per-delegate commission ────────────────────────────────────────────────
  interface CommRow {
    id: string; name: string; role: string; isKol: boolean;
    commDelegate: number; commKol: number; total: number;
  }

  const rows: CommRow[] = [];

  for (const del of delegates) {
    const myContactIds = new Set(delegateToContacts.get(del.id) ?? []);

    const recMap: Record<string, string | null> = {};
    const recRateMap: Record<string, number> = {};
    for (const cid of myContactIds) {
      const meta = contactMeta.get(cid);
      if (meta) {
        recMap[cid] = meta.recommender_id ?? null;
        if (meta.recommender_id && meta.recommender_commission_pct != null) {
          recRateMap[meta.recommender_id] = meta.recommender_commission_pct;
        }
      }
    }

    const myInvoices = paidInvs.filter(inv => inv.contact_id && myContactIds.has(inv.contact_id));
    const delBlock = buildCommissionBlock(
      "Delegado", myInvoices, productMap, recMap, recommenderNameMap, "delegate", recRateMap
    );

    let commKol = 0;
    if (del.is_kol || del.role === "KOL") {
      const kolContactIds = new Set(
        contacts
          .filter(c => c.kol_id === del.id && (!del.contact_id || c.id !== del.contact_id))
          .map(c => c.id)
      );
      const kolInvoices = paidInvs.filter(inv => inv.contact_id && kolContactIds.has(inv.contact_id));
      const kolRecMap: Record<string, string | null> = {};
      for (const cid of kolContactIds) {
        const meta = contactMeta.get(cid);
        if (meta) kolRecMap[cid] = meta.recommender_id ?? null;
      }
      const kolBlock = buildCommissionBlock("KOL", kolInvoices, productMap, kolRecMap, recommenderNameMap, "kol");
      commKol = kolBlock.totalNetCommission;
    }

    rows.push({
      id: del.id, name: del.delegate_name ?? del.full_name, role: del.role,
      isKol: del.is_kol || del.role === "KOL",
      commDelegate: delBlock.totalNetCommission, commKol,
      total: delBlock.totalNetCommission + commKol,
    });
  }

  rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "es"));

  const totalComissions = rows.reduce((s, r) => s + r.total, 0);
  const totalDelegate   = rows.reduce((s, r) => s + r.commDelegate, 0);
  const totalKol        = rows.reduce((s, r) => s + r.commKol, 0);
  const rowsWithAmount  = rows.filter(r => r.total > 0);
  const rowsZero        = rows.filter(r => r.total === 0);

  // ── P&L derived metrics ────────────────────────────────────────────────────
  const retencioComissions  = totalCobrat - totalComissions;           // cobrat - comissions
  const margeBrutFacturat   = totalFacturat - totalComissions;         // facturat - comissions
  const beneficiBrut        = totalCobrat - totalComissions - totalCOGS; // cobrat - comissions - COGS
  const pctComissions       = totalCobrat > 0 ? totalComissions / totalCobrat * 100 : 0;
  const pctCOGS             = totalCobrat > 0 ? totalCOGS / totalCobrat * 100 : 0;
  const margePct            = totalCobrat > 0 ? beneficiBrut / totalCobrat * 100 : 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-screen-lg mx-auto px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Resum mensual</h1>
          <p className="mt-1 text-sm text-[#6B7280]">Comissions, facturació i marges — {periodLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/performance/comisiones?mes=${prevMes}`}
            className="h-8 px-3 flex items-center text-xs font-medium text-[#6B7280] border border-[#E5E7EB] rounded-lg hover:border-[#0A0A0A] hover:text-[#0A0A0A] transition-colors bg-white shadow-sm">
            ← Anterior
          </Link>
          <span className="text-sm font-semibold text-[#0A0A0A] capitalize min-w-[130px] text-center">{periodLabel}</span>
          <Link href={`/dashboard/performance/comisiones?mes=${nextMes}`}
            className="h-8 px-3 flex items-center text-xs font-medium text-[#6B7280] border border-[#E5E7EB] rounded-lg hover:border-[#0A0A0A] hover:text-[#0A0A0A] transition-colors bg-white shadow-sm">
            Següent →
          </Link>
        </div>
      </div>

      {/* ── Vendes ────────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">Vendes</h2>
        <div className="grid grid-cols-2 gap-4">
          <KpiCard label="Facturat el mes" value={fmtEuro(totalFacturat)} note="Factures emeses (data factura)" />
          <KpiCard label="Cobrat el mes" value={fmtEuro(totalCobrat)} note="Factures pagades (data cobrament)" accent />
        </div>
      </section>

      {/* ── Costos ────────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">Costos</h2>
        <div className="grid grid-cols-3 gap-4">
          <KpiCard label="Comissions a pagar" value={fmtEuro(totalComissions)}
            note={`${fmtPct(pctComissions)} sobre cobrat`} warn />
          <KpiCard label="COGS (cost mercaderia)" value={totalCOGS > 0 ? fmtEuro(totalCOGS) : "—"}
            note={cogsComplete ? `${fmtPct(pctCOGS)} sobre cobrat` : "Estimació parcial — falten costos"} warn={totalCOGS > 0} />
          <KpiCard label="Total costos estimats" value={fmtEuro(totalComissions + totalCOGS)}
            note={fmtPct((totalComissions + totalCOGS) / Math.max(totalCobrat, 1) * 100) + " sobre cobrat"} warn />
        </div>
      </section>

      {/* ── Marges ────────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">Marges</h2>
        <div className="grid grid-cols-3 gap-4">
          <KpiCard label="Cobrat − comissions" value={fmtEuro(retencioComissions)}
            note="Caixa retinguda després de comissions"
            positive={retencioComissions >= 0} />
          <KpiCard label="Marge brut (facturat − com.)" value={fmtEuro(margeBrutFacturat)}
            note="Perspectiva d'emissió"
            positive={margeBrutFacturat >= 0} />
          <KpiCard label="Benefici brut estimat" value={fmtEuro(beneficiBrut)}
            note={`${fmtPct(margePct)} sobre cobrat${cogsComplete ? "" : " · COGS parcial"}`}
            positive={beneficiBrut >= 0} accent />
        </div>
      </section>

      {/* ── Comissions breakdown ──────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">Comissions per delegat / KOL</h2>

        {/* Sub-totals */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <KpiCard label="Total a pagar" value={fmtEuro(totalComissions)} accent />
          <KpiCard label="Comissions delegat" value={fmtEuro(totalDelegate)} />
          <KpiCard label="Comissions KOL" value={fmtEuro(totalKol)} />
        </div>

        {/* Main table */}
        {rowsWithAmount.length > 0 ? (
          <div className="rounded-xl border border-[#E5E7EB] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  {["Delegat / KOL", "Rol", "Com. Delegat", "Com. KOL", "Total", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {rowsWithAmount.map(row => (
                  <tr key={row.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-4 py-3 font-medium text-[#0A0A0A] whitespace-nowrap">{row.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        row.isKol ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                      }`}>
                        {row.isKol ? "KOL" : "Delegat"}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-[#0A0A0A] whitespace-nowrap">
                      {row.commDelegate > 0 ? fmtEuro(row.commDelegate) : <span className="text-[#9CA3AF]">—</span>}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-[#0A0A0A] whitespace-nowrap">
                      {row.commKol > 0 ? fmtEuro(row.commKol) : <span className="text-[#9CA3AF]">—</span>}
                    </td>
                    <td className="px-4 py-3 tabular-nums font-bold text-[#0A0A0A] whitespace-nowrap">
                      {fmtEuro(row.total)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link
                        href={`/dashboard/delegados/${row.id}?mes=${mesStr}`}
                        className="text-xs font-medium text-[#6B7280] hover:text-[#8E0E1A] transition-colors"
                      >
                        Detall →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#E5E7EB] bg-[#F9FAFB]">
                  <td className="px-4 py-3 font-bold text-[#0A0A0A]">TOTAL</td>
                  <td />
                  <td className="px-4 py-3 tabular-nums font-bold text-[#0A0A0A]">{fmtEuro(totalDelegate)}</td>
                  <td className="px-4 py-3 tabular-nums font-bold text-[#0A0A0A]">{fmtEuro(totalKol)}</td>
                  <td className="px-4 py-3 tabular-nums font-bold text-[#8E0E1A] text-base">{fmtEuro(totalComissions)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-[#E5E7EB] bg-white px-6 py-12 text-center">
            <p className="text-sm font-medium text-[#0A0A0A]">Cap comissió liquidable per {periodLabel}.</p>
            <p className="mt-1 text-xs text-[#6B7280]">Factures cobrades però cap producte amb taxa de comissió configurada.</p>
          </div>
        )}

        {rowsZero.length > 0 && (
          <details className="group mt-3">
            <summary className="cursor-pointer text-xs text-[#9CA3AF] hover:text-[#6B7280] transition-colors list-none flex items-center gap-1">
              <span className="group-open:rotate-90 inline-block transition-transform">▶</span>
              {rowsZero.length} delegat{rowsZero.length !== 1 ? "s" : ""} sense comissió aquest mes
            </summary>
            <div className="mt-2 rounded-xl border border-[#E5E7EB] overflow-hidden">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-[#F3F4F6]">
                  {rowsZero.map(row => (
                    <tr key={row.id} className="hover:bg-[#F9FAFB] transition-colors opacity-60">
                      <td className="px-4 py-2.5 text-[#6B7280]">{row.name}</td>
                      <td className="px-4 py-2.5 text-[#9CA3AF] text-xs">{row.isKol ? "KOL" : "Delegat"}</td>
                      <td className="px-4 py-2.5 text-[#9CA3AF] tabular-nums">0,00 €</td>
                      <td className="px-4 py-2.5">
                        <Link href={`/dashboard/delegados/${row.id}?mes=${mesStr}`} className="text-xs text-[#9CA3AF] hover:text-[#8E0E1A] transition-colors">
                          Detall →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </section>

      {/* COGS caveat */}
      {!cogsComplete && totalLines > 0 && (
        <p className="text-[11px] text-[#9CA3AF]">
          * COGS estimat a partir de {cogsLines}/{totalLines} línies de factura amb cost de producte configurat.
          Per completar-lo, afegeix el cost de compra als productes a Holded.
        </p>
      )}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, note, accent, warn, positive,
}: {
  label: string;
  value: string;
  note?: string;
  accent?: boolean;
  warn?: boolean;
  positive?: boolean;
}) {
  const bg = accent
    ? "bg-[#0A0A0A] border-[#0A0A0A]"
    : warn
      ? "bg-red-50 border-red-100"
      : positive === false
        ? "bg-red-50 border-red-100"
        : positive === true
          ? "bg-emerald-50 border-emerald-100"
          : "bg-white border-[#E5E7EB]";

  const valueCls = accent
    ? "text-white"
    : warn
      ? "text-[#8E0E1A]"
      : positive === false
        ? "text-[#8E0E1A]"
        : positive === true
          ? "text-emerald-700"
          : "text-[#0A0A0A]";

  const labelCls = accent ? "text-white/60" : "text-[#6B7280]";
  const noteCls  = accent ? "text-white/50" : "text-[#9CA3AF]";

  return (
    <div className={`rounded-xl border px-5 py-4 ${bg}`}>
      <p className={`text-xs font-semibold uppercase tracking-wider ${labelCls}`}>{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${valueCls}`}>{value}</p>
      {note && <p className={`mt-1 text-[11px] ${noteCls}`}>{note}</p>}
    </div>
  );
}
