import { redirect } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { getActors } from "@/app/actions/strategic-actors";
import type { StrategicActor } from "@/app/actions/strategic-actors";

const CARD    = "#FFFFFF";
const SURFACE = "#F8FAFC";
const BORDER  = "#E2E8F0";
const TEXT    = "#0F172A";
const DIM     = "#475569";
const LABEL   = "#94A3B8";
const SLATE   = "#334155";
const BLUE    = "#1E40AF";
const GREEN   = "#166534";
const RED     = "#991B1B";
const AMBER   = "#92400E";
const PURPLE  = "#6B21A8";

const REL_COLOR: Record<string, string> = {
  critic: RED,
  alt_valor: BLUE,
  oportunitat_latent: GREEN,
  operatiu: SLATE,
  complementari: DIM,
  baixa_prioritat: LABEL,
  risc_estrategic: AMBER,
};
const REL_LABEL: Record<string, string> = {
  critic: "Crític",
  alt_valor: "Alt valor",
  oportunitat_latent: "Oportunitat latent",
  operatiu: "Operatiu",
  complementari: "Complementari",
  baixa_prioritat: "Baixa prioritat",
  risc_estrategic: "Risc estratègic",
};
const RISC_COLOR: Record<string, string> = {
  baix: GREEN, mitja: AMBER, alt: RED, critic: "#7F1D1D", desconegut: LABEL,
};
const RISC_LABEL: Record<string, string> = {
  baix: "Risc baix", mitja: "Risc mitjà", alt: "Risc alt", critic: "Risc crític", desconegut: "Risc ?",
};

function riscMax(actor: StrategicActor): number {
  return Math.max(
    actor.risc_comercial, actor.risc_reputacional, actor.risc_legal,
    actor.risc_financer, actor.risc_dependencia, actor.risc_incompliment,
    actor.risc_bloqueig, actor.risc_conflicte,
  );
}

function AlertDot({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[8px] font-bold"
      style={{ backgroundColor: RED, color: "#FFFFFF" }}>{count}</span>
  );
}

function ActorCard({ actor }: { actor: StrategicActor }) {
  const relColor = REL_COLOR[actor.classificacio_relevancia ?? ""] ?? LABEL;
  const relLabel = REL_LABEL[actor.classificacio_relevancia ?? ""];
  const riscLevel = actor.classificacio_risc;
  const riscColor = RISC_COLOR[riscLevel ?? ""] ?? LABEL;
  const maxRisc = riscMax(actor);
  const alertCount = (actor.alertes_ia as unknown[])?.length ?? 0;
  const rols = actor.rol_tipus?.slice(0, 3) ?? [];

  return (
    <Link href={`/dashboard/bruixola/actors/${actor.id}`}
      className="block rounded-xl p-4 hover:shadow-md transition-all group"
      style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[14px] font-bold" style={{ color: TEXT }}>{actor.nom}</p>
            {actor.is_pdi && (
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest"
                style={{ backgroundColor: `${PURPLE}15`, color: PURPLE, border: `1px solid ${PURPLE}30` }}>PDI</span>
            )}
            <AlertDot count={alertCount} />
          </div>
          <p className="text-[11px] mt-0.5" style={{ color: DIM }}>
            {[actor.carrec, actor.empresa].filter(Boolean).join(" · ")}
          </p>
        </div>
        {actor.prioritat != null && (
          <div className="text-center shrink-0">
            <p className="text-[18px] font-black leading-none" style={{ color: actor.prioritat >= 4 ? RED : actor.prioritat >= 3 ? AMBER : LABEL }}>{actor.prioritat}</p>
            <p className="text-[7px] uppercase tracking-wider" style={{ color: LABEL }}>prior.</p>
          </div>
        )}
      </div>

      {/* Rol tags */}
      {rols.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {rols.map(r => (
            <span key={r} className="text-[9px] px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: SURFACE, color: DIM, border: `1px solid ${BORDER}` }}>
              {r}
            </span>
          ))}
          {(actor.rol_tipus?.length ?? 0) > 3 && (
            <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ color: LABEL }}>
              +{(actor.rol_tipus?.length ?? 0) - 3}
            </span>
          )}
        </div>
      )}

      {/* Scores row */}
      <div className="flex items-center gap-3 flex-wrap">
        {relLabel && (
          <span className="text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-wide"
            style={{ backgroundColor: `${relColor}12`, color: relColor, border: `1px solid ${relColor}25` }}>
            {relLabel}
          </span>
        )}
        {riscLevel && (
          <span className="text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-wide"
            style={{ backgroundColor: `${riscColor}12`, color: riscColor, border: `1px solid ${riscColor}25` }}>
            {RISC_LABEL[riscLevel]}
          </span>
        )}
        {maxRisc >= 3 && !riscLevel && (
          <span className="text-[8px] font-bold px-2 py-0.5 rounded" style={{ color: RED, border: `1px solid ${RED}30`, backgroundColor: `${RED}10` }}>
            Risc detectat
          </span>
        )}
        {actor.data_ultim_contacte && (
          <span className="text-[9px] ml-auto" style={{ color: LABEL }}>
            {new Date(actor.data_ultim_contacte).toLocaleDateString("ca-ES", { day: "numeric", month: "short" })}
          </span>
        )}
      </div>

      {/* Scores bar */}
      {(actor.impacte_potencial != null || actor.valor_estrategic != null) && (
        <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: `1px solid ${BORDER}` }}>
          {actor.impacte_potencial != null && (
            <div className="flex-1">
              <div className="flex justify-between items-center mb-0.5">
                <p className="text-[8px]" style={{ color: LABEL }}>Impacte pot.</p>
                <p className="text-[8px] font-bold" style={{ color: BLUE }}>{actor.impacte_potencial}/5</p>
              </div>
              <div className="h-0.5 rounded-full overflow-hidden" style={{ backgroundColor: BORDER }}>
                <div style={{ width: `${(actor.impacte_potencial / 5) * 100}%`, height: "100%", backgroundColor: BLUE, borderRadius: "9999px" }} />
              </div>
            </div>
          )}
          {actor.valor_estrategic != null && (
            <div className="flex-1">
              <div className="flex justify-between items-center mb-0.5">
                <p className="text-[8px]" style={{ color: LABEL }}>Valor estrat.</p>
                <p className="text-[8px] font-bold" style={{ color: AMBER }}>{actor.valor_estrategic}/5</p>
              </div>
              <div className="h-0.5 rounded-full overflow-hidden" style={{ backgroundColor: BORDER }}>
                <div style={{ width: `${(actor.valor_estrategic / 5) * 100}%`, height: "100%", backgroundColor: AMBER, borderRadius: "9999px" }} />
              </div>
            </div>
          )}
        </div>
      )}
    </Link>
  );
}

export default async function ActorsPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const actors = await getActors();

  const stats = {
    total: actors.length,
    critics: actors.filter(a => a.classificacio_relevancia === "critic").length,
    pdi: actors.filter(a => a.is_pdi).length,
    alertes: actors.reduce((sum, a) => sum + ((a.alertes_ia as unknown[])?.length ?? 0), 0),
    alt_risc: actors.filter(a => ["alt", "critic"].includes(a.classificacio_risc ?? "")).length,
  };

  const byRelevancia: Record<string, StrategicActor[]> = {
    critic:             actors.filter(a => a.classificacio_relevancia === "critic"),
    alt_valor:          actors.filter(a => a.classificacio_relevancia === "alt_valor"),
    oportunitat_latent: actors.filter(a => a.classificacio_relevancia === "oportunitat_latent"),
    risc_estrategic:    actors.filter(a => a.classificacio_relevancia === "risc_estrategic"),
    operatiu:           actors.filter(a => a.classificacio_relevancia === "operatiu"),
    complementari:      actors.filter(a => a.classificacio_relevancia === "complementari"),
    sense_classificar:  actors.filter(a => !a.classificacio_relevancia),
  };

  return (
    <div className="max-w-5xl mx-auto px-5 md:px-10 py-10 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-4 mb-3">
            <Link href="/dashboard/bruixola" className="text-[10px] font-bold uppercase tracking-[0.2em] hover:opacity-70" style={{ color: LABEL }}>
              ← Brúixola
            </Link>
          </div>
          <h1 className="text-[26px] font-black leading-tight tracking-tight" style={{ color: TEXT }}>
            Intel·ligència d&apos;Actors
          </h1>
          <p className="text-[11px] mt-1" style={{ color: DIM }}>
            {stats.total} actors · {stats.critics} crítics · {stats.pdi} PDIs · {stats.alertes} alertes
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/dashboard/bruixola/pdi"
            className="px-3 py-2 rounded-xl text-[10px] font-bold transition-all hover:opacity-80"
            style={{ backgroundColor: `${PURPLE}12`, color: PURPLE, border: `1px solid ${PURPLE}25` }}>
            PDI ({stats.pdi})
          </Link>
          <Link href="/dashboard/bruixola/actors/nou"
            className="px-4 py-2 rounded-xl text-[11px] font-bold transition-all hover:opacity-80"
            style={{ backgroundColor: TEXT, color: "#FFFFFF" }}>
            + Nou actor
          </Link>
        </div>
      </div>

      {/* Stats */}
      {actors.length > 0 && (
        <div className="grid grid-cols-5 gap-px overflow-hidden rounded-xl" style={{ backgroundColor: BORDER }}>
          {[
            { label: "Total",     value: stats.total,    color: SLATE },
            { label: "Crítics",   value: stats.critics,  color: RED },
            { label: "PDIs",      value: stats.pdi,      color: PURPLE },
            { label: "Alertes",   value: stats.alertes,  color: AMBER },
            { label: "Alt risc",  value: stats.alt_risc, color: RED },
          ].map(s => (
            <div key={s.label} className="py-3 text-center" style={{ backgroundColor: CARD }}>
              <p className="text-[20px] font-black tabular-nums" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[8px] font-bold uppercase tracking-widest mt-0.5" style={{ color: LABEL }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {actors.length === 0 && (
        <div className="rounded-2xl p-14 text-center" style={{ backgroundColor: SURFACE, border: `1px dashed ${BORDER}` }}>
          <p className="text-[13px] font-bold mb-2" style={{ color: TEXT }}>Cap actor registrat</p>
          <p className="text-[11px] mb-6 max-w-md mx-auto" style={{ color: DIM }}>
            Afegeix actors estratègics que poden impactar el teu negoci: socis, clients clau, inversors, reguladors, facilitadors, bloquejadors.
          </p>
          <Link href="/dashboard/bruixola/actors/nou"
            className="inline-block px-5 py-2.5 rounded-xl text-[11px] font-bold transition-all hover:opacity-80"
            style={{ backgroundColor: TEXT, color: "#FFFFFF" }}>
            + Registrar primer actor
          </Link>
        </div>
      )}

      {/* Actors per rellevància */}
      {(["critic", "alt_valor", "oportunitat_latent", "risc_estrategic", "operatiu", "complementari", "sense_classificar"] as const).map(key => {
        const items = byRelevancia[key];
        if (!items || items.length === 0) return null;
        const color = REL_COLOR[key] ?? LABEL;
        const label = key === "sense_classificar" ? "Sense classificar" : REL_LABEL[key];
        return (
          <div key={key}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: color }} />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color }}>
                {label} ({items.length})
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {items.map(actor => <ActorCard key={actor.id} actor={actor} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
