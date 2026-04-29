import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentMethods } from "@/lib/holded/api";
import { NewOrderForm } from "./NewOrderForm";

export default async function NuevoPedidoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();

  const [{ data: contactsData }, { data: productsData }, { data: profileData }, paymentMethods] =
    await Promise.all([
      admin.from("holded_contacts").select("id, name").order("name"),
      admin.from("holded_products").select("id, name, sku, price, total, taxes, price_pvp, price_pvd, price_pvl").order("name"),
      user ? admin.from("profiles").select("role").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
      getPaymentMethods(),
    ]);

  const contacts = (contactsData ?? []) as { id: string; name: string }[];
  const products = (productsData ?? []) as {
    id: string; name: string; sku: string | null;
    price: number | null; total: number | null; taxes: string[];
    price_pvp: number | null; price_pvd: number | null; price_pvl: number | null;
  }[];
  const userRole = (profileData as { role?: string } | null)?.role ?? "DELEGATE";

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <div>
        <Link href="/dashboard/pedidos" className="inline-flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#8E0E1A] transition-colors mb-4">
          ← Volver a pedidos
        </Link>
        <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Nuevo pedido</h1>
        <p className="mt-1 text-sm text-[#6B7280]">El pedido se creará directamente en Holded.</p>
      </div>

      <NewOrderForm
        paymentMethods={paymentMethods}
        contacts={contacts}
        products={products}
        userRole={userRole}
      />
    </div>
  );
}
