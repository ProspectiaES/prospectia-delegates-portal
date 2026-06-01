import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentMethods } from "@/lib/holded/api";
import { PEDIDOS_ALLOWED_SKUS } from "@/lib/skus";
import { NewOrderForm } from "./NewOrderForm";

export default async function NuevoPedidoPage({ searchParams }: { searchParams: Promise<{ contact?: string }> }) {
  const { contact: defaultContactId } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();

  const [{ data: productsData }, { data: profileData }, paymentMethods] =
    await Promise.all([
      admin.from("holded_products").select("id, name, sku, price, total, taxes, price_pvp, price_pvd, price_pvl").in("sku", PEDIDOS_ALLOWED_SKUS).order("name"),
      user ? admin.from("profiles").select("id, role").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
      getPaymentMethods(),
    ]);

  const userRole = (profileData as { id?: string; role?: string } | null)?.role ?? "DELEGATE";
  const canAssign = ["OWNER", "ADMIN", "KOL", "COORDINATOR", "CONSIGLIERE"].includes(userRole);

  // All contacts visible on this page — delegates get auto-assigned on order creation
  const { data: contactsRaw } = await admin
    .from("holded_contacts")
    .select("id, name")
    .order("name");
  const contactsData = (contactsRaw ?? []) as { id: string; name: string }[];

  const contacts = contactsData;
  const products = (productsData ?? []) as {
    id: string; name: string; sku: string | null;
    price: number | null; total: number | null; taxes: string[];
    price_pvp: number | null; price_pvd: number | null; price_pvl: number | null;
  }[];

  // Delegate/KOL/coordinator options — only fetched for privileged users
  let delegateOptions: { id: string; name: string }[] = [];
  let kolOptions:      { id: string; name: string }[] = [];
  let coordinatorOptions: { id: string; name: string }[] = [];

  if (canAssign) {
    const { data: profilesForAssign } = await admin
      .from("profiles")
      .select("id, full_name, delegate_name, role, is_kol, is_coordinator")
      .in("role", ["DELEGATE", "KOL", "COORDINATOR", "ADMIN", "CONSIGLIERE", "COM6"])
      .order("full_name");

    const pfa = (profilesForAssign ?? []) as {
      id: string; full_name: string; delegate_name: string | null;
      role: string; is_kol: boolean | null; is_coordinator: boolean | null;
    }[];

    delegateOptions    = pfa.map(p => ({ id: p.id, name: p.delegate_name ?? p.full_name }));
    kolOptions         = pfa.filter(p => p.is_kol || p.role === "KOL").map(p => ({ id: p.id, name: p.delegate_name ?? p.full_name }));
    coordinatorOptions = pfa.filter(p => p.is_coordinator || p.role === "COORDINATOR").map(p => ({ id: p.id, name: p.delegate_name ?? p.full_name }));
  }

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
        defaultContactId={defaultContactId}
        canAssign={canAssign}
        delegateOptions={delegateOptions}
        kolOptions={kolOptions}
        coordinatorOptions={coordinatorOptions}
      />
    </div>
  );
}
