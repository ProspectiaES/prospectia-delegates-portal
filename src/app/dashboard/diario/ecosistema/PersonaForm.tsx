"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { savePersona, saveInteraccio, analyzePersona } from "@/app/actions/ecosistema";
import type { Persona, Interaccio, Categoria } from "@/app/actions/ecosistema";

// ─── Warm light design tokens ─────────────────────────────────────────────────
const BG      = "#FAFAF8";
const CARD    = "#FFFFFF";
const SURFACE = "#FBF8F5";
const BORDER  = "#E4DDD5";
const BORDER2 = "#D0C8C0";
const TEXT    = "#1C1510";
const DIM     = "#7A6E67";
const LABEL   = "#9A8E82";
const R       = "#7D1120";
const GOLD    = "#A87830";
const BLUE    = "#2A6A8A";
const SLATE   = "#5A5A6A";
const COPPER  = "#8B5A28";
const GREEN   = "#2A7A4A";

const CAT_OPTIONS: { val: Categoria; label: string; desc: string; color: string }[] = [
  { val: "familia",    label: "Família",          desc: "Vincles familiars directes i externs", color: COPPER },
  { val: "nucli",      label: "Nucli central",     desc: "Persones àncora, mentors essencials",  color: R },
  { val: "estrategic", label: "Anell estratègic",  desc: "Aliances i col·laboradors clau",        color: GOLD },
  { val: "expansio",   label: "Expansió",          desc: "Referents, relacions en creixement",    color: BLUE },
  { val: "drenant",    label: "Zona drenant",       desc: "Alta càrrega, distància recomanada",    color: SLATE },
];

const SUBCATEGORIES_FAMILIAR = [
  { val: "protectora",        label: "Protectora" },
  { val: "estimada",          label: "Estimada" },
  { val: "neutra",            label: "Neutra" },
  { val: "complexa",          label: "Complexa" },
  { val: "hostil_passiva",    label: "Tensió latent" },
  { val: "hostil_activa",     label: "Tensió activa" },
  { val: "no_confiable",      label: "Confiança limitada" },
  { val: "delicada",          label: "Delicada emocionalment" },
  { val: "dependencia",       label: "Dependència emocional" },
  { val: "vincle_trencat",    label: "Vincle trencat" },
  { val: "inestable",         label: "Dinàmica inestable" },
  { val: "absorbent",         label: "Relació absorbent" },
];

const ROL_VITAL_GROUPS: Array<{ group: string; options: Array<{ val: string; label: string }> }> = [
  {
    group: "PROFESSIONAL",
    options: [
      { val: "soci", label: "Soci" },
      { val: "mentor", label: "Mentor" },
      { val: "aliat", label: "Aliat" },
      { val: "connector", label: "Connector" },
      { val: "estratega", label: "Estratega" },
      { val: "assessor", label: "Assessor" },
      { val: "inversor", label: "Inversor" },
      { val: "client", label: "Client" },
      { val: "referent_professional", label: "Referent professional" },
      { val: "lider", label: "Líder" },
      { val: "operador", label: "Operador" },
      { val: "executor", label: "Executor" },
      { val: "partner", label: "Partner" },
    ],
  },
  {
    group: "PERSONAL",
    options: [
      { val: "familia_directa", label: "Família directa" },
      { val: "amic_intim", label: "Amic íntim" },
      { val: "amistat_funcional", label: "Amistat funcional" },
      { val: "parella", label: "Parella" },
      { val: "exparella", label: "Exparella" },
      { val: "suport_emocional", label: "Suport emocional" },
      { val: "figura_paternal", label: "Figura paternal" },
      { val: "figura_maternal", label: "Figura maternal" },
      { val: "persona_refugi", label: "Persona refugi" },
    ],
  },
  {
    group: "CREIXEMENT",
    options: [
      { val: "inspirador", label: "Inspirador" },
      { val: "elevador", label: "Elevador" },
      { val: "model", label: "Model" },
      { val: "referent_vital", label: "Referent vital" },
      { val: "potenciador", label: "Potenciador" },
    ],
  },
  {
    group: "RISC / COMPLEXITAT",
    options: [
      { val: "relacio_reactiva", label: "Relació reactiva" },
      { val: "manipuladora", label: "Dinàmica manipuladora" },
      { val: "competitiva", label: "Competitiva" },
      { val: "conflictiva", label: "Conflictiva" },
      { val: "absorbent", label: "Absorbent" },
      { val: "passiu_agressiva", label: "Passiu-agressiva" },
      { val: "inestable", label: "Inestable" },
      { val: "imprevisible", label: "Imprevisible" },
    ],
  },
];

const TRETS_CONDUCTUALS: Array<{ grup: string; trets: string[] }> = [
  {
    grup: "Cognitiu",
    trets: ["racional", "emocional", "intuïtiu", "analític", "estratègic"],
  },
  {
    grup: "Reactivitat",
    trets: ["reactiu", "controlador", "evitatiu", "dependent", "impulsiu", "estable sota pressió"],
  },
  {
    grup: "Dinàmica social",
    trets: ["dominant", "passiu-agressiu", "competitiu", "manipulador subtil", "generador de conflicte", "evita conflicte", "validació constant"],
  },
  {
    grup: "Estabilitat",
    trets: ["estable", "imprevisible", "inestable", "sensible a crítica"],
  },
  {
    grup: "Impacte relacional",
    trets: ["protector", "oportunista", "absorbent", "inspirador"],
  },
];

const ESTAT_OPTIONS = [
  "expansiva", "inspiradora", "estable", "en evolució",
  "distant", "tensionada", "reactiva", "drenadora",
];

const SENSACIO_OPTIONS = [
  "centrat", "clar", "inspirat", "energitzat",
  "dispers", "cansat", "tens", "buit",
];

const EMOJIS = ["👤","👨","👩","🧑","👴","👵","🧔","🤝","💼","🧠","❤️","⭐","🔮","🌱","⚡"];

const KPI_LIST: Array<{ key: string; label: string; lowGood?: boolean }> = [
  { key: "risc_emocional",      label: "Risc emocional",         lowGood: true },
  { key: "risc_professional",   label: "Risc professional",      lowGood: true },
  { key: "estabilitat_kpi",     label: "Estabilitat" },
  { key: "fiabilitat_kpi",      label: "Fiabilitat" },
  { key: "coherencia_kpi",      label: "Coherència" },
  { key: "reciprocitat",        label: "Reciprocitat" },
  { key: "potencial_conflicte", label: "Potencial conflicte",    lowGood: true },
  { key: "desgast_energetic",   label: "Desgast energètic",      lowGood: true },
  { key: "influencia_focus",    label: "Influència focus" },
  { key: "influencia_mental",   label: "Influència mental" },
];

// ─── UI primitives ─────────────────────────────────────────────────────────────

function Section({ label, accent, children }: { label: string; accent?: string; children: React.ReactNode }) {
  const c = accent ?? R;
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, backgroundColor: CARD }}>
      <div className="px-5 py-3 flex items-center gap-2.5"
        style={{ backgroundColor: SURFACE, borderBottom: `1px solid ${BORDER}` }}>
        <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: c }} />
        <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: c }}>{label}</p>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: LABEL }}>{label}</p>
      {children}
    </div>
  );
}

function DInput({ name, value, onChange, placeholder }: {
  name: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <input name={name} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full outline-none text-[13px] font-medium"
      style={{ background: "transparent", border: "none", borderBottom: `1px solid ${BORDER2}`, paddingBottom: "8px", color: TEXT }}
      onFocus={e => (e.target.style.borderBottomColor = R)}
      onBlur={e => (e.target.style.borderBottomColor = BORDER2)} />
  );
}

function DTextarea({ name, value, onChange, placeholder, rows = 3 }: {
  name: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea name={name} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} rows={rows}
      className="w-full outline-none resize-none text-[12px] leading-relaxed"
      style={{ background: "transparent", border: "none", borderBottom: `1px solid ${BORDER2}`, paddingBottom: "8px", color: TEXT }}
      onFocus={e => (e.target.style.borderBottomColor = R)}
      onBlur={e => (e.target.style.borderBottomColor = BORDER2)} />
  );
}

function RatingBar({ name, label, value, onChange }: {
  name: string; label: string; value: number | null; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <p className="text-[11px] w-28 shrink-0" style={{ color: TEXT }}>{label}</p>
      <div className="flex gap-1.5 flex-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" onClick={() => onChange(value === n ? 0 : n)}
            className="flex-1 h-1.5 rounded-full transition-all"
            style={{ backgroundColor: value && n <= value ? R : BORDER2 }} />
        ))}
      </div>
      <span className="text-[11px] font-bold w-5 text-right tabular-nums" style={{ color: value ? R : DIM }}>
        {value ?? "–"}
      </span>
      <input type="hidden" name={name} value={value ?? ""} />
    </div>
  );
}

// ─── KPI Gauge (0–10) ─────────────────────────────────────────────────────────
function KpiGauge({ kpiKey, label, value, onChange, lowGood }: {
  kpiKey: string; label: string; value: number | null; onChange: (v: number | null) => void; lowGood?: boolean;
}) {
  const v = value ?? 0;
  const getColor = (n: number) => {
    if (lowGood) {
      if (n <= 3) return GREEN;
      if (n <= 6) return GOLD;
      return "#C4280A";
    } else {
      if (n <= 3) return "#C4280A";
      if (n <= 6) return GOLD;
      return GREEN;
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold" style={{ color: TEXT }}>{label}</p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold tabular-nums w-5 text-right"
            style={{ color: v > 0 ? getColor(v) : DIM }}>
            {v > 0 ? v : "–"}
          </span>
          {v > 0 && (
            <button type="button" onClick={() => onChange(null)}
              className="text-[10px]" style={{ color: DIM }}>×</button>
          )}
        </div>
      </div>
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <button key={n} type="button"
            onClick={() => onChange(v === n ? null : n)}
            className="flex-1 h-2 rounded-sm transition-all"
            style={{ backgroundColor: v >= n ? getColor(n) : BORDER2 }} />
        ))}
      </div>
      <input type="hidden" name={kpiKey} value={value ?? ""} />
    </div>
  );
}

// ─── Trait chip with intensity cycling ───────────────────────────────────────
function TraitChip({ tret, intensity, onToggle }: {
  tret: string;
  intensity: 0 | 1 | 2;
  onToggle: () => void;
}) {
  const baseStyle = {
    0: { bg: "transparent", color: DIM, border: BORDER2 },
    1: { bg: `${GOLD}15`, color: LABEL, border: `${GOLD}40` },
    2: { bg: `${GOLD}30`, color: GOLD, border: `${GOLD}70` },
  }[intensity];

  return (
    <button type="button" onClick={onToggle}
      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
      style={{
        backgroundColor: baseStyle.bg,
        color: baseStyle.color,
        border: `1px solid ${baseStyle.border}`,
        fontWeight: intensity === 2 ? 700 : intensity === 1 ? 600 : 400,
      }}>
      {intensity > 0 && (
        <span className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: intensity === 2 ? GOLD : `${GOLD}70` }} />
      )}
      {tret}
    </button>
  );
}

// ─── AI Alerts display ────────────────────────────────────────────────────────
function AlertesList({ alertes }: { alertes: Array<{ tipus: string; missatge: string }> }) {
  const colorMap: Record<string, string> = {
    positiu: GREEN,
    atencio: GOLD,
    risc:    "#C4280A",
  };
  const iconMap: Record<string, string> = {
    positiu: "◆",
    atencio: "◈",
    risc:    "◉",
  };

  return (
    <div className="space-y-2">
      {alertes.map((a, i) => {
        const c = colorMap[a.tipus] ?? LABEL;
        return (
          <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl"
            style={{ backgroundColor: `${c}08`, border: `1px solid ${c}20` }}>
            <span className="shrink-0 mt-0.5 text-[10px]" style={{ color: c }}>{iconMap[a.tipus] ?? "●"}</span>
            <p className="text-[11px] leading-relaxed" style={{ color: DIM }}>{a.missatge}</p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function PersonaForm({
  initial,
  defaultCat,
  interaccions = [],
}: {
  initial: Persona | null;
  defaultCat: Categoria;
  interaccions?: Interaccio[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isAnalyzing, startAnalyzeTransition] = useTransition();
  const [intPending, startIntTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [showAddInteraccio, setShowAddInteraccio] = useState(false);

  // Identity
  const [nom, setNom]                 = useState(initial?.nom ?? "");
  const [emoji, setEmoji]             = useState(initial?.avatar_emoji ?? "👤");
  const [categoria, setCategoria]     = useState<Categoria>(initial?.categoria ?? defaultCat);
  const [subcat, setSubcat]           = useState(initial?.subcategoria_familiar ?? "");
  const [rolCodi, setRolCodi]         = useState(initial?.rol_vital_codi ?? "");
  const [rolText, setRolText]         = useState(initial?.rol_vital ?? "");

  // Behavioral profiling
  type IntMap = Record<string, number>;
  const [trets, setTrets]             = useState<IntMap>(() => {
    const base: IntMap = {};
    (initial?.perfil_conductual ?? []).forEach(t => {
      base[t] = initial?.intensitat_perfil?.[t] ?? 1;
    });
    return base;
  });

  // Perception dimensions
  const [energia, setEnergia]         = useState<number | null>(initial?.energia ?? null);
  const [claredat, setClaredat]       = useState<number | null>(initial?.claredat ?? null);
  const [autenticitat, setAutent]     = useState<number | null>(initial?.autenticitat ?? null);
  const [alineacio, setAlineacio]     = useState<number | null>(initial?.alineacio ?? null);
  const [profunditat, setProfund]     = useState<number | null>(initial?.profunditat ?? null);
  const [confianca, setConfianca]     = useState<number | null>(initial?.confianca ?? null);

  // KPIs
  const [kpis, setKpis] = useState<Record<string, number | null>>({
    risc_emocional:      initial?.risc_emocional ?? null,
    risc_professional:   initial?.risc_professional ?? null,
    estabilitat_kpi:     initial?.estabilitat_kpi ?? null,
    fiabilitat_kpi:      initial?.fiabilitat_kpi ?? null,
    coherencia_kpi:      initial?.coherencia_kpi ?? null,
    reciprocitat:        initial?.reciprocitat ?? null,
    potencial_conflicte: initial?.potencial_conflicte ?? null,
    desgast_energetic:   initial?.desgast_energetic ?? null,
    influencia_focus:    initial?.influencia_focus ?? null,
    influencia_mental:   initial?.influencia_mental ?? null,
  });

  // State & feeling
  const [estat, setEstat]             = useState(initial?.estat_relacional ?? "");
  const [sensacio, setSensacio]       = useState(initial?.sensacio_post ?? "");
  const [notes, setNotes]             = useState(initial?.notes ?? "");

  // AI results
  const [aiEstrategia, setAiEstrategia] = useState(initial?.estrategia_ia ?? "");
  const [aiAlertes, setAiAlertes]       = useState<Array<{ tipus: string; missatge: string }>>(initial?.alertes_ia ?? []);
  const [aiImpacte, setAiImpacte]       = useState(initial?.impacte_ia ?? "");
  const [aiUpdated, setAiUpdated]       = useState(initial?.ai_updated_at ?? "");
  const [aiError, setAiError]           = useState("");

  // Interaction form
  const [intData, setIntData]   = useState(new Date().toISOString().slice(0, 10));
  const [intQual, setIntQual]   = useState<number | null>(null);
  const [intSens, setIntSens]   = useState("");
  const [intNotes, setIntNotes] = useState("");

  // ── Helpers ──
  const catOption = CAT_OPTIONS.find(c => c.val === categoria)!;
  const tretsList = Object.keys(trets);

  function toggleTret(t: string) {
    setTrets(prev => {
      const cur = prev[t] ?? 0;
      if (cur === 0) return { ...prev, [t]: 1 };
      if (cur === 1) return { ...prev, [t]: 2 };
      const next = { ...prev };
      delete next[t];
      return next;
    });
  }

  function getTretIntensity(t: string): 0 | 1 | 2 {
    const v = trets[t] ?? 0;
    return v === 0 ? 0 : v === 1 ? 1 : 2;
  }

  function setKpi(key: string, v: number | null) {
    setKpis(prev => ({ ...prev, [key]: v }));
  }

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (initial?.id) fd.set("id", initial.id);
    fd.set("avatar_emoji", emoji);
    fd.set("rol_vital", rolText || rolCodi);
    fd.set("rol_vital_codi", rolCodi);
    fd.set("perfil_conductual", JSON.stringify(tretsList));
    fd.set("intensitat_perfil", JSON.stringify(trets));

    const dims: Record<string, number | null> = { energia, claredat, autenticitat: autenticitat, alineacio, profunditat, confianca };
    Object.entries(dims).forEach(([k, v]) => { if (v != null) fd.set(k, String(v)); });
    Object.entries(kpis).forEach(([k, v]) => { if (v != null) fd.set(k, String(v)); });

    startTransition(async () => {
      const { id } = await savePersona(fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      if (!initial?.id) router.replace(`/dashboard/diario/ecosistema/${id}`);
    });
  }

  function handleAnalyze() {
    if (!initial?.id) return;
    setAiError("");
    startAnalyzeTransition(async () => {
      try {
        const result = await analyzePersona(initial.id);
        setAiEstrategia(result.estrategia);
        setAiAlertes(result.alertes);
        setAiImpacte(result.impacte);
        setAiUpdated(new Date().toISOString());
      } catch (err) {
        setAiError(err instanceof Error ? err.message : "Error desconegut");
      }
    });
  }

  function handleAddInteraccio() {
    const fd = new FormData();
    fd.set("persona_id", initial!.id);
    fd.set("data", intData);
    if (intQual) fd.set("qualitat", String(intQual));
    if (intSens) fd.set("sensacio", intSens);
    if (intNotes) fd.set("notes", intNotes);
    startIntTransition(async () => {
      await saveInteraccio(fd);
      setShowAddInteraccio(false);
      setIntQual(null); setIntSens(""); setIntNotes("");
    });
  }

  const selectedRolOption = ROL_VITAL_GROUPS
    .flatMap(g => g.options)
    .find(o => o.val === rolCodi);

  return (
    <div className="min-h-screen" style={{ backgroundColor: BG, color: TEXT }}>
      <div className="max-w-2xl mx-auto px-5 md:px-8 py-8 space-y-4">

        {/* Nav */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard/diario/ecosistema"
            className="text-[10px] font-bold uppercase tracking-[0.2em] hover:opacity-70"
            style={{ color: LABEL }}>
            ← Ecosistema
          </Link>
        </div>

        {/* Identity header */}
        <div className="flex items-center gap-5 py-3">
          <div className="relative group shrink-0">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl cursor-pointer transition-all"
              style={{ backgroundColor: `${catOption.color}15`, border: `2px solid ${catOption.color}30` }}>
              {emoji}
            </div>
            <div className="absolute top-18 left-0 z-10 hidden group-hover:flex flex-wrap gap-1 p-2 rounded-xl shadow-2xl w-52"
              style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER2}` }}>
              {EMOJIS.map(e => (
                <button key={e} type="button" onClick={() => setEmoji(e)}
                  className="text-xl hover:scale-125 transition-transform p-0.5">
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[22px] font-black leading-tight" style={{ color: nom ? TEXT : DIM }}>
              {nom || "Nom de la persona"}
            </p>
            {(selectedRolOption?.label || rolText) && (
              <p className="text-[12px] mt-0.5" style={{ color: LABEL }}>
                {selectedRolOption?.label || rolText}
              </p>
            )}
            <span className="text-[9px] font-bold px-2 py-0.5 rounded mt-1 inline-block"
              style={{ backgroundColor: `${catOption.color}20`, color: catOption.color }}>
              {catOption.label}
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">

          {/* ── Identitat ─── */}
          <Section label="Identitat" accent={catOption.color}>
            <Field label="Nom complet">
              <DInput name="nom" value={nom} onChange={setNom} placeholder="Nom…" />
            </Field>

            <Field label="Categoria orbital">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1">
                {CAT_OPTIONS.map(c => (
                  <button key={c.val} type="button" onClick={() => { setCategoria(c.val); if (c.val !== "familia") setSubcat(""); }}
                    className="text-left p-3 rounded-xl transition-all"
                    style={{
                      border: `1px solid ${categoria === c.val ? c.color : BORDER}`,
                      backgroundColor: categoria === c.val ? `${c.color}12` : SURFACE,
                    }}>
                    <p className="text-[11px] font-bold" style={{ color: c.color }}>{c.label}</p>
                    <p className="text-[9px] mt-0.5" style={{ color: DIM }}>{c.desc}</p>
                  </button>
                ))}
              </div>
              <input type="hidden" name="categoria" value={categoria} />
            </Field>

            {/* Família subcategory */}
            {categoria === "familia" && (
              <Field label="Dinàmica familiar">
                <div className="flex flex-wrap gap-2 mt-1">
                  {SUBCATEGORIES_FAMILIAR.map(s => (
                    <button key={s.val} type="button"
                      onClick={() => setSubcat(subcat === s.val ? "" : s.val)}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                      style={{
                        border: `1px solid ${subcat === s.val ? COPPER : BORDER}`,
                        backgroundColor: subcat === s.val ? `${COPPER}18` : SURFACE,
                        color: subcat === s.val ? COPPER : LABEL,
                      }}>
                      {s.label}
                    </button>
                  ))}
                </div>
                <input type="hidden" name="subcategoria_familiar" value={subcat} />
              </Field>
            )}

            {/* Rol vital */}
            <Field label="Rol vital">
              <select
                value={rolCodi}
                onChange={e => {
                  setRolCodi(e.target.value);
                  const found = ROL_VITAL_GROUPS.flatMap(g => g.options).find(o => o.val === e.target.value);
                  if (found) setRolText(found.label);
                }}
                className="w-full outline-none text-[12px] py-2 px-0"
                style={{
                  background: "transparent",
                  border: "none",
                  borderBottom: `1px solid ${BORDER2}`,
                  color: rolCodi ? TEXT : DIM,
                  cursor: "pointer",
                }}>
                <option value="" style={{ backgroundColor: CARD }}>Selecciona un rol…</option>
                {ROL_VITAL_GROUPS.map(g => (
                  <optgroup key={g.group} label={g.group} style={{ backgroundColor: CARD }}>
                    {g.options.map(o => (
                      <option key={o.val} value={o.val} style={{ backgroundColor: CARD }}>{o.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <input type="hidden" name="rol_vital_codi" value={rolCodi} />

              {/* Custom text override */}
              <div className="mt-3">
                <DInput name="rol_vital" value={rolText} onChange={setRolText}
                  placeholder="O escriu el rol manualment…" />
              </div>
            </Field>
          </Section>

          {/* ── Perfil Conductual ─── */}
          <Section label="Perfil Conductual" accent={GOLD}>
            <p className="text-[10px]" style={{ color: DIM }}>
              Clica una vegada per activar, dues per marcar com a intens, tres per desactivar.
            </p>
            <div className="space-y-4">
              {TRETS_CONDUCTUALS.map(grup => (
                <div key={grup.grup}>
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: DIM }}>
                    {grup.grup}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {grup.trets.map(t => (
                      <TraitChip key={t} tret={t} intensity={getTretIntensity(t)} onToggle={() => toggleTret(t)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {tretsList.length > 0 && (
              <div className="mt-2 p-3 rounded-xl" style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}` }}>
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: LABEL }}>
                  Trets actius ({tretsList.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {tretsList.map(t => (
                    <span key={t} className="text-[9px] px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: trets[t] === 2 ? `${GOLD}25` : `${GOLD}12`,
                        color: trets[t] === 2 ? GOLD : LABEL,
                        fontWeight: trets[t] === 2 ? 700 : 400,
                      }}>
                      {trets[t] === 2 ? "●" : "○"} {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <input type="hidden" name="perfil_conductual" value={JSON.stringify(tretsList)} />
            <input type="hidden" name="intensitat_perfil" value={JSON.stringify(trets)} />
          </Section>

          {/* ── Dimensions percebudes ─── */}
          <Section label="Dimensions Percebudes" accent={BLUE}>
            <div className="space-y-3">
              <RatingBar name="energia"      label="Energia"       value={energia}    onChange={setEnergia} />
              <RatingBar name="claredat"     label="Claredat"      value={claredat}   onChange={setClaredat} />
              <RatingBar name="autenticitat" label="Autenticitat"  value={autenticitat} onChange={setAutent} />
              <RatingBar name="alineacio"    label="Alineació vital" value={alineacio} onChange={setAlineacio} />
              <RatingBar name="profunditat"  label="Profunditat"   value={profunditat} onChange={setProfund} />
              <RatingBar name="confianca"    label="Confiança"     value={confianca}  onChange={setConfianca} />
            </div>
          </Section>

          {/* ── Risc Relacional ─── */}
          <Section label="Risc Relacional" accent="#C4580A">
            <p className="text-[10px]" style={{ color: DIM }}>
              Cartografia l&apos;impacte energètic i estratègic d&apos;aquesta relació.
            </p>
            <div className="space-y-4">
              {KPI_LIST.map(k => (
                <KpiGauge key={k.key} kpiKey={k.key} label={k.label}
                  value={kpis[k.key] ?? null}
                  onChange={v => setKpi(k.key, v)}
                  lowGood={k.lowGood} />
              ))}
            </div>
          </Section>

          {/* ── Estat i sensació ─── */}
          <Section label="Estat i Sensació" accent={COPPER}>
            <Field label="Estat de la relació">
              <div className="flex flex-wrap gap-2 mt-1">
                {ESTAT_OPTIONS.map(e => (
                  <button key={e} type="button" onClick={() => setEstat(estat === e ? "" : e)}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                    style={{
                      border: `1px solid ${estat === e ? R : BORDER}`,
                      backgroundColor: estat === e ? `${R}18` : SURFACE,
                      color: estat === e ? R : LABEL,
                    }}>
                    {e}
                  </button>
                ))}
              </div>
              <input type="hidden" name="estat_relacional" value={estat} />
            </Field>

            <Field label="Sensació habitual post-interacció">
              <div className="flex flex-wrap gap-2 mt-1">
                {SENSACIO_OPTIONS.map(s => (
                  <button key={s} type="button" onClick={() => setSensacio(sensacio === s ? "" : s)}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                    style={{
                      border: `1px solid ${sensacio === s ? GOLD : BORDER}`,
                      backgroundColor: sensacio === s ? `${GOLD}18` : SURFACE,
                      color: sensacio === s ? GOLD : LABEL,
                    }}>
                    {s}
                  </button>
                ))}
              </div>
              <input type="hidden" name="sensacio_post" value={sensacio} />
            </Field>
          </Section>

          {/* ── Observacions ─── */}
          <Section label="Observacions">
            <Field label="Context, dinàmiques, evolució">
              <DTextarea name="notes" value={notes} onChange={setNotes} rows={4}
                placeholder="Notes sobre la relació, moments clau, patrons observats…" />
            </Field>
          </Section>

          {/* Save button */}
          <div className="flex items-center justify-between pt-1 pb-2">
            <span className="text-[10px] font-semibold transition-opacity"
              style={{ color: GREEN, opacity: saved ? 1 : 0 }}>
              ✓ Guardat
            </span>
            <button type="submit" disabled={!nom || isPending}
              className="px-6 py-2.5 rounded-xl text-[12px] font-bold transition-all disabled:opacity-40 hover:opacity-80"
              style={{ backgroundColor: R, color: "#FFF" }}>
              {isPending ? "Guardant…" : initial ? "Guardar canvis" : "Afegir al sistema"}
            </button>
          </div>
        </form>

        {/* ── Intel·ligència IA ─── */}
        {initial && (
          <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${R}30`, backgroundColor: CARD }}>
            <div className="px-5 py-3 flex items-center justify-between"
              style={{ backgroundColor: `${R}08`, borderBottom: `1px solid ${R}20` }}>
              <div className="flex items-center gap-2.5">
                <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: R }} />
                <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: R }}>
                  Analista Relacional
                </p>
              </div>
              <div className="flex items-center gap-3">
                {aiUpdated && (
                  <span className="text-[9px]" style={{ color: DIM }}>
                    {new Date(aiUpdated).toLocaleDateString("ca-ES", { day: "numeric", month: "short" })}
                  </span>
                )}
                <button type="button" onClick={handleAnalyze} disabled={isAnalyzing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all disabled:opacity-50 hover:opacity-80"
                  style={{ backgroundColor: `${R}20`, color: R, border: `1px solid ${R}30` }}>
                  {isAnalyzing ? (
                    <>
                      <span className="animate-spin inline-block">◌</span>
                      Analitzant…
                    </>
                  ) : (
                    <>◎ Generar Anàlisi</>
                  )}
                </button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {aiError && (
                <p className="text-[11px] p-3 rounded-xl" style={{ backgroundColor: "#C4280A20", color: "#C4280A" }}>
                  {aiError}
                </p>
              )}

              {!aiEstrategia && !isAnalyzing && (
                <div className="text-center py-6">
                  <p className="text-[28px] mb-2">◎</p>
                  <p className="text-[12px]" style={{ color: DIM }}>
                    Genera una anàlisi relacional basada en el perfil d&apos;aquesta persona.
                  </p>
                </div>
              )}

              {aiEstrategia && (
                <>
                  {/* Estratègia */}
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: LABEL }}>
                      Estratègia d&apos;Interacció
                    </p>
                    <div className="rounded-xl p-4" style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}` }}>
                      <p className="text-[12px] leading-relaxed whitespace-pre-line" style={{ color: TEXT }}>
                        {aiEstrategia}
                      </p>
                    </div>
                  </div>

                  {/* Alertes */}
                  {aiAlertes.length > 0 && (
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: LABEL }}>
                        Alertes IA
                      </p>
                      <AlertesList alertes={aiAlertes} />
                    </div>
                  )}

                  {/* Impacte */}
                  {aiImpacte && (
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: LABEL }}>
                        Impacte sobre el Sistema Vital
                      </p>
                      <div className="rounded-xl p-4" style={{ backgroundColor: `${R}06`, border: `1px solid ${R}20` }}>
                        <p className="text-[12px] leading-relaxed italic" style={{ color: DIM }}>
                          {aiImpacte}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Historial d'interaccions ─── */}
        {initial && (
          <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, backgroundColor: CARD }}>
            <div className="px-5 py-3 flex items-center justify-between"
              style={{ backgroundColor: SURFACE, borderBottom: `1px solid ${BORDER}` }}>
              <div className="flex items-center gap-2.5">
                <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: BLUE }} />
                <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: BLUE }}>
                  Historial d&apos;Interaccions
                </p>
              </div>
              <button type="button" onClick={() => setShowAddInteraccio(!showAddInteraccio)}
                className="text-[10px] font-bold hover:opacity-70" style={{ color: BLUE }}>
                + Registrar
              </button>
            </div>

            <div className="p-5 space-y-3">
              {showAddInteraccio && (
                <div className="rounded-xl p-4 space-y-3" style={{ border: `1px solid ${BORDER2}`, backgroundColor: SURFACE }}>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Data">
                      <input type="date" value={intData} onChange={e => setIntData(e.target.value)}
                        className="outline-none text-[12px] w-full"
                        style={{ background: "transparent", border: "none", borderBottom: `1px solid ${BORDER2}`, paddingBottom: "6px", color: TEXT }} />
                    </Field>
                    <Field label="Qualitat (1–5)">
                      <div className="flex gap-1.5">
                        {[1,2,3,4,5].map(n => (
                          <button key={n} type="button" onClick={() => setIntQual(intQual === n ? null : n)}
                            className="w-7 h-7 rounded-lg text-[11px] font-bold transition-all"
                            style={{
                              backgroundColor: intQual === n ? R : SURFACE,
                              border: `1px solid ${intQual === n ? R : BORDER}`,
                              color: intQual === n ? "#FFF" : DIM,
                            }}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </Field>
                  </div>
                  <Field label="Sensació">
                    <div className="flex flex-wrap gap-1.5">
                      {SENSACIO_OPTIONS.map(s => (
                        <button key={s} type="button" onClick={() => setIntSens(intSens === s ? "" : s)}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
                          style={{
                            border: `1px solid ${intSens === s ? GOLD : BORDER}`,
                            color: intSens === s ? GOLD : LABEL,
                            backgroundColor: intSens === s ? `${GOLD}15` : "transparent",
                          }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Notes">
                    <input value={intNotes} onChange={e => setIntNotes(e.target.value)}
                      placeholder="Context de la interacció…"
                      className="w-full outline-none text-[12px]"
                      style={{ background: "transparent", border: "none", borderBottom: `1px solid ${BORDER2}`, paddingBottom: "6px", color: TEXT }} />
                  </Field>
                  <button type="button" disabled={intPending} onClick={handleAddInteraccio}
                    className="px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40 hover:opacity-80"
                    style={{ backgroundColor: BLUE, color: "#FFF" }}>
                    {intPending ? "Guardant…" : "Registrar interacció"}
                  </button>
                </div>
              )}

              {interaccions.length === 0 && !showAddInteraccio && (
                <p className="text-[11px] py-4 text-center" style={{ color: DIM }}>
                  Sense interaccions registrades
                </p>
              )}

              {interaccions.map(it => (
                <div key={it.id} className="flex items-start gap-3 py-2.5"
                  style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <span className="text-[10px] tabular-nums shrink-0 mt-0.5" style={{ color: DIM }}>
                    {new Date(it.data + "T12:00:00").toLocaleDateString("ca-ES", { day: "numeric", month: "short" })}
                  </span>
                  <div className="flex-1 min-w-0">
                    {it.sensacio && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded mr-2"
                        style={{ backgroundColor: `${GOLD}18`, color: GOLD }}>
                        {it.sensacio}
                      </span>
                    )}
                    {it.notes && <span className="text-[11px]" style={{ color: DIM }}>{it.notes}</span>}
                  </div>
                  {it.qualitat && (
                    <span className="text-[10px] font-black tabular-nums shrink-0" style={{ color: R }}>
                      {it.qualitat}/5
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
