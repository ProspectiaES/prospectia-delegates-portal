"use client";

import { useState, useTransition, useEffect } from "react";
import { saveDiarioEntry } from "@/app/actions/diario";
import type { GarminDayData } from "@/lib/garmin";

// ─── Types ────────────────────────────────────────────────────────────────────

type Objectiu = { categoria: string; objectiu: string; accio: string; nota: number | null };

type RitualMat = {
  aixecat_6: boolean; respirat: boolean; meditacio: boolean;
  missio: boolean; llegit: boolean; tasca_clau: boolean; sentir: boolean;
};

const RITUAL_LABELS: Record<keyof RitualMat, string> = {
  aixecat_6:  "Aixecat a les 6:00",
  respirat:   "Respiració conscient",
  meditacio:  "Meditació",
  missio:     "Lectura de la missió",
  llegit:     "Lectura 20 min",
  tasca_clau: "Tasca clau iniciada",
  sentir:     "Sentir (visualització)",
};

const ACTIVITAT_TIPUS = [
  { val: "", label: "Selecciona…" },
  { val: "running",  label: "Córrer" },
  { val: "caminar",  label: "Caminar" },
  { val: "ciclisme", label: "Ciclisme" },
  { val: "natacio",  label: "Natació" },
  { val: "gimnàs",   label: "Gimnàs / Força" },
  { val: "mobilitat", label: "Ioga / Mobilitat" },
  { val: "altra",    label: "Altra activitat" },
];

export interface DiarioEntry {
  fecha: string; hora_inici?: string | null; estat_anim?: number | null;
  energia?: number | null; focus_mat?: number | null; son_hores?: number | null;
  serenitat?: number | null; temps?: string | null; efemeride?: string | null;
  nota_dia?: number | null; tasca_clau?: string | null;
  disciplina_compromis?: string | null; espai_lliure?: string | null;
  reflexio_personal?: string | null; objectius_dia?: Objectiu[] | null;
  ritual_mat?: Partial<RitualMat> | null; activitats?: string | null;
  examen_vespre?: string | null; tasca_completada?: boolean | null;
  disciplina_complerta?: boolean | null; criteri_mantingut?: boolean | null;
  resultat?: string | null; av_disciplina?: number | null;
  av_mentalitat?: number | null; av_excelencia?: number | null;
  av_relacions?: number | null; av_serenitat?: number | null;
  avui_menduc?: string | null; running_km?: number | null;
  running_min?: number | null; running_notes?: string | null;
  activitat_tipus?: string | null; act_fc_mit?: number | null; act_fc_max?: number | null;
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const R = "#7D1120";    // Prospectia red
const BK = "#1C1510";  // Near-black warm
const BORDER = "#E4DDD5";
const LABEL = "#9A8E82";
const DIM = "#B0A498";

// ─── Section card ─────────────────────────────────────────────────────────────

function Section({ label, children, accent }: {
  label: string; children: React.ReactNode; accent?: boolean;
}) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ border: `1px solid ${BORDER}`, backgroundColor: "#FFF" }}>
      <div className="px-5 py-3 flex items-center gap-2"
        style={{
          backgroundColor: accent ? R : "#FBF8F5",
          borderBottom: `1px solid ${BORDER}`,
        }}>
        <div className="w-1 h-3.5 rounded-full shrink-0"
          style={{ backgroundColor: accent ? "rgba(255,255,255,0.5)" : R }} />
        <p className="text-[11px] font-bold uppercase tracking-[0.15em]"
          style={{ color: accent ? "#FFF" : R }}>
          {label}
        </p>
      </div>
      <div className="p-5 space-y-5">
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: LABEL }}>
        {label}
      </p>
      {children}
    </div>
  );
}

function TInput({ name, value, onChange, placeholder, type = "text" }: {
  name: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type} name={name} value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full outline-none text-[13px] font-medium transition-colors"
      style={{
        background: "transparent", border: "none",
        borderBottom: `1.5px solid ${BORDER}`,
        paddingBottom: "7px", color: BK,
      }}
      onFocus={e => (e.target.style.borderBottomColor = R)}
      onBlur={e => (e.target.style.borderBottomColor = BORDER)}
    />
  );
}

function TArea({ name, value, onChange, placeholder, rows = 3 }: {
  name: string; value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      name={name} value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder} rows={rows}
      className="w-full outline-none resize-none text-[13px] leading-relaxed"
      style={{
        background: "transparent", border: "none",
        borderBottom: `1.5px solid ${BORDER}`,
        paddingBottom: "7px", color: BK,
      }}
    />
  );
}

function Stars({ name, value, onChange }: {
  name: string; value: number | null; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button"
          onClick={() => onChange(value === n ? 0 : n)}
          className="text-lg transition-colors"
          style={{ color: value && n <= value ? "#C4964A" : "#DDD5C8" }}>
          ★
        </button>
      ))}
      <input type="hidden" name={name} value={value ?? ""} />
    </div>
  );
}

function GarminNum({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="text-center">
      <p className="text-[9px] font-semibold uppercase tracking-[0.1em] mb-1" style={{ color: LABEL }}>{label}</p>
      <p className="text-[20px] font-black tabular-nums" style={{ color: value ? BK : "#D0C8C0" }}>
        {value ?? "–"}
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DiarioForm({ fecha, initial, fraseSetmana }: {
  fecha: string; initial: DiarioEntry | null; fraseSetmana?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [garminLoading, setGarminLoading] = useState(false);
  const [garminMsg, setGarminMsg] = useState<string | null>(null);
  const [garminData, setGarminData] = useState<GarminDayData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  const [horaInici, setHoraInici]     = useState(initial?.hora_inici ?? "");
  const [estatAnim, setEstatAnim]     = useState<number | null>(initial?.estat_anim ?? null);
  const [energia, setEnergia]         = useState<number | null>(initial?.energia ?? null);
  const [focusMat, setFocusMat]       = useState<number | null>(initial?.focus_mat ?? null);
  const [sonHores, setSonHores]       = useState(String(initial?.son_hores ?? ""));
  const [serenitat, setSerenitat]     = useState<number | null>(initial?.serenitat ?? null);
  const [temps, setTemps]             = useState(initial?.temps ?? "");
  const [efemeride, setEfemeride]     = useState(initial?.efemeride ?? "");
  const [notaDia, setNotaDia]         = useState<number | null>(initial?.nota_dia ?? null);
  const [tascaClau, setTascaClau]             = useState(initial?.tasca_clau ?? "");
  const [disciplina, setDisciplina]           = useState(initial?.disciplina_compromis ?? "");
  const [espaiLliure, setEspaiLliure]         = useState(initial?.espai_lliure ?? "");
  const [reflexio, setReflexio]               = useState(initial?.reflexio_personal ?? "");
  const [objectius, setObjectius]             = useState<Objectiu[]>((initial?.objectius_dia as Objectiu[]) ?? []);
  const [ritual, setRitual] = useState<RitualMat>({
    aixecat_6:  (initial?.ritual_mat as Partial<RitualMat>)?.aixecat_6  ?? false,
    respirat:   (initial?.ritual_mat as Partial<RitualMat>)?.respirat   ?? false,
    meditacio:  (initial?.ritual_mat as Partial<RitualMat>)?.meditacio  ?? false,
    missio:     (initial?.ritual_mat as Partial<RitualMat>)?.missio     ?? false,
    llegit:     (initial?.ritual_mat as Partial<RitualMat>)?.llegit     ?? false,
    tasca_clau: (initial?.ritual_mat as Partial<RitualMat>)?.tasca_clau ?? false,
    sentir:     (initial?.ritual_mat as Partial<RitualMat>)?.sentir     ?? false,
  });
  const [activitats, setActivitats]           = useState(initial?.activitats ?? "");
  const [examenVespre, setExamenVespre]       = useState(initial?.examen_vespre ?? "");
  const [tascaCompletada, setTascaCompletada] = useState(initial?.tasca_completada ?? false);
  const [disciplinaComp, setDisciplinaComp]   = useState(initial?.disciplina_complerta ?? false);
  const [criteriMantingut, setCriteriMantingut] = useState(initial?.criteri_mantingut ?? false);
  const [resultat, setResultat]               = useState(initial?.resultat ?? "");
  const [avDisciplina, setAvDisciplina]   = useState<number | null>(initial?.av_disciplina ?? null);
  const [avMentalitat, setAvMentalitat]   = useState<number | null>(initial?.av_mentalitat ?? null);
  const [avExcelencia, setAvExcelencia]   = useState<number | null>(initial?.av_excelencia ?? null);
  const [avRelacions, setAvRelacions]     = useState<number | null>(initial?.av_relacions ?? null);
  const [avSerenitat, setAvSerenitat]     = useState<number | null>(initial?.av_serenitat ?? null);
  const [avuiMenduc, setAvuiMenduc]       = useState(initial?.avui_menduc ?? "");
  const [runningKm, setRunningKm]         = useState(initial?.running_km != null ? String(initial.running_km) : "");
  const [runningMin, setRunningMin]       = useState(initial?.running_min != null ? String(initial.running_min) : "");
  const [runningNotes, setRunningNotes]   = useState(initial?.running_notes ?? "");
  const [actTipus, setActTipus]           = useState(initial?.activitat_tipus ?? "");
  const [actFcMit, setActFcMit]           = useState(initial?.act_fc_mit != null ? String(initial.act_fc_mit) : "");
  const [actFcMax, setActFcMax]           = useState(initial?.act_fc_max != null ? String(initial.act_fc_max) : "");

  // Auto-fetch weather if not filled
  useEffect(() => {
    if (temps) return;
    setWeatherLoading(true);
    fetch("https://wttr.in/?format=3&lang=ca")
      .then(r => r.text())
      .then(t => { setTemps(t.trim()); })
      .catch(() => {})
      .finally(() => setWeatherLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addObjectiu() { setObjectius(p => [...p, { categoria: "", objectiu: "", accio: "", nota: null }]); }
  function removeObjectiu(i: number) { setObjectius(p => p.filter((_, j) => j !== i)); }
  function updateObjectiu(i: number, f: keyof Objectiu, v: string | number | null) {
    setObjectius(p => p.map((o, j) => j === i ? { ...o, [f]: v } : o));
  }

  async function syncGarmin() {
    setGarminLoading(true); setGarminMsg(null);
    try {
      const res = await fetch(`/api/garmin/day?date=${fecha}`);
      const json = await res.json() as { ok: boolean; data?: GarminDayData; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Error desconegut");
      const d = json.data!;
      setGarminData(d);
      if (d.son_hores  != null) setSonHores(String(d.son_hores));
      if (d.energia    != null) setEnergia(d.energia);
      if (d.serenitat  != null) setSerenitat(d.serenitat);
      if (d.running_km != null) setRunningKm(String(d.running_km));
      if (d.running_min != null) setRunningMin(String(d.running_min));
      setGarminMsg(d.origen.length > 0 ? d.origen.join(", ") : "Cap dada nova");
    } catch (e) { setGarminMsg(`Error: ${(e as Error).message}`); }
    finally { setGarminLoading(false); }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("objectius_dia", JSON.stringify(objectius));
    fd.set("ritual_mat", JSON.stringify(ritual));
    fd.set("tasca_completada", String(tascaCompletada));
    fd.set("disciplina_complerta", String(disciplinaComp));
    fd.set("criteri_mantingut", String(criteriMantingut));
    if (runningKm) fd.set("running_km", runningKm);
    if (runningMin) fd.set("running_min", runningMin);
    if (actFcMit) fd.set("act_fc_mit", actFcMit);
    if (actFcMax) fd.set("act_fc_max", actFcMax);
    startTransition(async () => {
      await saveDiarioEntry(fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  const kmVal = parseFloat(runningKm);
  const minVal = parseFloat(runningMin);
  const pace = (!isNaN(kmVal) && !isNaN(minVal) && kmVal > 0 && minVal > 0)
    ? (() => { const s = (minVal / kmVal) * 60; const m = Math.floor(s / 60); return `${m}:${String(Math.round(s % 60)).padStart(2, "0")} min/km`; })()
    : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-16">
      <input type="hidden" name="fecha" value={fecha} />

      {/* ── Frase setmanal ── */}
      {fraseSetmana && (
        <div className="rounded-2xl p-4 flex items-start gap-3"
          style={{ backgroundColor: "#FBF8F5", border: `1px solid ${BORDER}` }}>
          <div className="w-0.5 self-stretch rounded-full shrink-0 mt-0.5" style={{ backgroundColor: R }} />
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-1.5" style={{ color: LABEL }}>
              Frase de la setmana
            </p>
            <p className="text-[13px] italic leading-relaxed" style={{ color: "#5C5048" }}>
              &ldquo;{fraseSetmana}&rdquo;
            </p>
            <a href="/dashboard/diario/planificacio/missio"
              className="text-[10px] font-semibold mt-2 inline-block hover:underline"
              style={{ color: R }}>
              Llegir la missió personal →
            </a>
          </div>
        </div>
      )}

      {/* ── Matí ── */}
      <Section label="Matí · Estat del sistema">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Hora d'inici">
            <input type="time" name="hora_inici" value={horaInici}
              onChange={e => setHoraInici(e.target.value)}
              className="outline-none w-full text-[14px] font-semibold"
              style={{ background: "transparent", border: "none", borderBottom: `1.5px solid ${BORDER}`, paddingBottom: "7px", color: BK }} />
          </Field>
          <Field label="Son (hores)">
            <input type="number" name="son_hores" value={sonHores}
              onChange={e => setSonHores(e.target.value)}
              min={0} max={24} step={0.5} placeholder="7.0"
              className="outline-none w-full text-[14px] font-semibold"
              style={{ background: "transparent", border: "none", borderBottom: `1.5px solid ${BORDER}`, paddingBottom: "7px", color: BK }} />
          </Field>
          <Field label={`Temps${weatherLoading ? " (…)" : ""}`}>
            <TInput name="temps" value={temps} onChange={setTemps} placeholder="Sol, núvols…" />
          </Field>
          <Field label="Efemèride">
            <TInput name="efemeride" value={efemeride} onChange={setEfemeride} placeholder="Data rellevant…" />
          </Field>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 pt-1">
          {([
            ["Estat d'ànim", "estat_anim", estatAnim, setEstatAnim],
            ["Energia",      "energia",    energia,   setEnergia],
            ["Focus",        "focus_mat",  focusMat,  setFocusMat],
            ["Serenitat",    "serenitat",  serenitat, setSerenitat],
          ] as const).map(([label, name, val, setVal]) => (
            <Field key={name} label={label}>
              <Stars name={name} value={val} onChange={setVal as (v: number) => void} />
            </Field>
          ))}
        </div>
      </Section>

      {/* ── Ritual matinal ── */}
      <Section label="Ritual matinal">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-1">
          {(Object.keys(RITUAL_LABELS) as (keyof RitualMat)[]).map(key => (
            <button key={key} type="button"
              onClick={() => setRitual(r => ({ ...r, [key]: !r[key] }))}
              className="flex items-center gap-3 py-2.5 px-1 text-left rounded-lg transition-all hover:bg-gray-50">
              <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-all"
                style={{
                  borderColor: ritual[key] ? R : BORDER,
                  backgroundColor: ritual[key] ? R : "transparent",
                }}>
                {ritual[key] && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="white" strokeWidth="1.8">
                    <path d="M1 4l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-[13px] font-medium" style={{ color: ritual[key] ? BK : DIM }}>
                {RITUAL_LABELS[key]}
              </span>
            </button>
          ))}
        </div>
      </Section>

      {/* ── Planificació matinal ── */}
      <Section label="Planificació del dia" accent>
        <Field label="Tasca clau del dia">
          <TInput name="tasca_clau" value={tascaClau} onChange={setTascaClau} placeholder="Verb + resultat esperat…" />
        </Field>
        <Field label="Disciplina · Compromís">
          <TInput name="disciplina_compromis" value={disciplina} onChange={setDisciplina} placeholder="Sense sucre, exercici 45 min…" />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Espai lliure">
            <TArea name="espai_lliure" value={espaiLliure} onChange={setEspaiLliure} placeholder="El que tinguis al cap…" rows={2} />
          </Field>
          <Field label="Reflexió personal">
            <TArea name="reflexio_personal" value={reflexio} onChange={setReflexio} placeholder="Qui vull ser avui?" rows={2} />
          </Field>
        </div>
      </Section>

      {/* ── Objectius ── */}
      <Section label="Objectius del dia">
        {objectius.length > 0 && (
          <div className="space-y-3">
            {objectius.map((o, i) => (
              <div key={i} className="grid grid-cols-[20px_1fr_1fr_1fr_32px_24px] gap-2 items-center">
                <span className="text-[10px] font-black tabular-nums" style={{ color: "#C0A890" }}>
                  {i + 1}
                </span>
                {(["categoria", "objectiu", "accio"] as const).map(f => (
                  <input key={f} value={o[f] as string}
                    onChange={e => updateObjectiu(i, f, e.target.value)}
                    placeholder={f === "categoria" ? "Àrea…" : f === "objectiu" ? "Objectiu…" : "Acció…"}
                    className="outline-none text-[12px]"
                    style={{ background: "transparent", border: "none", borderBottom: `1px solid ${BORDER}`, paddingBottom: "5px", color: BK }} />
                ))}
                <select value={o.nota ?? ""} onChange={e => updateObjectiu(i, "nota", e.target.value ? parseInt(e.target.value) : null)}
                  className="outline-none text-[11px]"
                  style={{ background: "transparent", border: "none", borderBottom: `1px solid ${BORDER}`, color: LABEL }}>
                  <option value="">–</option>
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <button type="button" onClick={() => removeObjectiu(i)}
                  className="text-[16px] transition-colors hover:text-red-500" style={{ color: DIM }}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <button type="button" onClick={addObjectiu}
          className="text-[11px] font-semibold transition-colors hover:underline"
          style={{ color: R }}>
          + Afegir objectiu
        </button>
      </Section>

      {/* ── Diari d'activitats ── */}
      <Section label="Diari d'activitats">
        <TArea name="activitats" value={activitats} onChange={setActivitats}
          placeholder="Com ha anat el dia, converses importants, decisions, emocions…" rows={5} />
      </Section>

      {/* ── Activitat Física ── */}
      <Section label="Activitat Física">
        {/* Garmin sync */}
        <div className="flex items-center justify-between p-3 rounded-xl"
          style={{ backgroundColor: "#F5F0E8", border: `1px solid ${BORDER}` }}>
          <div>
            <p className="text-[11px] font-bold" style={{ color: BK }}>Garmin Connect</p>
            <p className="text-[10px]" style={{ color: LABEL }}>Importa son, FC, passos i activitat</p>
          </div>
          <button type="button" onClick={syncGarmin} disabled={garminLoading}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-40"
            style={{ backgroundColor: BK, color: "#FFF" }}>
            {garminLoading ? "Sincronitzant…" : "↻ Importar Garmin"}
          </button>
        </div>

        {/* Garmin stats */}
        {garminData && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 p-3 rounded-xl"
            style={{ backgroundColor: "#F9F2F0", border: `1px solid ${BORDER}` }}>
            <GarminNum label="Son" value={garminData.son_hores != null ? `${garminData.son_hores}h` : null} />
            <GarminNum label="FC repòs" value={garminData.rhr != null ? `${garminData.rhr}bpm` : null} />
            <GarminNum label="Energia" value={garminData.energia != null ? `${garminData.energia}/5` : null} />
            <GarminNum label="Serenitat" value={garminData.serenitat != null ? `${garminData.serenitat}/5` : null} />
            <GarminNum label="Passos" value={garminData.passos != null ? garminData.passos.toLocaleString("ca-ES") : null} />
            <GarminNum label="Km" value={garminData.running_km != null ? `${garminData.running_km}` : null} />
          </div>
        )}
        {garminMsg && (
          <p className="text-[10px] font-medium"
            style={{ color: garminMsg.startsWith("Error") ? "#8B2635" : "#2A7A4A" }}>
            {garminMsg}
          </p>
        )}

        {/* Manual activity */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-1">
          <Field label="Tipus activitat">
            <select name="activitat_tipus" value={actTipus} onChange={e => setActTipus(e.target.value)}
              className="outline-none text-[13px] w-full font-medium"
              style={{ background: "transparent", border: "none", borderBottom: `1.5px solid ${BORDER}`, paddingBottom: "7px", color: actTipus ? BK : LABEL }}>
              {ACTIVITAT_TIPUS.map(t => <option key={t.val} value={t.val}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Km / Distància">
            <input type="number" name="running_km" value={runningKm}
              onChange={e => setRunningKm(e.target.value)}
              min={0} max={200} step={0.1} placeholder="0.0"
              className="outline-none w-full text-[14px] font-semibold"
              style={{ background: "transparent", border: "none", borderBottom: `1.5px solid ${BORDER}`, paddingBottom: "7px", color: BK }} />
          </Field>
          <Field label="Durada (min)">
            <input type="number" name="running_min" value={runningMin}
              onChange={e => setRunningMin(e.target.value)}
              min={0} max={600} placeholder="0"
              className="outline-none w-full text-[14px] font-semibold"
              style={{ background: "transparent", border: "none", borderBottom: `1.5px solid ${BORDER}`, paddingBottom: "7px", color: BK }} />
          </Field>
          <Field label="FC Mitjana (bpm)">
            <input type="number" name="act_fc_mit" value={actFcMit}
              onChange={e => setActFcMit(e.target.value)}
              min={30} max={220} placeholder="–"
              className="outline-none w-full text-[14px] font-semibold"
              style={{ background: "transparent", border: "none", borderBottom: `1.5px solid ${BORDER}`, paddingBottom: "7px", color: BK }} />
          </Field>
          <Field label="FC Màxima (bpm)">
            <input type="number" name="act_fc_max" value={actFcMax}
              onChange={e => setActFcMax(e.target.value)}
              min={30} max={220} placeholder="–"
              className="outline-none w-full text-[14px] font-semibold"
              style={{ background: "transparent", border: "none", borderBottom: `1.5px solid ${BORDER}`, paddingBottom: "7px", color: BK }} />
          </Field>
          {pace && (
            <Field label="Ritme">
              <p className="text-[14px] font-semibold pt-1" style={{ color: "#2A7A4A" }}>{pace}</p>
            </Field>
          )}
        </div>
        <Field label="Notes activitat">
          <TInput name="running_notes" value={runningNotes} onChange={setRunningNotes} placeholder="Ruta, sensacions…" />
        </Field>
      </Section>

      {/* ── Nota del dia ── */}
      <Section label="Nota del dia">
        <Field label="Valoració global">
          <Stars name="nota_dia" value={notaDia} onChange={setNotaDia} />
        </Field>
      </Section>

      {/* ── Examen de vespre ── */}
      <Section label="Examen de vespre">
        <TArea name="examen_vespre" value={examenVespre} onChange={setExamenVespre}
          placeholder="He actuat des dels meus valors? He estat coherent? Que repetiria?" rows={4} />
      </Section>

      {/* ── Check final ── */}
      <Section label="Check final del dia">
        <div className="space-y-1">
          {([
            ["Tasca clau completada", tascaCompletada, setTascaCompletada],
            ["Disciplina complerta", disciplinaComp, setDisciplinaComp],
            ["Criteri mantingut", criteriMantingut, setCriteriMantingut],
          ] as const).map(([label, val, setVal]) => (
            <button key={label} type="button"
              onClick={() => (setVal as (v: boolean) => void)(!val)}
              className="flex items-center gap-3 py-2 px-1 w-full text-left rounded-lg transition-all hover:bg-gray-50">
              <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-all"
                style={{ borderColor: val ? R : BORDER, backgroundColor: val ? R : "transparent" }}>
                {val && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="white" strokeWidth="1.8">
                    <path d="M1 4l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-[13px] font-medium" style={{ color: val ? BK : DIM }}>
                {label}
              </span>
            </button>
          ))}
        </div>
        <Field label="Avui he avançat perquè…">
          <TInput name="resultat" value={resultat} onChange={setResultat} placeholder="He tancat la proposta perquè…" />
        </Field>
      </Section>

      {/* ── Autoavaluació ── */}
      <Section label="Autoavaluació">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
          {([
            ["Disciplina",   "av_disciplina",  avDisciplina,  setAvDisciplina],
            ["Mentalitat",   "av_mentalitat",  avMentalitat,  setAvMentalitat],
            ["Excel·lència", "av_excelencia",  avExcelencia,  setAvExcelencia],
            ["Relacions",    "av_relacions",   avRelacions,   setAvRelacions],
            ["Serenitat",    "av_serenitat",   avSerenitat,   setAvSerenitat],
          ] as const).map(([label, name, val, setVal]) => (
            <Field key={name} label={label}>
              <Stars name={name} value={val} onChange={setVal as (v: number) => void} />
            </Field>
          ))}
        </div>
      </Section>

      {/* ── Tancament ── */}
      <Section label="Avui m'enduc…">
        <TArea name="avui_menduc" value={avuiMenduc} onChange={setAvuiMenduc}
          placeholder="La lliçó d'avui…" rows={3} />
      </Section>

      {/* ── Guardar ── */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-[11px] font-semibold transition-opacity"
          style={{ color: "#2A7A4A", opacity: saved ? 1 : 0 }}>
          ✓ Guardat correctament
        </span>
        <button type="submit" disabled={isPending}
          className="px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all disabled:opacity-40 hover:opacity-90"
          style={{ backgroundColor: R, color: "#FFF" }}>
          {isPending ? "Guardant…" : "Guardar entrada"}
        </button>
      </div>
    </form>
  );
}
