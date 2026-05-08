// ─── 52 Weekly Phrases ────────────────────────────────────────────────────────

export const FRASES_52: string[] = [
  "Paraules, fets i consciència, sempre d'acord.",                                                    // Week 1
  "Fomento l'èxit de cada membre de la meva família com a expressió de la meva força interior.",       // Week 2
  "Escolto amb serenor i jutjo amb equilibri.",                                                        // Week 3
  "Mai poso l'honestedat en compromís.",                                                               // Week 4
  "Soc sincer i ferm fins i tot quan costa.",                                                          // Week 5
  "No critico ni destrueixo; construeixo i inspiro.",                                                  // Week 6
  "Mantinc l'actitud positiva, passi el que passi.",                                                   // Week 7
  "Soc ordenat en la meva persona i en la meva feina.",                                                // Week 8
  "Recordo i cuido la gent implicada en el meu camí.",                                                 // Week 9
  "Les persones mai són mitjans; sempre són fins.",                                                    // Week 10
  "Practico la humilitat com a base de la meva força.",                                                // Week 11
  "Busco impacte real: el que faig ha de marcar una diferència.",                                      // Week 12
  "Persegueixo la perfecció sabent que no és un destí, sinó una actitud.",                             // Week 13
  "Acabo tot allò que començo.",                                                                       // Week 14
  "La meva família és el centre estable de la meva vida.",                                             // Week 15
  "M'aixeco amb bon humor i disposició per ajudar.",                                                   // Week 16
  "Somric encara que el dia sigui dur.",                                                               // Week 17
  "Visc cada dia amb intensitat i sense distraccions.",                                                // Week 18
  "Planifico, executo i assoliré cada objectiu fixat.",                                                // Week 19
  "Córrer és part de qui soc. El moviment manté la meva ment neta.",                                  // Week 20
  "Focalitzo l'atenció en allò que realment importa.",                                                 // Week 21
  "Serveixo als altres amb alegria i sense esperar retorn.",                                            // Week 22
  "Cerco l'èxit col·lectiu per sobre del reconeixement personal.",                                     // Week 23
  "No postergo. Faig el que toca, quan toca.",                                                         // Week 24
  "Persevero fins assolir el resultat.",                                                               // Week 25
  "No tinc por d'equivocar-me; aprenc més ràpid que ningú.",                                           // Week 26
  "No em frustro davant el no; busco la següent oportunitat.",                                         // Week 27
  "Lidero amb decisió i calma. Soc un referent.",                                                      // Week 28
  "Em comporto com un empresari d'alt nivell en cada acció.",                                          // Week 29
  "Aconsegueixo tot allò que em proposo perquè actuo amb constància.",                                 // Week 30
  "Soc eficaç, elimino el soroll i simplifico.",                                                       // Week 31
  "Cada negativa és una oportunitat amagada.",                                                         // Week 32
  "Faig el que toca, sense excuses.",                                                                  // Week 33
  "Controlo les meves finances amb precisió i sentit estratègic.",                                     // Week 34
  "Estic en pau amb mi mateix.",                                                                       // Week 35
  "Escolto i comprenc abans d'exigir.",                                                                // Week 36
  "Transmeto alegria i energia en cada interacció.",                                                   // Week 37
  "No m'enfonso davant l'adversitat; m'aixeco més fort.",                                              // Week 38
  "Converteixo les derrotes en oportunitats d'aprenentatge.",                                          // Week 39
  "Focalitzo en tancar negocis amb valor real.",                                                       // Week 40
  "Fent seguiment constant, transformo contactes en resultats.",                                       // Week 41
  "Soc metòdic, ordenat i fiable.",                                                                    // Week 42
  "Menjo i bec amb moderació per mantenir el control i la claredat.",                                  // Week 43
  "Soc humil, auster i elegant.",                                                                      // Week 44
  "Treballo i penso com un empresari global.",                                                         // Week 45
  "Converteixo la por en energia productiva.",                                                         // Week 46
  "Surto de la meva zona de confort cada setmana.",                                                    // Week 47
  "No tolero la mediocritat, començant per la meva.",                                                  // Week 48
  "Penso fora del marc mental ordinari.",                                                              // Week 49
  "Analitzo les conseqüències abans d'actuar.",                                                        // Week 50
  "Em formo contínuament per seguir sent útil i lúcid.",                                               // Week 51
  "Adquireixo cultura per parlar amb tothom, sense complexos.",                                        // Week 52
];

// ─── Week number helpers ───────────────────────────────────────────────────────

export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function getFraseSetmana(date?: Date): { setmana: number; frase: string } {
  const d = date ?? new Date();
  const setmana = getWeekNumber(d);
  const idx = Math.min(setmana - 1, FRASES_52.length - 1);
  return { setmana, frase: FRASES_52[idx] };
}

// ─── Default planning content ─────────────────────────────────────────────────

export const DEFAULT_CARTA = {
  context: "Aquesta carta és un pont entre el que he après i el que vull consolidar. No és un balanç: és una brúixola.",
  lliçons: [
    { num: 1, aprenentatge: "El 2025 va ser un any de traspàs i dol per la mort del pare.", impacte: "Un any sense direcció definida ni meditació. El pèndol interior fora de centre." },
    { num: 2, aprenentatge: "", impacte: "" },
    { num: 3, aprenentatge: "", impacte: "" },
  ],
  focus_2026: [
    { num: 1, compromis: "Consolido Viholabs", descripcio: "Genero caixa amb focus en vendre i renuncio al que no paga" },
    { num: 2, compromis: "Em governa el dia", descripcio: "Estableixo normes diàries i decideixo abans d'actuar" },
    { num: 3, compromis: "Recupero centre i límits", descripcio: "Habito la meva identitat sense diluir-me relacionalment" },
  ],
  frase_autoexigencia: "La meva missió son les meves normes diaries.",
  declaracio: "El 2026 no serà un any per buscar més, sinó per ser millor. Sense constància no hi ha èxit. Aquest 2026 la meva gran prioritat ha de ser el meu dia a dia.",
  data: "22/12/2025",
};

export const DEFAULT_MISSIO = {
  statement: "Sóc empresari. El meu propòsit és guanyar diners amb ètica i criteri, i fer-los servir per crear impacte positiu i arribar a ser un filantrop real.",
  professional: "Facilitar la feina i el creixement de les persones amb qui col·laboro i faig negocis. Treballar des dels valors de professionalitat, lleialtat i coherència. Construir projectes que millorin vides, no només balanços.",
  pare: "Donar als meus fills una base moral sòlida i un pensament lliure. Ajudar-los a créixer com a persones responsables i felices. Estimar-los amb amor incondicional i liderar amb l'exemple.",
  amics: "Acceptar les diferències i ajudar a créixer als altres sense esperar res a canvi. Saber escoltar i aconsellar amb autenticitat. Celebrar l'èxit aliè sense enveja.",
  politic: "Defensar una democràcia liberal i social, basada en la justícia i la igualtat d'oportunitats. Posar Catalunya al centre del progrés, amb orgull però sense sectarisme.",
  civic: "Assumir la responsabilitat de contribuir a una societat justa i meritocràtica. Participar en iniciatives que millorin la convivència, l'educació i la salut.",
  marit: "Compartir la vida amb la Marta amb complicitat, respecte i afecte. Fer que la seva vida sigui més plena pel simple fet d'estar-hi. Acompanyar-la en els moments difícils.",
  reflexio_coherent: "",
  reflexio_desviat: "",
  reflexio_accions: "",
  frase: "Paraules, fets i consciència, sempre d'acord.",
};

export const DEFAULT_PRIORITATS = {
  top5: [
    { prioritat: "Generar estabilitat econòmica real", intencio: "Sortir de la incertesa crònica i recuperar seguretat, centre i autoritat personal. Sense caixa no hi ha pau." },
    { prioritat: "Consolidar Viholabs amb focus en vendre", intencio: "Passar de projectes potencials a un vehicle clar que genera ingressos, encara que sigui modest però recurrent." },
    { prioritat: "Governar el dia amb normes simples", intencio: "Deixar de viure reactiu. Decidir abans d'actuar. Construir direcció a través del dia a dia." },
    { prioritat: "Recuperar centre i límits personals", intencio: "Deixar de diluir-me en relacions i situacions que em buiden. Tornar a respectar-me sense justificar-me." },
    { prioritat: "Reordenar energia i cos", intencio: "Tornar a un estat físic i mental que permeti rendir, decidir i estar present, sense heroismes." },
  ],
  valors: [
    { valor: "Responsabilitat (Extreme Ownership)", practica: "No culpo context ni persones. Si no funciona, reviso el meu pla." },
    { valor: "Claredat", practica: "Parlo i decideixo amb menys paraules i més fets." },
    { valor: "Disciplina serena", practica: "Constància sense pressa, sense improvisació, sense dramatitzar." },
    { valor: "Respecte a mi mateix", practica: "No m'explico de més ni em faig petit per evitar conflictes." },
    { valor: "Focus", practica: "Poques prioritats, ben executades. Tot el que dispersa, surt." },
  ],
  eliminar: [
    { element: "Multitasking i multiprojectes", substitucio: "Un únic vehicle econòmic prioritari" },
    { element: "Improvisació diària", substitucio: "Una decisió clara cada matí" },
    { element: "Justificar-me constantment", substitucio: "Silenci, acció i coherència" },
    { element: "Debats infinits sobre diners", substitucio: "Accions concretes de caixa" },
    { element: "Relacions o dinàmiques que em buiden", substitucio: "Límits clars o reducció de presència" },
  ],
  reflexio: "El 2026 no és un any per demostrar res a ningú, sinó per recuperar govern, estabilitat i respecte propi. Quan l'ordre torna, la resta s'endreça.",
};

export const DEFAULT_OBJECTIUS_VITALS: Record<string, Array<{ categoria: string; objectiu: string; descripcio: string }>> = {
  "2026": [
    { categoria: "Personals", objectiu: "Recuperar centre i serenor estable", descripcio: "Viure sense improvisació crònica, amb decisions clares i ritme sostenible." },
    { categoria: "Disciplina", objectiu: "Governar el dia amb normes simples", descripcio: "Una prioritat diària, decisions sense fatiga, constància sense heroisme." },
    { categoria: "Excel·lència", objectiu: "Excel·lència personal silenciosa", descripcio: "Fer bé el que toca, encara que no es vegi ni s'aplaudeixi." },
    { categoria: "Laborals", objectiu: "Construir un vehicle econòmic estable", descripcio: "Un projecte clar que generi ingressos recurrents, encara que sigui modest." },
    { categoria: "Materials", objectiu: "Estabilitat econòmica personal", descripcio: "Cobrir necessitats, reduir pressió i recuperar llibertat mental." },
  ],
  "2030": [
    { categoria: "Personals", objectiu: "Ser influent a escala institucional o política", descripcio: "Consolidar veu pròpia amb impacte social." },
    { categoria: "Disciplina", objectiu: "Ascetisme actiu", descripcio: "Control del temps, del soroll i de la dispersió." },
    { categoria: "Excel·lència", objectiu: "Ser un referent ètic i d'alt rendiment", descripcio: "Excel·lència serena i mesurada." },
    { categoria: "Laborals", objectiu: "Multinacional consolidada", descripcio: "Expansió amb estructura sòlida i cultura pròpia." },
    { categoria: "Materials", objectiu: "10.000.000 € patrimoni net", descripcio: "Independència total i estabilitat patrimonial." },
  ],
  "2035": [
    { categoria: "Personals", objectiu: "Crear una fundació pròpia", descripcio: "Impacte en educació i salut." },
    { categoria: "Disciplina", objectiu: "Filantropia activa", descripcio: "Ajudar de manera estructurada i continuada." },
    { categoria: "Excel·lència", objectiu: "Tenir un llegat tangible", descripcio: "Escriure, formar i deixar empremta cultural." },
    { categoria: "Laborals", objectiu: "Holding empresarial consolidat", descripcio: "Banc propi i estructura diversificada." },
    { categoria: "Materials", objectiu: "Independència patrimonial per als fills", descripcio: "Propietat i llibertat financera familiar." },
  ],
  "2040": [
    { categoria: "Personals", objectiu: "Gaudir plenament de la vida", descripcio: "Temps, llibertat i serenitat." },
    { categoria: "Disciplina", objectiu: "Misticisme i introspecció", descripcio: "Espai per a l'espiritualitat i la calma." },
    { categoria: "Excel·lència", objectiu: "Transmetre el llegat als fills", descripcio: "Ensenyar a liderar amb valors i coherència." },
    { categoria: "Laborals", objectiu: "Traspassar direcció de l'empresa", descripcio: "Convertir-me en guia estratègic i mentor." },
    { categoria: "Materials", objectiu: "Llibertat patrimonial definitiva", descripcio: "Gestió eficient, sense complexitat." },
  ],
};

export const DEFAULT_OBJECTIUS_TRIMESTRALS: Record<string, Array<{ area: string; objectiu: string; descripcio: string }>> = {
  Q1: [
    { area: "Personals", objectiu: "Recuperar centre", descripcio: "Sortir de la reactivitat i deixar de justificar-me." },
    { area: "Disciplina", objectiu: "Governar el dia", descripcio: "Decidir abans d'actuar i reduir improvisació." },
    { area: "Excel·lència", objectiu: "Complir el decidit", descripcio: "Menys compromisos, més execució real." },
    { area: "Laborals", objectiu: "Focus únic", descripcio: "Activar un sol projecte prioritari." },
    { area: "Materials", objectiu: "Primer senyal de caixa", descripcio: "Validar que el sistema pot generar diners reals." },
  ],
  Q2: [
    { area: "Personals", objectiu: "Estabilitat relacional", descripcio: "Relacions més clares, menys drenatge." },
    { area: "Disciplina", objectiu: "Consistència sostinguda", descripcio: "Mantenir ritme sense tensió ni heroisme." },
    { area: "Excel·lència", objectiu: "Millorar qualitat", descripcio: "Fer millor el mateix, no fer més coses." },
    { area: "Laborals", objectiu: "Ajustar i reforçar", descripcio: "Optimitzar el projecte que funciona." },
    { area: "Materials", objectiu: "Regularitat econòmica", descripcio: "Passar de cobrament puntual a continuïtat." },
  ],
  Q3: [
    { area: "Personals", objectiu: "Presència i energia", descripcio: "Mantenir centre, salut i equilibri." },
    { area: "Disciplina", objectiu: "Autonomia del sistema", descripcio: "Que el sistema funcioni amb menys esforç conscient." },
    { area: "Excel·lència", objectiu: "Aprenentatge clau", descripcio: "Aprendre allò que eleva el meu nivell real." },
    { area: "Laborals", objectiu: "Expandir amb criteri", descripcio: "Obrir una nova palanca sense dispersió." },
    { area: "Materials", objectiu: "Augmentar marge", descripcio: "Millorar rendibilitat, no només ingressos." },
  ],
  Q4: [
    { area: "Personals", objectiu: "Serenor i coherència", descripcio: "Tancar l'any sense tensió ni comptes pendents." },
    { area: "Disciplina", objectiu: "Integrar hàbits", descripcio: "Que allò après sigui automàtic." },
    { area: "Excel·lència", objectiu: "Completar el decidit", descripcio: "No deixar res important sense acabar." },
    { area: "Laborals", objectiu: "Tancar l'any amb impacte", descripcio: "Un resultat mesurable que justifiqui tot l'esforç." },
    { area: "Materials", objectiu: "Tancament econòmic sa", descripcio: "Sense deutes urgents, amb marge per al 2027." },
  ],
};

export const DEFAULT_INFLUENCIES = {
  referents: [
    { nom: "Fernando Rueda Parra", ambit: "Visió, coherència, lideratge exigent", accio: "Converses mensuals i contrast d'idees." },
    { nom: "Mr Nam", ambit: "Estratègia, paciència, solidesa empresarial", accio: "Enfortir aliances Corea–Europa." },
    { nom: "Rosendo Garganta", ambit: "Innovació mèdica, constància", accio: "Reprendre col·laboració i sinergies." },
    { nom: "Esther Niubó", ambit: "Intel·ligència política i pragmatisme", accio: "Espais de debat o diàleg sobre lideratge." },
  ],
  inspiradors: [
    { nom: "Adela Cortina", ambit: "Ètica aplicada", aprenentatge: "Responsabilitat moral i coherència." },
    { nom: "Ayn Rand", ambit: "Filosofia", aprenentatge: "Independència i autocreació." },
    { nom: "Jaime Rodríguez de Santiago", ambit: "Pensament pràctic", aprenentatge: "Serenitat racional i acció ponderada." },
    { nom: "Jocko Willink", ambit: "Lideratge i disciplina", aprenentatge: "Propietat total i control emocional." },
    { nom: "Naval Ravikant", ambit: "Mentalitat i llibertat", aprenentatge: "Equilibri entre ambició i pau interior." },
    { nom: "Joan Tubau", ambit: "Antropologia i educació", aprenentatge: "Comprendre les persones per liderar-les millor." },
  ],
  persones_cuidar: [
    { nom: "Lander", relacio: "Amic i confident", accio: "Trobades trimestrals, compartir objectius." },
    { nom: "Jacobo de Salas", relacio: "Amic i referent empresarial", accio: "Projecte conjunt o brainstorming anual." },
    { nom: "José Luis de Sancho", relacio: "Mentor vital", accio: "Sopars periòdics, diàleg sobre valors." },
    { nom: "Miquel Essomba", relacio: "Inspiració social", accio: "Converses sobre lideratge i educació." },
    { nom: "Jaume Estruch", relacio: "Col·laborador professional", accio: "Seguiment projectes i confiança mútua." },
  ],
  a_distancia: [
    { nom: "Sandra Montesinos", motiu: "Negativitat i mediocritat", accio: "Cap contacte. Neutralitzar influència." },
    { nom: "Yolanda Armenta", motiu: "Energia tòxica", accio: "Allunyament definitiu." },
    { nom: "Eduard Payet", motiu: "Manca d'ètica i egoisme", accio: "Tallar canals de comunicació." },
    { nom: "Raul Ivars", motiu: "Frivolitat i inestabilitat", accio: "Distància permanent." },
  ],
  objectiu_relacional: "Les meves relacions han d'elevar la meva manera de pensar, decidir i viure.",
};

export const DEFAULT_DESITJOS = {
  desitjos: ["Casa de pagès a La Cellera de Ter"],
  notes: "",
};
