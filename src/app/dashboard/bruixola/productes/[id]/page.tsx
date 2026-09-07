import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductes, getEmpreses } from "@/app/actions/bruixola";
import { getProjectesNegoci } from "@/app/actions/bruixola-negoci";
import { ProjectesSection } from "./ProjectesSection";

export default async function ProducteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [productes, empreses, projectesNegoci] = await Promise.all([
    getProductes(),
    getEmpreses(),
    getProjectesNegoci(),
  ]);

  const producte = productes.find(p => p.id === id);
  if (!producte) notFound();

  const empresa = empreses.find(e => e.id === producte.empresa_id);
  const projectesProducte = projectesNegoci.filter(p => p.producte_id === id);

  return (
    <div className="max-w-screen-lg mx-auto px-6 py-8 space-y-6">
      <div>
        {empresa && (
          <Link href={`/dashboard/bruixola/empreses/${empresa.id}`} className="text-xs text-[#9CA3AF] hover:text-[#8E0E1A] transition-colors">
            ← {empresa.nom}
          </Link>
        )}
        <h1 className="mt-2 text-2xl font-bold text-[#0A0A0A] tracking-tight">{producte.nom}</h1>
        {producte.descripcio && <p className="mt-1 text-sm text-[#6B7280]">{producte.descripcio}</p>}
      </div>

      <ProjectesSection producteId={id} projectes={projectesProducte} />
    </div>
  );
}
