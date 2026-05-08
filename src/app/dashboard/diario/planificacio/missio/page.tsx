import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { getPlanificacio } from "@/app/actions/diario-planificacio";
import { DEFAULT_MISSIO } from "@/lib/diario-constants";
import { PlanHeader } from "../_PlanHeader";
import { MissioForm } from "./MissioForm";

export default async function MissioPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const data = await getPlanificacio("missio", 2026);

  return (
    <div>
      <PlanHeader emoji="🧭" title="Missió Personal" subtitle="El teu propòsit vital i professional · 2026" />
      <div className="max-w-2xl mx-auto px-4 py-5">
        <MissioForm initial={(data as typeof DEFAULT_MISSIO) ?? DEFAULT_MISSIO} />
      </div>
    </div>
  );
}
