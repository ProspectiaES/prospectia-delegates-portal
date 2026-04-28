import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { SyncButton } from "@/components/SyncButton";
import { getProfile } from "@/lib/profile";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DbProduct {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  kind: string | null;
  price: number | null;
  total: number | null;
  taxes: string[];
  stock: number | null;
  has_stock: boolean;
  commission_delegate:    number | null;
  commission_recommender: number | null;
  commission_affiliate:   number | null;
  commission_4:           number | null;
  commission_5:           number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtCurrency = (n: number | null) =>
  n == null ? "—"
  : new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

const fmtRate = (n: number | null) =>
  n == null ? <span className="text-[#D1D5DB]">—</span> : <span className="tabular-nums">{n}%</span>;

function taxLabel(codes: string[]): string {
  if (!codes?.length) return "—";
  const pcts = codes.map((c) => { const m = c.match(/(\d+)$/); return m ? `${m[1]}%` : c; });
  return pcts.join("+");
}

const kindLabel: Record<string, string> = {
  lots: "Lotes", serialnumbers: "N.º serie", product: "Producto", service: "Servicio",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ search?: string }>;
}

export default async function ProductosPage({ searchParams }: PageProps) {
  const { search = "" } = await searchParams;
  const q = search.trim();

  const [supabase, profile] = await Promise.all([createClient(), getProfile()]);
  const isOwner = profile?.role === "OWNER";

  let query = supabase
    .from("holded_products")
    .select(
      "id, name, description, sku, kind, price, total, taxes, stock, has_stock, commission_delegate, commission_recommender, commission_affiliate, commission_4, commission_5",
      { count: "exact" }
    )
    .order("name");

  if (q) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%,description.ilike.%${q}%`);

  const { data, count } = await query;
  const products = (data ?? []) as DbProduct[];
  const total    = count ?? 0;

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Productos</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            {total > 0 ? `${total} producto${total !== 1 ? "s" : ""} importados de Holded` : "Sin datos"}
          </p>
        </div>
        {isOwner && <SyncButton endpoint="/api/holded/sync" label="Sincronizar" />}
      </div>

      {/* Search */}
      <form method="GET" action="/dashboard/productos" className="flex items-center gap-3">
        <input
          name="search"
          defaultValue={q}
          placeholder="Buscar por nombre, SKU o descripción…"
          className="h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0A0A0A] placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors w-80 shadow-sm"
        />
        <button
          type="submit"
          className="h-9 px-4 rounded-lg border border-[#E5E7EB] bg-white text-sm font-medium text-[#0A0A0A] hover:border-[#0A0A0A] hover:bg-[#F9FAFB] transition-colors shadow-sm"
        >
          Filtrar
        </button>
        {q && (
          <a href="/dashboard/productos" className="h-9 px-3 flex items-center text-xs font-medium text-[#6B7280] hover:text-[#8E0E1A] transition-colors">
            Limpiar
          </a>
        )}
      </form>

      {/* Empty */}
      {products.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm font-medium text-[#0A0A0A]">
              {q ? "Sin resultados para los filtros aplicados." : "Sin productos sincronizados."}
            </p>
            {!q && isOwner && (
              <p className="mt-1 text-xs text-[#6B7280]">Usa «Sincronizar» para importar los productos de Holded.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {products.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  {[
                    "Nombre", "SKU", "Tipo", "Precio IVA incl.", "IVA", "Stock",
                    "Delegado", "Recomendador", "Afiliado", "Com. 4", "Com. 5", ""
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-4 py-3 font-medium text-[#0A0A0A] max-w-[200px]">
                      <Link href={`/dashboard/productos/${p.id}`} className="hover:text-[#8E0E1A] transition-colors truncate block">
                        {p.name}
                      </Link>
                      {p.description && (
                        <p className="text-xs text-[#9CA3AF] truncate">{p.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#6B7280] whitespace-nowrap">
                      {p.sku || <span className="text-[#D1D5DB]">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {p.kind ? (
                        <Badge variant="neutral">{kindLabel[p.kind] ?? p.kind}</Badge>
                      ) : <span className="text-[#D1D5DB] text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 tabular-nums whitespace-nowrap font-semibold text-[#0A0A0A]">
                      {fmtCurrency(p.total)}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#6B7280] whitespace-nowrap">
                      {taxLabel(p.taxes)}
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums whitespace-nowrap">
                      {p.has_stock
                        ? <span className={Number(p.stock) > 0 ? "text-emerald-600 font-medium" : "text-[#8E0E1A] font-medium"}>{p.stock}</span>
                        : <span className="text-[#D1D5DB]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">{fmtRate(p.commission_delegate)}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">{fmtRate(p.commission_recommender)}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">{fmtRate(p.commission_affiliate)}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">{fmtRate(p.commission_4)}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">{fmtRate(p.commission_5)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link href={`/dashboard/productos/${p.id}`} className="text-xs font-medium text-[#6B7280] hover:text-[#8E0E1A] transition-colors">
                        {isOwner ? "Editar →" : "Ver →"}
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
