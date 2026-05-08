"use client";

import { useTransition, useState } from "react";
import {
  activarRecentratge,
  activarSeguiment,
  activarCoherencia,
  activarEntrenador,
} from "@/app/actions/governador";

const R = "#7D1120";
const BK = "#1C1510";
const BORDER = "#E4DDD5";
const LABEL = "#9A8E82";
const DIM = "#B0A498";

type Mode = "recentratge" | "seguiment" | "coherencia" | "entrenador";

interface LastSession {
  resposta: string;
  created_at: string;
}

interface Props {
  lastSessions: Record<string, LastSession | null>;
}

const MODES: Array<{
  id: Mode;
  num: string;
  title: string;
  subtitle: string;
  trigger: string;
  description: string;
  action: () => Promise<{ resposta: string }>;
}> = [
  {
    id: "recentratge",
    num: "I",
    title: "Recentratge de Focus",
    subtitle: "Detecta dispersió · Corregeix el rumb",
    trigger: "Analitza el meu focus",
    description: "Creuament dels últims 14 dies amb objectius anuals. Detecta fronts oberts, incoherències i deriva estratègica.",
    action: activarRecentratge,
  },
  {
    id: "seguiment",
    num: "II",
    title: "Seguiment Diari",
    subtitle: "Governa el dia · Tanca bé cada jornada",
    trigger: "Governa el dia d'avui",
    description: "Adaptació al moment del dia. Si no has registrat, et recorda la prioritat absoluta. Si ho has fet, avalua i prescriu demà.",
    action: activarSeguiment,
  },
  {
    id: "coherencia",
    num: "III",
    title: "Coach de Coherència",
    subtitle: "Missió · Valors · Prioritats · Acció",
    trigger: "Valida la coherència d'avui",
    description: "Creuament de l'entrada d'avui amb missió, valors 2026 i prioritats anuals. Feedback directe i sense ornaments.",
    action: activarCoherencia,
  },
  {
    id: "entrenador",
    num: "IV",
    title: "Entrenador Físic",
    subtitle: "Prescripció adaptativa al teu estat real",
    trigger: "Prescriu l'entrenament",
    description: "Analitza energia, son, estat mental i càrrega setmanal. Prescriu l'entrenament exacte per avui, no una rutina genèrica.",
    action: activarEntrenador,
  },
];

function formatRelTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `fa ${mins}m`;
  const hrs = Math.round(diff / 3600000);
  if (hrs < 24) return `fa ${hrs}h`;
  const days = Math.round(diff / 86400000);
  return `fa ${days}d`;
}

function GovernadorMode({
  mode,
  last,
}: {
  mode: (typeof MODES)[number];
  last: LastSession | null;
}) {
  const [pending, startTransition] = useTransition();
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const displayed = response ?? last?.resposta ?? null;
  const timestamp = response ? "ara mateix" : last?.created_at ? formatRelTime(last.created_at) : null;

  function handleActivar() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await mode.action();
        setResponse(result.resposta);
        setExpanded(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error desconegut");
      }
    });
  }

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ border: `1px solid ${BORDER}`, backgroundColor: "#FFF" }}>
      {/* Mode header */}
      <div className="px-5 py-4 flex items-start justify-between gap-4"
        style={{ borderBottom: displayed || pending ? `1px solid ${BORDER}` : "none", backgroundColor: "#FBF8F5" }}>
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-[10px] font-black mt-0.5 shrink-0 tabular-nums"
            style={{ color: R }}>{mode.num}</span>
          <div>
            <h3 className="text-[14px] font-bold" style={{ color: BK }}>
              {mode.title}
            </h3>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] mt-0.5"
              style={{ color: LABEL }}>
              {mode.subtitle}
            </p>
          </div>
        </div>

        <button
          onClick={handleActivar}
          disabled={pending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40 shrink-0"
          style={{ backgroundColor: pending ? "#F5F0E8" : R, color: pending ? DIM : "#FFF" }}
        >
          {pending ? (
            <span className="animate-pulse">···</span>
          ) : (
            <>→ {mode.trigger}</>
          )}
        </button>
      </div>

      {/* Description (when no response yet) */}
      {!displayed && !pending && (
        <div className="px-5 py-4">
          <p className="text-[12px] leading-relaxed" style={{ color: LABEL }}>
            {mode.description}
          </p>
        </div>
      )}

      {/* Loading */}
      {pending && (
        <div className="px-5 py-4">
          <p className="text-[12px] animate-pulse" style={{ color: LABEL }}>
            El Governador analitza…
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-5 py-3">
          <p className="text-[12px]" style={{ color: "#8E0E1A" }}>{error}</p>
        </div>
      )}

      {/* Response */}
      {displayed && !pending && (
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            {timestamp && (
              <span className="text-[10px] font-semibold" style={{ color: LABEL }}>
                {timestamp}
              </span>
            )}
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-[11px] font-semibold transition-colors hover:underline ml-auto"
              style={{ color: expanded ? LABEL : R }}
            >
              {expanded ? "Tancar ↑" : "Llegir →"}
            </button>
          </div>

          {expanded && (
            <div className="space-y-2 pt-1" style={{ borderLeft: `3px solid #F0E8E0`, paddingLeft: "14px" }}>
              {displayed.split("\n").filter(l => l.trim()).map((line, i) => (
                <p key={i} className="text-[13px] leading-relaxed"
                  style={{ color: line.startsWith("-") || line.startsWith("•") ? "#5C5048" : BK }}>
                  {line.replace(/\*\*/g, "")}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function GovernadorClient({ lastSessions }: Props) {
  return (
    <div className="space-y-3">
      {MODES.map(mode => (
        <GovernadorMode
          key={mode.id}
          mode={mode}
          last={lastSessions[mode.id] ?? null}
        />
      ))}
    </div>
  );
}
