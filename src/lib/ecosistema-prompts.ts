// AI prompts for the Ecosistema Humà relational intelligence system
// Systemic analysis result (matches eco_ia_sistemic table)
export interface AnalisiSistemicResult {
  fets: string[];
  inferencies: string[];
  nivell_confianca: "alt" | "mitja" | "baix";
  que_falta: string[];
  observacions: string[];
  tendencia: "creix" | "estable" | "refreda" | "sense_dades";
  figura_central: boolean;
  figura_pont: boolean;
  xarxa_cohesionada: boolean;
  confianca_alta: boolean;
  reciprocitat_desigual: boolean;
  present_moments_critics: boolean;
}

export interface LinkCtx {
  link_type: string;
  link_strength: string | null;
  influence_type: string | null;
  direction: "out" | "in";
  nom: string;
  cognom?: string | null;
  categoria: string;
}

export interface PersonaSystemicCtx {
  nom: string;
  cognom?: string | null;
  categoria: string;
  subcategoria?: string | null;
  rol_vital?: string | null;
  tags?: string[];
  notes?: string | null;
  // Dimensions
  confianca?: number | null;
  reciprocitat?: number | null;
  risc_emocional?: number | null;
  risc_professional?: number | null;
  estabilitat_kpi?: number | null;
  desgast_energetic?: number | null;
  // Trust profile
  fiabilitat_critica?: string | null;
  suport_necessitat?: string | null;
  iniciativa_relacional?: string | null;
  reciprocitat_q?: string | null;
  disponibilitat?: string | null;
  confianca_g?: number | null;
  lleialtat?: number | null;
  consistencia?: number | null;
  tipus_suport?: string[];
  // Network
  links: LinkCtx[];
  neighbor_categories: string[];
  degree: number;
  // Timeline
  events_count: number;
  total_delta: {
    confianca: number; proximitat: number; forca: number;
    suport: number; reciprocitat: number; influencia: number;
  };
  recent_events: Array<{
    data: string; tipus: string;
    delta_confianca: number; delta_proximitat: number;
    delta_forca: number; delta_suport: number;
    delta_reciprocitat: number; delta_influencia: number;
    descripcio?: string | null;
  }>;
  critical_events_present: boolean;
}

export interface PersonaCtx {
  nom: string;
  cognom?: string | null;
  categoria: string;
  subcategoria?: string | null;
  subcategoria_familiar?: string | null;
  rol_vital?: string | null;
  tags?: string[];
  tipus_referent?: string | null;
  cita_clau?: string | null;
  perfil_conductual?: string[];
  intensitat_perfil?: Record<string, number>;
  energia?: number | null;
  claredat?: number | null;
  autenticitat?: number | null;
  alineacio?: number | null;
  profunditat?: number | null;
  confianca?: number | null;
  risc_emocional?: number | null;
  risc_professional?: number | null;
  estabilitat_kpi?: number | null;
  reciprocitat?: number | null;
  desgast_energetic?: number | null;
  notes?: string | null;
  darreres_interaccions?: Array<{ data: string; qualitat?: number | null; sensacio?: string | null; notes?: string | null }>;
}

export interface EcosistemaCtx {
  total: number;
  familia: number;
  nucli: number;
  coneguts: number;
  saludats: number;
  estrategics: number;
  inspiradors: number;
  referents: number;
  proscrits: number;
  bloquejats: number;
  persones: Array<{
    nom: string;
    cognom?: string | null;
    categoria: string;
    rol_vital?: string | null;
    risc_emocional?: number | null;
    estabilitat_kpi?: number | null;
    desgast_energetic?: number | null;
    perfil_conductual?: string[];
    tags?: string[];
  }>;
}

export interface AnalisiPersonaResult {
  estrategia: string;
  alertes: Array<{ tipus: "atencio" | "risc" | "positiu"; missatge: string }>;
  impacte: string;
}

export interface SnapshotResult {
  estat_general: string;
  forces: string[];
  atencions: string[];
  recomanacio: string;
}

const CAT_DESC: Record<string, string> = {
  familia:    "família (vincles familiars)",
  nucli:      "nucli central (persones àncora, mentors essencials)",
  coneguts:   "cercle proper (coneguts de confiança relativa)",
  saludats:   "saludats (contacte superficial o circunstancial)",
  estrategics: "anell estratègic (aliances i col·laboradors clau)",
  inspiradors: "inspiradors actius (amplifiquen el potencial)",
  referents:  "referents mentals (autors, obres, idees formatives)",
  proscrits:  "proscrits (relació tòxica activa)",
  bloquejats: "bloquejats (contacte tallat, límit establert)",
};

export function buildAnalisiPersonaPrompt(ctx: PersonaCtx): string {
  const trets = ctx.perfil_conductual?.length
    ? ctx.perfil_conductual.map(t => {
        const int = ctx.intensitat_perfil?.[t] ?? 1;
        return int === 2 ? `**${t}** (intens)` : t;
      }).join(", ")
    : "no definit";

  const kpis = [
    ctx.risc_emocional != null ? `risc emocional ${ctx.risc_emocional}/10` : null,
    ctx.risc_professional != null ? `risc professional ${ctx.risc_professional}/10` : null,
    ctx.estabilitat_kpi != null ? `estabilitat ${ctx.estabilitat_kpi}/10` : null,
    ctx.reciprocitat != null ? `reciprocitat ${ctx.reciprocitat}/10` : null,
    ctx.desgast_energetic != null ? `desgast energètic ${ctx.desgast_energetic}/10` : null,
  ].filter(Boolean).join(", ") || "no avaluats";

  const dims = [
    ctx.energia != null ? `energia percebuda ${ctx.energia}/5` : null,
    ctx.claredat != null ? `claredat aportada ${ctx.claredat}/5` : null,
    ctx.confianca != null ? `confiança ${ctx.confianca}/5` : null,
    ctx.alineacio != null ? `alineació vital ${ctx.alineacio}/5` : null,
  ].filter(Boolean).join(", ") || "no avaluades";

  const interactions = ctx.darreres_interaccions?.length
    ? ctx.darreres_interaccions.slice(0, 5).map(i =>
        `${i.data}${i.qualitat ? ` (qualitat ${i.qualitat}/5)` : ""}${i.sensacio ? ` — sensació: ${i.sensacio}` : ""}${i.notes ? ` — ${i.notes}` : ""}`
      ).join("\n")
    : "sense registre";

  const nomComplet = [ctx.nom, ctx.cognom].filter(Boolean).join(" ");
  const subcatInfo = ctx.subcategoria || ctx.subcategoria_familiar;

  return `Ets l'Analista Relacional del sistema d'intel·ligència personal. El teu rol és detectar dinàmiques relacionals, identificar patrons i generar estratègies de protecció vital. Ets elegant, racional i emocionalment intel·ligent. MAI jutges. Detectes dinàmiques.

PERFIL RELACIONAL:
- Nom: ${nomComplet}
- Categoria: ${CAT_DESC[ctx.categoria] ?? ctx.categoria}${subcatInfo ? ` / ${subcatInfo}` : ""}
- Rol vital: ${ctx.rol_vital ?? "no definit"}${ctx.tags?.length ? `\n- Etiquetes: ${ctx.tags.join(", ")}` : ""}${ctx.cita_clau ? `\n- Cita clau: "${ctx.cita_clau}"` : ""}
- Trets conductuals: ${trets}
- KPIs de risc/estabilitat: ${kpis}
- Dimensions percebudes: ${dims}
- Notes: ${ctx.notes ?? "sense notes"}

DARRERES INTERACCIONS:
${interactions}

Genera una anàlisi relacional en format JSON estrictament vàlid, sense text addicional:
{
  "estrategia": "estratègia recomanada d'interacció en 2-4 línies elegants, pràctiques i estratègiques",
  "alertes": [
    {"tipus": "positiu|atencio|risc", "missatge": "observació breu i precisa"},
    {"tipus": "positiu|atencio|risc", "missatge": "observació breu i precisa"}
  ],
  "impacte": "resum de l'impacte sobre el sistema vital en 1-2 frases elegants"
}

Màxim 3 alertes. Usa "positiu" per patrons que aporten, "atencio" per dinàmiques a observar, "risc" per patrons que erosionen el sistema. Tota la resposta en català, tò elegant i estratègic.`;
}

export function buildSnapshotPrompt(ctx: EcosistemaCtx): string {
  const resum = ctx.persones.map(p => {
    const parts = [p.nom, CAT_DESC[p.categoria] ?? p.categoria];
    if (p.rol_vital) parts.push(p.rol_vital);
    if (p.desgast_energetic != null && p.desgast_energetic >= 7) parts.push(`desgast ${p.desgast_energetic}/10`);
    if (p.estabilitat_kpi != null) parts.push(`estabilitat ${p.estabilitat_kpi}/10`);
    if (p.perfil_conductual?.length) parts.push(p.perfil_conductual.slice(0, 3).join(", "));
    return parts.join(" | ");
  }).join("\n");

  return `Ets l'Analista Relacional. Analitza l'ecosistema humà complet i genera un snapshot intel·ligent.

COMPOSICIÓ DE L'ECOSISTEMA (${ctx.total} persones):
- Família: ${ctx.familia}
- Nucli: ${ctx.nucli}
- Coneguts: ${ctx.coneguts}
- Saludats: ${ctx.saludats}
- Estratègics: ${ctx.estrategics}
- Inspiradors: ${ctx.inspiradors}
- Referents: ${ctx.referents}
- Proscrits: ${ctx.proscrits}
- Bloquejats: ${ctx.bloquejats}

PERSONES:
${resum}

Genera un snapshot en format JSON estrictament vàlid, sense text addicional:
{
  "estat_general": "avaluació breu i precisa de l'estat del sistema humà en 1 frase",
  "forces": ["punt fort de l'ecosistema", "segon punt fort"],
  "atencions": ["dinàmica a observar o corregir", "segon punt d'atenció"],
  "recomanacio": "recomanació estratègica concreta en 1-2 frases"
}

Màxim 3 forces i 3 atencions. Tò serè, elegant i estratègic. Tota la resposta en català.`;
}

export function buildAnalisiSistemicPrompt(ctx: PersonaSystemicCtx): string {
  const fmt = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  const nomComplet = [ctx.nom, ctx.cognom].filter(Boolean).join(" ");

  const metriques = [
    ctx.confianca != null           ? `confiança percebuda ${ctx.confianca}/5` : null,
    ctx.reciprocitat != null        ? `reciprocitat ${ctx.reciprocitat}/10` : null,
    ctx.risc_emocional != null      ? `risc emocional ${ctx.risc_emocional}/10` : null,
    ctx.estabilitat_kpi != null     ? `estabilitat ${ctx.estabilitat_kpi}/10` : null,
    ctx.desgast_energetic != null   ? `desgast energètic ${ctx.desgast_energetic}/10` : null,
  ].filter(Boolean).join(" · ") || "no registrades";

  const fiabilitat = [
    ctx.confianca_g != null         ? `confiança global ${ctx.confianca_g}/5` : null,
    ctx.fiabilitat_critica          ? `fiabilitat crítica: ${ctx.fiabilitat_critica}` : null,
    ctx.suport_necessitat           ? `suport quan cal: ${ctx.suport_necessitat}` : null,
    ctx.iniciativa_relacional       ? `iniciativa: ${ctx.iniciativa_relacional}` : null,
    ctx.reciprocitat_q              ? `reciprocitat: ${ctx.reciprocitat_q}` : null,
    ctx.disponibilitat              ? `disponibilitat: ${ctx.disponibilitat}` : null,
    ctx.tipus_suport?.length        ? `tipus suport: ${ctx.tipus_suport.join(", ")}` : null,
  ].filter(Boolean).join(" · ") || "no registrada";

  const xarxa = ctx.links.length === 0
    ? "Cap vincle registrat entre persones del sistema"
    : ctx.links.map(l =>
        `• ${l.nom}${l.cognom ? " " + l.cognom : ""} (${l.categoria})` +
        ` — ${l.link_type}` +
        (l.link_strength ? `, força ${l.link_strength}` : "") +
        (l.influence_type ? `, influència ${l.influence_type}` : "") +
        (l.direction === "in" ? " ← [relació entrant]" : "")
      ).join("\n");

  const { total_delta: td } = ctx;
  const deltaSummary = ctx.events_count > 0
    ? `Acumulat: conf ${fmt(td.confianca)}, prox ${fmt(td.proximitat)}, força ${fmt(td.forca)}, suport ${fmt(td.suport)}, reciprocitat ${fmt(td.reciprocitat)}, influència ${fmt(td.influencia)}`
    : "Sense events registrats";

  const recentStr = ctx.recent_events.slice(-4).map(e =>
    `  ${e.data} · ${e.tipus}` +
    (e.descripcio ? `: "${e.descripcio}"` : "") +
    ` (conf${fmt(e.delta_confianca)}, prox${fmt(e.delta_proximitat)}, força${fmt(e.delta_forca)})`
  ).join("\n");

  return `Ets l'Analista Relacional Sistèmic. Analitzes dinàmiques relacionals amb rigor metodològic i elegància prudent. MAI fas diagnòstics clínics. MAI jutges. MAI manipules.

PRINCIPIS:
1. Separes estrictament fets (dades registrades) d'inferències (interpretació de patrons)
2. Indiques el nivell de confiança basat en la qualitat i quantitat de dades disponibles
3. Senyales explícitament el que falta per validar les inferències
4. Usas un to serè, elegant i útil — mai alarmista, mai complaent

PERSONA: ${nomComplet} | ${CAT_DESC[ctx.categoria] ?? ctx.categoria}${ctx.subcategoria ? ` / ${ctx.subcategoria}` : ""}
Rol vital: ${ctx.rol_vital ?? "no definit"}${ctx.tags?.length ? ` | Etiquetes: ${ctx.tags.join(", ")}` : ""}
${ctx.notes ? `Notes: "${ctx.notes}"` : ""}

MÈTRIQUES: ${metriques}
FIABILITAT: ${fiabilitat}

XARXA DE VINCLES (${ctx.degree} connexions directes, categories: ${ctx.neighbor_categories.join(", ") || "cap"}):
${xarxa}

EVOLUCIÓ TEMPORAL (${ctx.events_count} events):
${deltaSummary}
${recentStr}
${ctx.critical_events_present ? "⚡ Ha aparegut en events de suport important, protecció, reconciliació o moment transformador" : ""}

Genera l'anàlisi en format JSON estrictament vàlid, sense text addicional:
{
  "fets": ["fet factual basat en dades registrades", ...],
  "inferencies": ["inferència prudent clarament especulativa", ...],
  "nivell_confianca": "alt|mitja|baix",
  "que_falta": ["element concret per validar una inferència", ...],
  "observacions": ["observació elegant, prudent i útil", ...],
  "tendencia": "creix|estable|refreda|sense_dades",
  "figura_central": true|false,
  "figura_pont": true|false,
  "xarxa_cohesionada": true|false,
  "confianca_alta": true|false,
  "reciprocitat_desigual": true|false,
  "present_moments_critics": true|false
}

DEFINICIONS DELS FLAGS:
- figura_central: degree ≥ 4 I confiança ≥ 4, O figura clau en múltiples categories
- figura_pont: connecta persones de ≥ 2 categories relacionals diferents
- xarxa_cohesionada: embegut/a en subxarxa on els veïns probablement s'interconnecten
- confianca_alta: confiança ≥ 4 O fiabilitat_critica "molt_fiable" o "fiable"
- reciprocitat_desigual: desequilibri evident entre donar i rebre (reciprocitat baixa + confiança alta, o reciprocitat_q "jo_dono_mes" / "oportunista")
- present_moments_critics: apareix en events de suport important, protecció, reconciliació o moment transformador

RESTRICCIONS ESTRICTES:
- Màx 5 fets, 4 inferències, 3 que_falta, 4 observacions
- Les observacions: elegants, prudents, útils. Ni acusatories ni clíniques. Frases completes.
- Si dades insuficients per determinar un flag, usa false
- Tota la resposta en català, tò serè i estratègic`;
}
