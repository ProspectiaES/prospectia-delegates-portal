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
  date_paid: string | null;
  total: number;
  status: number;
  description: string | null;
  last_synced_at: string;
  is_credit_note: boolean;
  from_invoice_id: string | null;
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

// ─── Sorting ──────────────────────────────────────────────────────────────────

const SORT_COLS = {
  doc_number:   "doc_number",
  contact_name: "contact_name",
  description:  "description",
  date:         "date",
  due_date:     "due_date",
  date_paid:    "date_paid",
  total:        "total",
  status:       "status",
} as const;

type SortCol = keyof typeof SORT_COLS;

const DEFAULT_SORT: SortCol = "date";
const DEFAULT_DIR            = "desc";

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string; status?: string; sort?: string; dir?: string }>;
}

export default async function FacturasPage({ searchParams }: PageProps) {
  const params    = await searchParams;
  const page      = Math.max(1, parseInt(params.page ?? "1", 10));
  const search    = (params.search ?? "").trim();
  const statusStr = params.status ?? "";
  const sortCol   = (params.sort && params.sort in SORT_COLS ? params.sort : DEFAULT_SORT) as SortCol;
  const sortDir   = params.dir === "asc" ? "asc" : "desc";

  const [supabase, profile] = await Promise.all([createClient(), getProfile()]);
  const role    = profile?.role ?? "";
  const isOwner = role === "OWNER" || role === "ADMIN";

  // For non-owners: restrict to their ecosystem's contact IDs
  let allowedContactIds: string[] | null = null;
  if (!isOwner && profile?.id) {
    const admin = createAdminClient();
    if (role === "DELEGATE") {
      const { data: cdRows } = await admin.from("contact_delegates")
        .select("contact_id").eq("delegate_id", profile.id);
      allowedContactIds = (cdRows ?? []).map(r => r.contact_id);
    } else if (role === "KOL") {
      const { data: myDelegates } = await admin.from("profiles")
        .select("id").eq("kol_id", profile.id);
      const delegateIds = [profile.id, ...(myDelegates ?? []).map((d: { id: string }) => d.id)];
      const { data: cdRows } = await admin.from("contact_delegates")
        .select("contact_id").in("delegate_id", delegateIds);
      allowedContactIds = (cdRows ?? []).map(r => r.contact_id);
    } else if (role === "COORDINATOR") {
      const { data: contacts } = await admin.from("holded_contacts")
        .select("id").eq("assigned_coordinator_id", profile.id);
      allowedContactIds = (contacts ?? []).map((c: { id: string }) => c.id);
    }
  }

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

  const useAdmin = !isOwner && allowedContactIds !== null;
  const db = useAdmin ? createAdminClient() : supabase;

  let query = db
    .from("holded_invoices")
    .select(
      "id, doc_number, contact_id, contact_name, date, due_date, date_last_modified, date_paid, total, status, description, last_synced_at, is_credit_note, from_invoice_id",
      { count: "exact" }
    )
    .order(SORT_COLS[sortCol], { ascending: sortDir === "asc", nullsFirst: false })
    .range(from, to);

  if (allowedContactIds !== null) query = query.in("contact_id", allowedContactIds.length ? allowedContactIds : ["__none__"]);
  if (search)    query = query.or(`contact_name.ilike.%${search}%,doc_number.ilike.%${search}%,description.ilike.%${search}%`);
  if (statusStr) query = query.eq("status", parseInt(statusStr, 10));

  const { data, count, error } = await query;

  const invoices   = (data ?? []) as DbInvoice[];
  const total      = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Build set of invoice IDs cancelled by a CN (all in scope, not just current page)
  const cancelledIds = new Set<string>();
  {
    let cnQ = db.from("holded_invoices").select("from_invoice_id")
      .eq("is_credit_note", true).not("from_invoice_id", "is", null);
    if (allowedContactIds !== null)
      cnQ = cnQ.in("contact_id", allowedContactIds.length ? allowedContactIds : ["__none__"]);
    const { data: cnData } = await cnQ;
    for (const r of cnData ?? []) {
      if (r.from_invoice_id) cancelledIds.add(r.from_invoice_id as string);
    }
  }

  const now          = new Date();
  const currentYear  = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  let statsQuery = db.from("holded_invoices").select("total, status");
  if (allowedContactIds !== null) statsQuery = statsQuery.in("contact_id", allowedContactIds.length ? allowedContactIds : ["__none__"]);
  const { data: allRows } = await statsQuery;
  const filtered    = statusStr ? (allRows ?? []).filter((r) => r.status === parseInt(statusStr, 10)) : (allRows ?? []);
  const sumTotal    = filtered.reduce((s, r) => s + (r.total ?? 0), 0);
  const sumCobradas = filtered.filter((r) => r.status === 3).reduce((s, r) => s + (r.total ?? 0), 0);

  function buildHref(overrides: Record<string, string>) {
    const p = new URLSearchParams({
      ...(search    ? { search }            : {}),
      ...(statusStr ? { status: statusStr } : {}),
      ...(sortCol !== DEFAULT_SORT ? { sort: sortCol } : {}),
      ...(sortDir  !== DEFAULT_DIR  ? { dir:  sortDir  } : {}),
      page: String(page),
      ...overrides,
    });
    return `/dashboard/facturas?${p.toString()}`;
  }

  function buildSortHref(col: SortCol) {
    const nextDir = sortCol === col && sortDir === "desc" ? "asc" : "desc";
    const p = new URLSearchParams({
      ...(search    ? { search }            : {}),
      ...(statusStr ? { status: statusStr } : {}),
      sort: col,
      dir:  nextDir,
      page: "1",
    });
    return `/dashboard/facturas?${p.toString()}`;
  }

  function SortIcon({ col }: { col: SortCol }) {
    if (sortCol !== col) return <span className="ml-1 text-[#D1D5DB]">↕</span>;
    return <span className="ml-1 text-[#0A0A0A]">{sortDir === "asc" ? "↑" : "↓"}</span>;
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
                  {(
                    [
                      { label: "N.º Factura", col: "doc_number"   as SortCol },
                      { label: "Cliente",     col: "contact_name" as SortCol },
                      { label: "Concepto",    col: "description"  as SortCol },
                      { label: "Fecha",       col: "date"         as SortCol },
                      { label: "Vencimiento", col: "due_date"     as SortCol },
                      { label: "F. Cobro",    col: "date_paid"    as SortCol },
                      { label: "Importe",     col: "total"        as SortCol },
                      { label: "Estado",      col: "status"       as SortCol },
                    ] as { label: string; col: SortCol }[]
                  ).map(({ label, col }) => (
                    <th key={col} className="px-4 py-3 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">
                      <a href={buildSortHref(col)} className="inline-flex items-center hover:text-[#0A0A0A] transition-colors cursor-pointer select-none">
                        {label}<SortIcon col={col} />
                      </a>
                    </th>
                  ))}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {invoices.map((inv) => {
                  const isCN        = inv.is_credit_note;
                  const isCancelled = !isCN && cancelledIds.has(inv.id);

                  const isOverdue =
                    !isCN && !isCancelled &&
                    (inv.status === 2 || (inv.status === 1 && inv.due_date && new Date(inv.due_date) < new Date()));

                  const paidDate = inv.status === 3 && inv.date_paid ? new Date(inv.date_paid) : null;
                  const isPaidThisMonth = !isCN && !isCancelled && paidDate != null
                    && paidDate.getFullYear() === currentYear
                    && paidDate.getMonth() + 1 === currentMonth;

                  const rowClass = isCN
                    ? "bg-red-50 hover:bg-red-50/80"
                    : isCancelled
                      ? "bg-[#F3F4F6] opacity-60 hover:opacity-80"
                      : isPaidThisMonth
                        ? "bg-amber-50/50 hover:bg-amber-50"
                        : "hover:bg-[#F9FAFB]";

                  const textMuted = isCancelled ? "text-[#9CA3AF]" : undefined;

                  return (
                    <tr key={inv.id} className={`transition-colors ${rowClass}`}>
                      <td className="px-4 py-3 tabular-nums whitespace-nowrap font-semibold font-mono text-xs">
                        <div className="flex items-center gap-1.5">
                          {isCN && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wide">NC</span>
                          )}
                          <Link href={`/dashboard/facturas/${inv.id}`} className={`hover:text-[#8E0E1A] transition-colors ${isCancelled ? "line-through text-[#9CA3AF]" : isCN ? "text-red-700" : "text-[#0A0A0A]"}`}>
                            {inv.doc_number ?? (
                              <span className="font-normal">{inv.id.slice(0, 8)}…</span>
                            )}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap max-w-[180px]">
                        <span className={`font-medium truncate block ${textMuted ?? "text-[#0A0A0A]"}`}>
                          {inv.contact_name ?? <span className="text-[#9CA3AF]">—</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <span className={`truncate block text-xs ${textMuted ?? "text-[#6B7280]"}`}>
                          {inv.description ?? "—"}
                        </span>
                      </td>
                      <td className={`px-4 py-3 tabular-nums whitespace-nowrap ${textMuted ?? "text-[#6B7280]"}`}>
                        {fmtDate(inv.date)}
                      </td>
                      <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                        <span className={isCancelled ? "text-[#9CA3AF]" : isOverdue ? "text-[#8E0E1A] font-medium" : "text-[#6B7280]"}>
                          {fmtDate(inv.due_date)}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                        {paidDate == null ? (
                          <span className="text-[#9CA3AF]">—</span>
                        ) : isPaidThisMonth ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                            ★ {fmtDate(inv.date_paid)}
                          </span>
                        ) : (
                          <span className={`font-medium tabular-nums ${isCancelled ? "text-[#9CA3AF]" : "text-emerald-700"}`}>{fmtDate(inv.date_paid)}</span>
                        )}
                      </td>
                      <td className={`px-4 py-3 tabular-nums whitespace-nowrap text-right font-semibold ${isCancelled ? "line-through text-[#9CA3AF]" : isCN ? "text-red-700" : "text-[#0A0A0A]"}`}>
                        {isCN ? `−${fmtCurrency(Math.abs(inv.total))}` : fmtCurrency(inv.total)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isCN ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700">Nota crédito</span>
                        ) : isCancelled ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-400">Anulada</span>
                        ) : (
                          <Badge variant={statusVariant[inv.status] ?? "neutral"}>
                            {statusLabel[inv.status] ?? `Estado ${inv.status}`}
                          </Badge>
                        )}
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
