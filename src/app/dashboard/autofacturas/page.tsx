import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtPeriod(year: number, month: number) {
  return new Date(year, month - 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

export default async function AutofacturasPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const admin = createAdminClient();

  const { data: rows } = await admin
    .from("autofacturas")
    .select("id, doc_number, delegate_id, affiliate_id, period_year, period_month, base_commission, iva_amount, irpf_amount, total_payable, generated_at")
    .order("id", { ascending: false });

  // Fetch delegate names
  const delegateIds = [...new Set((rows ?? []).map(r => r.delegate_id).filter(Boolean))] as string[];
  const affiliateIds = [...new Set((rows ?? []).map(r => (r as Record<string, unknown>).affiliate_id as string).filter(Boolean))];

  const [delegateRes, affiliateRes] = await Promise.all([
    delegateIds.length > 0
      ? admin.from("profiles").select("id, full_name, delegate_name").in("id", delegateIds)
      : Promise.resolve({ data: [] }),
    affiliateIds.length > 0
      ? admin.from("bixgrow_affiliates").select("id, first_name, last_name, email").in("id", affiliateIds)
      : Promise.resolve({ data: [] }),
  ]);

  const delegateMap = new Map(
    ((delegateRes.data ?? []) as { id: string; full_name: string; delegate_name: string | null }[])
      .map(d => [d.id, d.delegate_name ?? d.full_name])
  );
  const affiliateMap = new Map(
    ((affiliateRes.data ?? []) as { id: string; first_name: string | null; last_name: string | null; email: string }[])
      .map(a => [a.id, [a.first_name, a.last_name].filter(Boolean).join(" ") || a.email])
  );

  const list = (rows ?? []) as {
    id: number; doc_number: string; delegate_id: string | null; affiliate_id: string | null;
    period_year: number; period_month: number;
    base_commission: number; iva_amount: number; irpf_amount: number; total_payable: number;
    generated_at: string | null;
  }[];

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">

      <div>
        <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Autofacturas</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          {list.length} autofactura{list.length !== 1 ? "s" : ""} emitidas
        </p>
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm px-6 py-12 text-center">
          <p className="text-sm text-[#6B7280]">No hay autofacturas generadas aún.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  {["Número", "Destinatario", "Tipo", "Período", "Base", "+ IVA", "− IRPF", "Total", "Fecha"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {list.map(af => {
                  const isAffiliate = !!af.affiliate_id;
                  const recipientName = isAffiliate
                    ? (affiliateMap.get(af.affiliate_id!) ?? "—")
                    : (af.delegate_id ? (delegateMap.get(af.delegate_id) ?? "—") : "—");
                  const recipientHref = isAffiliate
                    ? `/dashboard/afiliados/${af.affiliate_id}`
                    : `/dashboard/delegados/${af.delegate_id}`;

                  return (
                    <tr key={af.id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0A0A0A]">{af.doc_number}</td>
                      <td className="px-4 py-3">
                        <Link href={recipientHref} className="text-sm font-medium text-[#0A0A0A] hover:text-[#8E0E1A] transition-colors">
                          {recipientName}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${isAffiliate ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"}`}>
                          {isAffiliate ? "Afiliado" : "Delegado"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#374151] capitalize whitespace-nowrap">
                        {fmtPeriod(af.period_year, af.period_month)}
                      </td>
                      <td className="px-4 py-3 tabular-nums whitespace-nowrap font-semibold text-[#0A0A0A]">
                        {fmtEuro(af.base_commission)}
                      </td>
                      <td className="px-4 py-3 tabular-nums whitespace-nowrap text-[#6B7280]">
                        {fmtEuro(af.iva_amount)}
                      </td>
                      <td className="px-4 py-3 tabular-nums whitespace-nowrap text-[#6B7280]">
                        {af.irpf_amount > 0 ? `− ${fmtEuro(af.irpf_amount)}` : "—"}
                      </td>
                      <td className="px-4 py-3 tabular-nums whitespace-nowrap font-bold text-[#0A0A0A]">
                        {fmtEuro(af.total_payable)}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#6B7280] whitespace-nowrap">
                        {fmtDate(af.generated_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
