import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import PriceCalculatorClient from "./PriceCalculatorClient";

export const metadata = { title: "Cálculo Precios — Prospectia" };

export default async function PreusPage() {
  const profile = await getProfile();
  // Only OWNER — not CONSIGLIERE
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const admin = createAdminClient();

  const [configRes, landingRes, productsRes, productPricesRes] = await Promise.all([
    admin.from("price_config").select("*").eq("id", 1).maybeSingle(),
    admin.from("price_landing_costs").select("*").order("sort_order"),
    admin.from("holded_products")
      .select("id, name, sku, price, cost, purchase_price")
      .gt("price", 0)
      .order("name"),
    admin.from("product_prices").select("*"),
  ]);

  const config = configRes.data ?? {
    id: 1, margen_tienda_pct: 35, margen_distribuidor_pct: 20,
    iva_pct: 21, units_per_lot: 2300,
  };

  const landingCosts = (landingRes.data ?? []) as {
    id: number; concept: string; amount: number;
    is_per_unit: boolean; sort_order: number; notes: string | null;
  }[];

  const products = (productsRes.data ?? []) as {
    id: string; name: string; sku: string | null;
    price: number | null; cost: number | null; purchase_price: number | null;
  }[];

  // Build product price overrides map
  type PriceRow = { product_id: string; pvp_sin_iva: number | null; purchase_cost_override: number | null };
  const priceMap = new Map<string, PriceRow>();
  for (const p of (productPricesRes.data ?? []) as PriceRow[]) {
    priceMap.set(p.product_id, p);
  }

  return (
    <PriceCalculatorClient
      initialConfig={config}
      initialLandingCosts={landingCosts}
      products={products}
      priceMap={Object.fromEntries(priceMap)}
    />
  );
}
