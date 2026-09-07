import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getOportunitat, getOrganitzacions, getPipelines, getStages, getPersones,
  getStageHistory, getTasquesOportunitat, getActivitats, getComentaris,
} from "@/app/actions/bruixola-negoci";
import { OportunitatDetailClient } from "./OportunitatDetailClient";
import { TimelineSection } from "../../TimelineSection";

export default async function OportunitatDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const oportunitat = await getOportunitat(id);
  if (!oportunitat) notFound();

  const [organitzacions, pipelines, stages, persones, stageHistory, tasques, activitats, comentaris] = await Promise.all([
    getOrganitzacions(),
    getPipelines(),
    getStages(),
    getPersones(oportunitat.organitzacio_id),
    getStageHistory(id),
    getTasquesOportunitat(id),
    getActivitats("oportunitat", id),
    getComentaris("oportunitat", id),
  ]);

  const org = organitzacions.find(o => o.id === oportunitat.organitzacio_id);

  return (
    <div className="max-w-screen-lg mx-auto px-6 py-8 space-y-6">
      <div>
        {org && (
          <Link href={`/dashboard/bruixola/organitzacions/${org.id}`} className="text-xs text-[#9CA3AF] hover:text-[#8E0E1A] transition-colors">
            ← {org.nom}
          </Link>
        )}
        <h1 className="mt-2 text-2xl font-bold text-[#0A0A0A] tracking-tight">{oportunitat.nom}</h1>
      </div>

      <OportunitatDetailClient
        oportunitat={oportunitat}
        pipelines={pipelines}
        stages={stages}
        persones={persones}
        stageHistory={stageHistory}
        tasques={tasques}
      />

      <TimelineSection entityType="oportunitat" entityId={id} activitats={activitats} comentaris={comentaris} />
    </div>
  );
}
