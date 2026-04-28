import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { getProfile } from "@/lib/profile";
import { CommissionForm } from "./CommissionForm";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DbProduct {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  factory_code: string | null;
  kind: string | null;
  price: number | null;
  total: number | null;
  cost: number | null;
  purchase_price: number | null;
  taxes: string[];
  stock: number | null;
  has_stock: boolean;
  tags: string[];
  last_synced_at: string;
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

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function taxLabel(codes: string[]): string {
  if (!codes.length) return "—";
  const pcts = codes.map((c) => {
    const m = c.match(/(\d+)$/);
    return m ? `${m[1]}%` : c;
  });
  return pcts.join(" + ");
}

const kindLabel: Record<string, string> = {
  lots:          "Lotes",
  serialnumbers: "N.º serie",
  product:       "Producto",
  service:       "Servicio",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductoDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [supabase, profile] = await Promise.all([createClient(), getProfile()]);
  const isOwner = profile?.role === "OWNER";

  const { data } = await supabase
    .from("holded_products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();

  const product = data as DbProduct;

  const infoRows = [
    { label: "SKU",            value: product.sku },
    { label: "Código fábrica", value: product.factory_code },
    { label: "Código de barras", value: product.barcode },
    { label: "Tipo",           value: product.kind ? (kindLabel[product.kind] ?? product.kind) : null },
    { label: "Precio base",    value: fmtCurrency(product.price) },
    { label: "Precio c/ IVA", value: fmtCurrency(product.total) },
    { label: "Coste",          value: fmtCurrency(product.cost) },
    { label: "P. compra",      value: fmtCurrency(product.purchase_price) },
    { label: "IVA",            value: taxLabel(product.taxes ?? []) },
    { label: "Stock",          value: product.has_stock ? String(product.stock ?? 0) : "Sin gestión de stock" },
    { label: "Sync",           value: fmtDate(product.last_synced_at) },
  ];

  return (
    <div className="max-w-screen-lg mx-auto px-6 py-8 space-y-6">

      {/* Back + header */}
      <div>
        <Link
          href="/dashboard/productos"
          className="inline-flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#8E0E1A] transition-colors mb-4"
        >
          ← Volver a productos
        </Link>
        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight truncate">{product.name}</h1>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              {product.kind && (
                <Badge variant="default">{kindLabel[product.kind] ?? product.kind}</Badge>
              )}
              {product.sku && (
                <code className="text-xs font-mono text-[#6B7280]">{product.sku}</code>
              )}
              {product.tags?.map((t) => (
                <Badge key={t} variant="neutral">{t}</Badge>
              ))}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xl font-bold text-[#0A0A0A] tabular-nums">{fmtCurrency(product.total)}</p>
            <p className="text-xs text-[#9CA3AF]">IVA {taxLabel(product.taxes ?? [])} incl.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Product data */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle>Datos del producto</CardTitle></CardHeader>
            <CardContent className="p-0">
              {product.description && (
                <p className="px-5 py-3 text-sm text-[#374151] border-b border-[#F3F4F6]">
                  {product.description}
                </p>
              )}
              <dl className="divide-y divide-[#F3F4F6]">
                {infoRows.map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between px-5 py-2.5">
                    <dt className="text-xs text-[#6B7280] shrink-0">{label}</dt>
                    <dd className="text-xs font-semibold text-[#0A0A0A] text-right tabular-nums">
                      {value || <span className="text-[#D1D5DB] font-normal">—</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Commission form */}
        <Card>
          <CardHeader>
            <CardTitle>Comisiones</CardTitle>
            {isOwner && <span className="text-xs text-[#9CA3AF]">% sobre precio de venta</span>}
          </CardHeader>
          <CardContent>
            {isOwner ? (
              <CommissionForm
                productId={product.id}
                commissions={{
                  commission_delegate:    product.commission_delegate,
                  commission_recommender: product.commission_recommender,
                  commission_affiliate:   product.commission_affiliate,
                  commission_4:           product.commission_4,
                  commission_5:           product.commission_5,
                }}
              />
            ) : (
              <dl className="space-y-3">
                {[
                  { label: "Delegado",     value: product.commission_delegate },
                  { label: "Recomendador", value: product.commission_recommender },
                  { label: "Afiliado",     value: product.commission_affiliate },
                  { label: "Com. 4",       value: product.commission_4 },
                  { label: "Com. 5",       value: product.commission_5 },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <dt className="text-xs text-[#6B7280]">{label}</dt>
                    <dd className="text-xs font-semibold text-[#0A0A0A] tabular-nums">
                      {value != null ? `${value}%` : <span className="text-[#D1D5DB] font-normal">—</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
