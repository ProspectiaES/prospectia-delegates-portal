import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { SyncButton } from "@/components/SyncButton";
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
  city: string | null;
  province: string | null;
  country: string | null;
  address: string | null;
  last_synced_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

const contactTypeLabel: Record<number, string> = {
  0: "Contacto", 1: "Cliente", 2: "Proveedor", 3: "Acreedor", 4: "Deudor",
};

const contactTypeVariant: Record<number, "default" | "success" | "warning" | "neutral"> = {
  0: "neutral", 1: "success", 2: "default", 3: "warning", 4: "warning",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string; type?: string }>;
}

export default async function ClientesPage({ searchParams }: PageProps) {
  const params  = await searchParams;
  const page    = Math.max(1, parseInt(params.page  ?? "1", 10));
  const search  = (params.search ?? "").trim();
  const typeStr = params.type ?? "";

  const [supabase, profile] = await Promise.all([createClient(), getProfile()]);
  const isOwner    = profile?.role === "OWNER";
  const isDelegate = profile?.role === "DELEGATE";
  const from = (page - 1) * PAGE_SIZE;
  const to   = from + PAGE_SIZE - 1;

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

  let query = supabase
    .from("holded_contacts")
    .select(
      "id, name, code, email, phone, mobile, type, tags, city, province, country, address, last_synced_at",
      { count: "exact" }
    )
    .order("name", { ascending: true })
    .range(from, to);

  if (delegateContactIds !== null) query = query.in("id", delegateContactIds);
  if (search)  query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,code.ilike.%${search}%`);
  if (typeStr) query = query.eq("type", parseInt(typeStr, 10));

  const { data, count, error } = await query;

  const contacts   = (data ?? []) as DbContact[];
  const total      = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function buildHref(overrides: Record<string, string>) {
    const p = new URLSearchParams({
      ...(search  ? { search }          : {}),
      ...(typeStr ? { type: typeStr }   : {}),
      page: String(page),
      ...overrides,
    });
    return `/dashboard/clientes?${p.toString()}`;
  }

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">

      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Clientes</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            {total > 0 ? `${total.toLocaleString("es-ES")} cliente${total !== 1 ? "s" : ""}` : "Sin datos"}
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
        <select
          name="type"
          defaultValue={typeStr}
          className="h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0A0A0A] focus:border-[#8E0E1A] focus:outline-none shadow-sm"
        >
          <option value="">Todos los tipos</option>
          <option value="0">Contacto</option>
          <option value="1">Cliente</option>
          <option value="2">Proveedor</option>
          <option value="3">Acreedor</option>
          <option value="4">Deudor</option>
        </select>
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

      {/* Table */}
      {contacts.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  {["Nombre", "Código", "Email", "Teléfono", "Tipo", "Localidad", "Etiquetas", ""].map((h) => (
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
                {contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-4 py-3 font-medium text-[#0A0A0A] whitespace-nowrap max-w-[200px] truncate">
                      <Link href={`/dashboard/clientes/${c.id}`} className="hover:text-[#8E0E1A] transition-colors">
                        {c.name || <span className="text-[#9CA3AF]">—</span>}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#6B7280] tabular-nums whitespace-nowrap font-mono text-xs">
                      {c.code || <span className="text-[#D1D5DB]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap max-w-[200px] truncate">
                      {c.email
                        ? <a href={`mailto:${c.email}`} className="hover:text-[#8E0E1A] transition-colors">{c.email}</a>
                        : <span className="text-[#D1D5DB]">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap tabular-nums">
                      {c.phone || c.mobile || <span className="text-[#D1D5DB]">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {c.type != null ? (
                        <Badge variant={contactTypeVariant[c.type] ?? "neutral"}>
                          {contactTypeLabel[c.type] ?? `Tipo ${c.type}`}
                        </Badge>
                      ) : (
                        <span className="text-[#D1D5DB] text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">
                      {[c.city, c.province].filter(Boolean).join(", ") || <span className="text-[#D1D5DB]">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.tags?.length > 0
                          ? c.tags.slice(0, 3).map((t) => <Badge key={t} variant="neutral">{t}</Badge>)
                          : <span className="text-[#D1D5DB] text-xs">—</span>
                        }
                        {c.tags?.length > 3 && (
                          <Badge variant="neutral">+{c.tags.length - 3}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link
                        href={`/dashboard/clientes/${c.id}`}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-[#E5E7EB] flex items-center justify-between">
              <span className="text-xs text-[#6B7280]">
                Página {page} de {totalPages} — {total.toLocaleString("es-ES")} contactos
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
