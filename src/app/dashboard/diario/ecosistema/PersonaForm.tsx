"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { savePersona, saveInteraccio } from "@/app/actions/ecosistema";
import type { Persona, Interaccio, Categoria } from "@/app/actions/ecosistema";

const R = "#7D1120";
const BK = "#1C1510";
const BORDER = "#E4DDD5";
const LABEL = "#9A8E82";

const CAT_OPTIONS: { val: Categoria; label: string; desc: string; color: string }[] = [
  { val: "nucli",      label: "Nucli central",    desc: "Família, mentors, socis essencials",     color: "#7D1120" },
  { val: "estrategic", label: "Anell estratègic",  desc: "Aliances, col·laboradors amb impacte",   color: "#A87830" },
  { val: "expansio",   label: "Expansió",          desc: "Relacions en construcció, referents",    color: "#2A6A8A" },
  { val: "drenant",    label: "Zona drenant",       desc: "Relacions que consumeixen energia",      color: "#5A5A6A" },
];

const ESTAT_OPTIONS = [
  "expansiva", "inspiradora", "estable", "en evolució",
  "distant", "tensionada", "reactiva", "drenadora",
];

const SENSACIO_OPTIONS = [
  "centrat", "clar", "inspirat", "energitzat", "tranquil",
  "dispers", "cansat", "accelerat", "buit", "tens",
];

const EMOJIS = ["👤", "👨", "👩", "🧑", "👴", "👵", "🧔", "👶", "🤝", "💼", "🧠", "❤️", "⭐", "🔮", "🌱"];

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, backgroundColor: "#FFF" }}>
      <div className="px-5 py-3 flex items-center gap-2" style={{ backgroundColor: "#FBF8F5", borderBottom: `1px solid ${BORDER}` }}>
        <div className="w-1 h-3.5 rounded-full" style={{ backgroundColor: R }} />
        <p className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: R }}>{label}</p>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: LABEL }}>{label}</p>
      {children}
    </div>
  );
}

function TInput({ name, value, onChange, placeholder }: {
  name: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <input name={name} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full outline-none text-[13px] font-medium"
      style={{ background: "transparent", border: "none", borderBottom: `1.5px solid ${BORDER}`, paddingBottom: "7px", color: BK }}
      onFocus={e => (e.target.style.borderBottomColor = R)}
      onBlur={e => (e.target.style.borderBottomColor = BORDER)} />
  );
}

function RatingBar({ name, label, value, onChange }: {
  name: string; label: string; value: number | null; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <p className="text-[11px] font-semibold w-28 shrink-0" style={{ color: BK }}>{label}</p>
      <div className="flex gap-1.5 flex-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" onClick={() => onChange(value === n ? 0 : n)}
            className="flex-1 h-2 rounded-full transition-all"
            style={{ backgroundColor: value && n <= value ? R : BORDER }} />
        ))}
      </div>
      <span className="text-[11px] font-bold tabular-nums w-6 text-right" style={{ color: value ? R : LABEL }}>
        {value ?? "–"}
      </span>
      <input type="hidden" name={name} value={value ?? ""} />
    </div>
  );
}

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
  const [saved, setSaved] = useState(false);
  const [showAddInteraccio, setShowAddInteraccio] = useState(false);
  const [intPending, startIntTransition] = useTransition();

  const [nom, setNom]               = useState(initial?.nom ?? "");
  const [rolVital, setRolVital]     = useState(initial?.rol_vital ?? "");
  const [categoria, setCategoria]   = useState<Categoria>(initial?.categoria ?? defaultCat);
  const [emoji, setEmoji]           = useState(initial?.avatar_emoji ?? "👤");
  const [energia, setEnergia]       = useState<number | null>(initial?.energia ?? null);
  const [claredat, setClaredat]     = useState<number | null>(initial?.claredat ?? null);
  const [autenticitat, setAutent]   = useState<number | null>(initial?.autenticitat ?? null);
  const [alineacio, setAlineacio]   = useState<number | null>(initial?.alineacio ?? null);
  const [profunditat, setProfund]   = useState<number | null>(initial?.profunditat ?? null);
  const [confianca, setConfianca]   = useState<number | null>(initial?.confianca ?? null);
  const [estat, setEstat]           = useState(initial?.estat_relacional ?? "");
  const [sensacio, setSensacio]     = useState(initial?.sensacio_post ?? "");
  const [notes, setNotes]           = useState(initial?.notes ?? "");

  const [intData, setIntData]     = useState(new Date().toISOString().slice(0, 10));
  const [intQual, setIntQual]     = useState<number | null>(null);
  const [intSens, setIntSens]     = useState("");
  const [intNotes, setIntNotes]   = useState("");

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (initial?.id) fd.set("id", initial.id);
    fd.set("avatar_emoji", emoji);
    if (energia != null) fd.set("energia", String(energia));
    if (claredat != null) fd.set("claredat", String(claredat));
    if (autenticitat != null) fd.set("autenticitat", String(autenticitat));
    if (alineacio != null) fd.set("alineacio", String(alineacio));
    if (profunditat != null) fd.set("profunditat", String(profunditat));
    if (confianca != null) fd.set("confianca", String(confianca));

    startTransition(async () => {
      const { id } = await savePersona(fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (!initial?.id) router.replace(`/dashboard/diario/ecosistema/${id}`);
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

  const catOption = CAT_OPTIONS.find(c => c.val === categoria);

  return (
    <div className="max-w-2xl mx-auto px-6 md:px-10 py-8 space-y-4">

      {/* Nav */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/diario/ecosistema"
          className="text-[11px] font-semibold uppercase tracking-[0.18em] hover:underline"
          style={{ color: LABEL }}>
          ← Ecosistema
        </Link>
      </div>

      {/* Identity header */}
      <div className="flex items-center gap-4 py-2">
        {/* Emoji picker */}
        <div className="relative group">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl cursor-pointer border-2 transition-all group-hover:border-opacity-60"
            style={{ border: `2px solid ${catOption?.color ?? R}20`, backgroundColor: "#FBF8F5" }}>
            {emoji}
          </div>
          <div className="absolute top-16 left-0 z-10 hidden group-hover:flex flex-wrap gap-1 p-2 rounded-xl shadow-lg w-48"
            style={{ backgroundColor: "#FFF", border: `1px solid ${BORDER}` }}>
            {EMOJIS.map(e => (
              <button key={e} type="button" onClick={() => setEmoji(e)}
                className="text-xl hover:scale-125 transition-transform p-0.5">
                {e}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[20px] font-black" style={{ color: nom ? BK : LABEL }}>
            {nom || "Nom de la persona"}
          </p>
          {rolVital && <p className="text-[12px]" style={{ color: LABEL }}>{rolVital}</p>}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Identitat */}
        <Section label="Identitat">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nom complet">
              <TInput name="nom" value={nom} onChange={setNom} placeholder="Nom…" />
            </Field>
            <Field label="Rol vital">
              <TInput name="rol_vital" value={rolVital} onChange={setRolVital} placeholder="Amic, mentor, soci…" />
            </Field>
          </div>

          <Field label="Categoria orbital">
            <div className="grid grid-cols-2 gap-2 mt-1">
              {CAT_OPTIONS.map(c => (
                <button key={c.val} type="button" onClick={() => setCategoria(c.val)}
                  className="text-left p-3 rounded-xl transition-all"
                  style={{
                    border: `1.5px solid ${categoria === c.val ? c.color : BORDER}`,
                    backgroundColor: categoria === c.val ? c.color + "10" : "#FFF",
                  }}>
                  <p className="text-[12px] font-bold" style={{ color: c.color }}>{c.label}</p>
                  <p className="text-[10px]" style={{ color: LABEL }}>{c.desc}</p>
                </button>
              ))}
            </div>
            <input type="hidden" name="categoria" value={categoria} />
          </Field>
        </Section>

        {/* Dimensions relacionals */}
        <Section label="Dimensions relacionals">
          <div className="space-y-3">
            <RatingBar name="energia"     label="Energia"      value={energia}    onChange={setEnergia} />
            <RatingBar name="claredat"    label="Claredat"     value={claredat}   onChange={setClaredat} />
            <RatingBar name="autenticitat" label="Autenticitat" value={autenticitat} onChange={setAutent} />
            <RatingBar name="alineacio"   label="Alineació vital" value={alineacio} onChange={setAlineacio} />
            <RatingBar name="profunditat" label="Profunditat"  value={profunditat} onChange={setProfund} />
            <RatingBar name="confianca"   label="Confiança"    value={confianca}  onChange={setConfianca} />
          </div>
        </Section>

        {/* Estat relacional */}
        <Section label="Estat i sensació">
          <Field label="Estat de la relació">
            <div className="flex flex-wrap gap-2 mt-1">
              {ESTAT_OPTIONS.map(e => (
                <button key={e} type="button" onClick={() => setEstat(estat === e ? "" : e)}
                  className="px-3 py-1 rounded-lg text-[11px] font-semibold transition-all"
                  style={{
                    border: `1px solid ${estat === e ? R : BORDER}`,
                    backgroundColor: estat === e ? "#FBF0F0" : "#FFF",
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
                  className="px-3 py-1 rounded-lg text-[11px] font-semibold transition-all"
                  style={{
                    border: `1px solid ${sensacio === s ? "#A87830" : BORDER}`,
                    backgroundColor: sensacio === s ? "#FBF4E8" : "#FFF",
                    color: sensacio === s ? "#A87830" : LABEL,
                  }}>
                  {s}
                </button>
              ))}
            </div>
            <input type="hidden" name="sensacio_post" value={sensacio} />
          </Field>
        </Section>

        {/* Notes */}
        <Section label="Observacions">
          <textarea name="notes" value={notes} onChange={e => setNotes(e.target.value)}
            rows={4} placeholder="Context, moments importants, evolució de la relació…"
            className="w-full outline-none resize-none text-[13px] leading-relaxed"
            style={{ background: "transparent", border: "none", borderBottom: `1.5px solid ${BORDER}`, paddingBottom: "7px", color: BK }} />
        </Section>

        {/* Save */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] font-semibold transition-opacity"
            style={{ color: "#2A7A4A", opacity: saved ? 1 : 0 }}>
            ✓ Guardat
          </span>
          <button type="submit" disabled={!nom || isPending}
            className="px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all disabled:opacity-40 hover:opacity-90"
            style={{ backgroundColor: R, color: "#FFF" }}>
            {isPending ? "Guardant…" : initial ? "Guardar canvis" : "Afegir al sistema"}
          </button>
        </div>
      </form>

      {/* Interaccions */}
      {initial && (
        <Section label="Historial d'interaccions">
          <button type="button" onClick={() => setShowAddInteraccio(!showAddInteraccio)}
            className="text-[12px] font-semibold hover:underline" style={{ color: R }}>
            + Registrar interacció
          </button>

          {showAddInteraccio && (
            <div className="rounded-xl p-4 space-y-3" style={{ border: `1px solid ${BORDER}`, backgroundColor: "#FBF8F5" }}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Data">
                  <input type="date" value={intData} onChange={e => setIntData(e.target.value)}
                    className="outline-none text-[13px] font-medium w-full"
                    style={{ background: "transparent", border: "none", borderBottom: `1.5px solid ${BORDER}`, paddingBottom: "7px", color: BK }} />
                </Field>
                <Field label="Qualitat (1–5)">
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} type="button" onClick={() => setIntQual(intQual === n ? null : n)}
                        className="w-7 h-7 rounded-lg text-[11px] font-bold transition-all"
                        style={{
                          backgroundColor: intQual === n ? R : "#FFF",
                          border: `1px solid ${intQual === n ? R : BORDER}`,
                          color: intQual === n ? "#FFF" : LABEL,
                        }}>
                        {n}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
              <Field label="Sensació">
                <div className="flex flex-wrap gap-1.5">
                  {SENSACIO_OPTIONS.slice(0, 8).map(s => (
                    <button key={s} type="button" onClick={() => setIntSens(intSens === s ? "" : s)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
                      style={{ border: `1px solid ${intSens === s ? "#A87830" : BORDER}`, color: intSens === s ? "#A87830" : LABEL, backgroundColor: intSens === s ? "#FBF4E8" : "#FFF" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Notes">
                <input value={intNotes} onChange={e => setIntNotes(e.target.value)}
                  placeholder="Conversa, decisió, moment important…"
                  className="w-full outline-none text-[12px]"
                  style={{ background: "transparent", border: "none", borderBottom: `1px solid ${BORDER}`, paddingBottom: "6px", color: BK }} />
              </Field>
              <button type="button" disabled={intPending} onClick={handleAddInteraccio}
                className="px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40"
                style={{ backgroundColor: BK, color: "#FFF" }}>
                {intPending ? "Guardant…" : "Registrar"}
              </button>
            </div>
          )}

          {interaccions.length > 0 && (
            <div className="space-y-2 mt-2">
              {interaccions.map(it => (
                <div key={it.id} className="flex items-start gap-3 py-2.5"
                  style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <span className="text-[11px] tabular-nums shrink-0 mt-0.5" style={{ color: LABEL }}>
                    {new Date(it.data + "T12:00:00").toLocaleDateString("ca-ES", { day: "numeric", month: "short" })}
                  </span>
                  <div className="flex-1">
                    {it.sensacio && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded mr-2"
                        style={{ backgroundColor: "#FBF4E8", color: "#A87830" }}>
                        {it.sensacio}
                      </span>
                    )}
                    {it.notes && <span className="text-[12px]" style={{ color: "#5C5048" }}>{it.notes}</span>}
                  </div>
                  {it.qualitat && (
                    <span className="text-[11px] font-black tabular-nums shrink-0" style={{ color: R }}>
                      {it.qualitat}/5
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

    </div>
  );
}
