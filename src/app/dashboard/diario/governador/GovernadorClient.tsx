"use client";

import { useTransition, useState } from "react";
import {
  activarRecentratge,
  activarSeguiment,
  activarCoherencia,
  activarEntrenador,
} from "@/app/actions/governador";

const C = {
  bg: "#050505",
  surface: "#080706",
  border: "#111111",
  muted: "#1A1815",
  label: "#2A2520",
  dim: "#3D3530",
  text: "#EDE8DF",
  textDim: "#7A7268",
  accent: "#7D1120",
  accentLo: "#2D060B",
  copper: "#C4964A",
};

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
    trigger: "→ Analitza el meu focus",
    description: "Creuament dels últims 14 dies amb objectius anuals. Detecta fronts oberts, incoherències i deriva estratègica.",
    action: activarRecentratge,
  },
  {
    id: "seguiment",
    num: "II",
    title: "Seguiment Diari",
    subtitle: "Governa el dia · Tanca bé cada jornada",
    trigger: "→ Governa el dia d'avui",
    description: "Adaptació al moment del dia. Si no has registrat, et recorda la prioritat absoluta. Si ho has fet, avalua i prescriu demà.",
    action: activarSeguiment,
  },
  {
    id: "coherencia",
    num: "III",
    title: "Coach de Coherència",
    subtitle: "Missió · Valors · Prioritats · Acció",
    trigger: "→ Valida la coherència d'avui",
    description: "Creuament de l'entrada d'avui amb missió, valors 2026 i prioritats anuals. Feedback directe i sense ornaments.",
    action: activarCoherencia,
  },
  {
    id: "entrenador",
    num: "IV",
    title: "Entrenador Físic",
    subtitle: "Prescripció adaptativa al teu estat real",
    trigger: "→ Prescriu l'entrenament",
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
    <div
      style={{
        borderTop: `1px solid ${C.border}`,
        paddingTop: "28px",
        paddingBottom: "28px",
      }}
    >
      {/* Mode header */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 mb-1">
            <span
              style={{
                fontSize: "9px",
                fontWeight: 700,
                letterSpacing: "0.35em",
                color: C.accent,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {mode.num}
            </span>
            <h2
              style={{
                fontSize: "13px",
                fontWeight: 800,
                color: C.text,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {mode.title}
            </h2>
          </div>
          <p
            style={{
              fontSize: "10px",
              color: C.textDim,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            {mode.subtitle}
          </p>
        </div>

        {/* Trigger button */}
        <button
          onClick={handleActivar}
          disabled={pending}
          style={{
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: pending ? C.dim : C.copper,
            background: "none",
            border: "none",
            cursor: pending ? "wait" : "pointer",
            padding: 0,
            whiteSpace: "nowrap",
            transition: "color 0.2s",
            flexShrink: 0,
          }}
        >
          {pending ? "···" : mode.trigger}
        </button>
      </div>

      {/* Description (shown when no response) */}
      {!displayed && !pending && (
        <p
          style={{
            fontSize: "11px",
            color: C.dim,
            marginTop: "10px",
            lineHeight: 1.6,
            fontStyle: "italic",
          }}
        >
          {mode.description}
        </p>
      )}

      {/* Loading state */}
      {pending && (
        <div
          style={{
            marginTop: "16px",
            fontSize: "11px",
            color: C.dim,
            letterSpacing: "0.2em",
          }}
        >
          <span className="animate-pulse">Governador processant···</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <p
          style={{
            marginTop: "12px",
            fontSize: "11px",
            color: "#8E0E1A",
          }}
        >
          {error}
        </p>
      )}

      {/* Response */}
      {displayed && !pending && (
        <div style={{ marginTop: "16px" }}>
          {/* Timestamp + toggle */}
          <div className="flex items-center justify-between mb-3">
            {timestamp && (
              <span
                style={{
                  fontSize: "9px",
                  color: C.label,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                }}
              >
                {timestamp}
              </span>
            )}
            <button
              onClick={() => setExpanded(v => !v)}
              style={{
                fontSize: "9px",
                color: C.dim,
                background: "none",
                border: "none",
                cursor: "pointer",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                marginLeft: "auto",
              }}
            >
              {expanded ? "tancar ↑" : "llegir →"}
            </button>
          </div>

          {/* Response text — expandable */}
          {expanded && (
            <div
              style={{
                borderLeft: `2px solid ${C.accentLo}`,
                paddingLeft: "16px",
              }}
            >
              {displayed.split("\n").filter(l => l.trim()).map((line, i) => (
                <p
                  key={i}
                  style={{
                    fontSize: "13px",
                    color: line.startsWith("•") || line.startsWith("-") ? C.textDim : C.text,
                    lineHeight: 1.75,
                    marginBottom: "8px",
                    fontWeight: line.startsWith("**") ? 700 : 400,
                  }}
                >
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
    <div>
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
