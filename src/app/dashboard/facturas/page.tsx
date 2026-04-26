import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { SyncButton } from "@/components/SyncButton";

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
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(n);

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const statusLabel: Record<number, string> = {
  0: "Borrador",
  1: "Pendiente",
  2: "Vencida",
  3: "Cobrada",
};
const statusVariant: Record<
  number,
  "neutral" | "warning" | "danger" | "success"
> = {
  0: "neutral",
  1: "warning",
  2: "danger",
  3: "success",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
  }>;
}

export default async function FacturasPage({ searchParams }: PageProps) {
  const params    = await searchParams;
  const page      = Math.max(1, parseInt(params.page ?? "1", 10));
  const search    = (params.search ?? "").trim();
  const statusStr = params.status ?? "";

  const supabase = await createClient();
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

  if (search) {
    query = query.or(
      `contact_name.ilike.%${search}%,doc_number.ilike.%${search}%,description.ilike.%${search}%`
    );
  }
  if (statusStr !== "") {
    query = query.eq("status", parseInt(statusStr, 10));
  }

  const { data, count, error } = await query;

  const invoices   = (data ?? []) as DbInvoice[];
  const total      = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Aggregate totals for the filtered set (only first call — no second round-trip for now)
  const { data: aggData } = await supabase
    .from("holded_invoices")
    .select("total, status")
    .then(({ data: allRows }) => {
      // filter locally to avoid a second query
      let rows = allRows ?? [];
      if (search) {
        // aggregates reflect unfiltered total when search is active
        rows = rows;
      }
      if (statusStr !== "") {
        rows = rows.filter((r) => r.status === parseInt(statusStr, 10));
      }
      return { data: rows };
    });

  const sumTotal  = (aggData ?? []).reduce((s, r) => s + (r.total ?? 0), 0);
  const sumCobradas = (aggData ?? []).filter((r) => r.status === 3).reduce((s, r) => s + (r.total ?? 0), 0);

  function buildHref(overrides: Record<string, string>) {
    const p = new URLSearchParams({
      ...(search    ? { search }               : {}),
      ...(statusStr ? { status: statusStr }    : {}),
      page: String(page),
      ...overrides,
    });
    return `/dashboard/facturas?${p.toString()}`;
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-8 space-y-6">

      {/* Heading */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">Facturas</h1>
          <p className="mt-1 text-sm text-[#A0A0A0]">
            {total > 0
              ? `${total.toLocaleString("es-ES")} facturas — ${fmtCurrency(sumTotal)} total, ${fmtCurrency(sumCobradas)} cobrado`
              : "Sin datos"}
          </p>
        </div>
        <SyncButton />
      </div>

      {/* Filters */}
      <form method="GET" action="/dashboard/facturas" className="flex flex-wrap items-center gap-3">
        <input
          name="search"
          defaultValue={search}
          placeholder="Buscar por cliente, núm. factura o concepto…"
          className="h-9 rounded-[6px] border border-[#2A2A2A] bg-[#121212] px-3 text-sm text-[#F5F5F5] placeholder-[#A0A0A0] focus:border-[#E50914] focus:outline-none focus:ring-1 focus:ring-[#E50914]/30 w-80"
        />
        <select
          name="status"
          defaultValue={statusStr}
          className="h-9 rounded-[6px] border border-[#2A2A2A] bg-[#121212] px-3 text-sm text-[#F5F5F5] focus:border-[#E50914] focus:outline-none"
        >
          <option value="">Todos los estados</option>
          <option value="3">Cobradas</option>
          <option value="1">Pendientes</option>
          <option value="2">Vencidas</option>
          <option value="0">Borradores</option>
        </select>
        <button
          type="submit"
          className="h-9 px-4 rounded-[6px] border border-[#2A2A2A] bg-[#1E1E1E] text-sm text-[#F5F5F5] hover:border-[#F5F5F5] transition-colors"
        >
          Filtrar
        </button>
        {(search || statusStr) && (
          <a
            href="/dashboard/facturas"
            className="h-9 px-3 flex items-center rounded-[6px] text-xs text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors"
          >
            Limpiar filtros
          </a>
        )}
      </form>

      {/* Error */}
      {error && (
        <div className="rounded-[6px] border border-[#3d080e] bg-[#1F0406] px-4 py-3 text-sm text-[#E50914]">
          Error al cargar datos: {error.message}
        </div>
      )}

      {/* Empty state */}
      {!error && invoices.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-[#F5F5F5]">
              {search || statusStr
                ? "Sin resultados para los filtros aplicados."
                : "Sin facturas sincronizadas."}
            </p>
            {!search && !statusStr && (
              <p className="mt-1 text-xs text-[#A0A0A0]">
                Usa «Sincronizar ahora» para importar las facturas de Holded.
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
                <tr className="border-b border-[#2A2A2A]">
                  {[
                    "N.º Factura",
                    "Cliente",
                    "Concepto",
                    "Fecha",
                    "Vencimiento",
                    "Modificado",
                    "Importe",
                    "Estado",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-medium text-[#A0A0A0] uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2A2A]">
                {invoices.map((inv) => {
                  const isOverdue =
                    inv.status === 2 ||
                    (inv.status === 1 &&
                      inv.due_date &&
                      new Date(inv.due_date) < new Date());

                  return (
                    <tr key={inv.id} className="hover:bg-[#1A1A1A] transition-colors">
                      {/* N.º Factura */}
                      <td className="px-4 py-3 tabular-nums whitespace-nowrap font-medium text-[#F5F5F5]">
                        {inv.doc_number ?? (
                          <span className="text-[#A0A0A0] text-xs font-normal">
                            {inv.id.slice(0, 8)}…
                          </span>
                        )}
                      </td>

                      {/* Cliente */}
                      <td className="px-4 py-3 whitespace-nowrap max-w-[180px]">
                        <span className="text-[#F5F5F5] truncate block">
                          {inv.contact_name ?? <span className="text-[#A0A0A0]">—</span>}
                        </span>
                      </td>

                      {/* Concepto */}
                      <td className="px-4 py-3 max-w-[200px]">
                        <span className="text-[#A0A0A0] truncate block text-xs">
                          {inv.description ?? "—"}
                        </span>
                      </td>

                      {/* Fecha */}
                      <td className="px-4 py-3 tabular-nums whitespace-nowrap text-[#A0A0A0]">
                        {fmtDate(inv.date)}
                      </td>

                      {/* Vencimiento */}
                      <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                        <span
                          className={
                            isOverdue ? "text-[#E50914]" : "text-[#A0A0A0]"
                          }
                        >
                          {fmtDate(inv.due_date)}
                        </span>
                      </td>

                      {/* Modificado */}
                      <td className="px-4 py-3 tabular-nums whitespace-nowrap text-[#A0A0A0]">
                        {fmtDate(inv.date_last_modified)}
                      </td>

                      {/* Importe */}
                      <td className="px-4 py-3 tabular-nums whitespace-nowrap text-right font-medium text-[#F5F5F5]">
                        {fmtCurrency(inv.total)}
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={statusVariant[inv.status] ?? "neutral"}>
                          {statusLabel[inv.status] ?? `Estado ${inv.status}`}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Totals row */}
              <tfoot>
                <tr className="border-t border-[#2A2A2A] bg-[#1A1A1A]">
                  <td colSpan={6} className="px-4 py-3 text-xs text-[#A0A0A0]">
                    {total.toLocaleString("es-ES")} facturas en total
                    {(search || statusStr) && " (filtrado)"}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-[#F5F5F5] tabular-nums">
                    {fmtCurrency(sumTotal)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-[#2A2A2A] flex items-center justify-between">
              <span className="text-xs text-[#A0A0A0]">
                Página {page} de {totalPages} — {total.toLocaleString("es-ES")} facturas
              </span>
              <div className="flex items-center gap-2">
                {page > 1 && (
                  <a
                    href={buildHref({ page: String(page - 1) })}
                    className="h-7 px-3 rounded-[6px] border border-[#2A2A2A] text-xs text-[#A0A0A0] hover:text-[#F5F5F5] hover:border-[#F5F5F5] transition-colors flex items-center"
                  >
                    ← Anterior
                  </a>
                )}
                {page < totalPages && (
                  <a
                    href={buildHref({ page: String(page + 1) })}
                    className="h-7 px-3 rounded-[6px] border border-[#2A2A2A] text-xs text-[#A0A0A0] hover:text-[#F5F5F5] hover:border-[#F5F5F5] transition-colors flex items-center"
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
