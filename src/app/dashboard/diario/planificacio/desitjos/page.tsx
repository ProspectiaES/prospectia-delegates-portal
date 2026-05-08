import { redirect } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { getPlanificacio } from "@/app/actions/diario-planificacio";
import { DEFAULT_DESITJOS } from "@/lib/diario-constants";
import { DesitjosForm } from "./DesitjosForm";

export default async function DesitjosPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const data = await getPlanificacio("desitjos", 2026);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <Link
        href="/dashboard/diario/planificacio"
        className="inline-flex items-center gap-2 text-sm text-[#6B7280] hover:text-[#0A0A0A] transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M9 2L4 7l5 5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Planificació
      </Link>

      <div>
        <h1 className="text-xl font-bold text-[#0A0A0A] tracking-tight">Desitjos</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">El que vols crear i viure · 2026</p>
      </div>

      <DesitjosForm initial={(data as typeof DEFAULT_DESITJOS) ?? DEFAULT_DESITJOS} />
    </div>
  );
}
