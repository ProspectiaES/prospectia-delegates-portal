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

// ─── Preguntes Fixes d'Anamnesi (3 core + 2 opcionals per fase) ──────────────

export interface AnamnesiPregunta {
  fase: number;
  ordre: number;   // 1-based global (1-25)
  ordreFase: number; // 1-5 dins la fase
  core: boolean;   // false = opcional (aprofundir)
  text: string;
  subtitol?: string;
}

export const ANAMNESI_PREGUNTES: AnamnesiPregunta[] = [
  // ── F1 · Mapa Empresarial ──────────────────────────────────────────────────
  { fase:1, ordre:1,  ordreFase:1, core:true,  text:"Quines empreses o marques formes part del grup? Descriu com es relacionen i quina és l'estructura legal i operativa.", subtitol:"Pot ser 1 sola empresa o un grup complex" },
  { fase:1, ordre:2,  ordreFase:2, core:true,  text:"Quin és el model de negoci principal? Com genereu ingressos avui i quina és la distribució aproximada (per canal, producte o mercat)?", subtitol:"Ex: 70% delegats, 20% directe, 10% online" },
  { fase:1, ordre:3,  ordreFase:3, core:true,  text:"Quin és el volum actual: equip (persones), facturació aproximada i nombre de clients actius?", subtitol:"Aproximat és suficient" },
  { fase:1, ordre:4,  ordreFase:4, core:false, text:"Hi ha línies de negoci que estàs considerant tancar, reduir o obrir en els pròxims 12 mesos? Per quin motiu?" },
  { fase:1, ordre:5,  ordreFase:5, core:false, text:"Com és la distribució geogràfica actual? On operes avui i on voldries operar? Quins mercats tens prioritzats?" },

  // ── F2 · Actors i Rols ─────────────────────────────────────────────────────
  { fase:2, ordre:6,  ordreFase:1, core:true,  text:"Qui pren les decisions estratègiques a l'empresa? Descriu el paper formal i el paper real de cada persona clau.", subtitol:"Sovint el rol formal i el real no coincideixen" },
  { fase:2, ordre:7,  ordreFase:2, core:true,  text:"Qui executa el dia a dia? Hi ha persones que concentren massa responsabilitat o que fan de coll d'ampolla sense solució?", subtitol:"Sigues honest sobre les dependències crítiques" },
  { fase:2, ordre:8,  ordreFase:3, core:true,  text:"Hi ha persones que bloquegen o alenteixen decisions importants, conscientment o no? Com es manifesta concretament?" },
  { fase:2, ordre:9,  ordreFase:4, core:false, text:"Com és la relació entre els actors clau? Hi ha tensions, aliances o dinàmiques tàcites que afecten les decisions?" },
  { fase:2, ordre:10, ordreFase:5, core:false, text:"Quines posicions clau falten a l'equip? Quina seria la contractació o el canvi de rol més impactant que podries fer ara?" },

  // ── F3 · Productes i Projectes ─────────────────────────────────────────────
  { fase:3, ordre:11, ordreFase:1, core:true,  text:"Quins productes o serveis teniu actius ara? Per a cada un, digues si esteu creixent, estancats o decreixent, i per quin motiu." },
  { fase:3, ordre:12, ordreFase:2, core:true,  text:"Quins projectes estan en marxa? Per a cada un: qui el porta, quin és l'estat real i quin és el resultat esperat.", subtitol:"Inclou projectes que 'haurien d'avançar' però no avancen" },
  { fase:3, ordre:13, ordreFase:3, core:true,  text:"Si haguessis de triar 2-3 coses on concentrar el 80% de l'energia, quines serien? Justifica el motiu per cadascuna.", subtitol:"La resposta revela les prioritats reals vs. les declarades" },
  { fase:3, ordre:14, ordreFase:4, core:false, text:"Quins projectes haurien d'estar actius però no ho estan? Quin és el fre real: falta de temps, recursos, decisió o prioritat?" },
  { fase:3, ordre:15, ordreFase:5, core:false, text:"Hi ha productes o serveis que mantens per inèrcia però que haurien de tancar-se o transformar-se radicalment?" },

  // ── F4 · Realitat Empresarial ──────────────────────────────────────────────
  { fase:4, ordre:16, ordreFase:1, core:true,  text:"Quin és el problema real més important que l'empresa no ha resolt? Per quins motius concrets no s'ha resolt fins ara?", subtitol:"No el problema 'presentable', el real" },
  { fase:4, ordre:17, ordreFase:2, core:true,  text:"Quines decisions importants s'han estat evitant o posposant? Per a cada una, digues el motiu real, no l'oficial." },
  { fase:4, ordre:18, ordreFase:3, core:true,  text:"Quin és el coll d'ampolla principal que frena el creixement? Sigues específic: és una persona, un procés, un recurs o una decisió no presa?" },
  { fase:4, ordre:19, ordreFase:4, core:false, text:"Quina és la cosa que tothom a l'empresa sap però ningú diu en veu alta? Quins temes s'eviten sistemàticament?" },
  { fase:4, ordre:20, ordreFase:5, core:false, text:"Quins errors del passat recent han tingut més impacte negatiu? Què s'ha après i s'ha canviat efectivament?" },

  // ── F5 · Construcció Objectius ─────────────────────────────────────────────
  { fase:5, ordre:21, ordreFase:1, core:true,  text:"On vols estar en 12 mesos? Descriu 3-5 resultats concrets i mesurables que dirien inequívocament 'hem tingut un any excel·lent'." },
  { fase:5, ordre:22, ordreFase:2, core:true,  text:"Quins 3 projectes o accions principals et portarien a aquells resultats? Ordena'ls per prioritat i digues qui hauria de portar cadascun." },
  { fase:5, ordre:23, ordreFase:3, core:true,  text:"Quines condicions, recursos o decisions calen que avui no tens o no has pres? Quins obstacles preveies?", subtitol:"Sigues honest sobre les restriccions reals" },
  { fase:5, ordre:24, ordreFase:4, core:false, text:"Si haguessis de triar UN sol objectiu per als pròxims 90 dies, quin seria? Quin impacte tindria en tot el resta?" },
  { fase:5, ordre:25, ordreFase:5, core:false, text:"Quines decisions hauràs de prendre en els pròxims 30 dies per que tot això sigui possible? Qui ha de prendre-les?" },
];

export const FASE_INFO_PROMPTS: Record<number, { label: string; desc: string }> = {
  1: { label: "Mapa Empresarial",      desc: "Estructura, empreses, marques, model de negoci" },
  2: { label: "Actors i Rols",         desc: "Qui decideix, qui executa, qui bloqueja" },
  3: { label: "Productes i Projectes", desc: "Estat, prioritats, dispersió" },
  4: { label: "Realitat Empresarial",  desc: "Problemes reals, decisions evitades, colls d'ampolla" },
  5: { label: "Construcció Objectius", desc: "Resultats esperats, prioritats, condicions" },
};

export function getFasePreguntesCore(fase: number): AnamnesiPregunta[] {
  return ANAMNESI_PREGUNTES.filter(p => p.fase === fase && p.core);
}

export function getFasePreguntes(fase: number): AnamnesiPregunta[] {
  return ANAMNESI_PREGUNTES.filter(p => p.fase === fase);
}

export function getPreguntaByOrdre(ordre: number): AnamnesiPregunta | undefined {
  return ANAMNESI_PREGUNTES.find(p => p.ordre === ordre);
}

// Keep buildAnamnesiPrompt for backwards compatibility (used in diagnostic)
export function buildAnamnesiPrompt(
  _fase: number,
  historial: AnamnesiTorn[],
  _novaResposta: string
): string {
  // Simplified - no longer used for question generation, only context in diagnostic
  return historial.map(t => `[Fase ${t.fase}] ${t.pregunta}\n→ ${t.resposta ?? ""}`).join("\n\n");
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
