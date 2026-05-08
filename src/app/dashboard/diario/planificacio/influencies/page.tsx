import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { getPlanificacio } from "@/app/actions/diario-planificacio";
import { DEFAULT_INFLUENCIES } from "@/lib/diario-constants";
import { PlanHeader } from "../_PlanHeader";
import { InfluenciesForm } from "./InfluenciesForm";

export default async function InfluenciesPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const data = await getPlanificacio("influencies", 2026);

  return (
    <div>
      <PlanHeader emoji="👥" title="Influències" subtitle="Referents, inspiradors, cercle proper i distàncies necessàries" />
      <div className="max-w-3xl mx-auto px-4 py-5">
        <InfluenciesForm initial={(data as typeof DEFAULT_INFLUENCIES) ?? DEFAULT_INFLUENCIES} />
      </div>
    </div>
  );
}
