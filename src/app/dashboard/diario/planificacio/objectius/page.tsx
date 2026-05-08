import { redirect } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { getPlanificacio } from "@/app/actions/diario-planificacio";
import { DEFAULT_OBJECTIUS_VITALS, DEFAULT_OBJECTIUS_TRIMESTRALS } from "@/lib/diario-constants";
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
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
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
        <h1 className="text-xl font-bold text-[#0A0A0A] tracking-tight">Objectius Vitals i Trimestrals</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">Horitzons 2026–2040 i objectius per trimestre</p>
      </div>

      <ObjectiusForm initial={initial} />
    </div>
  );
}
