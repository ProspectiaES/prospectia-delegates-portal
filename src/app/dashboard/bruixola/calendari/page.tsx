import Link from "next/link";
import { getTasquesPendents, type Tasca, type TipusTasca } from "@/app/actions/bruixola-negoci";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const TIPUS_LABEL: Record<TipusTasca, string> = { trucada: "Trucada", reunio: "Reunió", email: "Email", tasca: "Tasca" };

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("es-ES", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

export default async function CalendariPage() {
  const tasques = await getTasquesPendents();

  const conData = tasques.filter(t => t.data_limit);
  const senseData = tasques.filter(t => !t.data_limit);

  const grouped: Record<string, Tasca[]> = {};
  for (const t of conData) {
    (grouped[t.data_limit!] ??= []).push(t);
  }
  const dates = Object.keys(grouped).sort();

  return (
    <div className="max-w-screen-md mx-auto px-6 py-8 space-y-6">
      <div>
        <Link href="/dashboard/bruixola/prospeccio" className="text-xs text-[#9CA3AF] hover:text-[#8E0E1A] transition-colors">
          ← Pipeline de prospecció
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[#0A0A0A] tracking-tight">Agenda</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Totes les tasques pendents, de tots els projectes.</p>
      </div>

      {tasques.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-[#9CA3AF]">Cap tasca pendent.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {dates.map(date => {
            const overdue = isOverdue(date);
            return (
              <Card key={date}>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold ${overdue ? "text-[#8E0E1A]" : "text-[#0A0A0A]"}`}>{fmtDate(date)}</p>
                    {overdue && <Badge variant="danger">Vençuda</Badge>}
                  </div>
                  <div className="space-y-2">
                    {grouped[date].map(t => (
                      <div key={t.id} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="neutral">{TIPUS_LABEL[t.tipus]}</Badge>
                          <Link href={`/dashboard/bruixola/projectes/${t.projecte_id}`} className="text-sm text-[#0A0A0A] hover:text-[#8E0E1A] truncate">
                            {t.titol}
                          </Link>
                        </div>
                        {t.hora && <span className="text-xs text-[#9CA3AF] shrink-0">{t.hora}</span>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {senseData.length > 0 && (
            <Card>
              <CardContent className="space-y-2">
                <p className="text-sm font-semibold text-[#6B7280]">Sense data límit</p>
                {senseData.map(t => (
                  <div key={t.id} className="flex items-center gap-2">
                    <Badge variant="neutral">{TIPUS_LABEL[t.tipus]}</Badge>
                    <Link href={`/dashboard/bruixola/projectes/${t.projecte_id}`} className="text-sm text-[#0A0A0A] hover:text-[#8E0E1A]">
                      {t.titol}
                    </Link>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
