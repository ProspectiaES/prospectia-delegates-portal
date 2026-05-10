"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  getActor, saveActor, deleteActor, analyzeActor,
  getInteractions, saveInteraction, deleteInteraction,
  getLinks, saveLink, deleteLink, exportPDI,
  getActorDocuments, uploadActorDocument, deleteActorDocument, getDocumentSignedUrl,
} from "@/app/actions/strategic-actors";
import type { StrategicActor, ActorInteraction, ActorLink, ActorAlert, ActorDocument } from "@/app/actions/strategic-actors";

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
const PURPLE  = "#6B21A8";

const ROL_TIPUS_OPTS = [
  "Soci","Partner","Client","Distribuïdor","Proveïdor","Inversor",
  "Prescriptor","KOL","Regulador","Consultor","Agent comercial",
  "Fabricant","Intermediari","Contacte institucional","Contacte estratègic",
  "Competidor","Facilitador","Bloquejador","Risc reputacional","PDI",
];
const TRETS_OPTS = [
  "racional","emocional","directe","ambigu","estratègic","operatiu","controlador",
  "evitatiu","reactiu","cooperatiu","competitiu","oportunista","prudent","impulsiu",
  "fiable","imprevisible","dependent","dominant","negociador dur","relacional",
  "tècnic","polític","protector","bloquejador passiu","accelerador",
];
const REL_OPTS = [
  { value: "critic",             label: "Crític",           color: RED },
  { value: "alt_valor",          label: "Alt valor",        color: BLUE },
  { value: "oportunitat_latent", label: "Oportunitat",      color: GREEN },
  { value: "risc_estrategic",    label: "Risc estratègic",  color: AMBER },
  { value: "operatiu",           label: "Operatiu",         color: DIM },
  { value: "complementari",      label: "Complementari",    color: LABEL },
  { value: "baixa_prioritat",    label: "Baixa prioritat",  color: LABEL },
];
const POT_OPTS = ["molt_alt","alt","mitja","baix","incert","no_validat"];
const POT_LABELS: Record<string,string> = { molt_alt:"Molt alt", alt:"Alt", mitja:"Mitjà", baix:"Baix", incert:"Incert", no_validat:"No validat" };
const RISC_LABELS: Record<string,string> = { baix:"Baix", mitja:"Mitjà", alt:"Alt", critic:"Crític", desconegut:"Desconegut" };
const RISC_COLORS: Record<string,string> = { baix:GREEN, mitja:AMBER, alt:RED, critic:"#7F1D1D", desconegut:LABEL };
const RISC_NIVEL: string[] = ["Desconegut","Baix","Mitjà","Alt","Crític"];
const TABS = ["Visió General","Conducta","Potencialitat","Risc","Vincles","Documents","Historial","Anàlisi IA"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: LABEL }}>{label}</p>
      {children}
    </div>
  );
}
function DInput({ name, value, onChange, type="text", placeholder }: {
  name:string; value:string; onChange:(v:string)=>void; type?:string; placeholder?:string;
}) {
  return (
    <input name={name} value={value} onChange={e=>onChange(e.target.value)} type={type} placeholder={placeholder}
      className="w-full outline-none text-[12px] rounded-lg px-3 py-2"
      style={{backgroundColor:SURFACE,border:`1px solid ${BORDER2}`,color:TEXT}}
      onFocus={e=>(e.target.style.borderColor="#0F172A")}
      onBlur={e=>(e.target.style.borderColor=BORDER2)} />
  );
}
function DTextarea({ name, value, onChange, placeholder, rows=3 }: {
  name:string; value:string; onChange:(v:string)=>void; placeholder?:string; rows?:number;
}) {
  return (
    <textarea name={name} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="w-full outline-none resize-none text-[12px] leading-relaxed rounded-lg px-3 py-2"
      style={{backgroundColor:SURFACE,border:`1px solid ${BORDER2}`,color:TEXT}}
      onFocus={e=>(e.target.style.borderColor="#0F172A")}
      onBlur={e=>(e.target.style.borderColor=BORDER2)} />
  );
}
function Scale5({ name, label, value, onChange }: { name:string; label:string; value:number|null; onChange:(v:number)=>void }) {
  return (
    <div className="flex items-center gap-3">
      <p className="text-[11px] w-44 shrink-0" style={{color:DIM}}>{label}</p>
      <div className="flex gap-1.5">
        {[1,2,3,4,5].map(n=>(
          <button key={n} type="button" onClick={()=>onChange(n)}
            className="w-7 h-7 rounded text-[10px] font-bold transition-all"
            style={{backgroundColor:value===n?TEXT:SURFACE,border:`1px solid ${value===n?TEXT:BORDER2}`,color:value===n?"#FFFFFF":DIM}}>
            {n}
          </button>
        ))}
      </div>
      <input type="hidden" name={name} value={value??""} />
    </div>
  );
}
function RiscScale({ label, value, onChange }: { label:string; value:number; onChange:(v:number)=>void }) {
  const colors = [LABEL, GREEN, AMBER, RED, "#7F1D1D"];
  return (
    <div className="flex items-center gap-3">
      <p className="text-[11px] w-40 shrink-0" style={{color:DIM}}>{label}</p>
      <div className="flex gap-1">
        {[0,1,2,3,4].map(n=>(
          <button key={n} type="button" onClick={()=>onChange(n)}
            className="w-7 h-6 rounded text-[9px] font-bold transition-all"
            style={{backgroundColor:value===n?colors[n]:SURFACE,border:`1px solid ${value===n?colors[n]:BORDER2}`,color:value===n?"#FFFFFF":DIM}}>
            {n===0?"?":n}
          </button>
        ))}
      </div>
      <span className="text-[9px]" style={{color:colors[value]}}>{RISC_NIVEL[value]}</span>
    </div>
  );
}

// ─── Tab: Visió General ───────────────────────────────────────────────────────

function TabVisiogeneral({ actor, onSaved }: { actor: StrategicActor; onSaved: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [nom, setNom] = useState(actor.nom);
  const [empresa, setEmpresa] = useState(actor.empresa ?? "");
  const [carrec, setCarrec] = useState(actor.carrec ?? "");
  const [pais, setPais] = useState(actor.pais ?? "");
  const [email, setEmail] = useState(actor.email ?? "");
  const [telefon, setTelefon] = useState(actor.telefon ?? "");
  const [canal, setCanal] = useState(actor.canal_principal ?? "");
  const [origen, setOrigen] = useState(actor.origen_contacte ?? "");
  const [dataPrimer, setDataPrimer] = useState(actor.data_primer_contacte ?? "");
  const [dataUltim, setDataUltim] = useState(actor.data_ultim_contacte ?? "");
  const [font, setFont] = useState(actor.font_informacio ?? "");
  const [rolTipus, setRolTipus] = useState<string[]>(actor.rol_tipus ?? []);
  const [rolFormal, setRolFormal] = useState(actor.rol_formal ?? "");
  const [rolReal, setRolReal] = useState(actor.rol_real ?? "");
  const [poderDecisio, setPoderDecisio] = useState<number|null>(actor.poder_decisio);
  const [capacitatExec, setCapacitatExec] = useState<number|null>(actor.capacitat_execucio);
  const [capacitatInfl, setCapacitatInfl] = useState<number|null>(actor.capacitat_influencia);
  const [accesAporta, setAccesAporta] = useState(actor.acces_que_aporta ?? "");
  const [mercat, setMercat] = useState(actor.mercat_que_pot_obrir ?? "");
  const [classificacio, setClassificacio] = useState(actor.classificacio_relevancia ?? "");
  const [impactePot, setImpactePot] = useState<number|null>(actor.impacte_potencial);
  const [impacteAct, setImpacteAct] = useState<number|null>(actor.impacte_actual);
  const [valor, setValor] = useState<number|null>(actor.valor_estrategic);
  const [urgencia, setUrgencia] = useState<number|null>(actor.urgencia);
  const [prioritat, setPrioritat] = useState<number|null>(actor.prioritat);
  const [alineacio, setAlineacio] = useState<number|null>(actor.alineacio_objectius);
  const [capCaixa, setCapCaixa] = useState<number|null>(actor.capacitat_caixa);
  const [capPortes, setCapPortes] = useState<number|null>(actor.capacitat_portes);
  const [capBloqueig, setCapBloqueig] = useState<number|null>(actor.capacitat_bloqueig);
  const [capAccelerar, setCapAccelerar] = useState<number|null>(actor.capacitat_accelerar);
  const [notes, setNotes] = useState(actor.notes ?? "");

  function toggleRol(r: string) { setRolTipus(prev => prev.includes(r) ? prev.filter(x=>x!==r) : [...prev,r]); }

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("id", actor.id);
    fd.set("rol_tipus", JSON.stringify(rolTipus));
    [["poder_decisio",poderDecisio],["capacitat_execucio",capacitatExec],["capacitat_influencia",capacitatInfl],
     ["impacte_potencial",impactePot],["impacte_actual",impacteAct],["valor_estrategic",valor],
     ["urgencia",urgencia],["prioritat",prioritat],["alineacio_objectius",alineacio],
     ["capacitat_caixa",capCaixa],["capacitat_portes",capPortes],["capacitat_bloqueig",capBloqueig],
     ["capacitat_accelerar",capAccelerar]
    ].forEach(([k,v]) => { if (v!=null) fd.set(k as string, String(v)); });
    startTransition(async () => { await saveActor(fd); setSaved(true); setTimeout(()=>setSaved(false),2000); onSaved(); });
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Identitat */}
      <div className="rounded-xl overflow-hidden" style={{border:`1px solid ${BORDER}`,backgroundColor:CARD}}>
        <div className="px-4 py-2.5" style={{backgroundColor:SURFACE,borderBottom:`1px solid ${BORDER}`}}>
          <p className="text-[8px] font-bold uppercase tracking-[0.2em]" style={{color:LABEL}}>Identitat</p>
        </div>
        <div className="p-5 space-y-4">
          <Field label="Nom *"><DInput name="nom" value={nom} onChange={setNom} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Empresa"><DInput name="empresa" value={empresa} onChange={setEmpresa} /></Field>
            <Field label="Càrrec"><DInput name="carrec" value={carrec} onChange={setCarrec} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="País"><DInput name="pais" value={pais} onChange={setPais} /></Field>
            <Field label="Email"><DInput name="email" value={email} onChange={setEmail} type="email" /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Telèfon"><DInput name="telefon" value={telefon} onChange={setTelefon} /></Field>
            <Field label="Canal principal"><DInput name="canal_principal" value={canal} onChange={setCanal} /></Field>
            <Field label="Origen contacte"><DInput name="origen_contacte" value={origen} onChange={setOrigen} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Primer contacte"><DInput name="data_primer_contacte" value={dataPrimer} onChange={setDataPrimer} type="date" /></Field>
            <Field label="Últim contacte"><DInput name="data_ultim_contacte" value={dataUltim} onChange={setDataUltim} type="date" /></Field>
            <Field label="Font informació"><DInput name="font_informacio" value={font} onChange={setFont} /></Field>
          </div>
        </div>
      </div>

      {/* Rol */}
      <div className="rounded-xl overflow-hidden" style={{border:`1px solid ${BORDER}`,backgroundColor:CARD}}>
        <div className="px-4 py-2.5" style={{backgroundColor:SURFACE,borderBottom:`1px solid ${BORDER}`}}>
          <p className="text-[8px] font-bold uppercase tracking-[0.2em]" style={{color:BLUE}}>Rol Empresarial</p>
        </div>
        <div className="p-5 space-y-4">
          <Field label="Tipus de rol">
            <div className="flex flex-wrap gap-1.5">
              {ROL_TIPUS_OPTS.map(r=>(
                <button key={r} type="button" onClick={()=>toggleRol(r)}
                  className="px-2.5 py-0.5 rounded-lg text-[9px] font-medium transition-all"
                  style={{backgroundColor:rolTipus.includes(r)?TEXT:SURFACE,border:`1px solid ${rolTipus.includes(r)?TEXT:BORDER2}`,color:rolTipus.includes(r)?"#FFFFFF":DIM}}>
                  {r}
                </button>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Rol formal"><DInput name="rol_formal" value={rolFormal} onChange={setRolFormal} /></Field>
            <Field label="Rol real"><DInput name="rol_real" value={rolReal} onChange={setRolReal} /></Field>
          </div>
          <div className="space-y-2">
            <Scale5 name="poder_decisio" label="Poder de decisió" value={poderDecisio} onChange={setPoderDecisio} />
            <Scale5 name="capacitat_execucio" label="Capacitat d'execució" value={capacitatExec} onChange={setCapacitatExec} />
            <Scale5 name="capacitat_influencia" label="Capacitat d'influència" value={capacitatInfl} onChange={setCapacitatInfl} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Accés que aporta"><DInput name="acces_que_aporta" value={accesAporta} onChange={setAccesAporta} /></Field>
            <Field label="Mercat que pot obrir"><DInput name="mercat_que_pot_obrir" value={mercat} onChange={setMercat} /></Field>
          </div>
        </div>
      </div>

      {/* Rellevància */}
      <div className="rounded-xl overflow-hidden" style={{border:`1px solid ${BORDER}`,backgroundColor:CARD}}>
        <div className="px-4 py-2.5" style={{backgroundColor:SURFACE,borderBottom:`1px solid ${BORDER}`}}>
          <p className="text-[8px] font-bold uppercase tracking-[0.2em]" style={{color:AMBER}}>Rellevància Estratègica</p>
        </div>
        <div className="p-5 space-y-4">
          <Field label="Classificació">
            <div className="flex flex-wrap gap-2">
              {REL_OPTS.map(opt=>(
                <button key={opt.value} type="button" onClick={()=>setClassificacio(opt.value)}
                  className="px-3 py-1 rounded-lg text-[9px] font-semibold transition-all"
                  style={{border:`1px solid ${classificacio===opt.value?opt.color:BORDER}`,backgroundColor:classificacio===opt.value?`${opt.color}12`:SURFACE,color:classificacio===opt.value?opt.color:DIM}}>
                  {opt.label}
                </button>
              ))}
            </div>
            <input type="hidden" name="classificacio_relevancia" value={classificacio} />
          </Field>
          <div className="space-y-2">
            <Scale5 name="impacte_potencial" label="Impacte potencial" value={impactePot} onChange={setImpactePot} />
            <Scale5 name="impacte_actual" label="Impacte actual" value={impacteAct} onChange={setImpacteAct} />
            <Scale5 name="valor_estrategic" label="Valor estratègic" value={valor} onChange={setValor} />
            <Scale5 name="urgencia" label="Urgència" value={urgencia} onChange={setUrgencia} />
            <Scale5 name="prioritat" label="Prioritat" value={prioritat} onChange={setPrioritat} />
            <Scale5 name="alineacio_objectius" label="Alineació amb objectius" value={alineacio} onChange={setAlineacio} />
            <Scale5 name="capacitat_caixa" label="Capacitat de generar caixa" value={capCaixa} onChange={setCapCaixa} />
            <Scale5 name="capacitat_portes" label="Capacitat d'obrir portes" value={capPortes} onChange={setCapPortes} />
            <Scale5 name="capacitat_bloqueig" label="Capacitat de bloquejar" value={capBloqueig} onChange={setCapBloqueig} />
            <Scale5 name="capacitat_accelerar" label="Capacitat d'accelerar" value={capAccelerar} onChange={setCapAccelerar} />
          </div>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{border:`1px solid ${BORDER}`,backgroundColor:CARD}}>
        <div className="px-4 py-2.5" style={{backgroundColor:SURFACE,borderBottom:`1px solid ${BORDER}`}}>
          <p className="text-[8px] font-bold uppercase tracking-[0.2em]" style={{color:LABEL}}>Notes generals</p>
        </div>
        <div className="p-5">
          <DTextarea name="notes" value={notes} onChange={setNotes} placeholder="Context, observacions rellevants…" rows={3} />
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] font-semibold" style={{color:GREEN,opacity:saved?1:0}}>✓ Guardat</span>
        <button type="submit" disabled={!nom||isPending}
          className="px-6 py-2.5 rounded-xl text-[11px] font-bold disabled:opacity-40 hover:opacity-80 transition-all"
          style={{backgroundColor:TEXT,color:"#FFFFFF"}}>
          {isPending?"Guardant…":"Guardar canvis"}
        </button>
      </div>
    </form>
  );
}

// ─── Tab: Conducta ────────────────────────────────────────────────────────────

function TabConducta({ actor, onSaved }: { actor: StrategicActor; onSaved: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [estilCom, setEstilCom] = useState(actor.estil_comunicacio ?? "");
  const [estilDec, setEstilDec] = useState(actor.estil_decisio ?? "");
  const [velRes, setVelRes] = useState(actor.velocitat_resposta ?? "");
  const [tolRisc, setTolRisc] = useState(actor.tolerancia_risc ?? "");
  const [fiabilitat, setFiabilitat] = useState<number|null>(actor.fiabilitat_percebuda);
  const [consistencia, setConsistencia] = useState<number|null>(actor.consistencia);
  const [oriRes, setOriRes] = useState<number|null>(actor.orientacio_resultat);
  const [oriRel, setOriRel] = useState<number|null>(actor.orientacio_relacio);
  const [capNeg, setCapNeg] = useState<number|null>(actor.capacitat_negociacio);
  const [trets, setTrets] = useState<string[]>(actor.trets_conductuals ?? []);
  const [notesCond, setNotesCond] = useState(actor.notes_conductuals ?? "");

  function toggleTret(t: string) { setTrets(prev=>prev.includes(t)?prev.filter(x=>x!==t):[...prev,t]); }

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("id", actor.id);
    fd.set("trets_conductuals", JSON.stringify(trets));
    [["fiabilitat_percebuda",fiabilitat],["consistencia",consistencia],["orientacio_resultat",oriRes],
     ["orientacio_relacio",oriRel],["capacitat_negociacio",capNeg]
    ].forEach(([k,v])=>{ if(v!=null) fd.set(k as string,String(v)); });
    startTransition(async()=>{ await saveActor(fd); setSaved(true); setTimeout(()=>setSaved(false),2000); onSaved(); });
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div className="rounded-xl overflow-hidden" style={{border:`1px solid ${BORDER}`,backgroundColor:CARD}}>
        <div className="px-4 py-2.5 flex items-center gap-2" style={{backgroundColor:SURFACE,borderBottom:`1px solid ${BORDER}`}}>
          <p className="text-[8px] font-bold uppercase tracking-[0.2em]" style={{color:LABEL}}>Perfil Conductual</p>
          <span className="text-[8px] px-1.5 py-0.5 rounded" style={{backgroundColor:`${AMBER}15`,color:AMBER,border:`1px solid ${AMBER}25`}}>
            patrons observables · no diagnòstic clínic
          </span>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Estil de comunicació">
              <DInput name="estil_comunicacio" value={estilCom} onChange={setEstilCom} placeholder="Directe, formal, informal…" />
            </Field>
            <Field label="Estil de decisió">
              <DInput name="estil_decisio" value={estilDec} onChange={setEstilDec} placeholder="Analític, intuitiu, per consens…" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Velocitat de resposta">
              <DInput name="velocitat_resposta" value={velRes} onChange={setVelRes} placeholder="Ràpid, lent, irregular…" />
            </Field>
            <Field label="Tolerància al risc">
              <DInput name="tolerancia_risc" value={tolRisc} onChange={setTolRisc} placeholder="Alta, baixa, conservador…" />
            </Field>
          </div>
          <div className="space-y-2">
            <Scale5 name="fiabilitat_percebuda" label="Fiabilitat percebuda" value={fiabilitat} onChange={setFiabilitat} />
            <Scale5 name="consistencia" label="Consistència" value={consistencia} onChange={setConsistencia} />
            <Scale5 name="orientacio_resultat" label="Orientació a resultat" value={oriRes} onChange={setOriRes} />
            <Scale5 name="orientacio_relacio" label="Orientació a relació" value={oriRel} onChange={setOriRel} />
            <Scale5 name="capacitat_negociacio" label="Capacitat de negociació" value={capNeg} onChange={setCapNeg} />
          </div>
          <Field label="Trets conductuals observats">
            <div className="flex flex-wrap gap-1.5 mt-1">
              {TRETS_OPTS.map(t=>(
                <button key={t} type="button" onClick={()=>toggleTret(t)}
                  className="px-2.5 py-0.5 rounded-full text-[9px] font-medium transition-all"
                  style={{backgroundColor:trets.includes(t)?TEXT:SURFACE,border:`1px solid ${trets.includes(t)?TEXT:BORDER2}`,color:trets.includes(t)?"#FFFFFF":DIM}}>
                  {t}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Notes conductuals">
            <DTextarea name="notes_conductuals" value={notesCond} onChange={setNotesCond}
              placeholder="Observacions sobre patrons de comportament rellevants per a la relació empresarial…" rows={3} />
          </Field>
        </div>
      </div>
      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] font-semibold" style={{color:GREEN,opacity:saved?1:0}}>✓ Guardat</span>
        <button type="submit" disabled={isPending}
          className="px-6 py-2.5 rounded-xl text-[11px] font-bold disabled:opacity-40 hover:opacity-80 transition-all"
          style={{backgroundColor:TEXT,color:"#FFFFFF"}}>
          {isPending?"Guardant…":"Guardar canvis"}
        </button>
      </div>
    </form>
  );
}

// ─── Tab: Potencialitat ───────────────────────────────────────────────────────

function TabPotencialitat({ actor, onSaved }: { actor: StrategicActor; onSaved: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [classif, setClassif] = useState(actor.classificacio_potencial ?? "");
  const [justif, setJustif] = useState(actor.justificacio_potencial ?? "");

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("id", actor.id);
    startTransition(async()=>{ await saveActor(fd); setSaved(true); setTimeout(()=>setSaved(false),2000); onSaved(); });
  }

  const potColor = classif==="molt_alt"?GREEN:classif==="alt"?BLUE:classif==="baix"?RED:DIM;

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div className="rounded-xl overflow-hidden" style={{border:`1px solid ${BORDER}`,backgroundColor:CARD}}>
        <div className="px-4 py-2.5" style={{backgroundColor:SURFACE,borderBottom:`1px solid ${BORDER}`}}>
          <p className="text-[8px] font-bold uppercase tracking-[0.2em]" style={{color:GREEN}}>Potencialitat</p>
        </div>
        <div className="p-5 space-y-4">
          <Field label="Classificació">
            <div className="flex flex-wrap gap-2">
              {POT_OPTS.map(opt=>(
                <button key={opt} type="button" onClick={()=>setClassif(opt)}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                  style={{border:`1px solid ${classif===opt?potColor:BORDER}`,backgroundColor:classif===opt?`${potColor}12`:SURFACE,color:classif===opt?potColor:DIM}}>
                  {POT_LABELS[opt]}
                </button>
              ))}
            </div>
            <input type="hidden" name="classificacio_potencial" value={classif} />
          </Field>
          <Field label="Justificació de la classificació">
            <DTextarea name="justificacio_potencial" value={justif} onChange={setJustif}
              placeholder="Per quin motiu té aquest nivell de potencial? Base factual…" rows={3} />
          </Field>
        </div>
      </div>

      {actor.potencial_ia && (
        <div className="rounded-xl p-4" style={{backgroundColor:SURFACE,border:`1px solid ${BORDER}`}}>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[8px] font-bold uppercase tracking-[0.2em]" style={{color:GREEN}}>Anàlisi IA — Potencial</p>
            {actor.ai_confianca && (
              <span className="text-[8px] px-1.5 py-0.5 rounded" style={{backgroundColor:`${GREEN}15`,color:GREEN}}>
                Confiança {actor.ai_confianca}/5
              </span>
            )}
          </div>
          <p className="text-[12px] leading-relaxed whitespace-pre-line" style={{color:DIM}}>{actor.potencial_ia}</p>
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] font-semibold" style={{color:GREEN,opacity:saved?1:0}}>✓ Guardat</span>
        <button type="submit" disabled={isPending}
          className="px-6 py-2.5 rounded-xl text-[11px] font-bold disabled:opacity-40 hover:opacity-80 transition-all"
          style={{backgroundColor:TEXT,color:"#FFFFFF"}}>
          {isPending?"Guardant…":"Guardar"}
        </button>
      </div>
    </form>
  );
}

// ─── Tab: Risc ────────────────────────────────────────────────────────────────

function TabRisc({ actor, onSaved }: { actor: StrategicActor; onSaved: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [riscCom, setRiscCom] = useState(actor.risc_comercial ?? 0);
  const [riscRep, setRiscRep] = useState(actor.risc_reputacional ?? 0);
  const [riscLeg, setRiscLeg] = useState(actor.risc_legal ?? 0);
  const [riscFin, setRiscFin] = useState(actor.risc_financer ?? 0);
  const [riscDep, setRiscDep] = useState(actor.risc_dependencia ?? 0);
  const [riscInc, setRiscInc] = useState(actor.risc_incompliment ?? 0);
  const [riscBlo, setRiscBlo] = useState(actor.risc_bloqueig ?? 0);
  const [riscCon, setRiscCon] = useState(actor.risc_conflicte ?? 0);
  const [classifRisc, setClassifRisc] = useState(actor.classificacio_risc ?? "");
  const [notesRisc, setNotesRisc] = useState(actor.notes_risc ?? "");

  const RISC_OPT = ["baix","mitja","alt","critic","desconegut"];

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("id", actor.id);
    fd.set("risc_comercial", String(riscCom));
    fd.set("risc_reputacional", String(riscRep));
    fd.set("risc_legal", String(riscLeg));
    fd.set("risc_financer", String(riscFin));
    fd.set("risc_dependencia", String(riscDep));
    fd.set("risc_incompliment", String(riscInc));
    fd.set("risc_bloqueig", String(riscBlo));
    fd.set("risc_conflicte", String(riscCon));
    startTransition(async()=>{ await saveActor(fd); setSaved(true); setTimeout(()=>setSaved(false),2000); onSaved(); });
  }

  const maxRisc = Math.max(riscCom,riscRep,riscLeg,riscFin,riscDep,riscInc,riscBlo,riscCon);
  const risc_color = RISC_COLORS[classifRisc ?? ""] ?? (maxRisc>=3?RED:maxRisc>=2?AMBER:LABEL);

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div className="rounded-xl overflow-hidden" style={{border:`1px solid ${BORDER}`,backgroundColor:CARD}}>
        <div className="px-4 py-2.5" style={{backgroundColor:SURFACE,borderBottom:`1px solid ${BORDER}`}}>
          <p className="text-[8px] font-bold uppercase tracking-[0.2em]" style={{color:RED}}>Risc Empresarial</p>
        </div>
        <div className="p-5 space-y-3">
          <RiscScale label="Risc comercial" value={riscCom} onChange={setRiscCom} />
          <RiscScale label="Risc reputacional" value={riscRep} onChange={setRiscRep} />
          <RiscScale label="Risc legal / regulatori" value={riscLeg} onChange={setRiscLeg} />
          <RiscScale label="Risc financer" value={riscFin} onChange={setRiscFin} />
          <RiscScale label="Risc de dependència" value={riscDep} onChange={setRiscDep} />
          <RiscScale label="Risc d'incompliment" value={riscInc} onChange={setRiscInc} />
          <RiscScale label="Risc de bloqueig" value={riscBlo} onChange={setRiscBlo} />
          <RiscScale label="Risc de conflicte" value={riscCon} onChange={setRiscCon} />
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{border:`1px solid ${BORDER}`,backgroundColor:CARD}}>
        <div className="px-4 py-2.5" style={{backgroundColor:SURFACE,borderBottom:`1px solid ${BORDER}`}}>
          <p className="text-[8px] font-bold uppercase tracking-[0.2em]" style={{color:RED}}>Classificació de risc global</p>
        </div>
        <div className="p-5 space-y-4">
          <Field label="Classificació">
            <div className="flex flex-wrap gap-2">
              {RISC_OPT.map(opt=>(
                <button key={opt} type="button" onClick={()=>setClassifRisc(opt)}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                  style={{border:`1px solid ${classifRisc===opt?RISC_COLORS[opt]:BORDER}`,backgroundColor:classifRisc===opt?`${RISC_COLORS[opt]}12`:SURFACE,color:classifRisc===opt?RISC_COLORS[opt]:DIM}}>
                  {RISC_LABELS[opt]}
                </button>
              ))}
            </div>
            <input type="hidden" name="classificacio_risc" value={classifRisc} />
          </Field>
          <Field label="Notes de risc">
            <DTextarea name="notes_risc" value={notesRisc} onChange={setNotesRisc}
              placeholder="Descripció objectiva dels riscos: base factual, no judicis personals…" rows={3} />
          </Field>
        </div>
      </div>

      {actor.notes_risc && actor.ai_analisi_complet && (
        <div className="rounded-xl p-4" style={{backgroundColor:`${risc_color}06`,border:`1px solid ${risc_color}20`}}>
          <p className="text-[8px] font-bold uppercase tracking-[0.2em] mb-2" style={{color:risc_color}}>
            Anàlisi IA — Risc
          </p>
          <p className="text-[11px] leading-relaxed" style={{color:DIM}}>{actor.notes_risc}</p>
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] font-semibold" style={{color:GREEN,opacity:saved?1:0}}>✓ Guardat</span>
        <button type="submit" disabled={isPending}
          className="px-6 py-2.5 rounded-xl text-[11px] font-bold disabled:opacity-40 hover:opacity-80 transition-all"
          style={{backgroundColor:TEXT,color:"#FFFFFF"}}>
          {isPending?"Guardant…":"Guardar"}
        </button>
      </div>
    </form>
  );
}

// ─── Tab: Vincles ─────────────────────────────────────────────────────────────

function TabVincles({ actorId }: { actorId: string }) {
  const [links, setLinks] = useState<ActorLink[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [entTipus, setEntTipus] = useState("projecte");
  const [entNom, setEntNom] = useState("");
  const [tipusVincle, setTipusVincle] = useState("fort");
  const [desc, setDesc] = useState("");

  const reload = useCallback(async () => {
    const data = await getLinks(actorId);
    setLinks(data);
  }, [actorId]);

  useEffect(() => { reload(); }, [reload]);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("actor_id", actorId);
    fd.set("entitat_tipus", entTipus);
    fd.set("entitat_nom", entNom);
    fd.set("tipus_vincle", tipusVincle);
    fd.set("descripcio", desc);
    startTransition(async () => {
      await saveLink(fd);
      setShowForm(false); setEntNom(""); setDesc("");
      reload();
    });
  }

  const VINCLE_COLORS: Record<string,string> = { fort:BLUE, feble:DIM, incert:LABEL, conflictiu:RED, influencia:AMBER, dependencia:RED, confianca:GREEN };
  const ENT_ICONS: Record<string,string> = { actor:"👤", projecte:"📋", objectiu:"🎯", producte:"📦", mercat:"🌍", institucio:"🏛", client:"🤝", proveidor:"⚙️" };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={()=>setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl text-[10px] font-bold transition-all hover:opacity-80"
          style={{backgroundColor:TEXT,color:"#FFFFFF"}}>
          + Nou vincle
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="p-4 space-y-3 rounded-xl" style={{backgroundColor:SURFACE,border:`1px solid ${BORDER2}`}}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipus entitat">
              <select value={entTipus} onChange={e=>setEntTipus(e.target.value)}
                className="w-full outline-none text-[12px] rounded-lg px-3 py-2"
                style={{backgroundColor:CARD,border:`1px solid ${BORDER2}`,color:TEXT}}>
                {["actor","projecte","objectiu","producte","mercat","institucio","client","proveidor"].map(t=>
                  <option key={t} value={t}>{ENT_ICONS[t]} {t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
            </Field>
            <Field label="Nom / entitat *">
              <input value={entNom} onChange={e=>setEntNom(e.target.value)} placeholder="Nom…"
                className="w-full outline-none text-[12px] rounded-lg px-3 py-2"
                style={{backgroundColor:CARD,border:`1px solid ${BORDER2}`,color:TEXT}} />
            </Field>
          </div>
          <Field label="Tipus de vincle">
            <div className="flex flex-wrap gap-1.5">
              {["fort","feble","incert","conflictiu","influencia","dependencia","confianca"].map(v=>(
                <button key={v} type="button" onClick={()=>setTipusVincle(v)}
                  className="px-2.5 py-1 rounded-lg text-[9px] font-medium transition-all"
                  style={{backgroundColor:tipusVincle===v?(VINCLE_COLORS[v]??"#000"):CARD,border:`1px solid ${tipusVincle===v?(VINCLE_COLORS[v]??BORDER):BORDER2}`,color:tipusVincle===v?"#FFFFFF":DIM}}>
                  {v}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Descripció">
            <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Descripció del vincle…"
              className="w-full outline-none text-[12px] rounded-lg px-3 py-2"
              style={{backgroundColor:CARD,border:`1px solid ${BORDER2}`,color:TEXT}} />
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={()=>setShowForm(false)} className="px-3 py-1.5 text-[10px] rounded-lg" style={{color:LABEL}}>Cancel·lar</button>
            <button type="submit" disabled={!entNom||isPending}
              className="px-4 py-1.5 rounded-lg text-[10px] font-bold disabled:opacity-40"
              style={{backgroundColor:TEXT,color:"#FFFFFF"}}>
              Afegir vincle
            </button>
          </div>
        </form>
      )}

      {links.length === 0 && !showForm && (
        <div className="rounded-xl p-10 text-center" style={{backgroundColor:SURFACE,border:`1px dashed ${BORDER}`}}>
          <p className="text-[12px] font-semibold mb-1" style={{color:TEXT}}>Cap vincle registrat</p>
          <p className="text-[10px]" style={{color:DIM}}>Vincula aquest actor a projectes, objectius, mercats o altres actors.</p>
        </div>
      )}

      <div className="space-y-2">
        {links.map(link=>{
          const vc = VINCLE_COLORS[link.tipus_vincle ?? ""] ?? LABEL;
          return (
            <div key={link.id} className="rounded-xl px-4 py-3 flex items-start gap-3"
              style={{backgroundColor:CARD,border:`1px solid ${BORDER}`}}>
              <span className="text-lg shrink-0">{ENT_ICONS[link.entitat_tipus]??""}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[12px] font-semibold" style={{color:TEXT}}>{link.entitat_nom}</p>
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase"
                    style={{backgroundColor:`${vc}12`,color:vc,border:`1px solid ${vc}25`}}>
                    {link.tipus_vincle}
                  </span>
                  <span className="text-[9px]" style={{color:LABEL}}>{link.entitat_tipus}</span>
                </div>
                {link.descripcio && <p className="text-[10px] mt-0.5" style={{color:DIM}}>{link.descripcio}</p>}
              </div>
              <button type="button" onClick={()=>startTransition(async()=>{ await deleteLink(link.id,actorId); reload(); })}
                className="text-[10px] hover:opacity-70 shrink-0" style={{color:LABEL}}>×</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab: Documents ───────────────────────────────────────────────────────────

const ACCEPTED_TYPES = ".pdf,.txt,.md,.csv,.docx";
const MAX_MB = 20;

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function DocIcon({ tipus }: { tipus: string | null }) {
  if (tipus?.includes("pdf")) return <span className="text-lg">📄</span>;
  if (tipus?.includes("text") || tipus?.includes("csv")) return <span className="text-lg">📝</span>;
  return <span className="text-lg">📎</span>;
}

function TabDocuments({ actorId }: { actorId: string }) {
  const [docs, setDocs] = useState<ActorDocument[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isUploading, startUpload] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [notes, setNotes] = useState("");
  const [pregunta, setPregunta] = useState("");
  const [fileRef, setFileRef] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadOk, setUploadOk] = useState(false);

  const reload = useCallback(async () => {
    const d = await getActorDocuments(actorId);
    setDocs(d);
  }, [actorId]);

  useEffect(() => { reload(); }, [reload]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > MAX_MB * 1024 * 1024) {
      setError(`El fitxer supera ${MAX_MB} MB`);
      setFileRef(null);
    } else {
      setError(null);
      setFileRef(f);
    }
  }

  function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!fileRef) { setError("Selecciona un fitxer"); return; }
    const fd = new FormData(e.currentTarget);
    fd.set("actor_id", actorId);
    fd.set("file", fileRef);
    fd.set("notes", notes);
    fd.set("pregunta_ia", pregunta);
    startUpload(async () => {
      try {
        await uploadActorDocument(fd);
        setShowForm(false); setFileRef(null); setNotes(""); setPregunta(""); setUploadOk(true);
        setTimeout(() => setUploadOk(false), 2500);
        reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error en la pujada");
      }
    });
  }

  async function handleOpen(storagePath: string) {
    const url = await getDocumentSignedUrl(storagePath);
    if (url) window.open(url, "_blank");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold" style={{ color: DIM }}>
            Documents per enriquir l&apos;anàlisi IA
          </p>
          <p className="text-[9px] mt-0.5" style={{ color: LABEL }}>
            PDF, TXT, CSV, DOCX · màx {MAX_MB} MB · fins 5 documents per anàlisi
          </p>
        </div>
        <div className="flex items-center gap-2">
          {uploadOk && <span className="text-[10px] font-semibold" style={{ color: GREEN }}>✓ Pujat</span>}
          <button onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-xl text-[10px] font-bold transition-all hover:opacity-80"
            style={{ backgroundColor: TEXT, color: "#FFFFFF" }}>
            + Pujar document
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-xl p-3 flex gap-2" style={{ backgroundColor: `${BLUE}06`, border: `1px solid ${BLUE}20` }}>
        <div className="w-0.5 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: BLUE }} />
        <p className="text-[10px] leading-relaxed" style={{ color: DIM }}>
          Els documents aquí pujats s&apos;inclouen automàticament quan fas clic a <strong style={{ color: TEXT }}>&quot;Generar anàlisi IA&quot;</strong>.
          Claude llegeix el contingut i extreu informació rellevant per complementar el perfil de l&apos;actor.
        </p>
      </div>

      {/* Upload form */}
      {showForm && (
        <form onSubmit={handleUpload} className="p-4 space-y-3 rounded-xl"
          style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}` }}>
          <Field label="Fitxer *">
            <input type="file" accept={ACCEPTED_TYPES} onChange={handleFileChange}
              className="w-full text-[11px] rounded-lg px-3 py-2 cursor-pointer"
              style={{ backgroundColor: CARD, border: `1px solid ${BORDER}`, color: TEXT }} />
          </Field>
          {fileRef && (
            <p className="text-[9px]" style={{ color: DIM }}>
              {fileRef.name} · {fmtBytes(fileRef.size)} · {fileRef.type || "tipus desconegut"}
            </p>
          )}
          <Field label="Que vols saber d'aquest document? *">
            <textarea value={pregunta} onChange={e => setPregunta(e.target.value)} rows={2}
              placeholder="Ex: «Quins compromisos ha adquirit l'actor?», «Quins riscos veig en la proposta?», «Com posiciona l'empresa en el mercat?»"
              className="w-full outline-none resize-none text-[11px] rounded-lg px-3 py-2"
              style={{ backgroundColor: CARD, border: `1px solid ${BORDER}`, color: TEXT }} />
          </Field>
          <Field label="Context addicional (opcional)">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={1}
              placeholder="Ex: «Proposta comercial al març 2025», «Informe intern confidencial»…"
              className="w-full outline-none resize-none text-[11px] rounded-lg px-3 py-2"
              style={{ backgroundColor: CARD, border: `1px solid ${BORDER}`, color: TEXT }} />
          </Field>
          {error && <p className="text-[10px] font-semibold" style={{ color: RED }}>{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setShowForm(false); setError(null); setFileRef(null); }}
              className="px-3 py-1.5 text-[10px] rounded-lg" style={{ color: LABEL }}>
              Cancel·lar
            </button>
            <button type="submit" disabled={!fileRef || !pregunta.trim() || isUploading}
              className="px-4 py-1.5 rounded-lg text-[10px] font-bold disabled:opacity-40"
              style={{ backgroundColor: TEXT, color: "#FFFFFF" }}>
              {isUploading ? "Pujant…" : "Pujar"}
            </button>
          </div>
        </form>
      )}

      {/* Empty state */}
      {docs.length === 0 && !showForm && (
        <div className="rounded-xl p-10 text-center" style={{ backgroundColor: SURFACE, border: `1px dashed ${BORDER}` }}>
          <p className="text-[12px] font-semibold mb-1" style={{ color: TEXT }}>Cap document pujat</p>
          <p className="text-[10px]" style={{ color: DIM }}>
            Puja propostes, informes, correus o notes per que la IA tingui més context en l&apos;anàlisi.
          </p>
        </div>
      )}

      {/* Document list */}
      <div className="space-y-2">
        {docs.map(doc => (
          <div key={doc.id} className="rounded-xl px-4 py-3 flex items-start gap-3"
            style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
            <DocIcon tipus={doc.tipus_fitxer} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <button type="button" onClick={() => handleOpen(doc.storage_path)}
                  className="text-[12px] font-semibold hover:opacity-60 transition-opacity text-left"
                  style={{ color: BLUE }}>
                  {doc.nom_fitxer}
                </button>
                {doc.analitzat && (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase"
                    style={{ backgroundColor: `${GREEN}12`, color: GREEN, border: `1px solid ${GREEN}25` }}>
                    Analitzat IA ✓
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                {doc.mida_bytes && <span className="text-[9px]" style={{ color: LABEL }}>{fmtBytes(doc.mida_bytes)}</span>}
                <span className="text-[9px]" style={{ color: LABEL }}>
                  {new Date(doc.created_at).toLocaleDateString("ca-ES", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              {doc.pregunta_ia && (
                <p className="text-[9px] mt-1 italic" style={{ color: BLUE }}>
                  &ldquo;{doc.pregunta_ia}&rdquo;
                </p>
              )}
              {doc.notes && <p className="text-[10px] mt-0.5" style={{ color: DIM }}>{doc.notes}</p>}
            </div>
            <button type="button" disabled={isDeleting}
              onClick={() => startDelete(async () => { await deleteActorDocument(doc.id, actorId); reload(); })}
              className="text-[10px] hover:opacity-70 shrink-0 disabled:opacity-30" style={{ color: LABEL }}>
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Historial ───────────────────────────────────────────────────────────

function TabHistorial({ actorId }: { actorId: string }) {
  const [interactions, setInteractions] = useState<ActorInteraction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [tipus, setTipus] = useState("reunio");
  const [titol, setTitol] = useState("");
  const [contingut, setContingut] = useState("");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [resultat, setResultat] = useState("");
  const [reaccio, setReaccio] = useState("");
  const [seguiment, setSeguiment] = useState(false);
  const [dataSeg, setDataSeg] = useState("");

  const reload = useCallback(async () => {
    const d = await getInteractions(actorId);
    setInteractions(d);
  }, [actorId]);

  useEffect(() => { reload(); }, [reload]);

  const TIPUS_COLOR: Record<string,string> = { reunio:BLUE, trucada:GREEN, email:DIM, nota:AMBER, promesa:RED, compromis:RED, bloqueig:RED, seguiment:LABEL };
  const TIPUS_OPTS = ["reunio","trucada","email","nota","promesa","compromis","bloqueig","seguiment","canvi_actitud"];

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("actor_id", actorId);
    fd.set("tipus", tipus);
    fd.set("titol", titol);
    fd.set("contingut", contingut);
    fd.set("data", data);
    fd.set("resultat", resultat);
    fd.set("reaccio_observada", reaccio);
    fd.set("seguiment_necessari", String(seguiment));
    if (seguiment) fd.set("data_seguiment", dataSeg);
    startTransition(async()=>{
      await saveInteraction(fd);
      setShowForm(false); setTitol(""); setContingut(""); setResultat(""); setReaccio("");
      reload();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={()=>setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl text-[10px] font-bold transition-all hover:opacity-80"
          style={{backgroundColor:TEXT,color:"#FFFFFF"}}>
          + Registrar interacció
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="p-4 space-y-3 rounded-xl" style={{backgroundColor:SURFACE,border:`1px solid ${BORDER2}`}}>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Tipus">
              <select value={tipus} onChange={e=>setTipus(e.target.value)}
                className="w-full outline-none text-[11px] rounded-lg px-3 py-2"
                style={{backgroundColor:CARD,border:`1px solid ${BORDER2}`,color:TEXT}}>
                {TIPUS_OPTS.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Data">
              <input type="date" value={data} onChange={e=>setData(e.target.value)}
                className="w-full outline-none text-[12px] rounded-lg px-3 py-2"
                style={{backgroundColor:CARD,border:`1px solid ${BORDER2}`,color:TEXT}} />
            </Field>
            <Field label="Títol *">
              <input value={titol} onChange={e=>setTitol(e.target.value)} placeholder="Resum curt…"
                className="w-full outline-none text-[12px] rounded-lg px-3 py-2"
                style={{backgroundColor:CARD,border:`1px solid ${BORDER2}`,color:TEXT}} />
            </Field>
          </div>
          <Field label="Contingut / notes">
            <textarea value={contingut} onChange={e=>setContingut(e.target.value)} rows={3} placeholder="Detalls, informació capturada…"
              className="w-full outline-none resize-none text-[11px] leading-relaxed rounded-lg px-3 py-2"
              style={{backgroundColor:CARD,border:`1px solid ${BORDER2}`,color:TEXT}} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Resultat">
              <input value={resultat} onChange={e=>setResultat(e.target.value)} placeholder="Acord, rebuig, pendent…"
                className="w-full outline-none text-[11px] rounded-lg px-3 py-2"
                style={{backgroundColor:CARD,border:`1px solid ${BORDER2}`,color:TEXT}} />
            </Field>
            <Field label="Reacció observada">
              <input value={reaccio} onChange={e=>setReaccio(e.target.value)} placeholder="Actitud, to, posicionament…"
                className="w-full outline-none text-[11px] rounded-lg px-3 py-2"
                style={{backgroundColor:CARD,border:`1px solid ${BORDER2}`,color:TEXT}} />
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={()=>setSeguiment(!seguiment)}
              className="px-3 py-1 rounded-lg text-[9px] font-semibold transition-all"
              style={{border:`1px solid ${seguiment?AMBER:BORDER}`,backgroundColor:seguiment?`${AMBER}12`:SURFACE,color:seguiment?AMBER:DIM}}>
              {seguiment?"✓ Seguiment necessari":"Seguiment necessari"}
            </button>
            {seguiment && (
              <input type="date" value={dataSeg} onChange={e=>setDataSeg(e.target.value)}
                className="outline-none text-[11px] rounded-lg px-3 py-1.5"
                style={{backgroundColor:CARD,border:`1px solid ${BORDER2}`,color:TEXT}} />
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={()=>setShowForm(false)} className="px-3 py-1.5 text-[10px] rounded-lg" style={{color:LABEL}}>Cancel·lar</button>
            <button type="submit" disabled={!titol||isPending}
              className="px-4 py-1.5 rounded-lg text-[10px] font-bold disabled:opacity-40"
              style={{backgroundColor:TEXT,color:"#FFFFFF"}}>
              Guardar
            </button>
          </div>
        </form>
      )}

      {interactions.length === 0 && !showForm && (
        <div className="rounded-xl p-10 text-center" style={{backgroundColor:SURFACE,border:`1px dashed ${BORDER}`}}>
          <p className="text-[12px] font-semibold mb-1" style={{color:TEXT}}>Cap interacció registrada</p>
          <p className="text-[10px]" style={{color:DIM}}>Registra reunions, trucades, compromisos, reaccions i seguiments.</p>
        </div>
      )}

      <div className="space-y-2">
        {interactions.map(inter=>{
          const tc = TIPUS_COLOR[inter.tipus] ?? LABEL;
          return (
            <div key={inter.id} className="rounded-xl p-4" style={{backgroundColor:CARD,border:`1px solid ${BORDER}`}}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
                      style={{backgroundColor:`${tc}15`,color:tc,border:`1px solid ${tc}25`}}>
                      {inter.tipus}
                    </span>
                    <p className="text-[12px] font-semibold" style={{color:TEXT}}>{inter.titol}</p>
                    {inter.seguiment_necessari && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{backgroundColor:`${AMBER}15`,color:AMBER}}>
                        Seguiment {inter.data_seguiment ? `→ ${new Date(inter.data_seguiment).toLocaleDateString("ca-ES",{day:"numeric",month:"short"})}` : ""}
                      </span>
                    )}
                    <span className="text-[9px] ml-auto" style={{color:LABEL}}>
                      {new Date(inter.data).toLocaleDateString("ca-ES",{day:"numeric",month:"short",year:"numeric"})}
                    </span>
                  </div>
                  {inter.contingut && <p className="text-[11px] mt-1.5 leading-relaxed" style={{color:DIM}}>{inter.contingut}</p>}
                  {(inter.resultat || inter.reaccio_observada) && (
                    <div className="flex gap-4 mt-2 pt-2" style={{borderTop:`1px solid ${BORDER}`}}>
                      {inter.resultat && <p className="text-[10px]" style={{color:DIM}}>Resultat: <span style={{color:TEXT}}>{inter.resultat}</span></p>}
                      {inter.reaccio_observada && <p className="text-[10px]" style={{color:DIM}}>Reacció: <span style={{color:TEXT}}>{inter.reaccio_observada}</span></p>}
                    </div>
                  )}
                </div>
                <button type="button" onClick={()=>startTransition(async()=>{ await deleteInteraction(inter.id,actorId); reload(); })}
                  className="text-[10px] hover:opacity-70 shrink-0" style={{color:LABEL}}>×</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab: Anàlisi IA ──────────────────────────────────────────────────────────

function TabIA({ actor, onSaved }: { actor: StrategicActor; onSaved: () => void }) {
  const [isAnalyzing, startAnalyzeTransition] = useTransition();
  const [isExporting, startExportTransition] = useTransition();
  const [isPending, startPending] = useTransition();
  const [exportPreview, setExportPreview] = useState<Record<string,unknown>|null>(null);
  const [saved, setSaved] = useState(false);
  const [estrategia, setEstrategia] = useState(actor.estrategia_ia ?? "");
  const [isPDI, setIsPDI] = useState(actor.is_pdi);
  const [motiuPDI, setMotiuPDI] = useState(actor.motiu_pdi ?? "");
  const [tipusInfluencia, setTipusInfluencia] = useState(actor.tipus_influencia_pdi ?? "");
  const [pdiNotes, setPdiNotes] = useState(actor.pdi_notes ?? "");

  const alertes: ActorAlert[] = Array.isArray(actor.alertes_ia) ? actor.alertes_ia as ActorAlert[] : [];
  const SEV_COLOR: Record<string,string> = { baixa:GREEN, mitja:AMBER, alta:RED, critica:"#7F1D1D" };

  function handleAnalyze() {
    startAnalyzeTransition(async()=>{ await analyzeActor(actor.id); onSaved(); });
  }

  function handleExport() {
    startExportTransition(async()=>{
      const { contingut } = await exportPDI(actor.id);
      setExportPreview(contingut);
    });
  }

  function handleSavePDI(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("id", actor.id);
    fd.set("is_pdi", String(isPDI));
    startPending(async()=>{ await saveActor(fd); setSaved(true); setTimeout(()=>setSaved(false),2000); onSaved(); });
  }

  return (
    <div className="space-y-5">
      {/* Generate */}
      <div className="rounded-xl p-5 flex items-center justify-between gap-4"
        style={{backgroundColor:SURFACE,border:`1px solid ${BORDER}`}}>
        <div>
          <p className="text-[12px] font-bold" style={{color:TEXT}}>Anàlisi IA completa</p>
          <p className="text-[10px] mt-0.5" style={{color:DIM}}>
            Claude analitza potencial, risc, estratègia i genera alertes basades en les dades registrades.
          </p>
          {actor.ai_updated_at && (
            <p className="text-[9px] mt-1" style={{color:LABEL}}>
              Última anàlisi: {new Date(actor.ai_updated_at).toLocaleString("ca-ES",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}
            </p>
          )}
        </div>
        <button type="button" onClick={handleAnalyze} disabled={isAnalyzing}
          className="px-5 py-2.5 rounded-xl text-[11px] font-bold shrink-0 disabled:opacity-50 hover:opacity-80 transition-all"
          style={{backgroundColor:TEXT,color:"#FFFFFF"}}>
          {isAnalyzing?<span className="flex items-center gap-1.5"><span className="animate-spin">◌</span>Analitzant…</span>:actor.ai_updated_at?"Regenerar anàlisi":"Generar anàlisi IA"}
        </button>
      </div>

      {/* Alertes */}
      {alertes.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{border:`1px solid ${RED}25`,backgroundColor:CARD}}>
          <div className="px-4 py-2.5" style={{backgroundColor:`${RED}06`,borderBottom:`1px solid ${RED}20`}}>
            <p className="text-[8px] font-bold uppercase tracking-[0.2em]" style={{color:RED}}>
              Alertes IA ({alertes.length})
            </p>
          </div>
          <div className="p-4 space-y-3">
            {alertes.map((a,i)=>{
              const sc = SEV_COLOR[a.severitat] ?? LABEL;
              return (
                <div key={i} className="rounded-lg p-3" style={{backgroundColor:SURFACE,border:`1px solid ${sc}20`}}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
                      style={{backgroundColor:`${sc}15`,color:sc,border:`1px solid ${sc}25`}}>
                      {a.severitat}
                    </span>
                    <p className="text-[11px] font-semibold" style={{color:TEXT}}>{a.missatge}</p>
                  </div>
                  <p className="text-[10px]" style={{color:DIM}}>→ {a.accio_recomanada}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Anàlisi complet */}
      {actor.ai_analisi_complet && (
        <div className="rounded-xl overflow-hidden" style={{border:`1px solid ${BORDER}`,backgroundColor:CARD}}>
          <div className="px-4 py-2.5" style={{backgroundColor:SURFACE,borderBottom:`1px solid ${BORDER}`}}>
            <div className="flex items-center gap-3">
              <p className="text-[8px] font-bold uppercase tracking-[0.2em]" style={{color:LABEL}}>Dossier executiu IA</p>
              {actor.ai_confianca && (
                <span className="text-[8px] px-1.5 py-0.5 rounded" style={{backgroundColor:`${GREEN}12`,color:GREEN}}>
                  Confiança {actor.ai_confianca}/5
                </span>
              )}
            </div>
          </div>
          <div className="p-5">
            <p className="text-[12px] leading-relaxed whitespace-pre-line" style={{color:DIM}}>{actor.ai_analisi_complet}</p>
          </div>
        </div>
      )}

      {/* Estratègia */}
      <div className="rounded-xl overflow-hidden" style={{border:`1px solid ${BORDER}`,backgroundColor:CARD}}>
        <div className="px-4 py-2.5" style={{backgroundColor:SURFACE,borderBottom:`1px solid ${BORDER}`}}>
          <p className="text-[8px] font-bold uppercase tracking-[0.2em]" style={{color:BLUE}}>Estratègia d&apos;interacció</p>
        </div>
        <div className="p-5">
          {actor.estrategia_ia && !estrategia && (
            <div className="rounded-lg p-3 mb-3" style={{backgroundColor:SURFACE,border:`1px solid ${BORDER}`}}>
              <p className="text-[8px] font-bold uppercase tracking-wider mb-1" style={{color:LABEL}}>Recomanació IA</p>
              <p className="text-[12px] leading-relaxed" style={{color:DIM}}>{actor.estrategia_ia}</p>
            </div>
          )}
          <textarea value={estrategia} onChange={e=>setEstrategia(e.target.value)} rows={4}
            placeholder={actor.estrategia_ia || "Estratègia manual d'interacció…"}
            className="w-full outline-none resize-none text-[12px] leading-relaxed rounded-lg px-3 py-2"
            style={{backgroundColor:SURFACE,border:`1px solid ${BORDER2}`,color:TEXT}} />
          <div className="flex justify-end mt-2">
            <button type="button" onClick={()=>{
              const fd = new FormData();
              fd.set("id", actor.id);
              fd.set("estrategia_ia", estrategia);
              startPending(async()=>{ await saveActor(fd); setSaved(true); setTimeout(()=>setSaved(false),2000); onSaved(); });
            }} disabled={isPending} className="px-4 py-1.5 rounded-lg text-[10px] font-bold disabled:opacity-40"
              style={{backgroundColor:TEXT,color:"#FFFFFF"}}>
              Guardar estratègia
            </button>
          </div>
        </div>
      </div>

      {/* PDI */}
      <form onSubmit={handleSavePDI} className="rounded-xl overflow-hidden" style={{border:`1px solid ${isPDI?"#6B21A8":BORDER}`,backgroundColor:CARD}}>
        <div className="px-4 py-2.5 flex items-center justify-between"
          style={{backgroundColor:isPDI?"#6B21A810":SURFACE,borderBottom:`1px solid ${isPDI?"#6B21A825":BORDER}`}}>
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-3.5 rounded-full" style={{backgroundColor:"#6B21A8"}} />
            <p className="text-[8px] font-bold uppercase tracking-[0.2em]" style={{color:"#6B21A8"}}>
              PDI — Persona d&apos;Interès
            </p>
          </div>
          <button type="button" onClick={()=>setIsPDI(!isPDI)}
            className="text-[9px] font-bold px-2.5 py-1 rounded-lg transition-all"
            style={{backgroundColor:isPDI?"#6B21A8":SURFACE,color:isPDI?"#FFFFFF":LABEL,border:`1px solid ${isPDI?"#6B21A8":BORDER2}`}}>
            {isPDI?"Marcat PDI ✓":"Marcar com PDI"}
          </button>
          <input type="hidden" name="is_pdi" value={String(isPDI)} />
        </div>
        {isPDI && (
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Motiu PDI">
                <DInput name="motiu_pdi" value={motiuPDI} onChange={setMotiuPDI} placeholder="Raó estratègica…" />
              </Field>
              <Field label="Tipus d'influència">
                <DInput name="tipus_influencia_pdi" value={tipusInfluencia} onChange={setTipusInfluencia} placeholder="Decisor, prescriptor, accelerador…" />
              </Field>
            </div>
            <Field label="Notes PDI (es podran exportar al Diari)">
              <DTextarea name="pdi_notes" value={pdiNotes} onChange={setPdiNotes}
                placeholder="Informació rellevant per exportar (evitar dades sensibles)…" rows={2} />
            </Field>
            <div className="flex items-center gap-3 pt-1">
              <button type="submit" disabled={isPending}
                className="px-4 py-2 rounded-xl text-[10px] font-bold disabled:opacity-40"
                style={{backgroundColor:TEXT,color:"#FFFFFF"}}>
                Guardar PDI
              </button>
              <button type="button" onClick={handleExport} disabled={isExporting}
                className="px-4 py-2 rounded-xl text-[10px] font-bold disabled:opacity-40 hover:opacity-80 transition-all"
                style={{backgroundColor:"#6B21A8",color:"#FFFFFF"}}>
                {isExporting?"Exportant…":"Exportar al Diari →"}
              </button>
              {saved && <span className="text-[10px]" style={{color:GREEN}}>✓ Guardat</span>}
            </div>
            {exportPreview && (
              <div className="rounded-lg p-3 mt-2" style={{backgroundColor:`#6B21A808`,border:`1px solid #6B21A825`}}>
                <p className="text-[8px] font-bold uppercase tracking-wider mb-2" style={{color:"#6B21A8"}}>
                  Exportat al Diari — Previsualització
                </p>
                <pre className="text-[9px] leading-relaxed" style={{color:DIM}}>
                  {JSON.stringify(exportPreview,null,2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ActorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [actor, setActor] = useState<StrategicActor | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [, startDeleteTransition] = useTransition();

  async function reload() {
    const data = await getActor(params.id as string);
    if (!data) { router.push("/dashboard/bruixola/actors"); return; }
    setActor(data);
    setLoading(false);
  }

  useEffect(() => { reload(); }, [params.id]); // eslint-disable-line

  function handleDelete() {
    if (!confirm(`Eliminar actor "${actor?.nom}"?`)) return;
    startDeleteTransition(async () => {
      await deleteActor(params.id as string);
      router.push("/dashboard/bruixola/actors");
    });
  }

  if (loading || !actor) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-[12px]" style={{ color: LABEL }}>Carregant…</p>
    </div>
  );

  const relColor = ({ critic:RED, alt_valor:BLUE, oportunitat_latent:GREEN, risc_estrategic:AMBER, operatiu:DIM } as Record<string,string>)[actor.classificacio_relevancia ?? ""] ?? LABEL;
  const riscColor = RISC_COLORS[actor.classificacio_risc ?? ""] ?? LABEL;
  const alertCount = (actor.alertes_ia as unknown[])?.length ?? 0;

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 space-y-6">

      {/* Nav */}
      <div className="flex items-center justify-between">
        <Link href="/dashboard/bruixola/actors" className="text-[10px] font-bold uppercase tracking-[0.2em] hover:opacity-70" style={{ color: LABEL }}>
          ← Actors
        </Link>
        <button onClick={handleDelete} className="text-[10px] hover:opacity-70" style={{ color: LABEL }}>Eliminar</button>
      </div>

      {/* Hero */}
      <div className="rounded-2xl p-6" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {actor.is_pdi && (
                <span className="text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest"
                  style={{ backgroundColor: `${PURPLE}15`, color: PURPLE, border: `1px solid ${PURPLE}30` }}>PDI</span>
              )}
              {actor.classificacio_relevancia && (
                <span className="text-[8px] font-bold px-2 py-0.5 rounded uppercase"
                  style={{ backgroundColor: `${relColor}12`, color: relColor, border: `1px solid ${relColor}25` }}>
                  {{ critic:"Crític",alt_valor:"Alt valor",oportunitat_latent:"Oportunitat",risc_estrategic:"Risc estratègic",operatiu:"Operatiu",complementari:"Complementari",baixa_prioritat:"Baixa prioritat" }[actor.classificacio_relevancia] ?? actor.classificacio_relevancia}
                </span>
              )}
              {actor.classificacio_risc && (
                <span className="text-[8px] font-bold px-2 py-0.5 rounded uppercase"
                  style={{ backgroundColor: `${riscColor}12`, color: riscColor, border: `1px solid ${riscColor}25` }}>
                  Risc {RISC_LABELS[actor.classificacio_risc]}
                </span>
              )}
              {alertCount > 0 && (
                <span className="text-[8px] font-bold px-2 py-0.5 rounded" style={{ backgroundColor: `${RED}15`, color: RED }}>
                  {alertCount} alerta{alertCount > 1 ? "es" : ""}
                </span>
              )}
            </div>
            <h1 className="text-[22px] font-black leading-tight" style={{ color: TEXT }}>{actor.nom}</h1>
            <p className="text-[12px] mt-0.5" style={{ color: DIM }}>
              {[actor.carrec, actor.empresa, actor.pais].filter(Boolean).join(" · ")}
            </p>
            {actor.rol_tipus?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {actor.rol_tipus.slice(0,5).map(r=>(
                  <span key={r} className="text-[9px] px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: SURFACE, color: DIM, border: `1px solid ${BORDER}` }}>{r}</span>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 text-center shrink-0">
            {actor.impacte_potencial != null && (
              <div>
                <p className="text-[22px] font-black" style={{ color: BLUE }}>{actor.impacte_potencial}</p>
                <p className="text-[7px] uppercase tracking-wider" style={{ color: LABEL }}>Impacte</p>
              </div>
            )}
            {actor.valor_estrategic != null && (
              <div>
                <p className="text-[22px] font-black" style={{ color: AMBER }}>{actor.valor_estrategic}</p>
                <p className="text-[7px] uppercase tracking-wider" style={{ color: LABEL }}>Valor</p>
              </div>
            )}
            {actor.poder_decisio != null && (
              <div>
                <p className="text-[22px] font-black" style={{ color: actor.poder_decisio >= 4 ? RED : DIM }}>{actor.poder_decisio}</p>
                <p className="text-[7px] uppercase tracking-wider" style={{ color: LABEL }}>Decisió</p>
              </div>
            )}
            {actor.prioritat != null && (
              <div>
                <p className="text-[22px] font-black" style={{ color: actor.prioritat >= 4 ? RED : DIM }}>{actor.prioritat}</p>
                <p className="text-[7px] uppercase tracking-wider" style={{ color: LABEL }}>Prior.</p>
              </div>
            )}
          </div>
        </div>
        {actor.estrategia_ia && (
          <div className="mt-4 pt-4 flex items-start gap-2" style={{ borderTop: `1px solid ${BORDER}` }}>
            <span className="text-[9px] shrink-0 mt-0.5 font-bold" style={{ color: BLUE }}>ESTRATÈGIA →</span>
            <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: DIM }}>{actor.estrategia_ia}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 overflow-x-auto rounded-xl" style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}` }}>
        {TABS.map((tab, i) => (
          <button key={tab} onClick={() => setActiveTab(i)}
            className="flex-1 min-w-fit px-3 py-2.5 text-[10px] font-semibold transition-all whitespace-nowrap"
            style={{
              backgroundColor: activeTab === i ? CARD : "transparent",
              color: activeTab === i ? TEXT : LABEL,
              borderRight: i < TABS.length - 1 ? `1px solid ${BORDER}` : "none",
            }}>
            {tab}
            {tab === "Anàlisi IA" && alertCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[7px] font-black"
                style={{ backgroundColor: RED, color: "#FFFFFF" }}>{alertCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 0 && <TabVisiogeneral actor={actor} onSaved={reload} />}
        {activeTab === 1 && <TabConducta actor={actor} onSaved={reload} />}
        {activeTab === 2 && <TabPotencialitat actor={actor} onSaved={reload} />}
        {activeTab === 3 && <TabRisc actor={actor} onSaved={reload} />}
        {activeTab === 4 && <TabVincles actorId={actor.id} />}
        {activeTab === 5 && <TabDocuments actorId={actor.id} />}
        {activeTab === 6 && <TabHistorial actorId={actor.id} />}
        {activeTab === 7 && <TabIA actor={actor} onSaved={reload} />}
      </div>
    </div>
  );
}
