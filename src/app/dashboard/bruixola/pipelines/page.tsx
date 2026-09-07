import Link from "next/link";
import { getPipelines, getStages, type Stage } from "@/app/actions/bruixola-negoci";
import { PipelinesClient } from "./PipelinesClient";

export default async function PipelinesPage() {
  const [pipelines, allStages] = await Promise.all([getPipelines(), getStages()]);

  const stagesByPipeline: Record<string, Stage[]> = {};
  for (const s of allStages) {
    (stagesByPipeline[s.pipeline_id] ??= []).push(s);
  }

  return (
    <div className="max-w-screen-lg mx-auto px-6 py-8 space-y-6">
      <Link href="/dashboard/bruixola/prospeccio" className="text-xs text-[#9CA3AF] hover:text-[#8E0E1A] transition-colors">
        ← Pipeline de prospecció
      </Link>
      <PipelinesClient pipelines={pipelines} stagesByPipeline={stagesByPipeline} />
    </div>
  );
}
