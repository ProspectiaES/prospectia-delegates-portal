"use client";

import { useState, useTransition } from "react";
import { saveDiarioEntry } from "@/app/actions/diario";
import type { GarminDayData } from "@/lib/garmin";

// ─── Types ────────────────────────────────────────────────────────────────────

type Objectiu = { categoria: string; objectiu: string; accio: string; nota: number | null };

type RitualMat = {
  aixecat_7: boolean; respirat: boolean; meditacio: boolean;
  missio: boolean; llegit: boolean; tasca_clau: boolean; sentir: boolean;
};

const RITUAL_LABELS: Record<keyof RitualMat, string> = {
  aixecat_7: "Aixecat a les 7:00", respirat: "Respiració conscient",
  meditacio: "Meditació", missio: "Lectura de la missió",
  llegit: "Lectura 20 min", tasca_clau: "Tasca clau iniciada",
  sentir: "Sentir (visualització)",
};

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
}

// ─── Design primitives ────────────────────────────────────────────────────────

const C = {
  bg:       "#050505",
  surface:  "#0A0908",
  border:   "#111",
  muted:    "#252220",
  label:    "#2A2520",
  text:     "#EDE8DF",
  accent:   "#7D1120",
  accentLo: "#3D0810",
};

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5" style={{ borderTop: `1px solid ${C.border}`, paddingTop: "28px" }}>
      <p className="text-[9px] font-bold uppercase tracking-[0.4em]" style={{ color: C.muted }}>
        {label}
      </p>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[8px] font-bold uppercase tracking-[0.3em]" style={{ color: C.muted }}>
        {label}
      </p>
      {children}
    </div>
  );
}

function TextInput({ name, value, onChange, placeholder, type = "text" }: {
  name: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type} name={name} value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full outline-none transition-colors"
      style={{
        background: "transparent",
        border: "none",
        borderBottom: `1px solid ${C.border}`,
        paddingBottom: "8px",
        fontSize: "14px",
        color: C.text,
        fontWeight: 500,
      }}
      onFocus={e => (e.target.style.borderBottomColor = C.accentLo)}
      onBlur={e => (e.target.style.borderBottomColor = C.border)}
    />
  );
}

function TextArea({ name, value, onChange, placeholder, rows = 3 }: {
  name: string; value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      name={name} value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder} rows={rows}
      className="w-full outline-none resize-none transition-colors"
      style={{
        background: "transparent",
        border: "none",
        borderBottom: `1px solid ${C.border}`,
        paddingBottom: "8px",
        fontSize: "13px",
        lineHeight: "1.7",
        color: C.text,
      }}
    />
  );
}

function StarBar({ name, value, onChange }: {
  name: string; value: number | null; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {[1,2,3,4,5].map(n => (
        <button
          key={n} type="button"
          onClick={() => onChange(value === n ? 0 : n)}
          className="w-6 h-6 flex items-center justify-center text-base transition-all"
          style={{ color: value && n <= value ? "#C4964A" : "#1E1C1A" }}
        >★</button>
      ))}
      <input type="hidden" name={name} value={value ?? ""} />
    </div>
  );
}

function GarminStat({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-[8px] font-bold uppercase tracking-[0.3em] mb-1.5" style={{ color: C.muted }}>{label}</p>
      <p className="text-[24px] font-black tabular-nums" style={{ color: value ? C.text : "#1E1C1A" }}>{value ?? "–"}</p>
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
  const [ritual, setRitual]                   = useState<RitualMat>({
    aixecat_7: initial?.ritual_mat?.aixecat_7 ?? false,
    respirat: initial?.ritual_mat?.respirat ?? false,
    meditacio: initial?.ritual_mat?.meditacio ?? false,
    missio: initial?.ritual_mat?.missio ?? false,
    llegit: initial?.ritual_mat?.llegit ?? false,
    tasca_clau: initial?.ritual_mat?.tasca_clau ?? false,
    sentir: initial?.ritual_mat?.sentir ?? false,
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
    if (runningNotes) fd.set("running_notes", runningNotes);
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
    <form onSubmit={handleSubmit} className="space-y-10 pb-16" style={{ color: C.text }}>
      <input type="hidden" name="fecha" value={fecha} />

      {/* Frase */}
      {fraseSetmana && (
        <div style={{ borderLeft: `1px solid ${C.accentLo}`, paddingLeft: "16px" }}>
          <p className="text-[8px] font-bold uppercase tracking-[0.35em] mb-2" style={{ color: C.accentLo }}>
            Frase de la setmana
          </p>
          <p className="text-[13px] italic leading-relaxed" style={{ color: "#9A8F85" }}>
            &ldquo;{fraseSetmana}&rdquo;
          </p>
        </div>
      )}

      {/* ── Dashboard ── */}
      <Section label="Dashboard del dia">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-6">
          <Field label="Nota del dia">
            <StarBar name="nota_dia" value={notaDia} onChange={setNotaDia} />
          </Field>
          <Field label="Hora d'inici">
            <input type="time" name="hora_inici" value={horaInici}
              onChange={e => setHoraInici(e.target.value)}
              className="outline-none"
              style={{ background: "transparent", border: "none", borderBottom: `1px solid ${C.border}`, paddingBottom: "8px", fontSize: "14px", color: C.text, fontWeight: 500, width: "100%" }} />
          </Field>
          <Field label="Son (hores)">
            <input type="number" name="son_hores" value={sonHores}
              onChange={e => setSonHores(e.target.value)}
              min={0} max={24} step={0.5} placeholder="7.5"
              className="outline-none w-24"
              style={{ background: "transparent", border: "none", borderBottom: `1px solid ${C.border}`, paddingBottom: "8px", fontSize: "14px", color: C.text, fontWeight: 500 }} />
          </Field>
          <Field label="Temps">
            <TextInput name="temps" value={temps} onChange={setTemps} placeholder="Sol, núvols…" />
          </Field>
          <Field label="Efemèride">
            <TextInput name="efemeride" value={efemeride} onChange={setEfemeride} placeholder="Data important…" />
          </Field>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6 pt-2">
          {([
            ["Estat d'ànim", "estat_anim", estatAnim, setEstatAnim],
            ["Energia", "energia", energia, setEnergia],
            ["Focus", "focus_mat", focusMat, setFocusMat],
            ["Serenitat", "serenitat", serenitat, setSerenitat],
          ] as const).map(([label, name, val, setVal]) => (
            <Field key={name} label={label}>
              <StarBar name={name} value={val} onChange={setVal as (v: number) => void} />
            </Field>
          ))}
        </div>
      </Section>

      {/* ── Garmin ── */}
      <Section label="Garmin Connect">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-x-8 gap-y-5 flex-1">
            <GarminStat label="Son"      value={garminData?.son_hores != null ? `${garminData.son_hores}h` : null} />
            <GarminStat label="FC repòs" value={garminData?.rhr != null ? `${garminData.rhr}` : null} />
            <GarminStat label="Energia"  value={garminData?.energia != null ? `${garminData.energia}/5` : null} />
            <GarminStat label="Serenitat" value={garminData?.serenitat != null ? `${garminData.serenitat}/5` : null} />
            <GarminStat label="Passos"   value={garminData?.passos != null ? garminData.passos.toLocaleString("ca-ES") : null} />
            <GarminStat label="Running"  value={garminData?.running_km != null ? `${garminData.running_km}km` : null} />
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              type="button" onClick={syncGarmin} disabled={garminLoading}
              className="text-[9px] font-bold uppercase tracking-[0.35em] transition-colors disabled:opacity-30"
              style={{ color: C.muted }}
            >
              {garminLoading ? "Sincronitzant…" : "↻ Importar"}
            </button>
            {garminMsg && (
              <p className="text-[9px]" style={{ color: garminMsg.startsWith("Error") ? "#8B2635" : "#4A6A4A" }}>
                {garminMsg}
              </p>
            )}
          </div>
        </div>
      </Section>

      {/* ── Planificació matinal ── */}
      <Section label="Planificació matinal">
        <Field label="Tasca clau del dia">
          <TextInput name="tasca_clau" value={tascaClau} onChange={setTascaClau} placeholder="Verb + resultat esperat…" />
        </Field>
        <Field label="Disciplina · Compromís">
          <TextInput name="disciplina_compromis" value={disciplina} onChange={setDisciplina} placeholder="Sense sucre, exercici 45 min…" />
        </Field>
        <Field label="Espai lliure">
          <TextArea name="espai_lliure" value={espaiLliure} onChange={setEspaiLliure} placeholder="El que tinguis al cap…" rows={2} />
        </Field>
        <Field label="Reflexió personal">
          <TextArea name="reflexio_personal" value={reflexio} onChange={setReflexio} placeholder="Qui vull ser avui? Quina actitud porto?" rows={2} />
        </Field>
      </Section>

      {/* ── Objectius ── */}
      <Section label="Objectius del dia">
        {objectius.length > 0 && (
          <div className="space-y-4">
            {objectius.map((o, i) => (
              <div key={i} className="flex items-start gap-4">
                <span className="text-[11px] font-black mt-1 shrink-0 w-5" style={{ color: "#3A2A2D" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input value={o.categoria} onChange={e => updateObjectiu(i, "categoria", e.target.value)}
                    placeholder="Categoria…" className="outline-none"
                    style={{ background: "transparent", border: "none", borderBottom: `1px solid ${C.border}`, paddingBottom: "6px", fontSize: "12px", color: C.text }} />
                  <input value={o.objectiu} onChange={e => updateObjectiu(i, "objectiu", e.target.value)}
                    placeholder="Objectiu concret…" className="outline-none"
                    style={{ background: "transparent", border: "none", borderBottom: `1px solid ${C.border}`, paddingBottom: "6px", fontSize: "12px", color: C.text }} />
                  <input value={o.accio} onChange={e => updateObjectiu(i, "accio", e.target.value)}
                    placeholder="Acció clau…" className="outline-none"
                    style={{ background: "transparent", border: "none", borderBottom: `1px solid ${C.border}`, paddingBottom: "6px", fontSize: "12px", color: C.text }} />
                </div>
                <select value={o.nota ?? ""} onChange={e => updateObjectiu(i, "nota", e.target.value ? parseInt(e.target.value) : null)}
                  className="outline-none text-[11px] shrink-0"
                  style={{ background: "transparent", border: "none", color: C.muted }}>
                  <option value="">–</option>
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <button type="button" onClick={() => removeObjectiu(i)}
                  className="text-[10px] shrink-0 transition-colors" style={{ color: "#2A1A1A" }}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <button type="button" onClick={addObjectiu}
          className="text-[9px] font-bold uppercase tracking-[0.35em] transition-colors"
          style={{ color: C.muted }}>
          + Afegir objectiu
        </button>
      </Section>

      {/* ── Ritual ── */}
      <Section label="Ritual matinal">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(Object.keys(RITUAL_LABELS) as (keyof RitualMat)[]).map(key => (
            <button
              key={key} type="button"
              onClick={() => setRitual(r => ({ ...r, [key]: !r[key] }))}
              className="flex items-center gap-4 py-3 text-left transition-all"
              style={{ borderBottom: `1px solid ${ritual[key] ? C.accentLo : C.border}` }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0 transition-colors"
                style={{ backgroundColor: ritual[key] ? "#C4964A" : "#1E1C1A" }}
              />
              <span className="text-[12px] font-medium transition-colors"
                style={{ color: ritual[key] ? C.text : "#3A3530" }}>
                {RITUAL_LABELS[key]}
              </span>
            </button>
          ))}
        </div>
      </Section>

      {/* ── Diari activitats ── */}
      <Section label="Diari d'activitats">
        <TextArea name="activitats" value={activitats} onChange={setActivitats}
          placeholder="Com ha anat el dia, converses importants, decisions…" rows={6} />
      </Section>

      {/* ── Running ── */}
      <Section label="Moviment · Running">
        <div className="grid grid-cols-3 md:grid-cols-4 gap-8">
          <Field label="Km">
            <input type="number" name="running_km" value={runningKm}
              onChange={e => setRunningKm(e.target.value)} min={0} max={100} step={0.1} placeholder="0.0"
              className="outline-none w-full"
              style={{ background: "transparent", border: "none", borderBottom: `1px solid ${C.border}`, paddingBottom: "8px", fontSize: "20px", color: C.text, fontWeight: 800 }} />
          </Field>
          <Field label="Minuts">
            <input type="number" name="running_min" value={runningMin}
              onChange={e => setRunningMin(e.target.value)} min={0} max={300} placeholder="0"
              className="outline-none w-full"
              style={{ background: "transparent", border: "none", borderBottom: `1px solid ${C.border}`, paddingBottom: "8px", fontSize: "20px", color: C.text, fontWeight: 800 }} />
          </Field>
          <Field label="Ritme">
            <p className="text-[20px] font-black" style={{ color: pace ? "#C4964A" : "#1E1C1A", paddingBottom: "8px", borderBottom: `1px solid ${C.border}` }}>
              {pace ?? "–"}
            </p>
          </Field>
        </div>
        <Field label="Ruta · Notes">
          <TextInput name="running_notes" value={runningNotes} onChange={setRunningNotes} placeholder="Parc, ruta, sensacions…" />
        </Field>
      </Section>

      {/* ── Examen vespre ── */}
      <Section label="Examen de vespre">
        <TextArea name="examen_vespre" value={examenVespre} onChange={setExamenVespre}
          placeholder="He actuat des dels meus valors? He estat coherent? Que repetiria?" rows={4} />
      </Section>

      {/* ── Check final ── */}
      <Section label="Check final">
        <div className="space-y-4">
          {([
            ["Tasca clau completada", tascaCompletada, setTascaCompletada],
            ["Disciplina complerta", disciplinaComp, setDisciplinaComp],
            ["Criteri mantingut", criteriMantingut, setCriteriMantingut],
          ] as const).map(([label, val, setVal]) => (
            <button key={label} type="button"
              onClick={() => (setVal as (v: boolean) => void)(!val)}
              className="flex items-center gap-4 py-3 w-full text-left transition-all"
              style={{ borderBottom: `1px solid ${val ? C.accentLo : C.border}` }}
            >
              <div className="w-1.5 h-1.5 rounded-full shrink-0 transition-colors"
                style={{ backgroundColor: val ? "#C4964A" : "#1E1C1A" }} />
              <span className="text-[13px] font-medium transition-colors"
                style={{ color: val ? C.text : "#3A3530" }}>
                {label}
              </span>
            </button>
          ))}
        </div>
        <Field label="Resultat · avui he avançat perquè…">
          <TextInput name="resultat" value={resultat} onChange={setResultat}
            placeholder="He tancat la proposta perquè…" />
        </Field>
      </Section>

      {/* ── Autoavaluació ── */}
      <Section label="Autoavaluació">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-x-8 gap-y-6">
          {([
            ["Disciplina",   "av_disciplina",  avDisciplina,  setAvDisciplina],
            ["Mentalitat",   "av_mentalitat",  avMentalitat,  setAvMentalitat],
            ["Excel·lència", "av_excelencia",  avExcelencia,  setAvExcelencia],
            ["Relacions",    "av_relacions",   avRelacions,   setAvRelacions],
            ["Serenitat",    "av_serenitat",   avSerenitat,   setAvSerenitat],
          ] as const).map(([label, name, val, setVal]) => (
            <Field key={name} label={label}>
              <StarBar name={name} value={val} onChange={setVal as (v: number) => void} />
            </Field>
          ))}
        </div>
      </Section>

      {/* ── Tancament ── */}
      <Section label="Avui m'enduc…">
        <TextArea name="avui_menduc" value={avuiMenduc} onChange={setAvuiMenduc}
          placeholder="La lliçó d'avui…" rows={3} />
      </Section>

      {/* ── Save ── */}
      <div className="flex items-center justify-between pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
        <span
          className="text-[9px] font-bold uppercase tracking-[0.35em] transition-opacity"
          style={{ color: "#4A6A4A", opacity: saved ? 1 : 0 }}
        >
          ✓ Guardat
        </span>
        <button
          type="submit" disabled={isPending}
          className="text-[10px] font-bold uppercase tracking-[0.35em] transition-colors disabled:opacity-30"
          style={{ color: C.muted }}
        >
          {isPending ? "Guardant…" : "Guardar entrada →"}
        </button>
      </div>
    </form>
  );
}
