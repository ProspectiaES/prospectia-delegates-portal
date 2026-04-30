import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/Card";
import { SyncButton } from "@/components/SyncButton";
import { getProfile } from "@/lib/profile";
import { ClientesActivityList, type ContactWithActivity, type FollowupRecord } from "./ClientesActivityList";

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ search?: string; type?: string }>;
}

export default async function ClientesPage({ searchParams }: PageProps) {
  const params  = await searchParams;
  const search  = (params.search ?? "").trim();
  const typeStr = params.type ?? "";

  const [supabase, profile] = await Promise.all([createClient(), getProfile()]);
  const isOwner    = profile?.role === "OWNER";
  const isDelegate = profile?.role === "DELEGATE";

  // Non-owners default to type=1 (clients only); OWNER can see all via ?type=all
  const effectiveType = isOwner
    ? (typeStr === "all" ? "" : typeStr || "")
    : "1";

  // Delegates see only their assigned contacts
  let delegateContactIds: string[] | null = null;
  if (isDelegate && profile) {
    const admin = createAdminClient();
    const { data: links } = await admin
      .from("contact_delegates")
      .select("contact_id")
      .eq("delegate_id", profile.id);
    delegateContactIds = (links ?? []).map(r => r.contact_id as string);
  }

  // Early-exit: delegate with zero contacts
  if (delegateContactIds !== null && delegateContactIds.length === 0) {
    return (
      <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Clientes</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm font-medium text-[#0A0A0A]">Aún no tienes clientes asignados.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch all matching contacts (no pagination — activity list handles it client-side)
  let query = supabase
    .from("holded_contacts")
    .select("id, name, code, email, phone, type, tags, city")
    .order("name", { ascending: true });

  if (delegateContactIds !== null) query = query.in("id", delegateContactIds);
  if (search)        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,code.ilike.%${search}%`);
  if (effectiveType) query = query.eq("type", parseInt(effectiveType, 10));

  const { data: rawContacts, error } = await query;
  const contactList = rawContacts ?? [];

  // Fetch invoice activity: last and first invoice date per contact
  const allContactIds = contactList.map(c => c.id);
  let invDates: { contact_id: string | null; date: string | null }[] = [];
  if (allContactIds.length > 0) {
    const { data } = await supabase
      .from("holded_invoices")
      .select("contact_id, date")
      .in("contact_id", allContactIds)
      .eq("is_credit_note", false)
      .not("date", "is", null);
    invDates = (data ?? []) as typeof invDates;
  }

  // Aggregate min/max date per contact
  const activityMap = new Map<string, { first: string; last: string }>();
  for (const inv of invDates) {
    if (!inv.contact_id || !inv.date) continue;
    const cur = activityMap.get(inv.contact_id);
    if (!cur) {
      activityMap.set(inv.contact_id, { first: inv.date, last: inv.date });
    } else {
      if (inv.date < cur.first) cur.first = inv.date;
      if (inv.date > cur.last)  cur.last  = inv.date;
    }
  }

  // Build ContactWithActivity[]
  const now = new Date();
  const contacts: ContactWithActivity[] = contactList.map(c => {
    const activity         = activityMap.get(c.id);
    const lastActivityDate = activity?.last ?? null;
    const firstInvoiceDate = activity?.first ?? null;
    const daysSinceActivity = lastActivityDate
      ? Math.floor((now.getTime() - new Date(lastActivityDate).getTime()) / 86_400_000)
      : null;
    return {
      id: c.id,
      name: c.name,
      code: c.code ?? null,
      email: c.email ?? null,
      phone: c.phone ?? null,
      type: c.type ?? null,
      city: c.city ?? null,
      tags: (c.tags as string[]) ?? [],
      lastActivityDate,
      firstInvoiceDate,
      daysSinceActivity,
    };
  });

  // Period: current month
  const periodStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString();
  const periodEnd   = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)).toISOString();

  // Fetch persisted followup state + prospecto link map
  const admin3 = createAdminClient();
  const [followupsRes, prospectoRes] = await Promise.all([
    (isOwner
      ? admin3.from("client_followups").select("contact_id, status, tasks_done, otros_done, otros_text, notes")
      : admin3.from("client_followups").select("contact_id, status, tasks_done, otros_done, otros_text, notes").eq("delegate_id", profile!.id)
    ),
    admin3.from("prospectos").select("id, holded_contact_id").not("holded_contact_id", "is", null),
  ]);

  const initialFollowups: FollowupRecord[] = (followupsRes.data ?? []).map(r => ({
    contact_id: r.contact_id as string,
    status:     (r.status  as string) as FollowupRecord["status"],
    tasks_done: (r.tasks_done as string[]) ?? [],
    otros_done: r.otros_done as boolean,
    otros_text: (r.otros_text as string) ?? "",
    notes:      (r.notes as string) ?? "",
  }));

  const prospectoMap: Record<string, string> = {};
  for (const p of (prospectoRes.data ?? [])) {
    if (p.holded_contact_id) prospectoMap[p.holded_contact_id as string] = p.id;
  }

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">

      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Clientes</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            {contacts.length > 0 ? `${contacts.length.toLocaleString("es-ES")} cliente${contacts.length !== 1 ? "s" : ""}` : "Sin datos"}
          </p>
        </div>
        {isOwner && <SyncButton endpoint="/api/holded/sync" label="Sincronizar" />}
      </div>

      {/* Filters */}
      <form method="GET" action="/dashboard/clientes" className="flex flex-wrap items-center gap-3">
        <input
          name="search"
          defaultValue={search}
          placeholder="Buscar por nombre, email o código…"
          className="h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0A0A0A] placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors w-72 shadow-sm"
        />
        {isOwner && (
          <select
            name="type"
            defaultValue={typeStr || ""}
            className="h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0A0A0A] focus:border-[#8E0E1A] focus:outline-none shadow-sm"
          >
            <option value="all">Todos los tipos</option>
            <option value="1">Cliente</option>
            <option value="0">Contacto</option>
            <option value="2">Proveedor</option>
            <option value="3">Acreedor</option>
            <option value="4">Deudor</option>
          </select>
        )}
        <button
          type="submit"
          className="h-9 px-4 rounded-lg border border-[#E5E7EB] bg-white text-sm font-medium text-[#0A0A0A] hover:border-[#0A0A0A] hover:bg-[#F9FAFB] transition-colors shadow-sm"
        >
          Filtrar
        </button>
        {(search || typeStr) && (
          <a
            href="/dashboard/clientes"
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
      {!error && contacts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm font-medium text-[#0A0A0A]">
              {search || typeStr ? "Sin resultados para los filtros aplicados." : "Sin contactos sincronizados."}
            </p>
            {!search && !typeStr && (
              <p className="mt-1 text-xs text-[#6B7280]">
                Usa «Sincronizar» para importar los contactos de Holded.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Activity list */}
      {contacts.length > 0 && (
        <ClientesActivityList
          contacts={contacts}
          periodStart={periodStart}
          periodEnd={periodEnd}
          initialFollowups={initialFollowups}
          prospectoMap={prospectoMap}
        />
      )}

    </div>
  );
}
