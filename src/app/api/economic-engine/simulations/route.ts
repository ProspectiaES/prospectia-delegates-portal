import { getProfile } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") return Response.json({ error: "No autoritzat" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("economic_simulations")
    .select("id, name, project_type, status, net_sale_price, currency, estructura_pct, logistics_pct, is_performance_reference, notes, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

export async function POST(req: Request) {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") return Response.json({ error: "No autoritzat" }, { status: 401 });

  const admin = createAdminClient();
  const body  = await req.json() as Record<string, unknown>;
  const { cost_lines, commission_layers, promotions, ...simData } = body as {
    cost_lines?: unknown[]; commission_layers?: unknown[]; promotions?: unknown[];
    [k: string]: unknown;
  };

  const { data: sim, error } = await admin
    .from("economic_simulations")
    .insert({ ...simData, created_by: profile.id })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 422 });

  if (cost_lines?.length)        await admin.from("simulation_cost_lines").insert((cost_lines as Record<string,unknown>[]).map(l => ({ ...l, simulation_id: sim.id })));
  if (commission_layers?.length) await admin.from("simulation_commission_layers").insert((commission_layers as Record<string,unknown>[]).map(l => ({ ...l, simulation_id: sim.id })));
  if (promotions?.length)        await admin.from("simulation_promotions").insert((promotions as Record<string,unknown>[]).map(p => ({ ...p, simulation_id: sim.id })));

  return Response.json(sim, { status: 201 });
}
