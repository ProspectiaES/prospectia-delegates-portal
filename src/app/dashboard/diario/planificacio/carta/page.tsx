import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { getPlanificacio } from "@/app/actions/diario-planificacio";
import { DEFAULT_CARTA } from "@/lib/diario-constants";
import { PlanHeader } from "../_PlanHeader";
import { CartaForm } from "./CartaForm";

export default async function CartaPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const data = await getPlanificacio("carta", 2026);

  return (
    <div>
      <PlanHeader emoji="✉️" title="Carta al jo 2026" subtitle="Un pont entre el que has après i el que vols consolidar" />
      <div className="max-w-2xl mx-auto px-4 py-5">
        <CartaForm initial={(data as typeof DEFAULT_CARTA) ?? DEFAULT_CARTA} />
      </div>
    </div>
  );
}
