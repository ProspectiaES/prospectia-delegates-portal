import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { getPlanificacio } from "@/app/actions/diario-planificacio";
import { DEFAULT_PRIORITATS } from "@/lib/diario-constants";
import { PlanHeader } from "../_PlanHeader";
import { PrioritatsForm } from "./PrioritatsForm";

export default async function PrioritatsPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const data = await getPlanificacio("prioritats", 2026);

  return (
    <div>
      <PlanHeader emoji="🎯" title="Prioritats 2026" subtitle="Top 5, valors en pràctica i allò a eliminar" />
      <div className="max-w-2xl mx-auto px-4 py-5">
        <PrioritatsForm initial={(data as typeof DEFAULT_PRIORITATS) ?? DEFAULT_PRIORITATS} />
      </div>
    </div>
  );
}
