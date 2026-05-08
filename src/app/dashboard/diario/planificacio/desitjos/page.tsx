import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { getPlanificacio } from "@/app/actions/diario-planificacio";
import { DEFAULT_DESITJOS } from "@/lib/diario-constants";
import { PlanHeader } from "../_PlanHeader";
import { DesitjosForm } from "./DesitjosForm";

export default async function DesitjosPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const data = await getPlanificacio("desitjos", 2026);

  return (
    <div>
      <PlanHeader emoji="✨" title="Desitjos" subtitle="El que vols crear i viure · 2026" />
      <div className="max-w-2xl mx-auto px-4 py-5">
        <DesitjosForm initial={(data as typeof DEFAULT_DESITJOS) ?? DEFAULT_DESITJOS} />
      </div>
    </div>
  );
}
