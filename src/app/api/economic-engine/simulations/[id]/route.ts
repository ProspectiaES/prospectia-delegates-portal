import { getProfile } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculate } from "@/lib/economic-engine/calculator";
import type { EconomicSimulation } from "@/lib/economic-engine/types";

export const runtime = "nodejs";

async function requireOwner() {
  const profile = await getProfile();
  return profile?.role === "OWNER" ? profile : null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await requireOwner();
  if (!profile) return Response.json({ error: "No autoritzat" }, { status: 401 });

  const { id } = await params;
  const admin   = createAdminClient();

  const [simRes, costRes, commRes, promoRes] = await Promise.all([
    admin.from("economic_simulations").select("*").eq("id", id).maybeSingle(),
    admin.from("simulation_cost_lines").select("*").eq("simulation_id", id).order("sort_order"),
    admin.from("simulation_commission_layers").select("*").eq("simulation_id", id).order("layer_order"),
    admin.from("simulation_promotions").select("*").eq("simulation_id", id),
  ]);

  if (!simRes.data) return Response.json({ error: "No trobat" }, { status: 404 });

  const sim: EconomicSimulation = {
    ...simRes.data,
    cost_lines:        costRes.data ?? [],
    commission_layers: commRes.data ?? [],
    promotions:        promoRes.data ?? [],
  };

  const result = calculate(sim);
  return Response.json({ simulation: sim, result });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await requireOwner();
  if (!profile) return Response.json({ error: "No autoritzat" }, { status: 401 });

  const { id } = await params;
  const admin   = createAdminClient();
  const body    = await req.json() as Record<string, unknown>;
  const { cost_lines, commission_layers, promotions, ...simData } = body as {
    cost_lines?: unknown[]; commission_layers?: unknown[]; promotions?: unknown[];
    [k: string]: unknown;
  };

  const { data, error } = await admin
    .from("economic_simulations")
    .update({ ...simData, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 422 });

  // Replace related rows if provided
  if (cost_lines !== undefined) {
    await admin.from("simulation_cost_lines").delete().eq("simulation_id", id);
    if (cost_lines.length) await admin.from("simulation_cost_lines").insert((cost_lines as Record<string,unknown>[]).map(l => ({ ...l, id: undefined, simulation_id: id })));
  }
  if (commission_layers !== undefined) {
    await admin.from("simulation_commission_layers").delete().eq("simulation_id", id);
    if (commission_layers.length) await admin.from("simulation_commission_layers").insert((commission_layers as Record<string,unknown>[]).map(l => ({ ...l, id: undefined, simulation_id: id })));
  }
  if (promotions !== undefined) {
    await admin.from("simulation_promotions").delete().eq("simulation_id", id);
    if (promotions.length) await admin.from("simulation_promotions").insert((promotions as Record<string,unknown>[]).map(p => ({ ...p, id: undefined, simulation_id: id })));
  }

  // Snapshot
  const simFull = { ...data, cost_lines, commission_layers, promotions } as unknown as EconomicSimulation;
  const snap = calculate(simFull);
  await admin.from("simulation_snapshots").insert({ simulation_id: id, snapshot_data: snap, created_by: profile.id });

  return Response.json(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await requireOwner();
  if (!profile) return Response.json({ error: "No autoritzat" }, { status: 401 });

  const { id } = await params;
  const admin   = createAdminClient();
  await admin.from("economic_simulations").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", id);
  return Response.json({ ok: true });
}
