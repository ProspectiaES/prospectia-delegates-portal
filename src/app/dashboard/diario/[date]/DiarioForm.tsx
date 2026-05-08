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

// ─── Shared primitives ────────────────────────────────────────────────────────

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-4 pt-1 pb-0.5">
      <span className="text-[10px] font-bold text-[#C0C0C0] uppercase tracking-[0.15em] whitespace-nowrap">{title}</span>
      <div className="flex-1 h-px bg-[#F0F0F0]" />
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-[#F0F0F0] shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5 space-y-4 ${className}`}>
      {children}
    </div>
  );
}

function MetricLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold text-[#C0C0C0] uppercase tracking-wider mb-1.5">{children}</p>;
}

function MetricMini({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#FAFAFA] rounded-xl p-3 ${className}`}>
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
      className="w-full text-[13px] text-[#0A0A0A] placeholder-[#DCDCDC] bg-transparent border-0 outline-none resize-none leading-relaxed"
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
      className="w-full text-[13px] text-[#0A0A0A] placeholder-[#DCDCDC] bg-transparent border-0 outline-none"
    />
  );
}

function StarRating({ name, value, onChange, small = false }: {
  name: string; value: number | null; onChange: (v: number) => void; small?: boolean;
}) {
  const sz = small ? "w-5 h-5 text-sm" : "w-6 h-6 text-base";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? 0 : n)}
          className={`${sz} rounded flex items-center justify-center transition-all hover:scale-110 ${value && n <= value ? "text-amber-400" : "text-[#E0E0E0] hover:text-amber-300"}`}
          aria-label={`${n}`}
        >
          ★
        </button>
      ))}
      <input type="hidden" name={name} value={value ?? ""} />
    </div>
  );
}

function GarminChip({ icon, label, value }: { icon: string; label: string; value: string | null }) {
  return (
    <div className="bg-[#FAFAFA] rounded-xl p-3">
      <p className="text-[10px] font-bold text-[#C0C0C0] uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-[15px] font-bold leading-tight ${value ? "text-[#0A0A0A]" : "text-[#E0E0E0]"}`}>
        {value ?? "–"}
      </p>
      <p className="text-base mt-0.5">{icon}</p>
    </div>
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
  const [garminData, setGarminData] = useState<GarminDayData | null>(null);

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
      setGarminData(d);
      if (d.son_hores  != null) setSonHores(String(d.son_hores));
      if (d.energia    != null) setEnergia(d.energia);
      if (d.serenitat  != null) setSerenitat(d.serenitat);
      if (d.running_km != null) setRunningKm(String(d.running_km));
      if (d.running_min != null) setRunningMin(String(d.running_min));
      const items = d.origen.length > 0 ? d.origen.join(", ") : "cap dada nova";
      setGarminMsg(`✓ ${items}`);
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
    <form onSubmit={handleSubmit} className="space-y-3">
      <input type="hidden" name="fecha" value={fecha} />

      {/* ── Frase de la setmana ── */}
      {fraseSetmana && (
        <div className="bg-white rounded-2xl border border-[#F0F0F0] shadow-[0_1px_4px_rgba(0,0,0,0.04)] px-5 py-4 border-l-4 border-l-[#8E0E1A]">
          <p className="text-[10px] font-bold text-[#8E0E1A] uppercase tracking-[0.15em] mb-1">Frase de la setmana</p>
          <p className="text-[13px] text-[#0A0A0A] italic leading-relaxed">&ldquo;{fraseSetmana}&rdquo;</p>
        </div>
      )}

      {/* ── 1. Dashboard ── */}
      <Card>
        <div>
          <p className="text-[11px] font-black text-[#8E0E1A]/40 uppercase tracking-[0.15em] mb-0.5">Dashboard</p>
          <p className="text-[15px] font-semibold text-[#0A0A0A] leading-tight">{dateLabel}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <MetricMini>
            <MetricLabel>Hora d&apos;inici</MetricLabel>
            <input
              type="time"
              name="hora_inici"
              value={horaInici}
              onChange={e => setHoraInici(e.target.value)}
              className="text-[13px] font-medium text-[#0A0A0A] bg-transparent border-0 outline-none w-full"
            />
          </MetricMini>

          <MetricMini>
            <MetricLabel>Temps</MetricLabel>
            <input
              type="text"
              name="temps"
              value={temps}
              onChange={e => setTemps(e.target.value)}
              placeholder="Sol, plujós…"
              className="text-[13px] text-[#0A0A0A] placeholder-[#DCDCDC] bg-transparent border-0 outline-none w-full"
            />
          </MetricMini>

          <MetricMini>
            <MetricLabel>Hores de son</MetricLabel>
            <input
              type="number"
              name="son_hores"
              value={sonHores}
              onChange={e => setSonHores(e.target.value)}
              min={0} max={24} step={0.5}
              placeholder="7.5"
              className="text-[13px] font-medium text-[#0A0A0A] placeholder-[#DCDCDC] bg-transparent border-0 outline-none w-full"
            />
          </MetricMini>

          <MetricMini className="col-span-2 sm:col-span-1">
            <MetricLabel>Nota del dia</MetricLabel>
            <StarRating name="nota_dia" value={notaDia} onChange={setNotaDia} />
          </MetricMini>

          <MetricMini className="col-span-2">
            <MetricLabel>Efemèride</MetricLabel>
            <input
              type="text"
              name="efemeride"
              value={efemeride}
              onChange={e => setEfemeride(e.target.value)}
              placeholder="Alguna data important d'avui…"
              className="text-[13px] text-[#0A0A0A] placeholder-[#DCDCDC] bg-transparent border-0 outline-none w-full"
            />
          </MetricMini>
        </div>

        <SectionDivider title="Mesures internes" />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {([
            ["Estat d'ànim", "estat_anim", estatAnim, setEstatAnim],
            ["Energia", "energia", energia, setEnergia],
            ["Focus", "focus_mat", focusMat, setFocusMat],
            ["Serenitat", "serenitat", serenitat, setSerenitat],
          ] as const).map(([label, name, val, setVal]) => (
            <MetricMini key={name}>
              <MetricLabel>{label}</MetricLabel>
              <StarRating name={name} value={val} onChange={setVal as (v: number) => void} small />
            </MetricMini>
          ))}
        </div>
      </Card>

      {/* ── 2. Garmin ── */}
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black text-[#8E0E1A]/40 uppercase tracking-[0.15em] mb-0.5">Dispositiu</p>
            <p className="text-[15px] font-semibold text-[#0A0A0A] leading-tight">Garmin Connect</p>
          </div>
          <button
            type="button"
            onClick={syncGarmin}
            disabled={garminLoading}
            className="flex items-center gap-1.5 shrink-0 px-4 py-2 rounded-xl bg-[#0A0A0A] text-white text-[12px] font-semibold hover:bg-[#8E0E1A] disabled:opacity-40 transition-colors"
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
            Importar
          </button>
        </div>

        {garminMsg && (
          <p className={`-mt-2 text-[11px] font-medium ${garminMsg.startsWith("Error") ? "text-red-500" : "text-emerald-600"}`}>
            {garminMsg}
          </p>
        )}

        {garminData ? (
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
            <GarminChip icon="💤" label="Son"      value={garminData.son_hores != null ? `${garminData.son_hores}h` : null} />
            <GarminChip icon="❤️" label="FC repòs" value={garminData.rhr != null ? `${garminData.rhr} bpm` : null} />
            <GarminChip icon="⚡" label="Energia"  value={garminData.energia != null ? `${garminData.energia}/5` : null} />
            <GarminChip icon="🧘" label="Serenitat" value={garminData.serenitat != null ? `${garminData.serenitat}/5` : null} />
            <GarminChip icon="👟" label="Passos"   value={garminData.passos != null ? garminData.passos.toLocaleString("ca-ES") : null} />
            <GarminChip icon="🏃" label="Running"  value={garminData.running_km != null ? `${garminData.running_km} km` : null} />
          </div>
        ) : (
          <p className="text-[12px] text-[#C0C0C0] text-center py-4">
            Cap dada importada · Prem <em>Importar</em> per sincronitzar el Garmin
          </p>
        )}
      </Card>

      {/* ── 3. Matí ── */}
      <Card>
        <div>
          <p className="text-[11px] font-black text-[#8E0E1A]/40 uppercase tracking-[0.15em] mb-0.5">Planificació</p>
          <p className="text-[15px] font-semibold text-[#0A0A0A]">Matinal</p>
        </div>

        <div>
          <Label>Tasca clau del dia</Label>
          <div className="bg-[#FAFAFA] rounded-xl px-4 py-3">
            <TextInput name="tasca_clau" value={tascaClau} onChange={setTascaClau}
              placeholder="Verb + resultat esperat…" />
          </div>
        </div>

        <div>
          <Label>Disciplina · compromís</Label>
          <div className="bg-[#FAFAFA] rounded-xl px-4 py-3">
            <TextInput name="disciplina_compromis" value={disciplina} onChange={setDisciplina}
              placeholder="Sense sucre, exercici 45 min…" />
          </div>
        </div>

        <div>
          <Label>Espai lliure</Label>
          <div className="bg-[#FAFAFA] rounded-xl px-4 py-3">
            <TextArea name="espai_lliure" value={espaiLliure} onChange={setEspaiLliure}
              placeholder="El que tinguis al cap…" rows={2} />
          </div>
        </div>

        <div>
          <Label>Reflexió personal</Label>
          <div className="bg-[#FAFAFA] rounded-xl px-4 py-3">
            <TextArea name="reflexio_personal" value={reflexio} onChange={setReflexio}
              placeholder="Qui vull ser avui? Quina actitud porto?" rows={2} />
          </div>
        </div>
      </Card>

      {/* ── 4. Objectius del dia ── */}
      <Card>
        <div>
          <p className="text-[11px] font-black text-[#8E0E1A]/40 uppercase tracking-[0.15em] mb-0.5">Intenció</p>
          <p className="text-[15px] font-semibold text-[#0A0A0A]">Objectius del dia</p>
        </div>

        {objectius.length > 0 && (
          <div className="space-y-2">
            {objectius.map((o, i) => (
              <div key={i} className="bg-[#FAFAFA] rounded-xl px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-[#8E0E1A]/40">{String(i + 1).padStart(2, "0")}</span>
                  <button
                    type="button"
                    onClick={() => removeObjectiu(i)}
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[#D0D0D0] hover:text-[#8E0E1A] hover:bg-[#FEF2F2] transition-colors"
                  >
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M1 1l6 6M7 1L1 7" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={o.categoria}
                    onChange={e => updateObjectiu(i, "categoria", e.target.value)}
                    placeholder="Categoria…"
                    className="text-[13px] text-[#0A0A0A] placeholder-[#DCDCDC] bg-transparent border-b border-[#F0F0F0] outline-none pb-1"
                  />
                  <input
                    type="text"
                    value={o.objectiu}
                    onChange={e => updateObjectiu(i, "objectiu", e.target.value)}
                    placeholder="Objectiu concret…"
                    className="text-[13px] text-[#0A0A0A] placeholder-[#DCDCDC] bg-transparent border-b border-[#F0F0F0] outline-none pb-1"
                  />
                  <input
                    type="text"
                    value={o.accio}
                    onChange={e => updateObjectiu(i, "accio", e.target.value)}
                    placeholder="Acció clau…"
                    className="text-[13px] text-[#0A0A0A] placeholder-[#DCDCDC] bg-transparent border-b border-[#F0F0F0] outline-none pb-1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#C0C0C0] uppercase tracking-wider">Nota</span>
                  <select
                    value={o.nota ?? ""}
                    onChange={e => updateObjectiu(i, "nota", e.target.value ? parseInt(e.target.value) : null)}
                    className="text-[12px] text-[#0A0A0A] bg-transparent border-0 outline-none"
                  >
                    <option value="">–</option>
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={addObjectiu}
          className="flex items-center gap-2 text-[12px] font-semibold text-[#8E0E1A]/70 hover:text-[#8E0E1A] transition-colors py-1"
        >
          <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center">
            <svg width="7" height="7" viewBox="0 0 7 7" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3.5.5v6M.5 3.5h6" strokeLinecap="round"/>
            </svg>
          </span>
          Afegir objectiu
        </button>
      </Card>

      {/* ── 5. Ritual matinal ── */}
      <Card>
        <div>
          <p className="text-[11px] font-black text-[#8E0E1A]/40 uppercase tracking-[0.15em] mb-0.5">Hàbits</p>
          <p className="text-[15px] font-semibold text-[#0A0A0A]">Ritual matinal</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {(Object.keys(RITUAL_LABELS) as (keyof RitualMat)[]).map(key => (
            <button
              key={key}
              type="button"
              onClick={() => setRitual(r => ({ ...r, [key]: !r[key] }))}
              className={[
                "flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all",
                ritual[key] ? "bg-emerald-50 border border-emerald-200" : "bg-[#FAFAFA] border border-transparent hover:border-[#F0F0F0]",
              ].join(" ")}
            >
              <div className={[
                "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                ritual[key] ? "bg-emerald-500 border-emerald-500" : "border-[#D8D8D8]",
              ].join(" ")}>
                {ritual[key] && (
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="white" strokeWidth="2">
                    <path d="M1.5 4.5l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span className={`text-[13px] ${ritual[key] ? "text-[#0A0A0A] font-semibold" : "text-[#6B7280]"}`}>
                {RITUAL_LABELS[key]}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {/* ── 6. Activitats ── */}
      <Card>
        <div>
          <p className="text-[11px] font-black text-[#8E0E1A]/40 uppercase tracking-[0.15em] mb-0.5">Memòria</p>
          <p className="text-[15px] font-semibold text-[#0A0A0A]">Diari d&apos;activitats</p>
        </div>
        <div className="bg-[#FAFAFA] rounded-xl px-4 py-3">
          <TextArea
            name="activitats"
            value={activitats}
            onChange={setActivitats}
            placeholder="Descriu com ha anat el dia, converses importants, decisions preses…"
            rows={5}
          />
        </div>
      </Card>

      {/* ── 7. Running ── */}
      <Card>
        <div>
          <p className="text-[11px] font-black text-[#8E0E1A]/40 uppercase tracking-[0.15em] mb-0.5">Moviment</p>
          <p className="text-[15px] font-semibold text-[#0A0A0A]">Running</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <MetricMini>
            <MetricLabel>Km</MetricLabel>
            <input
              type="number"
              name="running_km"
              value={runningKm}
              onChange={e => setRunningKm(e.target.value)}
              min={0} max={100} step={0.1}
              placeholder="0.0"
              className="text-[15px] font-bold text-[#0A0A0A] placeholder-[#E0E0E0] bg-transparent border-0 outline-none w-full"
            />
          </MetricMini>
          <MetricMini>
            <MetricLabel>Minuts</MetricLabel>
            <input
              type="number"
              name="running_min"
              value={runningMin}
              onChange={e => setRunningMin(e.target.value)}
              min={0} max={300}
              placeholder="0"
              className="text-[15px] font-bold text-[#0A0A0A] placeholder-[#E0E0E0] bg-transparent border-0 outline-none w-full"
            />
          </MetricMini>
          <MetricMini>
            <MetricLabel>Ritme</MetricLabel>
            <p className={`text-[15px] font-bold leading-tight ${pace ? "text-[#0A0A0A]" : "text-[#E0E0E0]"}`}>
              {pace ?? "–"}
            </p>
          </MetricMini>
        </div>

        <div className="bg-[#FAFAFA] rounded-xl px-4 py-3">
          <TextInput
            name="running_notes"
            value={runningNotes}
            onChange={setRunningNotes}
            placeholder="Ruta, sensacions, notes…"
          />
        </div>
      </Card>

      {/* ── 8. Examen de vespre ── */}
      <Card>
        <div>
          <p className="text-[11px] font-black text-[#8E0E1A]/40 uppercase tracking-[0.15em] mb-0.5">Reflexió</p>
          <p className="text-[15px] font-semibold text-[#0A0A0A]">Examen de vespre</p>
        </div>
        <div className="bg-[#FAFAFA] rounded-xl px-4 py-3">
          <TextArea
            name="examen_vespre"
            value={examenVespre}
            onChange={setExamenVespre}
            placeholder="He actuat des dels meus valors? He estat coherent? Que m'ha sorprès avui?"
            rows={4}
          />
        </div>
      </Card>

      {/* ── 9. Check final ── */}
      <Card>
        <div>
          <p className="text-[11px] font-black text-[#8E0E1A]/40 uppercase tracking-[0.15em] mb-0.5">Tancament</p>
          <p className="text-[15px] font-semibold text-[#0A0A0A]">Check final</p>
        </div>

        <div className="space-y-1.5">
          {([
            ["Tasca clau completada", tascaCompletada, setTascaCompletada],
            ["Disciplina complerta", disciplinaComp, setDisciplinaComp],
            ["Criteri mantingut", criteriMantingut, setCriteriMantingut],
          ] as const).map(([label, val, setVal]) => (
            <button
              key={label}
              type="button"
              onClick={() => (setVal as (v: boolean) => void)(!val)}
              className={[
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all",
                val ? "bg-[#FEF2F2] border border-[#FECDD3]" : "bg-[#FAFAFA] border border-transparent hover:border-[#F0F0F0]",
              ].join(" ")}
            >
              <div className={[
                "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                val ? "bg-[#8E0E1A] border-[#8E0E1A]" : "border-[#D8D8D8]",
              ].join(" ")}>
                {val && (
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="white" strokeWidth="2">
                    <path d="M1.5 4.5l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span className={`text-[13px] ${val ? "text-[#0A0A0A] font-semibold" : "text-[#6B7280]"}`}>{label}</span>
            </button>
          ))}
        </div>

        <div>
          <Label>Resultat · avui he avançat perquè…</Label>
          <div className="bg-[#FAFAFA] rounded-xl px-4 py-3">
            <TextInput name="resultat" value={resultat} onChange={setResultat}
              placeholder="He tancat la proposta perquè m'he preparat bé…" />
          </div>
        </div>
      </Card>

      {/* ── 10. Autoavaluació ── */}
      <Card>
        <div>
          <p className="text-[11px] font-black text-[#8E0E1A]/40 uppercase tracking-[0.15em] mb-0.5">Mesura</p>
          <p className="text-[15px] font-semibold text-[#0A0A0A]">Autoavaluació</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {([
            ["Disciplina",   "av_disciplina",  avDisciplina,  setAvDisciplina],
            ["Mentalitat",   "av_mentalitat",  avMentalitat,  setAvMentalitat],
            ["Excel·lència", "av_excelencia",  avExcelencia,  setAvExcelencia],
            ["Relacions",    "av_relacions",   avRelacions,   setAvRelacions],
            ["Serenitat",    "av_serenitat",   avSerenitat,   setAvSerenitat],
          ] as const).map(([label, name, val, setVal]) => (
            <MetricMini key={name}>
              <MetricLabel>{label}</MetricLabel>
              <StarRating name={name} value={val} onChange={setVal as (v: number) => void} small />
            </MetricMini>
          ))}
        </div>
      </Card>

      {/* ── 11. Tancament ── */}
      <Card>
        <div>
          <p className="text-[11px] font-black text-[#8E0E1A]/40 uppercase tracking-[0.15em] mb-0.5">Lliçó</p>
          <p className="text-[15px] font-semibold text-[#0A0A0A]">Avui m&apos;enduc…</p>
        </div>
        <div className="bg-[#FAFAFA] rounded-xl px-4 py-3">
          <TextArea name="avui_menduc" value={avuiMenduc} onChange={setAvuiMenduc}
            placeholder="Avui m'enduc que la constància és més poderosa que la intensitat…"
            rows={3} />
        </div>
      </Card>

      {/* ── Save ── */}
      <div className="flex items-center justify-between pt-2 pb-8">
        <span className={`text-[12px] text-emerald-600 font-medium transition-opacity duration-300 ${saved ? "opacity-100" : "opacity-0"}`}>
          ✓ Entrada guardada
        </span>
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2 bg-[#0A0A0A] text-white rounded-xl text-[13px] font-semibold hover:bg-[#8E0E1A] disabled:opacity-40 transition-colors"
        >
          {isPending ? "Guardant…" : "Guardar entrada"}
        </button>
      </div>
    </form>
  );
}
