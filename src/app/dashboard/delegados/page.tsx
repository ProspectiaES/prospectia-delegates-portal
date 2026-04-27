import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/Card";
import { getProfile } from "@/lib/profile";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DelegateRow {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DelegadosPage() {
  const admin    = createAdminClient();
  const [supabase, profile] = await Promise.all([createClient(), getProfile()]);
  const isOwner = profile?.role === "OWNER";

  const [delegatesRes, cdRes, affiliatesRes, invoicesRes] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, email, phone, city, created_at")
      .eq("role", "DELEGATE")
      .order("full_name"),
    supabase.from("contact_delegates").select("delegate_id, contact_id"),
    supabase.from("bixgrow_affiliates").select("delegate_id").not("delegate_id", "is", null),
    supabase.from("holded_invoices").select("contact_id, total, status"),
  ]);

  const delegates  = (delegatesRes.data  ?? []) as DelegateRow[];
  const cdRows     = cdRes.data           ?? [];
  const affRows    = affiliatesRes.data   ?? [];
  const invRows    = invoicesRes.data     ?? [];

  // Build contact → delegate reverse map and invoice map
  const contactToDelegate: Record<string, string> = {};
  for (const cd of cdRows) {
    if (cd.contact_id && cd.delegate_id) contactToDelegate[cd.contact_id] = cd.delegate_id;
  }

  const stats = delegates.map((d) => {
    const clientCount    = cdRows.filter((cd) => cd.delegate_id === d.id).length;
    const affiliateCount = affRows.filter((a) => a.delegate_id === d.id).length;
    const myContactIds   = cdRows.filter((cd) => cd.delegate_id === d.id).map((cd) => cd.contact_id);
    const myInvoices     = invRows.filter((inv) => myContactIds.includes(inv.contact_id));
    const totalBilled    = myInvoices.reduce((s, inv) => s + (inv.total ?? 0), 0);
    const pendingAmt     = myInvoices.filter((inv) => inv.status === 1).reduce((s, inv) => s + (inv.total ?? 0), 0);
    const overdueAmt     = myInvoices.filter((inv) => inv.status === 2).reduce((s, inv) => s + (inv.total ?? 0), 0);
    return { ...d, clientCount, affiliateCount, totalBilled, pendingAmt, overdueAmt };
  });

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Delegados</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            {delegates.length > 0
              ? `${delegates.length} delegado${delegates.length !== 1 ? "s" : ""} registrado${delegates.length !== 1 ? "s" : ""}`
              : "Sin delegados configurados"}
          </p>
        </div>
        {isOwner && (
          <Link
            href="/dashboard/delegados/nuevo"
            className="h-9 px-4 flex items-center gap-2 rounded-lg bg-[#8E0E1A] text-sm font-semibold text-white hover:bg-[#6B0A14] transition-colors shadow-sm"
          >
            + Nuevo delegado
          </Link>
        )}
      </div>

      {/* Empty */}
      {delegates.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm font-medium text-[#0A0A0A]">Sin delegados aún.</p>
            <p className="mt-1 text-xs text-[#6B7280]">
              Crea usuarios con rol «DELEGATE» en Supabase para que aparezcan aquí.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {delegates.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  {["Nombre", "Contacto", "Clientes", "Afiliados", "Total facturado", "Pendiente", "Vencido", "Alta", ""].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {stats.map((d) => (
                  <tr key={d.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-4 py-3 font-medium text-[#0A0A0A] whitespace-nowrap">
                      <Link href={`/dashboard/delegados/${d.id}`} className="hover:text-[#8E0E1A] transition-colors">
                        {d.full_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#6B7280]">
                      {d.email && <p>{d.email}</p>}
                      {d.phone && <p>{d.phone}</p>}
                      {!d.email && !d.phone && <span className="text-[#D1D5DB]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">
                      <span className="inline-flex items-center justify-center rounded-full bg-[#F3F4F6] text-[#374151] text-xs font-semibold px-2.5 py-0.5 min-w-[28px]">
                        {d.clientCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">
                      <span className="inline-flex items-center justify-center rounded-full bg-[#F3F4F6] text-[#374151] text-xs font-semibold px-2.5 py-0.5 min-w-[28px]">
                        {d.affiliateCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums whitespace-nowrap font-semibold text-[#0A0A0A]">
                      {fmtCurrency(d.totalBilled)}
                    </td>
                    <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                      <span className={d.pendingAmt > 0 ? "text-[#F59E0B] font-medium" : "text-[#9CA3AF]"}>
                        {fmtCurrency(d.pendingAmt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                      <span className={d.overdueAmt > 0 ? "text-[#8E0E1A] font-medium" : "text-[#9CA3AF]"}>
                        {fmtCurrency(d.overdueAmt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#6B7280] whitespace-nowrap">
                      {fmtDate(d.created_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link
                        href={`/dashboard/delegados/${d.id}`}
                        className="text-xs font-medium text-[#6B7280] hover:text-[#8E0E1A] transition-colors"
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
