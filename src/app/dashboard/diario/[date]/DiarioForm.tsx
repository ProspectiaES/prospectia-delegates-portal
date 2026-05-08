"use client";

import { useState, useTransition } from "react";
import { saveDiarioEntry } from "@/app/actions/diario";
import type { GarminDayData } from "@/lib/garmin";

// ─── Types ────────────────────────────────────────────────────────────────────

type Objectiu = { categoria: string; objectiu: string; accio: string; nota: number | null };

type RitualMat = {
  aixecat_7: boolean;
  respirat: boolean;
  meditacio: boolean;
  missio: boolean;
  llegit: boolean;
  tasca_clau: boolean;
  sentir: boolean;
};

const RITUAL_LABELS: Record<keyof RitualMat, string> = {
  aixecat_7:  "Aixecat a les 7:00",
  respirat:   "Respiració conscient",
  meditacio:  "Meditació",
  missio:     "Lectura de la missió",
  llegit:     "Lectura 20 min",
  tasca_clau: "Tasca clau iniciada",
  sentir:     "Sentir (visualització)",
};

export interface DiarioEntry {
  fecha: string;
  hora_inici?: string | null;
  estat_anim?: number | null;
  energia?: number | null;
  focus_mat?: number | null;
  son_hores?: number | null;
  serenitat?: number | null;
  temps?: string | null;
  efemeride?: string | null;
  nota_dia?: number | null;
  tasca_clau?: string | null;
  disciplina_compromis?: string | null;
  espai_lliure?: string | null;
  reflexio_personal?: string | null;
  objectius_dia?: Objectiu[] | null;
  ritual_mat?: Partial<RitualMat> | null;
  activitats?: string | null;
  examen_vespre?: string | null;
  tasca_completada?: boolean | null;
  disciplina_complerta?: boolean | null;
  criteri_mantingut?: boolean | null;
  resultat?: string | null;
  av_disciplina?: number | null;
  av_mentalitat?: number | null;
  av_excelencia?: number | null;
  av_relacions?: number | null;
  av_serenitat?: number | null;
  avui_menduc?: string | null;
  running_km?: number | null;
  running_min?: number | null;
  running_notes?: string | null;
}

// ─── Star rating ──────────────────────────────────────────────────────────────

function StarRating({
  name, value, onChange,
}: {
  name: string;
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? 0 : n)}
          className={[
            "w-7 h-7 rounded-md flex items-center justify-center text-base transition-all hover:scale-110",
            value && n <= value ? "text-amber-400" : "text-[#D1D5DB] hover:text-amber-300",
          ].join(" ")}
          aria-label={`${n} estrella${n !== 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
      <input type="hidden" name={name} value={value ?? ""} />
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ emoji, title, subtitle }: { emoji: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-lg bg-[#FEF2F2] flex items-center justify-center text-base shrink-0">
        {emoji}
      </div>
      <div>
        <h2 className="text-sm font-bold text-[#0A0A0A] leading-tight">{title}</h2>
        {subtitle && <p className="text-[11px] text-[#9CA3AF] leading-tight">{subtitle}</p>}
      </div>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-4 ${className}`}>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">{children}</p>;
}

function TextArea({ name, value, onChange, placeholder, rows = 3 }: {
  name: string; value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      name={name}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full text-sm text-[#0A0A0A] placeholder-[#D1D5DB] bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A] transition-colors"
    />
  );
}

function TextInput({ name, value, onChange, placeholder, type = "text" }: {
  name: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      name={name}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full text-sm text-[#0A0A0A] placeholder-[#D1D5DB] bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A] transition-colors"
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DiarioForm({ fecha, initial, fraseSetmana }: {
  fecha: string;
  initial: DiarioEntry | null;
  fraseSetmana?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [garminLoading, setGarminLoading] = useState(false);
  const [garminMsg, setGarminMsg] = useState<string | null>(null);

  // ── State ──
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
  const [objectius, setObjectius]             = useState<Objectiu[]>(
    (initial?.objectius_dia as Objectiu[]) ?? []
  );
  const [ritual, setRitual]                   = useState<RitualMat>({
    aixecat_7:  initial?.ritual_mat?.aixecat_7  ?? false,
    respirat:   initial?.ritual_mat?.respirat   ?? false,
    meditacio:  initial?.ritual_mat?.meditacio  ?? false,
    missio:     initial?.ritual_mat?.missio     ?? false,
    llegit:     initial?.ritual_mat?.llegit     ?? false,
    tasca_clau: initial?.ritual_mat?.tasca_clau ?? false,
    sentir:     initial?.ritual_mat?.sentir     ?? false,
  });

  const [activitats, setActivitats]           = useState(initial?.activitats ?? "");
  const [examenVespre, setExamenVespre]       = useState(initial?.examen_vespre ?? "");

  const [tascaCompletada, setTascaCompletada]     = useState(initial?.tasca_completada ?? false);
  const [disciplinaComp, setDisciplinaComp]       = useState(initial?.disciplina_complerta ?? false);
  const [criteriMantingut, setCriteriMantingut]   = useState(initial?.criteri_mantingut ?? false);
  const [resultat, setResultat]                   = useState(initial?.resultat ?? "");

  const [avDisciplina, setAvDisciplina]   = useState<number | null>(initial?.av_disciplina ?? null);
  const [avMentalitat, setAvMentalitat]   = useState<number | null>(initial?.av_mentalitat ?? null);
  const [avExcelencia, setAvExcelencia]   = useState<number | null>(initial?.av_excelencia ?? null);
  const [avRelacions, setAvRelacions]     = useState<number | null>(initial?.av_relacions ?? null);
  const [avSerenitat, setAvSerenitat]     = useState<number | null>(initial?.av_serenitat ?? null);
  const [avuiMenduc, setAvuiMenduc]       = useState(initial?.avui_menduc ?? "");

  const [runningKm, setRunningKm]         = useState(initial?.running_km != null ? String(initial.running_km) : "");
  const [runningMin, setRunningMin]       = useState(initial?.running_min != null ? String(initial.running_min) : "");
  const [runningNotes, setRunningNotes]   = useState(initial?.running_notes ?? "");

  // ── Objectius helpers ──
  function addObjectiu() {
    setObjectius(prev => [...prev, { categoria: "", objectiu: "", accio: "", nota: null }]);
  }
  function removeObjectiu(i: number) {
    setObjectius(prev => prev.filter((_, idx) => idx !== i));
  }
  function updateObjectiu(i: number, field: keyof Objectiu, val: string | number | null) {
    setObjectius(prev => prev.map((o, idx) => idx === i ? { ...o, [field]: val } : o));
  }

  // ── Garmin sync ──
  async function syncGarmin() {
    setGarminLoading(true);
    setGarminMsg(null);
    try {
      const res = await fetch(`/api/garmin/day?date=${fecha}`);
      const json = await res.json() as { ok: boolean; data?: GarminDayData; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Error desconegut");
      const d = json.data!;
      if (d.son_hores  != null) setSonHores(String(d.son_hores));
      if (d.energia    != null) setEnergia(d.energia);
      if (d.serenitat  != null) setSerenitat(d.serenitat);
      if (d.running_km != null) setRunningKm(String(d.running_km));
      if (d.running_min != null) setRunningMin(String(d.running_min));
      const items = d.origen.length > 0 ? d.origen.join(", ") : "cap dada nova";
      setGarminMsg(`Sincronitzat: ${items}`);
    } catch (e) {
      setGarminMsg(`Error: ${(e as Error).message}`);
    } finally {
      setGarminLoading(false);
    }
  }

  // ── Submit ──
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

  const dateLabel = new Date(fecha + "T12:00:00").toLocaleDateString("ca-ES", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  // Running pace calculation
  const kmVal = parseFloat(runningKm);
  const minVal = parseFloat(runningMin);
  const pace = (!isNaN(kmVal) && !isNaN(minVal) && kmVal > 0 && minVal > 0)
    ? (() => {
        const totalSec = (minVal / kmVal) * 60;
        const m = Math.floor(totalSec / 60);
        const s = Math.round(totalSec % 60);
        return `${m}:${String(s).padStart(2, "0")} min/km`;
      })()
    : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="fecha" value={fecha} />

      {/* ── Frase de la setmana ── */}
      {fraseSetmana && (
        <div className="bg-white rounded-xl border-l-4 border-l-[#8E0E1A] border border-[#E5E7EB] px-4 py-3">
          <p className="text-[11px] font-semibold text-[#8E0E1A] uppercase tracking-wider mb-1">Frase de la setmana</p>
          <p className="text-sm text-[#0A0A0A] italic">&ldquo;{fraseSetmana}&rdquo;</p>
        </div>
      )}

      {/* ── 1. Metrics ── */}
      <Card>
        <div className="flex items-start justify-between gap-2">
          <SectionHeader emoji="📊" title="Dashboard del dia" subtitle={dateLabel} />
          <button
            type="button"
            onClick={syncGarmin}
            disabled={garminLoading}
            className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-xs font-semibold text-[#374151] hover:bg-[#F3F4F6] disabled:opacity-50 transition-colors"
            title="Importar dades del Garmin Connect"
          >
            {garminLoading ? (
              <svg className="animate-spin" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 1v2M6 9v2M1 6h2M9 6h2" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M10.5 6A4.5 4.5 0 112.1 3.9" strokeLinecap="round"/>
                <path d="M2 1.5V4h2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            Garmin
          </button>
        </div>
        {garminMsg && (
          <p className={`-mt-2 text-[11px] ${garminMsg.startsWith("Error") ? "text-red-500" : "text-emerald-600"}`}>
            {garminMsg}
          </p>
        )}

        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <div>
            <Label>Hora d&apos;inici</Label>
            <input
              type="time"
              name="hora_inici"
              value={horaInici}
              onChange={e => setHoraInici(e.target.value)}
              className="text-sm text-[#0A0A0A] bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A]"
            />
          </div>
          <div>
            <Label>Temps</Label>
            <TextInput name="temps" value={temps} onChange={setTemps} placeholder="Sol, plujós…" />
          </div>

          <div>
            <Label>Nota del dia ⭐</Label>
            <StarRating name="nota_dia" value={notaDia} onChange={setNotaDia} />
          </div>
          <div>
            <Label>Hores de son</Label>
            <input
              type="number"
              name="son_hores"
              value={sonHores}
              onChange={e => setSonHores(e.target.value)}
              min={0} max={24} step={0.5}
              placeholder="7.5"
              className="w-24 text-sm text-[#0A0A0A] bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {([
            ["Estat d'ànim", "estat_anim", estatAnim, setEstatAnim],
            ["Energia", "energia", energia, setEnergia],
            ["Focus", "focus_mat", focusMat, setFocusMat],
            ["Serenitat", "serenitat", serenitat, setSerenitat],
          ] as const).map(([label, name, val, setVal]) => (
            <div key={name}>
              <Label>{label}</Label>
              <StarRating name={name} value={val} onChange={setVal as (v: number) => void} />
            </div>
          ))}
        </div>

        <div>
          <Label>Efemèride del dia</Label>
          <TextInput name="efemeride" value={efemeride} onChange={setEfemeride}
            placeholder="Alguna data important d'avui…" />
        </div>
      </Card>

      {/* ── 2. Matí ── */}
      <Card>
        <SectionHeader emoji="🌅" title="Planificació matinal" subtitle="Comença el dia amb intenció" />

        <div>
          <Label>Tasca clau del dia <span className="normal-case text-[10px] text-[#9CA3AF]">(verb + resultat esperat)</span></Label>
          <TextInput name="tasca_clau" value={tascaClau} onChange={setTascaClau}
            placeholder="Tancar 2 propostes comercials…" />
        </div>

        <div>
          <Label>Disciplina · compromís</Label>
          <TextInput name="disciplina_compromis" value={disciplina} onChange={setDisciplina}
            placeholder="Sense sucre, exercici 45 min…" />
        </div>

        <div>
          <Label>Espai lliure</Label>
          <TextArea name="espai_lliure" value={espaiLliure} onChange={setEspaiLliure}
            placeholder="El que tinguis al cap…" rows={2} />
        </div>

        <div>
          <Label>Reflexió personal</Label>
          <TextArea name="reflexio_personal" value={reflexio} onChange={setReflexio}
            placeholder="Qui vull ser avui? Quina actitud porto?" rows={2} />
        </div>
      </Card>

      {/* ── 3. Objectius del dia ── */}
      <Card>
        <SectionHeader emoji="🎯" title="Objectius del dia" />

        {objectius.length > 0 && (
          <div className="space-y-2">
            {objectius.map((o, i) => (
              <div key={i} className="grid grid-cols-[1fr_2fr_2fr_auto_auto] gap-2 items-start">
                <div>
                  {i === 0 && <Label>Categoria</Label>}
                  <input
                    type="text"
                    value={o.categoria}
                    onChange={e => updateObjectiu(i, "categoria", e.target.value)}
                    placeholder="Personal"
                    className="w-full text-sm bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A]"
                  />
                </div>
                <div>
                  {i === 0 && <Label>Objectiu concret</Label>}
                  <input
                    type="text"
                    value={o.objectiu}
                    onChange={e => updateObjectiu(i, "objectiu", e.target.value)}
                    placeholder="Objectiu…"
                    className="w-full text-sm bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A]"
                  />
                </div>
                <div>
                  {i === 0 && <Label>Acció clau</Label>}
                  <input
                    type="text"
                    value={o.accio}
                    onChange={e => updateObjectiu(i, "accio", e.target.value)}
                    placeholder="Acció…"
                    className="w-full text-sm bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A]"
                  />
                </div>
                <div>
                  {i === 0 && <Label>Nota</Label>}
                  <select
                    value={o.nota ?? ""}
                    onChange={e => updateObjectiu(i, "nota", e.target.value ? parseInt(e.target.value) : null)}
                    className="text-sm bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg px-2 py-1.5 focus:outline-none"
                  >
                    <option value="">–</option>
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className={i === 0 ? "pt-5" : ""}>
                  <button
                    type="button"
                    onClick={() => removeObjectiu(i)}
                    className="p-1.5 rounded-md text-[#9CA3AF] hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 2l8 8M10 2L2 10" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={addObjectiu}
          className="flex items-center gap-1.5 text-sm text-[#8E0E1A] hover:text-[#7a0b16] font-medium transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 1v12M1 7h12" strokeLinecap="round"/>
          </svg>
          Afegir objectiu
        </button>
      </Card>

      {/* ── 4. Ritual matinal ── */}
      <Card>
        <SectionHeader emoji="✅" title="Ritual matinal" subtitle="Marca el que has fet" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(Object.keys(RITUAL_LABELS) as (keyof RitualMat)[]).map(key => (
            <label
              key={key}
              className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer hover:bg-[#F9FAFB] transition-colors"
            >
              <div
                onClick={() => setRitual(r => ({ ...r, [key]: !r[key] }))}
                className={[
                  "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer shrink-0",
                  ritual[key] ? "bg-emerald-500 border-emerald-500" : "border-[#D1D5DB]",
                ].join(" ")}
              >
                {ritual[key] && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2">
                    <path d="M1.5 5l2.5 2.5 4.5-4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span className={`text-sm ${ritual[key] ? "text-[#0A0A0A] font-medium" : "text-[#6B7280]"}`}>
                {RITUAL_LABELS[key]}
              </span>
            </label>
          ))}
        </div>
      </Card>

      {/* ── 5. Diari d'activitats ── */}
      <Card>
        <SectionHeader emoji="📝" title="Diari d'activitats" subtitle="Escriu lliurement" />
        <TextArea
          name="activitats"
          value={activitats}
          onChange={setActivitats}
          placeholder="Descriu com ha anat el dia, el que has fet, converses importants, decisions preses…"
          rows={6}
        />
      </Card>

      {/* ── 5b. Running / Moviment ── */}
      <Card>
        <SectionHeader emoji="🏃" title="Running / Moviment" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <Label>Km recorreguts</Label>
            <input
              type="number"
              name="running_km"
              value={runningKm}
              onChange={e => setRunningKm(e.target.value)}
              min={0} max={100} step={0.1}
              placeholder="0.0"
              className="w-full text-sm text-[#0A0A0A] placeholder-[#D1D5DB] bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A] transition-colors"
            />
          </div>
          <div>
            <Label>Minuts</Label>
            <input
              type="number"
              name="running_min"
              value={runningMin}
              onChange={e => setRunningMin(e.target.value)}
              min={0} max={300}
              placeholder="0"
              className="w-full text-sm text-[#0A0A0A] placeholder-[#D1D5DB] bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A] transition-colors"
            />
          </div>
          <div>
            <Label>Ritme</Label>
            <div className="flex items-center h-[38px] px-3 bg-[#F3F4F6] border border-[#E5E7EB] rounded-lg text-sm text-[#374151]">
              {pace ?? "–"}
            </div>
          </div>
        </div>
        <div>
          <Label>Ruta o notes</Label>
          <TextInput
            name="running_notes"
            value={runningNotes}
            onChange={setRunningNotes}
            placeholder="Parc de la Ciutadella, 5K suau…"
          />
        </div>
      </Card>

      {/* ── 6. Examen de vespre ── */}
      <Card>
        <SectionHeader emoji="🌙" title="Examen de vespre" subtitle="Reflexió final del dia" />
        <TextArea
          name="examen_vespre"
          value={examenVespre}
          onChange={setExamenVespre}
          placeholder="He actuat des dels meus valors? He estat coherent? Que m'ha sorprès avui? Que repetiria?"
          rows={4}
        />
      </Card>

      {/* ── 7. Check final ── */}
      <Card>
        <SectionHeader emoji="🏁" title="Check final" />

        <div className="space-y-2">
          {([
            ["Tasca clau completada", tascaCompletada, setTascaCompletada],
            ["Disciplina complerta", disciplinaComp, setDisciplinaComp],
            ["Criteri mantingut", criteriMantingut, setCriteriMantingut],
          ] as const).map(([label, val, setVal]) => (
            <label key={label} className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer hover:bg-[#F9FAFB] transition-colors">
              <div
                onClick={() => (setVal as (v: boolean) => void)(!val)}
                className={[
                  "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer shrink-0",
                  val ? "bg-[#8E0E1A] border-[#8E0E1A]" : "border-[#D1D5DB]",
                ].join(" ")}
              >
                {val && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2">
                    <path d="M1.5 5l2.5 2.5 4.5-4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span className={`text-sm ${val ? "text-[#0A0A0A] font-semibold" : "text-[#6B7280]"}`}>{label}</span>
            </label>
          ))}
        </div>

        <div>
          <Label>Resultat · avui he avançat perquè…</Label>
          <TextInput name="resultat" value={resultat} onChange={setResultat}
            placeholder="He tancat la proposta perquè m'he preparat bé…" />
        </div>
      </Card>

      {/* ── 8. Autoavaluació ── */}
      <Card>
        <SectionHeader emoji="📈" title="Autoavaluació ràpida" subtitle="1 = molt baix · 5 = excel·lent" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {([
            ["Disciplina",   "av_disciplina",  avDisciplina,  setAvDisciplina],
            ["Mentalitat",   "av_mentalitat",  avMentalitat,  setAvMentalitat],
            ["Excel·lència", "av_excelencia",  avExcelencia,  setAvExcelencia],
            ["Relacions",    "av_relacions",   avRelacions,   setAvRelacions],
            ["Serenitat",    "av_serenitat",   avSerenitat,   setAvSerenitat],
          ] as const).map(([label, name, val, setVal]) => (
            <div key={name} className="flex items-center gap-3">
              <span className="text-sm text-[#374151] w-28 shrink-0">{label}</span>
              <StarRating name={name} value={val} onChange={setVal as (v: number) => void} />
            </div>
          ))}
        </div>
      </Card>

      {/* ── 9. Tancament ── */}
      <Card>
        <SectionHeader emoji="💎" title="Tancament" subtitle="Una frase per tancar el dia" />
        <div>
          <Label>Avui m&apos;enduc…</Label>
          <TextArea name="avui_menduc" value={avuiMenduc} onChange={setAvuiMenduc}
            placeholder="Avui m'enduc que la constància és més poderosa que la intensitat…"
            rows={3} />
        </div>
      </Card>

      {/* ── Save button ── */}
      <div className="flex items-center justify-between pb-8">
        <div className={`text-sm text-emerald-600 font-medium transition-opacity duration-300 ${saved ? "opacity-100" : "opacity-0"}`}>
          ✓ Entrada guardada
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 bg-[#8E0E1A] text-white rounded-lg text-sm font-semibold hover:bg-[#7a0b16] disabled:opacity-60 transition-colors"
        >
          {isPending ? "Guardant…" : "Guardar entrada"}
        </button>
      </div>
    </form>
  );
}
