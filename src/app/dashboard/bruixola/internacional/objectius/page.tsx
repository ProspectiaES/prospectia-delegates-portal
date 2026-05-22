import { redirect } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { InternacionalObjectiusClient } from "./InternacionalObjectiusClient";
import type { Objectiu } from "../../objectius/page";

export const metadata = { title: "Objectius Internacional — Brúixola" };

const SELECT = "id,titol,tipus,any,trimestre,mes,estat,prioritat,progress,data_objectiu,metrica,valor_objectiu,valor_actual,seguent_accio,descripcio,decisio_pendent,notes,divisio,created_at,updated_at";

// Monthly revenue for Internacional contacts (by year)
async function getIntlRevenue(admin: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>, contactIds: string[]) {
  if (contactIds.length === 0) return [];
  const now = new Date();
  const yearStart = new Date(Date.UTC(now.getFullYear() - 1, 0, 1)).toISOString();
  const { data } = await admin
    .from("holded_invoices")
    .select("date_paid, date, total, subtotal, status")
    .in("contact_id", contactIds)
    .eq("is_credit_note", false)
    .gte("date", yearStart);
  return data ?? [];
}

export default async function InternacionalObjectiusPage() {
  const profile = await getProfile();
  if (!profile || (profile.role !== "OWNER" && profile.role !== "CONSIGLIERE")) {
    redirect("/dashboard");
  }

  const admin = createAdminClient();

  const [objectiusRes, intlContactsRes] = await Promise.all([
    admin
      .from("bruixola_objectius")
      .select(SELECT)
      .eq("user_id", profile.id)
      .eq("divisio", "internacional")
      .order("any", { ascending: false })
      .order("prioritat", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),

    admin
      .from("holded_contacts")
      .select("id")
      .eq("is_internacional", true)
      .is("merged_into_id", null),
  ]);

  const objectius = (objectiusRes.data ?? []) as Objectiu[];
  const intlIds   = (intlContactsRes.data ?? []).map(c => c.id);
  const currentYear = new Date().getFullYear();

  // Fetch invoice data for real metrics
  const invoices = await getIntlRevenue(admin, intlIds);

  // Monthly revenue aggregation: [year][month0] = revenue
  type MonthRevMap = Record<number, Record<number, number>>;
  const byMonth: MonthRevMap = {};
  for (const inv of invoices) {
    const dateStr = inv.date_paid ?? inv.date;
    if (!dateStr) continue;
    const d = new Date(dateStr);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    if (!byMonth[y]) byMonth[y] = {};
    if (!byMonth[y][m]) byMonth[y][m] = 0;
    byMonth[y][m] += inv.subtotal ?? inv.total ?? 0;
  }

  // Annual revenue per year
  const annualRevenue: Record<number, number> = {};
  for (const [yr, months] of Object.entries(byMonth)) {
    annualRevenue[Number(yr)] = Object.values(months).reduce((s, v) => s + v, 0);
  }

  // YTD revenue (current year, up to today)
  const now = new Date();
  const ytdRevenue = Object.entries(byMonth[currentYear] ?? {})
    .filter(([m]) => Number(m) <= now.getUTCMonth())
    .reduce((s, [, v]) => s + v, 0);

  // Quarterly revenue
  const quarterRevenue: Record<string, number> = {};
  for (const [yr, months] of Object.entries(byMonth)) {
    for (let q = 1; q <= 4; q++) {
      const key = `${yr}-Q${q}`;
      quarterRevenue[key] = [0,1,2].map(i => months[(q-1)*3+i] ?? 0).reduce((s,v) => s+v, 0);
    }
  }

  // Active internacional clients (with invoices this year)
  const activeClientsYTD = new Set(
    invoices
      .filter(inv => {
        const d = new Date(inv.date_paid ?? inv.date ?? "");
        return d.getUTCFullYear() === currentYear;
      })
      .map(() => "") // we don't have contact_id in this query — just count total for now
  ).size;

  // Total invoices this year
  const invoicesThisYear = invoices.filter(inv => {
    const d = new Date(inv.date_paid ?? inv.date ?? "");
    return d.getUTCFullYear() === currentYear;
  }).length;

  // System metrics for context
  const systemMetrics = {
    ytdRevenue,
    annualRevenue,
    quarterRevenue,
    intlClientsCount: intlIds.length,
    invoicesThisYear,
    currentYear,
  };

  return (
    <div className="max-w-5xl mx-auto px-5 pt-6 pb-12">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard/bruixola/internacional" className="text-xs text-[#6B7280] hover:text-[#111827]">← Internacional</Link>
            <span className="text-xs text-[#D1D5DB]">/</span>
            <Link href="/dashboard/bruixola/objectius" className="text-xs text-[#6B7280] hover:text-[#111827]">Objectius</Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[#0A0A0A]">Objectius Internacional</h1>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E]">
              {intlIds.length} clients marcats
            </span>
          </div>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            {objectius.length} objectiu{objectius.length !== 1 ? "s" : ""} · Seguiment basat en dades reals del sistema
          </p>
        </div>
      </div>

      {/* System KPIs — real data */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          {
            label: `Facturació YTD ${currentYear}`,
            value: new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(ytdRevenue),
            sub: `Total ${currentYear - 1}: ${new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(annualRevenue[currentYear - 1] ?? 0)}`,
            accent: true,
          },
          {
            label: "Clients Internacional",
            value: String(intlIds.length),
            sub: "marcats com Internacional",
          },
          {
            label: `Factures ${currentYear}`,
            value: String(invoicesThisYear),
            sub: "emeses fins avui",
          },
          {
            label: `Q${Math.ceil((now.getUTCMonth() + 1) / 3)} ${currentYear}`,
            value: new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(
              quarterRevenue[`${currentYear}-Q${Math.ceil((now.getUTCMonth() + 1) / 3)}`] ?? 0
            ),
            sub: "trimestre actual",
          },
        ].map(k => (
          <div key={k.label} className={`rounded-xl p-4 border ${k.accent ? "border-[#8E0E1A] bg-[#8E0E1A]" : "border-[#E5E7EB] bg-white shadow-sm"}`}>
            <p className={`text-[10px] font-semibold mb-1 ${k.accent ? "text-[#FECDD3]" : "text-[#6B7280]"}`}>{k.label}</p>
            <p className={`text-lg font-bold leading-tight ${k.accent ? "text-white" : "text-[#0A0A0A]"}`}>{k.value}</p>
            <p className={`text-[10px] mt-0.5 ${k.accent ? "text-[#FCA5A5]" : "text-[#9CA3AF]"}`}>{k.sub}</p>
          </div>
        ))}
      </div>

      <InternacionalObjectiusClient
        objectius={objectius}
        currentYear={currentYear}
        systemMetrics={systemMetrics}
      />
    </div>
  );
}
