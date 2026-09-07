import Link from "next/link";
import { getOrganitzacions, getOportunitats, getPipelines, getStages } from "@/app/actions/bruixola-negoci";
import { getEmpreses } from "@/app/actions/bruixola";
import { ProspeccioClient } from "./ProspeccioClient";

export default async function ProspeccioPage() {
  const [organitzacions, oportunitats, empreses, pipelines, stages] = await Promise.all([
    getOrganitzacions(),
    getOportunitats(),
    getEmpreses(),
    getPipelines(),
    getStages(),
  ]);

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/bruixola/empreses" className="text-xs text-[#9CA3AF] hover:text-[#8E0E1A] transition-colors">
            ← Les meves empreses
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-[#0A0A0A] tracking-tight">Pipeline de prospecció</h1>
          <p className="mt-1 text-sm text-[#6B7280]">Organitzacions externes i oportunitats en curs — visible només per a tu.</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/dashboard/bruixola/pipelines" className="text-[#8E0E1A] hover:underline">Pipelines →</Link>
          <Link href="/dashboard/bruixola/calendari" className="text-[#8E0E1A] hover:underline">Agenda →</Link>
        </div>
      </div>

      <ProspeccioClient
        organitzacions={organitzacions}
        oportunitats={oportunitats}
        empreses={empreses.map(e => ({ id: e.id, nom: e.nom }))}
        pipelines={pipelines}
        stages={stages}
      />
    </div>
  );
}
