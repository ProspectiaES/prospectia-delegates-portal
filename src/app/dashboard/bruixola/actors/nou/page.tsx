"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveActor } from "@/app/actions/strategic-actors";

const CARD    = "#FFFFFF";
const SURFACE = "#F8FAFC";
const BORDER  = "#E2E8F0";
const BORDER2 = "#CBD5E1";
const TEXT    = "#0F172A";
const DIM     = "#475569";
const LABEL   = "#94A3B8";
const BLUE    = "#1E40AF";
const GREEN   = "#166534";
const RED     = "#991B1B";
const AMBER   = "#92400E";

const ROL_TIPUS_OPTS = [
  "Soci", "Partner", "Client", "Distribuïdor", "Proveïdor", "Inversor",
  "Prescriptor", "KOL", "Regulador", "Consultor", "Agent comercial",
  "Fabricant", "Intermediari", "Contacte institucional", "Contacte estratègic",
  "Competidor", "Facilitador", "Bloquejador", "Risc reputacional", "PDI",
];

const REL_OPTS = [
  { value: "critic",             label: "Crític",              color: RED },
  { value: "alt_valor",          label: "Alt valor",           color: BLUE },
  { value: "oportunitat_latent", label: "Oportunitat latent",  color: GREEN },
  { value: "risc_estrategic",    label: "Risc estratègic",     color: AMBER },
  { value: "operatiu",           label: "Operatiu",            color: DIM },
  { value: "complementari",      label: "Complementari",       color: LABEL },
  { value: "baixa_prioritat",    label: "Baixa prioritat",     color: LABEL },
];

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-2">
        <p className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: LABEL }}>{label}</p>
        {hint && <p className="text-[9px]" style={{ color: LABEL }}>{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function DInput({ name, value, onChange, placeholder, type = "text" }: {
  name: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input name={name} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type}
      className="w-full outline-none text-[13px] rounded-lg px-3 py-2"
      style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER2}`, color: TEXT }}
      onFocus={e => (e.target.style.borderColor = "#0F172A")}
      onBlur={e => (e.target.style.borderColor = BORDER2)} />
  );
}

function DTextarea({ name, value, onChange, placeholder, rows = 3 }: {
  name: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea name={name} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="w-full outline-none resize-none text-[12px] leading-relaxed rounded-lg px-3 py-2"
      style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER2}`, color: TEXT }}
      onFocus={e => (e.target.style.borderColor = "#0F172A")}
      onBlur={e => (e.target.style.borderColor = BORDER2)} />
  );
}

function Scale5({ name, label, value, onChange }: {
  name: string; label: string; value: number | null; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <p className="text-[11px] w-40 shrink-0" style={{ color: DIM }}>{label}</p>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" onClick={() => onChange(n)}
            className="w-7 h-7 rounded text-[10px] font-bold transition-all"
            style={{
              backgroundColor: value === n ? TEXT : SURFACE,
              border: `1px solid ${value === n ? TEXT : BORDER2}`,
              color: value === n ? "#FFFFFF" : DIM,
            }}>
            {n}
          </button>
        ))}
      </div>
      <input type="hidden" name={name} value={value ?? ""} />
    </div>
  );
}

function SectionHeader({ title, color = TEXT }: { title: string; color?: string }) {
  return (
    <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: SURFACE, borderBottom: `1px solid ${BORDER}` }}>
      <div className="w-0.5 h-3.5 rounded-full" style={{ backgroundColor: color }} />
      <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color }}>{title}</p>
    </div>
  );
}

export default function NouActorPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Identitat
  const [nom, setNom]                         = useState("");
  const [empresa, setEmpresa]                 = useState("");
  const [carrec, setCarrec]                   = useState("");
  const [pais, setPais]                       = useState("");
  const [email, setEmail]                     = useState("");
  const [canal, setCanal]                     = useState("");
  const [origen, setOrigen]                   = useState("");
  const [dataPrimer, setDataPrimer]           = useState("");
  const [dataUltim, setDataUltim]             = useState(new Date().toISOString().split("T")[0]);

  // Rol
  const [rolTipus, setRolTipus]               = useState<string[]>([]);
  const [rolFormal, setRolFormal]             = useState("");
  const [rolReal, setRolReal]                 = useState("");
  const [poderDecisio, setPoderDecisio]       = useState<number | null>(null);
  const [capacitatExec, setCapacitatExec]     = useState<number | null>(null);
  const [capacitatInfl, setCapacitatInfl]     = useState<number | null>(null);
  const [accesAporta, setAccesAporta]         = useState("");
  const [mercatPotObrir, setMercatPotObrir]   = useState("");

  // Rellevància
  const [classificacio, setClassificacio]     = useState("");
  const [impactePotencial, setImpactePotencial] = useState<number | null>(null);
  const [valorEstrateg, setValorEstrateg]     = useState<number | null>(null);
  const [urgencia, setUrgencia]               = useState<number | null>(null);
  const [prioritat, setPrioritat]             = useState<number | null>(3);

  // PDI
  const [isPDI, setIsPDI]                     = useState(false);
  const [motiuPDI, setMotiuPDI]               = useState("");

  // Notes
  const [notes, setNotes]                     = useState("");

  function toggleRol(r: string) {
    setRolTipus(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
  }

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("rol_tipus", JSON.stringify(rolTipus));
    if (poderDecisio != null) fd.set("poder_decisio", String(poderDecisio));
    if (capacitatExec != null) fd.set("capacitat_execucio", String(capacitatExec));
    if (capacitatInfl != null) fd.set("capacitat_influencia", String(capacitatInfl));
    if (impactePotencial != null) fd.set("impacte_potencial", String(impactePotencial));
    if (valorEstrateg != null) fd.set("valor_estrategic", String(valorEstrateg));
    if (urgencia != null) fd.set("urgencia", String(urgencia));
    if (prioritat != null) fd.set("prioritat", String(prioritat));
    fd.set("is_pdi", String(isPDI));
    startTransition(async () => {
      const { id } = await saveActor(fd);
      router.push(`/dashboard/bruixola/actors/${id}`);
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-5 md:px-8 py-10 space-y-6">

      <div className="flex items-center gap-3">
        <Link href="/dashboard/bruixola/actors" className="text-[10px] font-bold uppercase tracking-[0.2em] hover:opacity-70" style={{ color: LABEL }}>
          ← Intel·ligència d&apos;Actors
        </Link>
      </div>

      <div>
        <h1 className="text-[24px] font-black" style={{ color: TEXT }}>Nou Actor Estratègic</h1>
        <p className="text-[11px] mt-1" style={{ color: DIM }}>
          Registra un actor que pot impactar el negoci, vendes, decisions, mercats o riscos.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">

        {/* Identitat */}
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, backgroundColor: CARD }}>
          <SectionHeader title="Identitat" color={TEXT} />
          <div className="p-5 space-y-4">
            <Field label="Nom *">
              <DInput name="nom" value={nom} onChange={setNom} placeholder="Nom complet…" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Empresa / Organització">
                <DInput name="empresa" value={empresa} onChange={setEmpresa} placeholder="Empresa…" />
              </Field>
              <Field label="Càrrec">
                <DInput name="carrec" value={carrec} onChange={setCarrec} placeholder="CEO, Director, etc." />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="País">
                <DInput name="pais" value={pais} onChange={setPais} placeholder="Espanya, EAU, etc." />
              </Field>
              <Field label="Email">
                <DInput name="email" value={email} onChange={setEmail} type="email" placeholder="email@empresa.com" />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Canal principal">
                <DInput name="canal_principal" value={canal} onChange={setCanal} placeholder="Email, Telèfon…" />
              </Field>
              <Field label="Primer contacte">
                <DInput name="data_primer_contacte" value={dataPrimer} onChange={setDataPrimer} type="date" />
              </Field>
              <Field label="Últim contacte">
                <DInput name="data_ultim_contacte" value={dataUltim} onChange={setDataUltim} type="date" />
              </Field>
            </div>
            <Field label="Origen del contacte">
              <DInput name="origen_contacte" value={origen} onChange={setOrigen} placeholder="Fira, referència, LinkedIn…" />
            </Field>
          </div>
        </div>

        {/* Rol empresarial */}
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, backgroundColor: CARD }}>
          <SectionHeader title="Rol Empresarial" color={BLUE} />
          <div className="p-5 space-y-4">
            <Field label="Tipus de rol (selecció múltiple)">
              <div className="flex flex-wrap gap-1.5">
                {ROL_TIPUS_OPTS.map(r => (
                  <button key={r} type="button" onClick={() => toggleRol(r)}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all"
                    style={{
                      backgroundColor: rolTipus.includes(r) ? TEXT : SURFACE,
                      border: `1px solid ${rolTipus.includes(r) ? TEXT : BORDER2}`,
                      color: rolTipus.includes(r) ? "#FFFFFF" : DIM,
                    }}>
                    {r}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Rol formal">
                <DInput name="rol_formal" value={rolFormal} onChange={setRolFormal} placeholder="Títol oficial…" />
              </Field>
              <Field label="Rol real">
                <DInput name="rol_real" value={rolReal} onChange={setRolReal} placeholder="Qui realment és/decideix…" />
              </Field>
            </div>
            <div className="space-y-2.5 pt-1">
              <Scale5 name="poder_decisio" label="Poder de decisió" value={poderDecisio} onChange={setPoderDecisio} />
              <Scale5 name="capacitat_execucio" label="Capacitat d'execució" value={capacitatExec} onChange={setCapacitatExec} />
              <Scale5 name="capacitat_influencia" label="Capacitat d'influència" value={capacitatInfl} onChange={setCapacitatInfl} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Accés que aporta">
                <DInput name="acces_que_aporta" value={accesAporta} onChange={setAccesAporta} placeholder="Clients, xarxa, mercat…" />
              </Field>
              <Field label="Mercat que pot obrir">
                <DInput name="mercat_que_pot_obrir" value={mercatPotObrir} onChange={setMercatPotObrir} placeholder="País, segment, canal…" />
              </Field>
            </div>
          </div>
        </div>

        {/* Rellevància estratègica */}
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, backgroundColor: CARD }}>
          <SectionHeader title="Rellevància Estratègica" color={AMBER} />
          <div className="p-5 space-y-4">
            <Field label="Classificació">
              <div className="flex flex-wrap gap-2">
                {REL_OPTS.map(opt => (
                  <button key={opt.value} type="button" onClick={() => setClassificacio(opt.value)}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                    style={{
                      border: `1px solid ${classificacio === opt.value ? opt.color : BORDER}`,
                      backgroundColor: classificacio === opt.value ? `${opt.color}12` : SURFACE,
                      color: classificacio === opt.value ? opt.color : DIM,
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <input type="hidden" name="classificacio_relevancia" value={classificacio} />
            </Field>
            <div className="space-y-2.5">
              <Scale5 name="impacte_potencial" label="Impacte potencial" value={impactePotencial} onChange={setImpactePotencial} />
              <Scale5 name="valor_estrategic" label="Valor estratègic" value={valorEstrateg} onChange={setValorEstrateg} />
              <Scale5 name="urgencia" label="Urgència" value={urgencia} onChange={setUrgencia} />
              <Scale5 name="prioritat" label="Prioritat" value={prioritat} onChange={setPrioritat} />
            </div>
          </div>
        </div>

        {/* PDI */}
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${isPDI ? "#6B21A8" : BORDER}`, backgroundColor: CARD }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: isPDI ? "#6B21A810" : SURFACE, borderBottom: `1px solid ${isPDI ? "#6B21A825" : BORDER}` }}>
            <div className="flex items-center gap-2">
              <div className="w-0.5 h-3.5 rounded-full" style={{ backgroundColor: "#6B21A8" }} />
              <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: "#6B21A8" }}>PDI — Persona d&apos;Interès</p>
            </div>
            <button type="button" onClick={() => setIsPDI(!isPDI)}
              className="text-[9px] font-bold px-2.5 py-1 rounded-lg transition-all"
              style={{ backgroundColor: isPDI ? "#6B21A8" : SURFACE, color: isPDI ? "#FFFFFF" : LABEL, border: `1px solid ${isPDI ? "#6B21A8" : BORDER2}` }}>
              {isPDI ? "Marcat PDI" : "Marcar PDI"}
            </button>
            <input type="hidden" name="is_pdi" value={String(isPDI)} />
          </div>
          {isPDI && (
            <div className="p-5 space-y-3">
              <Field label="Motiu PDI">
                <DTextarea name="motiu_pdi" value={motiuPDI} onChange={setMotiuPDI}
                  placeholder="Per quin motiu estratègic és PDI? Quina oportunitat o risc representa?" rows={2} />
              </Field>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, backgroundColor: CARD }}>
          <SectionHeader title="Notes" />
          <div className="p-5">
            <DTextarea name="notes" value={notes} onChange={setNotes}
              placeholder="Context inicial, observacions rellevants…" rows={3} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/dashboard/bruixola/actors"
            className="px-5 py-2.5 rounded-xl text-[11px] font-semibold"
            style={{ backgroundColor: SURFACE, color: DIM, border: `1px solid ${BORDER2}` }}>
            Cancel·lar
          </Link>
          <button type="submit" disabled={!nom || isPending}
            className="px-6 py-2.5 rounded-xl text-[11px] font-bold transition-all disabled:opacity-40 hover:opacity-80"
            style={{ backgroundColor: TEXT, color: "#FFFFFF" }}>
            {isPending ? "Guardant…" : "Crear actor"}
          </button>
        </div>
      </form>
    </div>
  );
}
