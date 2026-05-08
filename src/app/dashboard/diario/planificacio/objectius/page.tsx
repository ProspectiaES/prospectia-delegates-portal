import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { getPlanificacio } from "@/app/actions/diario-planificacio";
import { DEFAULT_OBJECTIUS_VITALS, DEFAULT_OBJECTIUS_TRIMESTRALS } from "@/lib/diario-constants";
import { PlanHeader } from "../_PlanHeader";
import { ObjectiusForm } from "./ObjectiusForm";

export interface ObjectiusData {
  vitals: typeof DEFAULT_OBJECTIUS_VITALS;
  trimestrals: typeof DEFAULT_OBJECTIUS_TRIMESTRALS;
}

export default async function ObjectiusPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const data = await getPlanificacio("objectius", 2026) as ObjectiusData | null;

  const initial: ObjectiusData = {
    vitals: data?.vitals ?? DEFAULT_OBJECTIUS_VITALS,
    trimestrals: data?.trimestrals ?? DEFAULT_OBJECTIUS_TRIMESTRALS,
  };

  return (
    <div>
      <PlanHeader emoji="📈" title="Objectius Vitals" subtitle="Horitzons 2026–2040 i objectius per trimestre" />
      <div className="max-w-4xl mx-auto px-4 py-5">
        <ObjectiusForm initial={initial} />
      </div>
    </div>
  );
}
