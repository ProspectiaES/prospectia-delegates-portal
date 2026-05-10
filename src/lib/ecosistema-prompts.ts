// AI prompts for the Ecosistema Humà relational intelligence system

export interface PersonaCtx {
  nom: string;
  categoria: string;
  subcategoria_familiar?: string | null;
  rol_vital?: string | null;
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
  estrategic: number;
  expansio: number;
  drenant: number;
  persones: Array<{
    nom: string;
    categoria: string;
    rol_vital?: string | null;
    risc_emocional?: number | null;
    estabilitat_kpi?: number | null;
    desgast_energetic?: number | null;
    perfil_conductual?: string[];
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
  familia: "família",
  nucli: "nucli central (persones àncora, mentors essencials)",
  estrategic: "anell estratègic (aliances, col·laboradors clau)",
  expansio: "expansió (referents, relacions en creixement)",
  drenant: "zona drenant (relacions d'alt cost energètic)",
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

  return `Ets l'Analista Relacional del sistema d'intel·ligència personal. El teu rol és detectar dinàmiques relacionals, identificar patrons i generar estratègies de protecció vital. Ets elegant, racional i emocionalment intel·ligent. MAI jutges. Detectes dinàmiques.

PERFIL RELACIONAL:
- Nom: ${ctx.nom}
- Categoria: ${CAT_DESC[ctx.categoria] ?? ctx.categoria}${ctx.subcategoria_familiar ? ` / ${ctx.subcategoria_familiar}` : ""}
- Rol vital: ${ctx.rol_vital ?? "no definit"}
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
- Estratègic: ${ctx.estrategic}
- Expansió: ${ctx.expansio}
- Drenant: ${ctx.drenant}

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
