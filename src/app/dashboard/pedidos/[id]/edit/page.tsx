import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";
import { PEDIDOS_ALLOWED_SKUS } from "@/lib/skus";
import { EditOrderForm } from "./EditOrderForm";

function extractTaxIds(taxes: unknown): string[] {
  if (!Array.isArray(taxes)) return [];
  return taxes.map(t => {
    if (typeof t === "string") return t;
    if (t && typeof t === "object" && "id" in t) return String((t as { id: unknown }).id);
    return "";
  }).filter(Boolean);
}

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const admin = createAdminClient();

  const { data: order } = await admin
    .from("holded_salesorders")
    .select("id, doc_number, contact_id, contact_name, date, status, raw")
    .eq("id", id)
    .maybeSingle();

  if (!order || order.status !== 0) redirect("/dashboard/pedidos");

  if (profile.role !== "OWNER") {
    const { data: link } = await admin
      .from("contact_delegates")
      .select("delegate_id")
      .eq("contact_id", order.contact_id)
      .eq("delegate_id", profile.id)
      .maybeSingle();
    if (!link) redirect("/dashboard/pedidos");
  }

  const { data: productsData } = await admin
    .from("holded_products")
    .select("id, name, sku, price, taxes, price_pvp")
    .in("sku", PEDIDOS_ALLOWED_SKUS)
    .order("name");

  const products = (productsData ?? []) as {
    id: string; name: string; sku: string | null;
    price: number | null; taxes: string[]; price_pvp: number | null;
  }[];

  const rawOrder = (order.raw ?? {}) as Record<string, unknown>;
  const dateUnix = typeof rawOrder.date === "number" ? rawOrder.date : Math.floor(new Date(order.date as string).getTime() / 1000);
  const notes = typeof rawOrder.notes === "string" ? rawOrder.notes : "";

  const rawProducts = Array.isArray(rawOrder.products) ? rawOrder.products as Record<string, unknown>[] : [];

  const initialLines = rawProducts.map((rp, i) => {
    const productId = (rp.productId ?? rp.id ?? "") as string;
    const name      = (rp.name ?? "") as string;
    const units     = Number(rp.units ?? rp.qty ?? 1);
    const price     = Number(rp.price ?? rp.unitPrice ?? 0);
    const discount  = Number(rp.discount ?? 0);
    const taxes     = extractTaxIds(rp.taxes);
    return { key: i, productId, name, units, price, discount, taxes };
  }).filter(l => l.productId);

  const RECARGO_CODES = new Set(["s_rec_52", "s_rec_14", "s_rec_05"]);
  const initialRecargo = initialLines.some(l => l.taxes.some(t => RECARGO_CODES.has(t)));

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <div>
        <Link href="/dashboard/pedidos" className="inline-flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#8E0E1A] transition-colors mb-4">
          ← Volver a pedidos
        </Link>
        <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Editar pedido</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          <span className="font-medium text-[#374151]">{order.contact_name}</span>
          {order.doc_number && (
            <span className="ml-2 text-[#9CA3AF]">· {order.doc_number}</span>
          )}
          <span className="ml-2 px-1.5 py-0.5 rounded-full bg-[#F3F4F6] text-[10px] font-semibold text-[#6B7280] uppercase tracking-wide">Borrador</span>
        </p>
      </div>

      <EditOrderForm
        orderId={id}
        contactId={order.contact_id as string}
        contactName={order.contact_name as string}
        dateUnix={dateUnix}
        notes={notes}
        initialLines={initialLines}
        initialRecargo={initialRecargo}
        products={products}
      />
    </div>
  );
}
