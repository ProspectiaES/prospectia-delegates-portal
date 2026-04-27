import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ContactEditForm } from "./ContactEditForm";
import { DelegateAssignment } from "./DelegateAssignment";
import { AffiliateSelect } from "./AffiliateSelect";
import { getProfile } from "@/lib/profile";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DbContact {
  id: string;
  name: string;
  code: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  type: number | null;
  tags: string[];
  address: string | null;
  city: string | null;
  postal_code: string | null;
  province: string | null;
  country: string | null;
  country_code: string | null;
  affiliate_id: string | null;
  first_synced_at: string;
  last_synced_at: string;
  raw: Record<string, unknown>;
}

interface DbInvoice {
  id: string;
  doc_number: string | null;
  date: string | null;
  due_date: string | null;
  total: number;
  status: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const typeLabel: Record<number, string> = {
  0: "Contacto", 1: "Cliente", 2: "Proveedor", 3: "Acreedor", 4: "Deudor",
};
const typeVariant: Record<number, "default" | "success" | "warning" | "neutral"> = {
  0: "neutral", 1: "success", 2: "default", 3: "warning", 4: "warning",
};
const statusLabel: Record<number, string> = { 0: "Borrador", 1: "Pendiente", 2: "Vencida", 3: "Cobrada" };
const statusVariant: Record<number, "neutral" | "warning" | "danger" | "success"> = {
  0: "neutral", 1: "warning", 2: "danger", 3: "success",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClienteDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [profile, { data: contactData }, { data: invoicesData }] = await Promise.all([
    getProfile(),
    supabase
      .from("holded_contacts")
      .select("id, name, code, email, phone, mobile, type, tags, address, city, postal_code, province, country, country_code, affiliate_id, first_synced_at, last_synced_at, raw")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("holded_invoices")
      .select("id, doc_number, date, due_date, total, status")
      .eq("contact_id", id)
      .order("date", { ascending: false })
      .limit(10),
  ]);

  if (!contactData) notFound();

  const isOwner = profile?.role === "OWNER";

  // Owner-only: load delegates + current assignments + all affiliates
  let allDelegates: { id: string; full_name: string }[] = [];
  let assignedIds: string[] = [];
  let allAffiliates: { id: string; email: string; first_name: string | null; last_name: string | null; referral_code: string | null }[] = [];

  if (isOwner) {
    const [delegatesRes, assignmentsRes, affiliatesRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name").eq("role", "DELEGATE").order("full_name"),
      supabase.from("contact_delegates").select("delegate_id").eq("contact_id", id),
      supabase.from("bixgrow_affiliates").select("id, email, first_name, last_name, referral_code").order("email"),
    ]);
    allDelegates  = (delegatesRes.data  ?? []) as typeof allDelegates;
    assignedIds   = (assignmentsRes.data ?? []).map((r) => r.delegate_id);
    allAffiliates = (affiliatesRes.data  ?? []) as typeof allAffiliates;
  }

  const contact = contactData as DbContact;
  const invoices = (invoicesData ?? []) as DbInvoice[];
  const totalBilled = invoices.reduce((s, inv) => s + inv.total, 0);
  const totalPaid   = invoices.filter((inv) => inv.status === 3).reduce((s, inv) => s + inv.total, 0);

  const location = [contact.city, contact.province, contact.country].filter(Boolean).join(", ");

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">

      {/* Back + header */}
      <div>
        <Link
          href="/dashboard/clientes"
          className="inline-flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#8E0E1A] transition-colors mb-4"
        >
          ← Volver a clientes
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">{contact.name}</h1>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              {contact.type != null && (
                <Badge variant={typeVariant[contact.type] ?? "neutral"}>
                  {typeLabel[contact.type] ?? `Tipo ${contact.type}`}
                </Badge>
              )}
              {contact.code && (
                <span className="text-xs text-[#6B7280] font-mono">{contact.code}</span>
              )}
              {location && (
                <span className="text-xs text-[#6B7280]">{location}</span>
              )}
            </div>
          </div>
          <p className="text-xs text-[#9CA3AF] text-right shrink-0 ml-4">
            Sync: {fmtDate(contact.last_synced_at)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Edit form — 2/3 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Datos del contacto</CardTitle>
            <span className="text-xs text-[#9CA3AF]">Editable · se guarda en Holded</span>
          </CardHeader>
          <CardContent>
            <ContactEditForm contact={{
              id:          contact.id,
              name:        contact.name,
              code:        contact.code,
              email:       contact.email,
              phone:       contact.phone,
              mobile:      contact.mobile,
              type:        contact.type,
              tags:        contact.tags ?? [],
              address:     contact.address,
              city:        contact.city,
              postal_code: contact.postal_code,
              province:    contact.province,
              country:     contact.country,
            }} />
          </CardContent>
        </Card>

        {/* Stats + invoices — 1/3 */}
        <div className="space-y-6">

          {/* Stats */}
          <Card>
            <CardHeader><CardTitle>Resumen económico</CardTitle></CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-[#F3F4F6]">
                {[
                  { label: "Facturas totales", value: String(invoices.length) },
                  { label: "Facturado",         value: fmtCurrency(totalBilled) },
                  { label: "Cobrado",           value: fmtCurrency(totalPaid) },
                  { label: "Pendiente",         value: fmtCurrency(totalBilled - totalPaid) },
                ].map(({ label, value }) => (
                  <li key={label} className="flex items-center justify-between px-5 py-3">
                    <span className="text-xs text-[#6B7280]">{label}</span>
                    <span className="text-xs font-semibold text-[#0A0A0A] tabular-nums">{value}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Delegate assignment — owner only */}
          {isOwner && (
            <Card>
              <CardHeader>
                <CardTitle>Delegados asignados</CardTitle>
                <span className="text-xs text-[#9CA3AF]">Solo visible para ti</span>
              </CardHeader>
              <CardContent className="p-0">
                <DelegateAssignment
                  contactId={contact.id}
                  delegates={allDelegates}
                  assignedIds={assignedIds}
                />
              </CardContent>
            </Card>
          )}

          {/* Affiliate assignment — owner only */}
          {isOwner && (
            <Card>
              <CardHeader>
                <CardTitle>Afiliado asignado</CardTitle>
                <span className="text-xs text-[#9CA3AF]">Solo visible para ti</span>
              </CardHeader>
              <CardContent className="p-0">
                <AffiliateSelect
                  contactId={contact.id}
                  affiliates={allAffiliates}
                  currentAffiliateId={contact.affiliate_id}
                />
              </CardContent>
            </Card>
          )}

          {/* Recent invoices */}
          {invoices.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Facturas</CardTitle>
                <span className="text-xs text-[#9CA3AF]">Últimas {invoices.length}</span>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-[#F3F4F6]">
                  {invoices.map((inv) => (
                    <li key={inv.id}>
                      <Link
                        href={`/dashboard/facturas/${inv.id}`}
                        className="flex items-center justify-between px-5 py-3 hover:bg-[#F9FAFB] transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[#0A0A0A] truncate">
                            {inv.doc_number ?? inv.id.slice(0, 8) + "…"}
                          </p>
                          <p className="text-xs text-[#9CA3AF]">{fmtDate(inv.date)}</p>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1 ml-3">
                          <span className="text-xs font-semibold text-[#0A0A0A] tabular-nums">
                            {fmtCurrency(inv.total)}
                          </span>
                          <Badge variant={statusVariant[inv.status] ?? "neutral"}>
                            {statusLabel[inv.status] ?? "—"}
                          </Badge>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
