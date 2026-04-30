import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderRow {
  commission: number;
  status: string;
}

interface Affiliate {
  id: string;
  referral_code: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  program: string | null;
  status: string;
  contact_id: string | null;
  bixgrow_orders: OrderRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n);

const fmtNumber = (n: number) => new Intl.NumberFormat("es-ES").format(n);

const statusVariant: Record<string, "success" | "warning" | "neutral"> = {
  Approved: "success",
  Pending:  "warning",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AfiliadosPage() {
  const [, profile] = await Promise.all([createClient(), getProfile()]);
  const isDelegate = profile?.role === "DELEGATE";
  const admin = createAdminClient();

  // Use admin to bypass OWNER-only RLS on bixgrow tables
  let affiliatesQuery = admin
    .from("bixgrow_affiliates")
    .select("id, referral_code, email, first_name, last_name, program, status, contact_id, bixgrow_orders(commission, status)")
    .order("created_at", { ascending: false });

  if (isDelegate && profile) {
    affiliatesQuery = affiliatesQuery.eq("delegate_id", profile.id);
  }

  const { data: affiliatesData } = await affiliatesQuery;

  const affiliates = (affiliatesData ?? []) as Affiliate[];

  // Aggregate per affiliate
  type Agg = { total: number; approved: number; pending: number; paid: number; count: number };
  const agg = (orders: OrderRow[]): Agg =>
    orders.reduce<Agg>(
      (acc, o) => {
        acc.total += o.commission;
        acc.count += 1;
        if (o.status === "pending")  acc.pending  += o.commission;
        if (o.status === "approved") acc.approved += o.commission;
        if (o.status === "paid")     acc.paid     += o.commission;
        return acc;
      },
      { total: 0, approved: 0, pending: 0, paid: 0, count: 0 }
    );

  const allOrders = affiliates.flatMap((a) => a.bixgrow_orders);
  const totalCommissions = allOrders.reduce((s, o) => s + o.commission, 0);
  const totalPaid        = allOrders.filter((o) => o.status === "paid").reduce((s, o) => s + o.commission, 0);
  const totalApproved    = allOrders.filter((o) => o.status === "approved").reduce((s, o) => s + o.commission, 0);
  const totalPending     = allOrders.filter((o) => o.status === "pending").reduce((s, o) => s + o.commission, 0);

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Afiliados</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          {affiliates.length} afiliados · Integración BixGrow
        </p>
      </div>

      {/* KPIs */}
      {affiliates.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Afiliados"          value={fmtNumber(affiliates.length)} subtext="registrados" accent />
          <KpiCard label="Comisiones totales" value={fmtCurrency(totalCommissions)} subtext={`${allOrders.length} órdenes`} />
          <KpiCard label="Por liquidar"       value={fmtCurrency(totalApproved)} subtext="aprobadas sin pagar" trend={totalApproved > 0 ? "down" : "neutral"} />
          <KpiCard label="Pagadas"            value={fmtCurrency(totalPaid)} subtext="desembolsadas" trend="up" />
        </div>
      )}

      {/* Empty state */}
      {affiliates.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm font-medium text-[#0A0A0A]">Sin afiliados registrados</p>
            {!isDelegate && (
              <p className="mt-1 text-xs text-[#6B7280] max-w-sm mx-auto">
                Configura el webhook de BixGrow apuntando a{" "}
                <code className="font-mono text-[#8E0E1A]">https://dashboard.prospectia.es/api/bixgrow/webhook</code>
                {" "}para empezar a recibir datos.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {affiliates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Listado de afiliados</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  {["Afiliado", "Programa", "Código", "Estado", "Pendiente", "Por liquidar", "Pagado", "Total", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {affiliates.map((a) => {
                  const ag = agg(a.bixgrow_orders);
                  const name = [a.first_name, a.last_name].filter(Boolean).join(" ") || a.email;
                  return (
                    <tr key={a.id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/afiliados/${a.id}`} className="hover:text-[#8E0E1A] transition-colors">
                          <p className="font-medium text-[#0A0A0A]">{name}</p>
                          <p className="text-xs text-[#6B7280]">{a.email}</p>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#6B7280] whitespace-nowrap">
                        {a.program ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[#6B7280] whitespace-nowrap">
                        {a.referral_code ?? "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={statusVariant[a.status] ?? "neutral"}>{a.status}</Badge>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-xs text-[#F59E0B] whitespace-nowrap">
                        {fmtCurrency(ag.pending)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-xs text-[#6B7280] whitespace-nowrap">
                        {fmtCurrency(ag.approved)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-xs text-emerald-600 whitespace-nowrap">
                        {fmtCurrency(ag.paid)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-sm font-semibold text-[#0A0A0A] whitespace-nowrap">
                        {fmtCurrency(ag.total)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link href={`/dashboard/afiliados/${a.id}`} className="text-xs font-medium text-[#6B7280] hover:text-[#8E0E1A] transition-colors">
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-[#E5E7EB] bg-[#F9FAFB]">
                  <td colSpan={4} className="px-4 py-3 text-xs text-[#6B7280]">
                    {affiliates.length} afiliados
                  </td>
                  <td className="px-4 py-3 tabular-nums text-xs font-bold text-[#F59E0B]">{fmtCurrency(totalPending)}</td>
                  <td className="px-4 py-3 tabular-nums text-xs font-bold text-[#6B7280]">{fmtCurrency(totalApproved)}</td>
                  <td className="px-4 py-3 tabular-nums text-xs font-bold text-emerald-600">{fmtCurrency(totalPaid)}</td>
                  <td className="px-4 py-3 tabular-nums text-sm font-bold text-[#0A0A0A]">{fmtCurrency(totalCommissions)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* Webhook info — owner only */}
      {!isDelegate && <Card>
        <CardHeader><CardTitle>Configuración webhook</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-[#F3F4F6]">
            {[
              { label: "URL del webhook",    value: "https://dashboard.prospectia.es/api/bixgrow/webhook" },
              { label: "Afiliat creat",      value: "→ /api/bixgrow/webhook" },
              { label: "Ordre creada",       value: "→ /api/bixgrow/webhook" },
              { label: "Ordre aprovada",     value: "→ /api/bixgrow/webhook" },
              { label: "Pagament generat",   value: "→ /api/bixgrow/webhook" },
              { label: "Pagament pagat",     value: "→ /api/bixgrow/webhook" },
            ].map(({ label, value }) => (
              <li key={label} className="flex items-center justify-between px-5 py-3 gap-4">
                <span className="text-xs text-[#6B7280]">{label}</span>
                <code className="text-xs font-mono text-[#0A0A0A] truncate max-w-[360px]">{value}</code>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>}
    </div>
  );
}
