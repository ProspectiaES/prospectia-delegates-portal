import { createClient } from "@/lib/supabase/server";
import { KpiCard } from "@/components/ui/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SyncButton } from "@/components/SyncButton";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DbInvoice {
  id: string;
  doc_number: string | null;
  contact_name: string | null;
  date: string | null;
  total: number;
  status: number;
  last_synced_at: string;
}

interface SyncLog {
  sync_type: string;
  status: string;
  contacts_synced: number;
  invoices_synced: number;
  finished_at: string | null;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmtNumber   = (n: number) => new Intl.NumberFormat("es-ES").format(n);
const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const fmtPercent  = (n: number) => `${n.toFixed(1).replace(".", ",")}%`;

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "hace un momento";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

const statusLabel: Record<number, string> = {
  0: "Borrador", 1: "Pendiente", 2: "Vencida", 3: "Cobrada",
};
const statusVariant: Record<number, "neutral" | "warning" | "danger" | "success"> = {
  0: "neutral", 1: "warning", 2: "danger", 3: "success",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { count: totalContacts },
    { data: invoices },
    { data: lastSync },
  ] = await Promise.all([
    supabase.from("holded_contacts").select("*", { count: "exact", head: true }),
    supabase
      .from("holded_invoices")
      .select("id, doc_number, contact_name, date, total, status, last_synced_at")
      .order("date", { ascending: false })
      .limit(5),
    supabase
      .from("holded_sync_log")
      .select("sync_type, status, contacts_synced, invoices_synced, finished_at")
      .eq("status", "completed")
      .order("finished_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // KPI aggregates
  const { data: aggData } = await supabase
    .from("holded_invoices")
    .select("total, status");

  const allInvoices = aggData ?? [];
  const totalInvoiced   = allInvoices.reduce((s, r) => s + (r.total ?? 0), 0);
  const billable        = allInvoices.filter((r) => r.status > 0);
  const paid            = allInvoices.filter((r) => r.status === 3);
  const convRate        = billable.length > 0 ? (paid.length / billable.length) * 100 : 0;

  const hasSynced = (totalContacts ?? 0) > 0 || allInvoices.length > 0;
  const syncLog   = lastSync as SyncLog | null;
  const recentDocs = (invoices ?? []) as DbInvoice[];

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-8 space-y-8">

      {/* Heading */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-[#A0A0A0]">
            Delegados, puntos de venta y comisiones.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {syncLog && (
            <span className="text-xs text-[#A0A0A0]">
              Último sync: {relativeTime(syncLog.finished_at)}
            </span>
          )}
          <SyncButton />
        </div>
      </div>

      {/* Empty state */}
      {!hasSynced && (
        <div className="rounded-[8px] border border-[#2A2A2A] bg-[#121212] px-6 py-10 text-center">
          <p className="text-sm font-medium text-[#F5F5F5]">Sin datos sincronizados</p>
          <p className="mt-1 text-xs text-[#A0A0A0]">
            Pulsa «Sincronizar ahora» para importar todos los contactos y facturas de Holded.
          </p>
        </div>
      )}

      {hasSynced && (
        <>
          {/* KPIs */}
          <section aria-label="Indicadores clave">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="Delegados"
                value={fmtNumber(totalContacts ?? 0)}
                subtext="contactos en Holded"
                accent
              />
              <KpiCard
                label="Facturas emitidas"
                value={fmtNumber(allInvoices.length)}
                subtext={`${fmtNumber(billable.length)} emitidas`}
              />
              <KpiCard
                label="Total facturado"
                value={fmtCurrency(totalInvoiced)}
                subtext={`${fmtNumber(paid.length)} cobradas`}
              />
              <KpiCard
                label="Tasa de cobro"
                value={billable.length > 0 ? fmtPercent(convRate) : "—"}
                trend={convRate >= 80 ? "up" : convRate >= 50 ? "neutral" : "down"}
                trendValue={paid.length > 0 ? `${paid.length} pagadas` : undefined}
              />
            </div>
          </section>

          {/* Bottom grid */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Facturas recientes — 2/3 */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Facturas recientes</CardTitle>
                <span className="text-xs text-[#A0A0A0]">Últimas 5</span>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-[#2A2A2A]">
                  {recentDocs.map((doc, i) => (
                    <li
                      key={doc.id}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#1A1A1A] transition-colors"
                    >
                      <span className="w-5 shrink-0 text-xs tabular-nums text-[#A0A0A0] text-right">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#F5F5F5] font-medium leading-snug truncate">
                          {doc.contact_name ?? "Sin nombre"}
                        </p>
                        <p className="text-xs text-[#A0A0A0] mt-0.5">
                          {doc.doc_number ? `Factura ${doc.doc_number}` : `ID ${doc.id.slice(0, 10)}…`}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-medium text-[#F5F5F5] tabular-nums">
                        {fmtCurrency(doc.total)}
                      </span>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <Badge variant={statusVariant[doc.status] ?? "neutral"}>
                          {statusLabel[doc.status] ?? "—"}
                        </Badge>
                        <span className="text-xs text-[#A0A0A0]">
                          {relativeTime(doc.date)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Resumen de sincronización — 1/3 */}
            <Card>
              <CardHeader>
                <CardTitle>Sincronización</CardTitle>
                <Badge variant="success" dot>Activa</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-[#2A2A2A]">
                  {[
                    { label: "Intervalo completo",     value: "Cada 15 min" },
                    { label: "Actualización estado",   value: "Cada 4 h"    },
                    { label: "Contactos importados",   value: fmtNumber(totalContacts ?? 0) },
                    { label: "Facturas importadas",    value: fmtNumber(allInvoices.length) },
                    {
                      label: "Último sync completo",
                      value: syncLog?.sync_type === "full"
                        ? relativeTime(syncLog.finished_at)
                        : "—",
                    },
                  ].map(({ label, value }) => (
                    <li
                      key={label}
                      className="flex items-center justify-between px-5 py-3"
                    >
                      <span className="text-xs text-[#A0A0A0]">{label}</span>
                      <span className="text-xs font-medium text-[#F5F5F5] tabular-nums">
                        {value}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

          </section>
        </>
      )}
    </div>
  );
}
