// Intel·ligència d'Actors Estratègics — Prompts IA
// Sistema d'anàlisi empresarial d'actors rellevants.
// NO diagnòstic clínic. NO manipulació. Anàlisi basada en patrons observables.

export interface ActorAnalysisResult {
  // Potencialitat
  classificacio_potencial: "molt_alt" | "alt" | "mitja" | "baix" | "incert" | "no_validat";
  justificacio_potencial: string;
  potencial_ia: string;
  // Risc
  classificacio_risc: "baix" | "mitja" | "alt" | "critic" | "desconegut";
  notes_risc: string;
  // Estratègia
  estrategia_ia: string;
  // Alertes
  alertes_ia: ActorAlert[];
  // Anàlisi complet
  ai_analisi_complet: string;
  ai_confianca: 1 | 2 | 3 | 4 | 5;
  // Per informar
  que_falta_validar: string;
}

export interface ActorAlert {
  tipus: string;
  missatge: string;
  severitat: "baixa" | "mitja" | "alta" | "critica";
  accio_recomanada: string;
}

export interface ActorContext {
  actor: {
    nom: string;
    empresa?: string | null;
    carrec?: string | null;
    rol_tipus?: string[] | null;
    rol_formal?: string | null;
    rol_real?: string | null;
    poder_decisio?: number | null;
    capacitat_execucio?: number | null;
    capacitat_influencia?: number | null;
    acces_que_aporta?: string | null;
    mercat_que_pot_obrir?: string | null;
    impacte_potencial?: number | null;
    impacte_actual?: number | null;
    trets_conductuals?: string[] | null;
    notes_conductuals?: string | null;
    data_primer_contacte?: string | null;
    data_ultim_contacte?: string | null;
    risc_comercial?: number | null;
    risc_reputacional?: number | null;
    risc_dependencia?: number | null;
    notes?: string | null;
  };
  interactions: Array<{
    tipus: string;
    titol: string;
    contingut?: string | null;
    data: string;
    resultat?: string | null;
    reaccio_observada?: string | null;
  }>;
  projectes_vinculats?: string[];
  objectius_vinculats?: string[];
}

export function buildActorAnalysisPrompt(ctx: ActorContext): string {
  const { actor, interactions } = ctx;

  const interactionsText = interactions.length > 0
    ? interactions.slice(-10).map(i =>
        `[${i.data}] ${i.tipus.toUpperCase()}: ${i.titol}${i.resultat ? ` → ${i.resultat}` : ""}${i.reaccio_observada ? ` | Reacció: ${i.reaccio_observada}` : ""}`
      ).join("\n")
    : "Cap interacció registrada.";

  const rolesText = actor.rol_tipus?.join(", ") || "No definit";
  const trets = actor.trets_conductuals?.join(", ") || "No definits";

  return `Ets un analista d'intel·ligència empresarial sènior. Analitza l'actor estratègic següent i retorna un JSON estructurat.

CONTEXT EMPRESA: Sistema de govern empresarial per identificar actors que poden impactar negoci, vendes, decisions, mercats, aliances o riscos.

IMPORTANT:
- NO fer diagnòstic psicològic clínic
- NO usar etiquetes mèdiques
- NO fer afirmacions sense base
- Distingir sempre entre: fet observat / inferència / hipòtesi / risc confirmat / risc pendent de validar
- Ser sobri, executiu i analític. No sensacionalista.

ACTOR:
- Nom: ${actor.nom}
- Empresa: ${actor.empresa || "No especificada"}
- Càrrec: ${actor.carrec || "No especificat"}
- Rols: ${rolesText}
- Rol formal: ${actor.rol_formal || "No definit"}
- Rol real: ${actor.rol_real || "No definit"}
- Poder decisió (1-5): ${actor.poder_decisio ?? "?"}
- Capacitat execució (1-5): ${actor.capacitat_execucio ?? "?"}
- Capacitat influència (1-5): ${actor.capacitat_influencia ?? "?"}
- Accés que aporta: ${actor.acces_que_aporta || "No definit"}
- Mercat que pot obrir: ${actor.mercat_que_pot_obrir || "No definit"}
- Impacte potencial (1-5): ${actor.impacte_potencial ?? "?"}
- Impacte actual (1-5): ${actor.impacte_actual ?? "?"}
- Trets conductuals observats: ${trets}
- Notes conductuals: ${actor.notes_conductuals || "Cap"}
- Primer contacte: ${actor.data_primer_contacte || "No registrat"}
- Últim contacte: ${actor.data_ultim_contacte || "No registrat"}
- Risc comercial (0-4): ${actor.risc_comercial ?? 0}
- Risc reputacional (0-4): ${actor.risc_reputacional ?? 0}
- Risc dependència (0-4): ${actor.risc_dependencia ?? 0}
- Notes generals: ${actor.notes || "Cap"}

HISTORIAL D'INTERACCIONS:
${interactionsText}

${ctx.projectes_vinculats?.length ? `PROJECTES VINCULATS: ${ctx.projectes_vinculats.join(", ")}` : ""}
${ctx.objectius_vinculats?.length ? `OBJECTIUS VINCULATS: ${ctx.objectius_vinculats.join(", ")}` : ""}

Retorna ÚNICAMENT un JSON vàlid amb aquesta estructura exacta:
{
  "classificacio_potencial": "molt_alt|alt|mitja|baix|incert|no_validat",
  "justificacio_potencial": "1-2 frases concretes justificant la classificació",
  "potencial_ia": "Paràgraf analític sobre el potencial real d'aquest actor per al negoci",
  "classificacio_risc": "baix|mitja|alt|critic|desconegut",
  "notes_risc": "Descripció objectiva dels riscos identificats i la seva base",
  "estrategia_ia": "Estratègia d'interacció recomanada: concreta, accionable, sense manipulació",
  "alertes_ia": [
    {
      "tipus": "manca_followup|alt_potencial_risc_alt|dependencia_excessiva|promesa_incomplerta|actor_bloquejant|informacio_incompleta|oportunitat_latent|relacio_freda|risc_reputacional|excés_confiança",
      "missatge": "Descripció concreta de l'alerta",
      "severitat": "baixa|mitja|alta|critica",
      "accio_recomanada": "Acció específica per adreçar-la"
    }
  ],
  "ai_analisi_complet": "Anàlisi executiu complet: potencial, risc, relació actual, dependències, recomanació estratègica. 3-5 paràgrafs sobris.",
  "ai_confianca": 1-5,
  "que_falta_validar": "Informació que faltaria per millorar l'anàlisi"
}`;
}

export function buildActorAlertsPrompt(actors: Array<{
  nom: string;
  data_ultim_contacte?: string | null;
  classificacio_relevancia?: string | null;
  risc_comercial?: number | null;
  risc_dependencia?: number | null;
  impacte_potencial?: number | null;
  seguiments_pendents?: number;
}>): string {
  const actorsText = actors.map(a =>
    `- ${a.nom} | Rel: ${a.classificacio_relevancia || "?"} | Últim contacte: ${a.data_ultim_contacte || "mai"} | Risc comercial: ${a.risc_comercial ?? 0}/4 | Risc dependència: ${a.risc_dependencia ?? 0}/4 | Impacte potencial: ${a.impacte_potencial ?? "?"}/5 | Seguiments pendents: ${a.seguiments_pendents ?? 0}`
  ).join("\n");

  return `Analitza els actors estratègics següents i detecta alertes crítiques que requereixen atenció.

Avui: ${new Date().toISOString().split("T")[0]}

ACTORS:
${actorsText}

Genera ÚNICAMENT un JSON: { "alertes": [ { "actor_nom": "...", "tipus": "...", "missatge": "...", "severitat": "baixa|mitja|alta|critica", "accio": "..." } ] }

Criteris d'alerta:
- Actors crítics sense contacte >30 dies
- Alt potencial + alt risc sense estratègia
- Dependència excessiva (risc_dependencia >=3)
- Seguiments vencuts
- Oportunitats latents sense acció`;
}
