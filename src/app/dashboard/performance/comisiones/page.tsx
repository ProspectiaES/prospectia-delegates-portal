import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";
import { buildCommissionBlock } from "@/app/dashboard/delegados/[id]/commissionCalc";

export const metadata = { title: "Comissions a pagar — Prospectia" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

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

  const mesStr = `${pYear}-${String(pMonth + 1).padStart(2, "0")}`;
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
  const [delegatesRes, cdRes, contactsRes, paidInvRes, cnRes, productsRes] = await Promise.all([
    admin.from("profiles")
      .select("id, full_name, delegate_name, role, is_kol, contact_id")
      .in("role", ["DELEGATE", "KOL"])
      .order("full_name"),

    admin.from("contact_delegates").select("contact_id, delegate_id"),

    admin.from("holded_contacts")
      .select("id, kol_id, recommender_id, recommender_commission_pct"),

    admin.from("holded_invoices")
      .select("id, doc_number, contact_id, contact_name, date, total, raw")
      .eq("status", 3).eq("is_credit_note", false)
      .gte("date_paid", periodStart).lte("date_paid", periodEnd),

    admin.from("holded_invoices")
      .select("from_invoice_id")
      .eq("is_credit_note", true).not("from_invoice_id", "is", null),

    admin.from("holded_products")
      .select("id, name, commission_delegate, commission_delegate_type, commission_recommender, commission_recommender_type, commission_4, commission_4_type"),
  ]);

  type Profile = { id: string; full_name: string; delegate_name: string | null; role: string; is_kol: boolean; contact_id: string | null };
  type Contact = { id: string; kol_id: string | null; recommender_id: string | null; recommender_commission_pct: number | null };
  type PaidInv  = { id: string; doc_number: string | null; contact_id: string | null; contact_name: string | null; date: string | null; total: number; raw: Record<string, unknown> };

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

  // ── Product map ────────────────────────────────────────────────────────────
  type CommType = "percent" | "amount";
  type ProductComm = {
    id: string; name: string;
    commission_delegate: number | null; commission_delegate_type: CommType;
    commission_recommender: number | null; commission_recommender_type: CommType;
    commission_4: number | null; commission_4_type: CommType;
  };
  const productMap: Record<string, ProductComm> = {};
  for (const p of (productsRes.data ?? []) as ProductComm[]) productMap[p.id] = p;

  // ── Index helpers ──────────────────────────────────────────────────────────
  // contact_id → delegate_ids
  const contactToDelegates = new Map<string, string[]>();
  for (const cd of cdRows) {
    const arr = contactToDelegates.get(cd.contact_id) ?? [];
    arr.push(cd.delegate_id);
    contactToDelegates.set(cd.contact_id, arr);
  }

  // delegate_id → contact_ids
  const delegateToContacts = new Map<string, string[]>();
  for (const cd of cdRows) {
    const arr = delegateToContacts.get(cd.delegate_id) ?? [];
    arr.push(cd.contact_id);
    delegateToContacts.set(cd.delegate_id, arr);
  }

  // contact_id → contact meta
  const contactMeta = new Map<string, Contact>();
  for (const c of contacts) contactMeta.set(c.id, c);

  // Unique recommender IDs → fetch their names
  const recIds = [...new Set(contacts.map(c => c.recommender_id).filter(Boolean))] as string[];
  const recommenderNameMap: Record<string, string> = {};
  if (recIds.length > 0) {
    const { data: recContacts } = await admin.from("holded_contacts").select("id, name").in("id", recIds);
    for (const rc of recContacts ?? []) recommenderNameMap[rc.id] = rc.name;
  }

  // ── Per-delegate commission ────────────────────────────────────────────────
  interface CommRow {
    id: string;
    name: string;
    role: string;
    isKol: boolean;
    commDelegate: number;
    commKol: number;
    total: number;
  }

  const rows: CommRow[] = [];

  for (const del of delegates) {
    const myContactIds = new Set(delegateToContacts.get(del.id) ?? []);

    // Recommender map for this delegate's contacts
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

    // Delegate's paid invoices this period
    const myInvoices = paidInvs.filter(inv => inv.contact_id && myContactIds.has(inv.contact_id));

    const delBlock = buildCommissionBlock(
      "Delegado", myInvoices, productMap, recMap, recommenderNameMap, "delegate", recRateMap
    );

    // KOL commission: contacts where kol_id = this person's id
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

      const kolBlock = buildCommissionBlock(
        "KOL", kolInvoices, productMap, kolRecMap, recommenderNameMap, "kol"
      );
      commKol = kolBlock.totalNetCommission;
    }

    const total = delBlock.totalNetCommission + commKol;

    // Only include if there's something to show (or always show active delegates?)
    rows.push({
      id:           del.id,
      name:         del.delegate_name ?? del.full_name,
      role:         del.role,
      isKol:        del.is_kol || del.role === "KOL",
      commDelegate: delBlock.totalNetCommission,
      commKol,
      total,
    });
  }

  // Sort: by total desc, then name
  rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "es"));

  const grandTotal     = rows.reduce((s, r) => s + r.total, 0);
  const totalDelegate  = rows.reduce((s, r) => s + r.commDelegate, 0);
  const totalKol       = rows.reduce((s, r) => s + r.commKol, 0);
  const rowsWithAmount = rows.filter(r => r.total > 0);
  const rowsZero       = rows.filter(r => r.total === 0);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-screen-lg mx-auto px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Comissions a pagar</h1>
          <p className="mt-1 text-sm text-[#6B7280]">Factures cobrades el {periodLabel}</p>
        </div>
        {/* Month nav */}
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

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total a pagar", value: grandTotal, accent: true },
          { label: "Comissions delegat", value: totalDelegate, accent: false },
          { label: "Comissions KOL", value: totalKol, accent: false },
        ].map(({ label, value, accent }) => (
          <div key={label} className={`rounded-xl border px-5 py-4 ${accent ? "bg-[#0A0A0A] border-[#0A0A0A]" : "bg-white border-[#E5E7EB]"}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider ${accent ? "text-white/60" : "text-[#6B7280]"}`}>{label}</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${accent ? "text-white" : "text-[#0A0A0A]"}`}>{fmtEuro(value)}</p>
          </div>
        ))}
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
                      row.isKol
                        ? "bg-purple-100 text-purple-700"
                        : "bg-blue-100 text-blue-700"
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
                <td className="px-4 py-3 tabular-nums font-bold text-[#8E0E1A] text-base">{fmtEuro(grandTotal)}</td>
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

      {/* Zero rows (collapsed) */}
      {rowsZero.length > 0 && (
        <details className="group">
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
    </div>
  );
}
