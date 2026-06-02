/**
 * POST /api/economic-engine/calculate
 * Calcul en temps real sense persistència — per a "what-if" al client.
 */
import { calculate } from "@/lib/economic-engine/calculator";
import type { EconomicSimulation } from "@/lib/economic-engine/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const sim = await req.json() as EconomicSimulation;
    const result = calculate(sim);
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
