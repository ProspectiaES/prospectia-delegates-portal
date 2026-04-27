import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { SyncButton } from "@/components/SyncButton";
import { getProfile } from "@/lib/profile";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DbInvoice {
  id: string;
  doc_number: string | null;
  contact_id: string | null;
  contact_name: string | null;
  date: string | null;
  due_date: string | null;
  date_last_modified: string | null;
  total: number;
  status: number;
  description: string | null;
  last_synced_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

const statusLabel: Record<number, string> = {
  0: "Borrador", 1: "Pendiente", 2: "Vencida", 3: "Cobrada",
};
const statusVariant: Record<number, "neutral" | "warning" | "danger" | "success"> = {
  0: "neutral", 1: "warning", 2: "danger", 3: "success",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}

export default async function FacturasPage({ searchParams }: PageProps) {
  const params    = await searchParams;
  const page      = Math.max(1, parseInt(params.page ?? "1", 10));
  const search    = (params.search ?? "").trim();
  const statusStr = params.status ?? "";

  const [supabase, profile] = await Promise.all([createClient(), getProfile()]);
  const isOwner = profile?.role === "OWNER";

  // Last status sync — admin client since sync_log is OWNER-only via RLS
  let lastSyncedAt: string | null = null;
  if (isOwner) {
    const adminDb = createAdminClient();
    const { data: lastSync } = await adminDb
      .from("holded_sync_log")
      .select("finished_at")
      .eq("sync_type", "status_only")
      .eq("status", "completed")
      .order("finished_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    lastSyncedAt = lastSync?.finished_at ?? null;
  }
  const from     = (page - 1) * PAGE_SIZE;
  const to       = from + PAGE_SIZE - 1;

  let query = supabase
    .from("holded_invoices")
    .select(
      "id, doc_number, contact_id, contact_name, date, due_date, date_last_modified, total, status, description, last_synced_at",
      { count: "exact" }
    )
    .order("date", { ascending: false })
    .range(from, to);

  if (search)    query = query.or(`contact_name.ilike.%${search}%,doc_number.ilike.%${search}%,description.ilike.%${search}%`);
  if (statusStr) query = query.eq("status", parseInt(statusStr, 10));

  const { data, count, error } = await query;

  const invoices   = (data ?? []) as DbInvoice[];
  const total      = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const { data: allRows } = await supabase.from("holded_invoices").select("total, status");
  const filtered    = statusStr ? (allRows ?? []).filter((r) => r.status === parseInt(statusStr, 10)) : (allRows ?? []);
  const sumTotal    = filtered.reduce((s, r) => s + (r.total ?? 0), 0);
  const sumCobradas = filtered.filter((r) => r.status === 3).reduce((s, r) => s + (r.total ?? 0), 0);

  function buildHref(overrides: Record<string, string>) {
    const p = new URLSearchParams({
      ...(search    ? { search }            : {}),
      ...(statusStr ? { status: statusStr } : {}),
      page: String(page),
      ...overrides,
    });
    return `/dashboard/facturas?${p.toString()}`;
  }

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">

      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Facturas</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            {total > 0
              ? `${total.toLocaleString("es-ES")} facturas — ${fmtCurrency(sumTotal)} total, ${fmtCurrency(sumCobradas)} cobrado`
              : "Sin datos"}
          </p>
        </div>
        {isOwner && <SyncButton lastSyncedAt={lastSyncedAt} />}
      </div>

      {/* Filters */}
      <form method="GET" action="/dashboard/facturas" className="flex flex-wrap items-center gap-3">
        <input
          name="search"
          defaultValue={search}
          placeholder="Buscar por cliente, n.º factura o concepto…"
          className="h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0A0A0A] placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors w-80 shadow-sm"
        />
        <select
          name="status"
          defaultValue={statusStr}
          className="h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0A0A0A] focus:border-[#8E0E1A] focus:outline-none shadow-sm"
        >
          <option value="">Todos los estados</option>
          <option value="3">Cobradas</option>
          <option value="1">Pendientes</option>
          <option value="2">Vencidas</option>
          <option value="0">Borradores</option>
        </select>
        <button
          type="submit"
          className="h-9 px-4 rounded-lg border border-[#E5E7EB] bg-white text-sm font-medium text-[#0A0A0A] hover:border-[#0A0A0A] hover:bg-[#F9FAFB] transition-colors shadow-sm"
        >
          Filtrar
        </button>
        {(search || statusStr) && (
          <a
            href="/dashboard/facturas"
            className="h-9 px-3 flex items-center text-xs font-medium text-[#6B7280] hover:text-[#8E0E1A] transition-colors"
          >
            Limpiar filtros
          </a>
        )}
      </form>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-[#8E0E1A]">
          Error al cargar datos: {error.message}
        </div>
      )}

      {/* Empty state */}
      {!error && invoices.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm font-medium text-[#0A0A0A]">
              {search || statusStr ? "Sin resultados para los filtros aplicados." : "Sin facturas sincronizadas."}
            </p>
            {!search && !statusStr && (
              <p className="mt-1 text-xs text-[#6B7280]">
                Usa «Sincronizar» para importar las facturas de Holded.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {invoices.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  {["N.º Factura", "Cliente", "Concepto", "Fecha", "Vencimiento", "Modificado", "Importe", "Estado", ""].map((h) => (
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
                {invoices.map((inv) => {
                  const isOverdue =
                    inv.status === 2 ||
                    (inv.status === 1 && inv.due_date && new Date(inv.due_date) < new Date());

                  return (
                    <tr key={inv.id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-4 py-3 tabular-nums whitespace-nowrap font-semibold text-[#0A0A0A] font-mono text-xs">
                        <Link href={`/dashboard/facturas/${inv.id}`} className="hover:text-[#8E0E1A] transition-colors">
                          {inv.doc_number ?? (
                            <span className="font-normal">{inv.id.slice(0, 8)}…</span>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap max-w-[180px]">
                        <span className="text-[#0A0A0A] font-medium truncate block">
                          {inv.contact_name ?? <span className="text-[#9CA3AF]">—</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <span className="text-[#6B7280] truncate block text-xs">
                          {inv.description ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums whitespace-nowrap text-[#6B7280]">
                        {fmtDate(inv.date)}
                      </td>
                      <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                        <span className={isOverdue ? "text-[#8E0E1A] font-medium" : "text-[#6B7280]"}>
                          {fmtDate(inv.due_date)}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums whitespace-nowrap text-[#6B7280]">
                        {fmtDate(inv.date_last_modified)}
                      </td>
                      <td className="px-4 py-3 tabular-nums whitespace-nowrap text-right font-semibold text-[#0A0A0A]">
                        {fmtCurrency(inv.total)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={statusVariant[inv.status] ?? "neutral"}>
                          {statusLabel[inv.status] ?? `Estado ${inv.status}`}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link
                          href={`/dashboard/facturas/${inv.id}`}
                          className="text-xs font-medium text-[#6B7280] hover:text-[#8E0E1A] transition-colors"
                        >
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-[#E5E7EB] bg-[#F9FAFB]">
                  <td colSpan={6} className="px-4 py-3 text-xs text-[#6B7280]">
                    {total.toLocaleString("es-ES")} facturas en total{(search || statusStr) && " (filtrado)"}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-[#0A0A0A] tabular-nums">
                    {fmtCurrency(sumTotal)}
                  </td>
                  <td />
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-[#E5E7EB] flex items-center justify-between">
              <span className="text-xs text-[#6B7280]">
                Página {page} de {totalPages} — {total.toLocaleString("es-ES")} facturas
              </span>
              <div className="flex items-center gap-2">
                {page > 1 && (
                  <a
                    href={buildHref({ page: String(page - 1) })}
                    className="h-7 px-3 rounded-lg border border-[#E5E7EB] text-xs text-[#6B7280] hover:text-[#0A0A0A] hover:border-[#0A0A0A] transition-colors flex items-center bg-white shadow-sm"
                  >
                    ← Anterior
                  </a>
                )}
                {page < totalPages && (
                  <a
                    href={buildHref({ page: String(page + 1) })}
                    className="h-7 px-3 rounded-lg border border-[#E5E7EB] text-xs text-[#6B7280] hover:text-[#0A0A0A] hover:border-[#0A0A0A] transition-colors flex items-center bg-white shadow-sm"
                  >
                    Siguiente →
                  </a>
                )}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
