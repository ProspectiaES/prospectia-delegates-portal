import { redirect, notFound } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import ProductPricingClient from "./ProductPricingClient";

export default async function ProductPricingPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const { id } = await params;
  const admin   = createAdminClient();

  const [productRes, configRes, landingRes, priceRowRes] = await Promise.all([
    admin.from("holded_products").select("id, name, sku, price, cost, purchase_price, taxes, raw").eq("id", id).maybeSingle(),
    admin.from("price_config").select("*").eq("id", 1).maybeSingle(),
    admin.from("price_landing_costs").select("*").order("sort_order"),
    admin.from("product_prices").select("*").eq("product_id", id).maybeSingle(),
  ]);

  if (!productRes.data) notFound();

  const productRaw = productRes.data as {
    id: string; name: string; sku: string | null;
    price: number | null; cost: number | null; purchase_price: number | null;
    taxes: string[] | null; raw: Record<string, unknown> | null;
  };

  // Detect IVA from product taxes (e.g. "s_iva_10" → 10, "s_iva_21" → 21)
  function parseIvaPct(taxes: string[] | null): number {
    if (!taxes) return config.iva_pct;
    for (const t of taxes) {
      const m = t.match(/iva[_-]?(\d+)/i);
      if (m) return parseInt(m[1]);
    }
    return config.iva_pct;
  }
  const productIvaPct = parseIvaPct(productRaw.taxes);

  const product = {
    id: productRaw.id, name: productRaw.name, sku: productRaw.sku,
    price: productRaw.price, cost: productRaw.cost, purchase_price: productRaw.purchase_price,
  };

  const config = configRes.data ?? {
    id: 1, margen_tienda_pct: 35, margen_distribuidor_pct: 20, iva_pct: 21, units_per_lot: 2300,
  };

  const landingCosts = (landingRes.data ?? []) as {
    id: number; concept: string; amount: number; is_per_unit: boolean; sort_order: number;
  }[];

  // Compute global landing cost
  const lotTotal    = landingCosts.filter(l => !l.is_per_unit).reduce((s, l) => s + l.amount, 0);
  const perUnitDir  = landingCosts.filter(l => l.is_per_unit).reduce((s, l) => s + l.amount, 0);
  const globalLanding = config.units_per_lot > 0 ? lotTotal / config.units_per_lot + perUnitDir : perUnitDir;

  const savedRow = priceRowRes.data as {
    pvp_sin_iva: number | null;
    purchase_cost_override: number | null;
    landing_cost_override: number | null;
    commission_layers_json: unknown | null;
  } | null;

  return (
    <ProductPricingClient
      product={product}
      config={config}
      productIvaPct={productIvaPct}
      globalLanding={globalLanding}
      savedRow={savedRow}
    />
  );
}
