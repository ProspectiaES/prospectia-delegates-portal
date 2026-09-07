import Link from "next/link";
import { notFound } from "next/navigation";
import { getEmpreses, getActors, getProjectes, getBloquejos, type EstatProjecte } from "@/app/actions/bruixola";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const estatVariant: Record<EstatProjecte, "default" | "success" | "warning" | "danger" | "neutral"> = {
  actiu: "success",
  congelat: "neutral",
  completat: "success",
  cancelat: "danger",
  pendent: "warning",
};

export default async function EmpresaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // getActors()/getProjectes()/getBloquejos() have no filter param — bruixola.ts
  // is off-limits to edit, so we filter the full lists here instead.
  const [empreses, actors, projectes, bloquejos] = await Promise.all([
    getEmpreses(),
    getActors(),
    getProjectes(),
    getBloquejos(),
  ]);

  const empresa = empreses.find(e => e.id === id);
  if (!empresa) notFound();

  const actorsEmpresa = actors.filter(a => a.empresa_id === id);
  const projectesEmpresa = projectes.filter(p => p.empresa_id === id);

  // Bloqueig has no empresa_id — link via this empresa's own projects/actors.
  const projecteIds = new Set(projectesEmpresa.map(p => p.id));
  const actorIds = new Set(actorsEmpresa.map(a => a.id));
  const bloquejosEmpresa = bloquejos.filter(b =>
    (b.projecte_id && projecteIds.has(b.projecte_id)) ||
    (b.actor_id && actorIds.has(b.actor_id))
  );

  return (
    <div className="max-w-screen-lg mx-auto px-6 py-8 space-y-6">
      <div>
        <Link href="/dashboard/bruixola/empreses" className="text-xs text-[#9CA3AF] hover:text-[#8E0E1A] transition-colors">
          ← Les meves empreses
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[#0A0A0A] tracking-tight">{empresa.nom}</h1>
        {empresa.descripcio && <p className="mt-1 text-sm text-[#6B7280]">{empresa.descripcio}</p>}
      </div>

      <Card>
        <CardHeader><CardTitle>Persones clau ({actorsEmpresa.length})</CardTitle></CardHeader>
        <CardContent>
          {actorsEmpresa.length === 0 ? (
            <p className="text-sm text-[#9CA3AF]">Cap persona registrada.</p>
          ) : (
            <div className="space-y-3">
              {actorsEmpresa.map(a => (
                <div key={a.id} className="flex items-start justify-between gap-4 pb-3 border-b border-[#F3F4F6] last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-semibold text-[#0A0A0A]">{a.nom}</p>
                    <p className="text-xs text-[#6B7280]">{[a.rol_formal, a.area].filter(Boolean).join(" · ")}</p>
                  </div>
                  {a.extern && <Badge variant="neutral">Extern</Badge>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Projectes ({projectesEmpresa.length})</CardTitle></CardHeader>
        <CardContent>
          {projectesEmpresa.length === 0 ? (
            <p className="text-sm text-[#9CA3AF]">Cap projecte registrat.</p>
          ) : (
            <div className="space-y-3">
              {projectesEmpresa.map(p => (
                <div key={p.id} className="flex items-start justify-between gap-4 pb-3 border-b border-[#F3F4F6] last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-semibold text-[#0A0A0A]">{p.nom}</p>
                    {p.seguent_accio && <p className="text-xs text-[#6B7280] mt-0.5">Següent: {p.seguent_accio}</p>}
                  </div>
                  <Badge variant={estatVariant[p.estat]}>{p.estat}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Bloquejos oberts ({bloquejosEmpresa.filter(b => !b.resolt).length})</CardTitle></CardHeader>
        <CardContent>
          {bloquejosEmpresa.filter(b => !b.resolt).length === 0 ? (
            <p className="text-sm text-[#9CA3AF]">Cap bloqueig obert.</p>
          ) : (
            <div className="space-y-3">
              {bloquejosEmpresa.filter(b => !b.resolt).map(b => (
                <div key={b.id} className="pb-3 border-b border-[#F3F4F6] last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm font-semibold text-[#0A0A0A]">{b.titol}</p>
                    <Badge variant={b.severitat >= 4 ? "danger" : "warning"}>Severitat {b.severitat}</Badge>
                  </div>
                  {b.accio_necessaria && <p className="text-xs text-[#6B7280] mt-1">{b.accio_necessaria}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
