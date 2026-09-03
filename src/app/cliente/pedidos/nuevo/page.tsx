import { redirect } from "next/navigation";
import { getClientContact } from "@/lib/clientSession";
import { createAdminClient } from "@/lib/supabase/admin";
import { PEDIDOS_ALLOWED_SKUS } from "@/lib/skus";
import { ClientOrderForm } from "./ClientOrderForm";

export default async function ClientePedidoNuevoPage() {
  const contact = await getClientContact();
  if (!contact) redirect("/login");

  const admin = createAdminClient();
  const { data: productsData } = await admin
    .from("holded_products")
    .select("id, name, sku, price, price_pvp, taxes")
    .in("sku", PEDIDOS_ALLOWED_SKUS)
    .order("name");

  const products = (productsData ?? []) as {
    id: string; name: string; sku: string | null;
    price: number | null; price_pvp: number | null; taxes: string[];
  }[];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <a href="/cliente/pedidos" className="text-xs text-[#9CA3AF] hover:text-[#8E0E1A] transition-colors">
          ← Volver a mis pedidos
        </a>
        <h1 className="mt-2 text-2xl font-bold text-[#0A0A0A] tracking-tight">Nuevo pedido</h1>
      </div>
      <ClientOrderForm products={products} />
    </div>
  );
}
