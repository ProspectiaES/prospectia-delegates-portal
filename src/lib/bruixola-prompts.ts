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

// ─── Rich Diagnostic Result ───────────────────────────────────────────────────

export interface RichDiagnosticResult {
  // Summary
  estat_global: string;
  visio_executiva: string;
  diagnostic_general: string;
  // Per-area
  diagnostic_comercial: string;
  diagnostic_execucio: string;
  diagnostic_estructura: string;
  diagnostic_focus: string;
  diagnostic_dispersio: string;
  diagnostic_equip: string;
  diagnostic_pipeline: string;
  diagnostic_financera: string;
  // Key findings
  problema_central: string;
  forces: string[];
  riscos: string[];
  oportunitats: string[];
  dispersio_detectada: boolean;
  dispersio_detall: string;
  // Priorities & objectives
  prioritats: string[];
  objectius_90_dies: Array<{ titol: string; descripcio: string; kpis: string[]; responsable: string }>;
  objectius_12_mesos: Array<{ titol: string; descripcio: string }>;
  // Decisions & projects
  decisions_urgents: string[];
  projectes_potenciar: string[];
  projectes_congelar: string[];
  // Roadmap
  roadmap_30_dies: { focus: string; objectius: string[]; decisions: string[]; accions: string[] };
  roadmap_90_dies: { focus: string; objectius: string[]; decisions: string[]; accions: string[] };
  roadmap_12_mesos: { focus: string; objectius: string[]; decisions: string[]; accions: string[] };
  // Executive consulting
  consultoria: {
    que_faria: string;
    mal_enfocat: string;
    on_perdent_energia: string;
    potencial_real: string;
    decisions_inajornables: string[];
    projectes_sense_sentit: string[];
    que_professionalitzar: string[];
    sistemes_falten: string[];
  };
  // Conclusion
  conclusions_finals: string;
  recomanacio_principal: string;
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
    .filter(t => t.resposta && t.resposta !== "__skip__")
    .map(t => `[Fase ${t.fase}] ${t.pregunta}\n→ ${t.resposta}`)
    .join("\n\n");

  const empresesText = ctx.empreses.length > 0
    ? ctx.empreses.map(e => `${e.nom} (${e.tipus ?? "?"}, ${e.sector ?? "?"})`).join(", ")
    : "No definides";

  const actorsText = ctx.actors.length > 0
    ? ctx.actors.map(a => `${a.nom}: formal="${a.rol_formal ?? "?"}", real="${a.rol_real ?? "?"}", poder=${a.poder_decisio ?? "?"}/5, càrrega=${a.carrega_actual ?? "?"}/5`).join("\n")
    : "No definits";

  const productesText = ctx.productes.length > 0
    ? ctx.productes.map(p => `${p.nom}: estat=${p.estat ?? "?"}, caixa=${p.caixa_actual != null ? `${p.caixa_actual}€` : "?"}, potencial=${p.potencial ?? "?"}/5, esforç=${p.esforc ?? "?"}/5`).join("\n")
    : "No definits";

  const projectesText = ctx.projectes.length > 0
    ? ctx.projectes.map(p => `${p.nom}: estat=${p.estat ?? "?"}, prioritat=${p.prioritat ?? "?"}/5, impacte=${p.impacte ?? "?"}/5`).join("\n")
    : "No definits";

  const objectiusText = ctx.objectius.length > 0
    ? ctx.objectius.map(o => `${o.titol}: ${o.estat ?? "?"}, ${o.progress ?? 0}%`).join("\n")
    : "No definits";

  return `Ets un consultor senior de direcció empresarial i desenvolupament de negoci. La teva especialització: business development, reestructuració empresarial, escalabilitat, sistemes comercials, focus executiu, govern empresarial.

El teu to: executiu, sobri, clar, racional, honest, elegant, molt orientat a decisió.
NO: frases buides, motivació barata, startup bullshit, llenguatge LinkedIn.

El diagnòstic ha de fer sentir: "Ara entenem realment què passa i què hem de fer."

═══ DADES DE L'EMPRESA ═══

Empreses/Marques: ${empresesText}

Actors i equip:
${actorsText}

Productes/Serveis:
${productesText}

Projectes:
${projectesText}

Objectius:
${objectiusText}

═══ ANAMNESI ESTRATÈGICA ═══
${anamnesiText || "(Sense anamnesi — basar el diagnòstic en les dades estructurals disponibles)"}

═══ INSTRUCCIONS ═══

Genera el diagnòstic complet com a consultor senior extern. NO resumeixis les dades. Interpreta, connecta punts, detecta contradiccions, detecta patrons ocults, detecta potencial real.

Respon ÚNICAMENT en JSON vàlid amb aquesta estructura exacta:

{
  "estat_global": "1 frase executiva (màx 20 paraules) que descriu l'estat real de l'empresa",
  "visio_executiva": "Visió executiva en 3-4 línies. Síntesi brutal de la situació real.",
  "diagnostic_general": "Diagnòstic general en 4-6 línies. Honest, directe, sense eufemismes.",
  "diagnostic_comercial": "Diagnòstic de l'àrea comercial: pipeline, conversió, seguiment, estructura de vendes.",
  "diagnostic_execucio": "Diagnòstic d'execució: velocitat, follow-through, colls d'ampolla, responsabilitats.",
  "diagnostic_estructura": "Diagnòstic estructural: organigrama real vs formal, dependències crítiques.",
  "diagnostic_focus": "Diagnòstic de focus: on va l'energia vs on hauria d'anar.",
  "diagnostic_dispersio": "Diagnòstic de dispersió: quants fronts, quins estan actius de veritat, cost de la dispersió.",
  "diagnostic_equip": "Diagnòstic d'equip: capacitat, càrrega, rols buits, dependències de persones.",
  "diagnostic_pipeline": "Diagnòstic de pipeline: estat, qualitat, predictibilitat, bloquejos.",
  "diagnostic_financera": "Diagnòstic financer: caixa, recurrència, exposició, sostenibilitat.",
  "problema_central": "El problema real principal. 2-3 línies. Directe.",
  "forces": ["força real 1", "força real 2", "força real 3"],
  "riscos": ["risc real i concret 1", "risc real i concret 2", "risc real i concret 3", "risc 4"],
  "oportunitats": ["oportunitat real 1", "oportunitat real 2", "oportunitat real 3"],
  "dispersio_detectada": true,
  "dispersio_detall": "Descripció concreta de la dispersió detectada i el seu impacte.",
  "prioritats": ["prioritat real 1", "prioritat real 2", "prioritat real 3", "prioritat real 4"],
  "objectius_90_dies": [
    {"titol": "Objectiu 1", "descripcio": "Descripció concreta", "kpis": ["KPI mesurable 1", "KPI 2"], "responsable": "Qui"},
    {"titol": "Objectiu 2", "descripcio": "Descripció concreta", "kpis": ["KPI 1"], "responsable": "Qui"},
    {"titol": "Objectiu 3", "descripcio": "Descripció concreta", "kpis": ["KPI 1"], "responsable": "Qui"}
  ],
  "objectius_12_mesos": [
    {"titol": "Objectiu anual 1", "descripcio": "Descripció amb resultat esperat mesurable"},
    {"titol": "Objectiu anual 2", "descripcio": "Descripció amb resultat esperat mesurable"},
    {"titol": "Objectiu anual 3", "descripcio": "Descripció amb resultat esperat mesurable"}
  ],
  "decisions_urgents": ["decisió urgent 1", "decisió urgent 2", "decisió urgent 3"],
  "projectes_potenciar": ["projecte o línia a potenciar 1", "projecte 2"],
  "projectes_congelar": ["projecte a congelar o parar 1", "projecte 2"],
  "roadmap_30_dies": {
    "focus": "Focus principal dels 30 primers dies",
    "objectius": ["objectiu 1", "objectiu 2"],
    "decisions": ["decisió a prendre 1", "decisió 2"],
    "accions": ["acció concreta 1", "acció 2", "acció 3"]
  },
  "roadmap_90_dies": {
    "focus": "Focus dels 90 dies",
    "objectius": ["objectiu 1", "objectiu 2"],
    "decisions": ["decisió 1"],
    "accions": ["acció 1", "acció 2", "acció 3"]
  },
  "roadmap_12_mesos": {
    "focus": "Focus dels 12 mesos",
    "objectius": ["objectiu 1", "objectiu 2"],
    "decisions": ["decisió estructural 1"],
    "accions": ["acció estratègica 1", "acció 2"]
  },
  "consultoria": {
    "que_faria": "Què faria si dirigís l'empresa avui. Directe, executiu, clar.",
    "mal_enfocat": "Què està mal enfocat. On s'ha invertit energia on no cal.",
    "on_perdent_energia": "On s'està perdent energia concretament.",
    "potencial_real": "On és el potencial real que no s'està explotant.",
    "decisions_inajornables": ["decisió que no es pot evitar més 1", "decisió 2", "decisió 3"],
    "projectes_sense_sentit": ["projecte que no té sentit mantenir 1"],
    "que_professionalitzar": ["àrea o procés a professionalitzar 1", "àrea 2"],
    "sistemes_falten": ["sistema o eina que falta 1", "sistema 2"]
  },
  "conclusions_finals": "Conclusions en 3-4 línies. Síntesi. El missatge final del consultor.",
  "recomanacio_principal": "La recomanació principal. La més important. 2-3 línies. La que canvia tot."
}

Tota la resposta en català. Màxim rigor executiu.`;
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
