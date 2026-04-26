import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SyncButton } from "@/components/SyncButton";

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
  0: "Contacto",
  1: "Cliente",
  2: "Proveedor",
  3: "Acreedor",
  4: "Deudor",
};

const contactTypeVariant: Record<
  number,
  "default" | "success" | "warning" | "neutral"
> = {
  0: "neutral",
  1: "success",
  2: "default",
  3: "warning",
  4: "warning",
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

  const supabase = await createClient();
  const from     = (page - 1) * PAGE_SIZE;
  const to       = from + PAGE_SIZE - 1;

  let query = supabase
    .from("holded_contacts")
    .select("id, name, code, email, phone, mobile, type, tags, city, province, country, address, last_synced_at", {
      count: "exact",
    })
    .order("name", { ascending: true })
    .range(from, to);

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,email.ilike.%${search}%,code.ilike.%${search}%`
    );
  }
  if (typeStr !== "") {
    query = query.eq("type", parseInt(typeStr, 10));
  }

  const { data, count, error } = await query;

  const contacts   = (data ?? []) as DbContact[];
  const total      = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function buildHref(overrides: Record<string, string>) {
    const p = new URLSearchParams({
      ...(search   ? { search }   : {}),
      ...(typeStr  ? { type: typeStr } : {}),
      page: String(page),
      ...overrides,
    });
    return `/dashboard/clientes?${p.toString()}`;
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-8 space-y-6">

      {/* Heading */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">Clientes</h1>
          <p className="mt-1 text-sm text-[#A0A0A0]">
            {total > 0 ? `${total.toLocaleString("es-ES")} contactos importados de Holded` : "Sin datos"}
          </p>
        </div>
        <SyncButton />
      </div>

      {/* Filters */}
      <form method="GET" action="/dashboard/clientes" className="flex flex-wrap items-center gap-3">
        <input
          name="search"
          defaultValue={search}
          placeholder="Buscar por nombre, email o código…"
          className="h-9 rounded-[6px] border border-[#2A2A2A] bg-[#121212] px-3 text-sm text-[#F5F5F5] placeholder-[#A0A0A0] focus:border-[#E50914] focus:outline-none focus:ring-1 focus:ring-[#E50914]/30 w-72"
        />
        <select
          name="type"
          defaultValue={typeStr}
          className="h-9 rounded-[6px] border border-[#2A2A2A] bg-[#121212] px-3 text-sm text-[#F5F5F5] focus:border-[#E50914] focus:outline-none"
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
          className="h-9 px-4 rounded-[6px] border border-[#2A2A2A] bg-[#1E1E1E] text-sm text-[#F5F5F5] hover:border-[#F5F5F5] transition-colors"
        >
          Filtrar
        </button>
        {(search || typeStr) && (
          <a
            href="/dashboard/clientes"
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
      {!error && contacts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-[#F5F5F5]">
              {search || typeStr ? "Sin resultados para los filtros aplicados." : "Sin contactos sincronizados."}
            </p>
            {!search && !typeStr && (
              <p className="mt-1 text-xs text-[#A0A0A0]">
                Usa «Sincronizar ahora» para importar los contactos de Holded.
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
                <tr className="border-b border-[#2A2A2A]">
                  {["Nombre", "Código", "Email", "Teléfono", "Tipo", "Localidad", "Etiquetas"].map((h) => (
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
                {contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-[#1A1A1A] transition-colors">
                    <td className="px-4 py-3 font-medium text-[#F5F5F5] whitespace-nowrap max-w-[200px] truncate">
                      {c.name || <span className="text-[#A0A0A0]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-[#A0A0A0] tabular-nums whitespace-nowrap">
                      {c.code || <span className="text-[#2A2A2A]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-[#A0A0A0] whitespace-nowrap max-w-[200px] truncate">
                      {c.email
                        ? <a href={`mailto:${c.email}`} className="hover:text-[#F5F5F5] transition-colors">{c.email}</a>
                        : <span className="text-[#2A2A2A]">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-[#A0A0A0] whitespace-nowrap tabular-nums">
                      {c.phone || c.mobile || <span className="text-[#2A2A2A]">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {c.type != null ? (
                        <Badge variant={contactTypeVariant[c.type] ?? "neutral"}>
                          {contactTypeLabel[c.type] ?? `Tipo ${c.type}`}
                        </Badge>
                      ) : (
                        <span className="text-[#2A2A2A] text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#A0A0A0] whitespace-nowrap">
                      {[c.city, c.province].filter(Boolean).join(", ") || <span className="text-[#2A2A2A]">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.tags?.length > 0
                          ? c.tags.slice(0, 3).map((t) => (
                              <Badge key={t} variant="neutral">{t}</Badge>
                            ))
                          : <span className="text-[#2A2A2A] text-xs">—</span>
                        }
                        {c.tags?.length > 3 && (
                          <Badge variant="neutral">+{c.tags.length - 3}</Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-[#2A2A2A] flex items-center justify-between">
              <span className="text-xs text-[#A0A0A0]">
                Página {page} de {totalPages} — {total.toLocaleString("es-ES")} contactos
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
