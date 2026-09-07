import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductes } from "@/app/actions/bruixola";
import { getProjecteNegoci, getOportunitats, getOrganitzacions, getTasquesProjecte, getPipelines, getStages } from "@/app/actions/bruixola-negoci";
import { Badge } from "@/components/ui/Badge";
import { ProjecteDetailClient } from "./ProjecteDetailClient";

const ESTAT_LABEL: Record<string, string> = { actiu: "Actiu", pausat: "Pausat", aturat: "Aturat", completat: "Completat" };
const ESTAT_VARIANT: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  actiu: "success", pausat: "warning", aturat: "danger", completat: "neutral",
};

export default async function ProjecteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const projecte = await getProjecteNegoci(id);
  if (!projecte) notFound();

  const [productes, oportunitats, organitzacions, tasques, pipelines, stages] = await Promise.all([
    getProductes(),
    getOportunitats(),
    getOrganitzacions(),
    getTasquesProjecte(id),
    getPipelines(),
    getStages(),
  ]);

  const producte = productes.find(p => p.id === projecte.producte_id);
  const oportunitatsProjecte = oportunitats.filter(o => o.projecte_id === id);

  return (
    <div className="max-w-screen-lg mx-auto px-6 py-8 space-y-6">
      <div>
        {producte && (
          <Link href={`/dashboard/bruixola/productes/${producte.id}`} className="text-xs text-[#9CA3AF] hover:text-[#8E0E1A] transition-colors">
            ← {producte.nom}
          </Link>
        )}
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">{projecte.nom || `${producte?.nom ?? ""} — ${projecte.mercat}`}</h1>
          <Badge variant={ESTAT_VARIANT[projecte.estat]}>{ESTAT_LABEL[projecte.estat]}</Badge>
        </div>
        <p className="mt-1 text-sm text-[#6B7280]">{projecte.mercat}</p>
        {projecte.notes && <p className="mt-1 text-sm text-[#6B7280]">{projecte.notes}</p>}
      </div>

      <ProjecteDetailClient
        projecteId={id}
        empresaId={producte?.empresa_id ?? null}
        oportunitats={oportunitatsProjecte}
        organitzacions={organitzacions}
        tasques={tasques}
        pipelines={pipelines}
        stages={stages}
      />
    </div>
  );
}
