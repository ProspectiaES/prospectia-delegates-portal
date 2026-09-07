import Link from "next/link";
import { getEmpreses } from "@/app/actions/bruixola";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function BruixolaEmpresesPage() {
  const empreses = await getEmpreses();

  return (
    <div className="max-w-screen-lg mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/bruixola" className="text-xs text-[#9CA3AF] hover:text-[#8E0E1A] transition-colors">
            ← Bruixola
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-[#0A0A0A] tracking-tight">Les meves empreses</h1>
        </div>
        <Link
          href="/dashboard/bruixola/prospeccio"
          className="text-sm font-medium text-[#8E0E1A] hover:underline"
        >
          Pipeline de prospecció →
        </Link>
      </div>

      {empreses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-[#9CA3AF]">
            Encara no hi ha cap empresa registrada.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {empreses.map(e => (
            <Link key={e.id} href={`/dashboard/bruixola/empreses/${e.id}`}>
              <Card className="h-full hover:border-[#8E0E1A] transition-colors">
                <CardHeader>
                  <CardTitle>{e.nom}</CardTitle>
                  <Badge variant={e.activa ? "success" : "neutral"}>{e.activa ? "Activa" : "Inactiva"}</Badge>
                </CardHeader>
                <CardContent className="space-y-1">
                  {e.tipus && <p className="text-xs text-[#6B7280]">{e.tipus}</p>}
                  {e.sector && <p className="text-xs text-[#9CA3AF]">{e.sector}</p>}
                  {e.descripcio && <p className="text-xs text-[#6B7280] line-clamp-2 mt-2">{e.descripcio}</p>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
