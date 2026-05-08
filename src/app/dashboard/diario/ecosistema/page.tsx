import { redirect } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { getEcosistemaStats } from "@/app/actions/ecosistema";
import { EcosistemaClient } from "./EcosistemaClient";

const R = "#7D1120";
const BK = "#1C1510";
const LABEL = "#9A8E82";
const BORDER = "#E4DDD5";

export default async function EcosistemaPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const { persones, stats } = await getEcosistemaStats();

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-10 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-4 mb-3">
            <Link href="/dashboard/diario"
              className="text-[11px] font-semibold uppercase tracking-[0.18em] hover:underline"
              style={{ color: LABEL }}>
              ← Diari
            </Link>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-1" style={{ color: R }}>
            Consciència relacional
          </p>
          <h1 className="text-[26px] font-black leading-tight" style={{ color: BK }}>
            Ecosistema Humà
          </h1>
          <p className="text-[12px] mt-1 max-w-md leading-relaxed" style={{ color: LABEL }}>
            Les persones no són neutres. Cada relació amplifica, sosté, dispersa o erosiona el sistema vital.
          </p>
        </div>
        <Link href="/dashboard/diario/ecosistema/nova"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold shrink-0 transition-opacity hover:opacity-80"
          style={{ backgroundColor: R, color: "#FFF" }}>
          + Persona
        </Link>
      </div>

      {/* Distribution */}
      {stats && stats.total > 0 && (
        <div className="rounded-2xl p-5" style={{ backgroundColor: "#FFF", border: `1px solid ${BORDER}` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: LABEL }}>
            Composició del sistema · {stats.total} persones
          </p>
          <div className="grid grid-cols-4 gap-3">
            {([
              { cat: "nucli",      label: "Nucli",      color: "#7D1120", bg: "#FBF0F0", val: stats.nucli },
              { cat: "estrategic", label: "Estratègic", color: "#A87830", bg: "#FBF4E8", val: stats.estrategic },
              { cat: "expansio",   label: "Expansió",   color: "#2A6A8A", bg: "#EEF4F8", val: stats.expansio },
              { cat: "drenant",    label: "Drenant",    color: "#5A5A6A", bg: "#F4F4F6", val: stats.drenant },
            ]).map(item => (
              <div key={item.cat} className="rounded-xl p-3 text-center"
                style={{ backgroundColor: item.bg }}>
                <p className="text-[22px] font-black tabular-nums" style={{ color: item.color }}>
                  {item.val}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: item.color }}>
                  {item.label}
                </p>
              </div>
            ))}
          </div>
          {/* Energy bar */}
          {stats.total > 0 && (
            <div className="mt-4 h-2 rounded-full overflow-hidden flex gap-0.5">
              {stats.nucli > 0 && <div style={{ flex: stats.nucli, backgroundColor: "#7D1120" }} />}
              {stats.estrategic > 0 && <div style={{ flex: stats.estrategic, backgroundColor: "#A87830" }} />}
              {stats.expansio > 0 && <div style={{ flex: stats.expansio, backgroundColor: "#2A6A8A" }} />}
              {stats.drenant > 0 && <div style={{ flex: stats.drenant, backgroundColor: "#D0C8C0" }} />}
            </div>
          )}
        </div>
      )}

      {/* Main client component */}
      <EcosistemaClient persones={persones} stats={stats} />

    </div>
  );
}
