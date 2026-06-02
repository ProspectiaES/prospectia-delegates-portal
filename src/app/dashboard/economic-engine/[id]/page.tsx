import { redirect, notFound } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculate } from "@/lib/economic-engine/calculator";
import type { EconomicSimulation } from "@/lib/economic-engine/types";
import SimulationEditor from "./SimulationEditor";

export default async function SimulationPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const { id } = await params;
  const admin   = createAdminClient();

  // "new" → render blank editor
  if (id === "new") {
    const blank: EconomicSimulation = {
      name: "Nova simulació", project_type: "national", status: "draft",
      net_sale_price: null, currency: "EUR", estructura_pct: 12, logistics_pct: 5,
      is_performance_reference: false, cost_lines: [], commission_layers: [], promotions: [],
    };
    return <SimulationEditor simulation={blank} initialResult={null} isNew />;
  }

  const [simRes, costRes, commRes, promoRes] = await Promise.all([
    admin.from("economic_simulations").select("*").eq("id", id).maybeSingle(),
    admin.from("simulation_cost_lines").select("*").eq("simulation_id", id).order("sort_order"),
    admin.from("simulation_commission_layers").select("*").eq("simulation_id", id).order("layer_order"),
    admin.from("simulation_promotions").select("*").eq("simulation_id", id),
  ]);

  if (!simRes.data) notFound();

  const sim: EconomicSimulation = {
    ...simRes.data,
    cost_lines:        costRes.data ?? [],
    commission_layers: commRes.data ?? [],
    promotions:        promoRes.data ?? [],
  };

  const initialResult = calculate(sim);

  return <SimulationEditor simulation={sim} initialResult={initialResult} />;
}
