import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  getOrganitzacions, getPersones, getOportunitats, getActivitats, getComentaris,
  type TipusOrganitzacio,
} from "@/app/actions/bruixola-negoci";
import { PersonesSection } from "./PersonesSection";
import { TimelineSection } from "../../TimelineSection";

const TIPUS_LABEL: Record<TipusOrganitzacio, string> = {
  prospecte: "Prospecte", client: "Client", partner: "Partner",
  proveidor: "Proveïdor", distribuidor: "Distribuïdor", altre: "Altre",
};

export default async function OrganitzacioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [organitzacions, persones, oportunitats, activitats, comentaris] = await Promise.all([
    getOrganitzacions(),
    getPersones(id),
    getOportunitats(),
    getActivitats("organitzacio", id),
    getComentaris("organitzacio", id),
  ]);

  const org = organitzacions.find(o => o.id === id);
  if (!org) notFound();

  const oportunitatsOrg = oportunitats.filter(o => o.organitzacio_id === id);

  return (
    <div className="max-w-screen-lg mx-auto px-6 py-8 space-y-6">
      <div>
        <Link href="/dashboard/bruixola/prospeccio" className="text-xs text-[#9CA3AF] hover:text-[#8E0E1A] transition-colors">
          ← Pipeline de prospecció
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">{org.nom}</h1>
          <Badge variant="default">{TIPUS_LABEL[org.tipus]}</Badge>
        </div>
        <p className="mt-1 text-sm text-[#6B7280]">{[org.pais, org.sector].filter(Boolean).join(" · ")}</p>
        {org.notes && <p className="mt-1 text-sm text-[#6B7280]">{org.notes}</p>}
      </div>

      <PersonesSection organitzacioId={id} persones={persones} />

      <Card>
        <CardHeader><CardTitle>Oportunitats ({oportunitatsOrg.length})</CardTitle></CardHeader>
        <CardContent>
          {oportunitatsOrg.length === 0 ? (
            <p className="text-sm text-[#9CA3AF]">Cap oportunitat encara.</p>
          ) : (
            <div className="space-y-2">
              {oportunitatsOrg.map(op => (
                <Link key={op.id} href={`/dashboard/bruixola/oportunitats/${op.id}`} className="flex items-center justify-between rounded-lg border border-[#E5E7EB] p-3 hover:border-[#8E0E1A] transition-colors">
                  <span className="text-sm text-[#0A0A0A]">{op.nom}</span>
                  {op.ona && <Badge variant="neutral">{op.ona}</Badge>}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TimelineSection entityType="organitzacio" entityId={id} activitats={activitats} comentaris={comentaris} />
    </div>
  );
}
