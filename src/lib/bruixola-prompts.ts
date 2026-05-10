// IA Estratègica — Brúixola Estratègica
// Prompts per a anamnesi adaptativa, diagnòstic i objectius SMART

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnamnesiTorn {
  fase: number;
  pregunta: string;
  resposta?: string;
}

export interface DiagnosticResult {
  estat_global: string;
  resum_executiu: string;
  forces: string[];
  riscos: string[];
  oportunitats: string[];
  problemes: string[];
  dispersio_detectada: boolean;
  focus_recomanat: string;
  projectes_congelar: string[];
  projectes_potenciar: string[];
  decisions_pendents: string[];
  seguents_accions: string[];
  recomanacio: string;
}

export interface ObjectiuSMART {
  titol: string;
  descripcio: string;
  metrica: string;
  valor_objectiu: number | null;
  data_objectiu: string | null;
  prioritat: number;
  impacte: number;
  esforc: number;
  seguent_accio: string;
}

// ─── Anamnesi Adaptativa ──────────────────────────────────────────────────────

const FASE_CONTEXT: Record<number, string> = {
  1: "Mapa empresarial: estructura, empreses, marques, línies de negoci",
  2: "Actors i rols: qui decideix, qui executa, qui bloqueja, qui depèn de qui",
  3: "Productes i projectes: estat actual, caixa, esforç, viabilitat",
  4: "Realitat empresarial: problemes reals, pèrdues d'energia, colls d'ampolla, decisions evitades",
  5: "Construcció d'objectius: convertir el caos en direcció executable",
};

export function buildAnamnesiPrompt(
  fase: number,
  historial: AnamnesiTorn[],
  novaResposta: string
): string {
  const historialText = historial.length > 0
    ? historial.map(t =>
        `[Fase ${t.fase}] P: ${t.pregunta}\nR: ${t.resposta ?? "(sense resposta)"}`
      ).join("\n\n")
    : "(primera interacció)";

  const isFaseNova = historial.filter(t => t.fase === fase).length === 0;

  return `Ets el Sistema d'Anamnesi Estratègica Empresarial. La teva funció és entendre l'empresa de manera profunda i construir un mapa estratègic real a través d'una conversa intel·ligent i adaptativa.

El teu to és: executiu, directe, professional, no invasiu. NO ets un consultor que jutja. NO ets un chatbot motivacional. Ets un sistema que ajuda a construir direcció real.

CONTEXT DE L'ANAMNESI:
Estàs en la Fase ${fase}: ${FASE_CONTEXT[fase]}

HISTORIAL DE LA CONVERSA:
${historialText}

${novaResposta ? `ÚLTIMA RESPOSTA DE L'USUARI: "${novaResposta}"` : ""}

INSTRUCCIONS:
${isFaseNova
    ? `Comença la Fase ${fase}. Presenta breument (1 línia) de què tracta aquesta fase i fes la primera pregunta d'aquesta fase.`
    : `Basant-te en la resposta anterior i el context acumulat, fes la SEGÜENT pregunta més rellevant d'aquesta fase. Adapta-la a allò que ja saps.`
}

REGLES:
- Fes UNA sola pregunta per torn. Mai dos en un sol missatge.
- La pregunta ha de ser específica, directa i executiva.
- Si la resposta anterior revela alguna cosa crítica (dispersió, manca de responsable, bloqueig important), pots fer una pregunta de seguiment sobre aquell punt específic ABANS de continuar.
- Si la resposta és massa vaga, pots demanar concreció: "Pots donar-me un exemple concret?"
- No repeteixis preguntes ja fetes.
- Quan consideres que la fase actual té prou informació (3-5 preguntes), indica: "FASE_COMPLETA" al final de la teva resposta (com a marca interna, no visible).

FORMAT DE RESPOSTA:
Retorna NOMÉS JSON vàlid sense text addicional:
{
  "pregunta": "La teva pregunta directa i executiva",
  "observacio": "Observació breu (opcional) sobre la resposta anterior si és rellevant. Màxim 1 frase. Null si no cal.",
  "fase_completa": false
}

Si la fase ja té suficient informació, posa "fase_completa": true.
Tota la resposta en català, to executiu i sobri.`;
}

// ─── Diagnòstic Empresarial ───────────────────────────────────────────────────

export function buildDiagnosticPrompt(ctx: {
  empreses: Array<{ nom: string; tipus: string | null; sector: string | null }>;
  actors: Array<{ nom: string; rol_formal: string | null; rol_real: string | null; poder_decisio: number | null; carrega_actual: number | null }>;
  productes: Array<{ nom: string; tipus: string | null; estat: string | null; caixa_actual: number | null; potencial: number | null; esforc: number | null }>;
  projectes: Array<{ nom: string; estat: string | null; prioritat: number | null; impacte: number | null; esforc: number | null; seguent_accio: string | null }>;
  objectius: Array<{ titol: string; tipus: string | null; estat: string | null; progress: number | null }>;
  anamnesi: AnamnesiTorn[];
}): string {
  const anamnesiText = ctx.anamnesi
    .filter(t => t.resposta)
    .map(t => `[Fase ${t.fase}] ${t.pregunta}\n→ ${t.resposta}`)
    .join("\n\n");

  const empresesText = ctx.empreses.length > 0
    ? ctx.empreses.map(e => `${e.nom} (${e.tipus ?? "?"}, ${e.sector ?? "?"})` ).join(", ")
    : "No definides";

  const actorsText = ctx.actors.length > 0
    ? ctx.actors.map(a => `${a.nom}: rol formal="${a.rol_formal ?? "?"}", rol real="${a.rol_real ?? "?"}", poder=${a.poder_decisio ?? "?"}/5, càrrega=${a.carrega_actual ?? "?"}/5`).join("\n")
    : "No definits";

  const productesText = ctx.productes.length > 0
    ? ctx.productes.map(p => `${p.nom} (${p.tipus ?? "?"}): estat=${p.estat ?? "?"}, caixa=${p.caixa_actual != null ? `${p.caixa_actual}€` : "?"}, potencial=${p.potencial ?? "?"}/5, esforç=${p.esforc ?? "?"}/5`).join("\n")
    : "No definits";

  const projectesText = ctx.projectes.length > 0
    ? ctx.projectes.map(p => `${p.nom}: estat=${p.estat ?? "?"}, prioritat=${p.prioritat ?? "?"}/5, impacte=${p.impacte ?? "?"}/5, esforç=${p.esforc ?? "?"}/5, pròxim=${p.seguent_accio ?? "sense acció"}`).join("\n")
    : "No definits";

  const objectiusText = ctx.objectius.length > 0
    ? ctx.objectius.map(o => `${o.titol} (${o.tipus ?? "?"}): estat=${o.estat ?? "?"}, progrés=${o.progress ?? 0}%`).join("\n")
    : "No definits";

  return `Ets el Sistema de Diagnòstic Estratègic Empresarial. La teva funció és generar un diagnòstic executiu real, honest i accionable d'una empresa.

El teu to és: racional, elegant, executiu, constructiu. No jutges. No uses frases de consultor buit. Ets honest però constructiu. El diagnòstic ha de fer sentir: "Ara finalment tenim direcció."

DADES DE L'EMPRESA:
Empreses: ${empresesText}

Actors:
${actorsText}

Productes/Serveis:
${productesText}

Projectes:
${projectesText}

Objectius:
${objectiusText}

ANAMNESI ESTRATÈGICA (conversa prèvia):
${anamnesiText || "(Sense anamnesi prèvia)"}

Genera un diagnòstic empresarial complet en format JSON estrictament vàlid, sense text addicional:
{
  "estat_global": "Frase executiva breu que descriu l'estat real de l'empresa (1 frase, màxim 20 paraules)",
  "resum_executiu": "Diagnòstic executiu en 3-5 línies. Honest, directe, constructiu. Descriu la situació real.",
  "forces": ["punt fort real 1", "punt fort real 2", "punt fort real 3"],
  "riscos": ["risc real 1", "risc real 2", "risc real 3"],
  "oportunitats": ["oportunitat concreta 1", "oportunitat concreta 2"],
  "problemes": ["problema sistèmic 1", "problema sistèmic 2", "problema sistèmic 3"],
  "dispersio_detectada": true,
  "focus_recomanat": "El focus principal que l'empresa hauria de tenir ara. 1-2 frases concretes.",
  "projectes_congelar": ["projecte o línia a congelar 1"],
  "projectes_potenciar": ["projecte o línia a potenciar 1", "projecte o línia a potenciar 2"],
  "decisions_pendents": ["decisió específica que s'ha d'abordar 1", "decisió específica 2"],
  "seguents_accions": ["acció immediata concreta 1", "acció immediata concreta 2", "acció immediata concreta 3"],
  "recomanacio": "Recomanació estratègica principal en 2-3 línies. La més important de tot el diagnòstic."
}

Màxim 3 forces, 3 riscos, 2 oportunitats, 3 problemes, 2 projectes_congelar, 3 projectes_potenciar, 3 decisions_pendents, 3 seguents_accions.
Tota la resposta en català. To executiu, sòbri i directe.`;
}

// ─── Conversió Idea → Objectiu SMART ─────────────────────────────────────────

export function buildObjectiuSMARTPrompt(
  idea: string,
  context: { empreses: string[]; actors: string[]; projectes: string[] }
): string {
  return `Ets el Sistema de Construcció d'Objectius SMART. La teva funció és convertir una idea o intenció en un objectiu empresarial executable, mesurable i real.

CONTEXT EMPRESARIAL:
Empreses: ${context.empreses.join(", ") || "no definides"}
Actors disponibles: ${context.actors.join(", ") || "no definits"}
Projectes actius: ${context.projectes.join(", ") || "no definits"}

IDEA/INTENCIÓ DE L'USUARI: "${idea}"

REGLES D'UN BON OBJECTIU:
❌ "Millorar branding" → ✅ "Augmentar un 20% els leads entrants abans del Q4 2026"
❌ "Expandir negoci" → ✅ "Obrir 3 distribuïdors nous a Orient Mitjà abans de setembre 2026"
❌ "Ser més eficients" → ✅ "Reduir el temps de resposta a leads a menys de 2h abans de juny 2026"

L'objectiu ha de tenir:
- Títol clar i executiu (màxim 12 paraules)
- Mètrica real i mesurable
- Valor objectiu numèric si és possible
- Data límit realista
- Prioritat (1=baixa, 5=crítica)
- Impacte en el negoci (1-5)
- Esforç requerit (1=baix, 5=alt)
- Primera acció concreta i immediata

Si la idea és massa vaga per crear un objectiu SMART, el camp "titol" ha de ser null i "problema" ha d'explicar per quin camp manquen dades.

Retorna ÚNICAMENT JSON vàlid, sense text addicional:
{
  "titol": "Títol executiu de l'objectiu o null si massa vague",
  "problema": "Explicació de per quin camp manquen dades si titol és null, o null si tot OK",
  "descripcio": "Descripció clara del que s'ha d'aconseguir i per què importa",
  "metrica": "La mètrica principal per mesurar l'èxit",
  "valor_objectiu": 0,
  "unitat": "unitat de la mètrica (€, %, leads, clients, etc.)",
  "data_objectiu": "YYYY-MM-DD o null",
  "prioritat": 3,
  "impacte": 4,
  "esforc": 3,
  "seguent_accio": "Primera acció concreta que cal fer aquesta setmana"
}

Tota la resposta en català. To executiu.`;
}

// ─── Detecció Alertes Automàtiques ───────────────────────────────────────────

export function buildAlertesPrompt(ctx: {
  objectius: Array<{ titol: string; estat: string | null; progress: number | null; data_objectiu: string | null; seguent_accio: string | null }>;
  projectes: Array<{ nom: string; estat: string | null; seguent_accio: string | null; data_objectiu: string | null }>;
  kpis: Array<{ nom: string; valor_actual: number | null; valor_objectiu: number | null; tendencia: string | null }>;
}): string {
  return `Analitza les dades empresarials i detecta alertes crítiques.

OBJECTIUS:
${ctx.objectius.map(o => `- ${o.titol}: estat=${o.estat}, progrés=${o.progress ?? 0}%, data_limit=${o.data_objectiu ?? "sense"}, pròxim=${o.seguent_accio ?? "sense acció"}`).join("\n") || "Cap objectiu"}

PROJECTES:
${ctx.projectes.map(p => `- ${p.nom}: estat=${p.estat}, pròxim=${p.seguent_accio ?? "sense acció"}, data=${p.data_objectiu ?? "sense"}`).join("\n") || "Cap projecte"}

KPIs:
${ctx.kpis.map(k => {
    const desv = k.valor_actual != null && k.valor_objectiu != null && k.valor_objectiu > 0
      ? Math.round(((k.valor_actual - k.valor_objectiu) / k.valor_objectiu) * 100)
      : null;
    return `- ${k.nom}: actual=${k.valor_actual ?? "?"}, objectiu=${k.valor_objectiu ?? "?"}, desviació=${desv != null ? `${desv}%` : "?"}, tendència=${k.tendencia ?? "?"}`;
  }).join("\n") || "Cap KPI"}

Detecta alertes reals. Retorna JSON:
{
  "alertes": [
    {"tipus": "critica|atencio|info", "area": "objectius|projectes|kpis|estructura", "missatge": "Alerta breu i concreta", "accio": "Acció recomanada"}
  ]
}

Màxim 5 alertes. Prioritza les crítiques. Tota la resposta en català.`;
}
