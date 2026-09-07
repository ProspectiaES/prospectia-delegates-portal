-- ============================================================================
-- Seed de dades reals: Wooshin — prospecció ArniPatch / Ivy Leaf ODF / Tadalafil ODF
-- NO és una migració d'esquema — executar NOMÉS DESPRÉS d'aplicar
-- 065_bruixola_negoci.sql. Idempotent (es pot re-executar sense duplicar).
--
-- Hi ha DOS perfils amb role='OWNER' en producció (lvila@prospectia.es i
-- marti@viho.es) — totes les subqueries d'owner filtren explícitament per
-- l'email lvila@prospectia.es, ja que aquestes empreses/oportunitats són
-- seves. No usar mai un simple "WHERE role='OWNER' LIMIT 1" en aquest
-- projecte — és no determinista amb dos OWNER.
--
-- Decisions de modelatge (revisar abans d'executar):
--   - Laboratorios Viñas ja apareix a ArniPatch i Ivy Leaf ODF com a
--     "conversación ya abierta" -> es crea UNA organització i DUES
--     oportunitats (una per producte), estat inicial 'qualificat'.
--   - Q Pharma (Tadalafil) ja ha mostrat interès -> estat inicial 'qualificat'.
--   - Heel España EXCLÒS explícitament per Ivy Leaf ODF (conflicte amb
--     Tusheel) -> només es crea l'oportunitat d'ArniPatch, no la d'Ivy Leaf.
--   - "Ferrer Internacional / Vemedia Pharma Hispania" (Ivy Leaf, titularitat
--     de Prospantus per verificar) es modela com a organització SEPARADA de
--     "Grupo Ferrer" (prospecte de porfolio a Tadalafil) — mateix grup
--     empresarial però rols molt diferents; fusionar manualment si es
--     confirma que cal tractar-los com un sol contacte.
--   - Descartats explícitament al document (Combix, Aristo, Mabo, KRKA
--     local, Stadagen) NO es carreguen — sense dades de contacte ni
--     prioritat segons el pla original.
--   - `valor_potencial` es deixa NULL a tots — cap dels documents dona xifres.
-- ============================================================================

-- ─── 1. Empreses pròpies (crear si no existeixen) ───────────────────────────

INSERT INTO bruixola_empreses (user_id, nom, tipus, sector, descripcio)
SELECT (SELECT p.id FROM profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'lvila@prospectia.es'), v.nom, v.tipus, 'Farmacèutica / autocuidado', v.descripcio
FROM (VALUES
  ('Wooshin',            'Fabricant',  'Wooshin Labottach — ArniPatch, Ivy Leaf ODF, Tadalafil ODF'),
  ('Athena',             'Propi',      NULL),
  ('Devicare',           'Propi',      NULL),
  ('Zinereo',            'Propi',      NULL),
  ('Magneplex',          'Propi',      'Via Experts Pharma Care'),
  ('Rioja Nature Pharma','Propi',      NULL),
  ('Ristar Labs',        'Propi',      NULL),
  ('Geongang',           'Propi',      NULL),
  ('Laboratorios SK',    'Propi',      NULL)
) AS v(nom, tipus, descripcio)
WHERE NOT EXISTS (
  SELECT 1 FROM bruixola_empreses e
  WHERE e.user_id = (SELECT p.id FROM profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'lvila@prospectia.es') AND e.nom = v.nom
);

-- ─── 2. Organitzacions externes (dedupliquen entre productes) ───────────────

INSERT INTO bruixola_organitzacions (user_id, nom, tipus, pais, sector, contacte, notes)
SELECT (SELECT p.id FROM profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'lvila@prospectia.es'), v.nom, 'prospecte', 'Espanya', v.sector, v.contacte, v.notes
FROM (VALUES
  ('Laboratorios Viñas',                               'Laboratori familiar', 'C/ Provença 386, 6a, Barcelona · 93 207 05 12 · www.vinas.es · contacte: Mariona (ja actiu)', 'Origen del projecte Wooshin a Espanya.'),
  ('HARTMANN España',                                  'Apòsits/parches',     'Mataró, Barcelona · 93 741 71 36 · hartmann.info/es-es', 'Sense àrnica pròpia — entrada neta.'),
  ('Angelini Pharma España',                           'Consumer Health',     'Pozuelo de Alarcón, Madrid · 91 561 88 44 · angelinipharma.es · info@angelini.es', 'Experiència amb ThermaCare (paral·lelisme directe).'),
  ('Laboratorios ERN',                                 'Laboratori familiar', 'Esplugues de Llobregat, Barcelona · 93 470 44 44 · ern.es · ern@ern.es', 'Perfil de porfolio, apetit constant per novetats.'),
  ('Grupo Juste',                                      'Laboratori familiar', 'C/ Juan Esplandiu 11, Madrid · 91 502 65 00 · grupojuste.es · info@grupojuste.es', 'Perfil de porfolio via llicències.'),
  ('Italfarmaco España',                                'Filial grup mitjà',   'C/ Orense 16, Madrid · 91 597 37 60 · italfarmaco.es · info@italfarmaco.es', 'Decisió final pot requerir validació a Itàlia.'),
  ('Cantabria Labs / Insud Pharma',                     'Grup en expansió',    'C/ Julián Camarillo 25, Madrid · 91 787 08 00 · cantabrialabs.com · info@cantabrialabs.com', 'Nucli dermocosmètica, apetit demostrat per in-licensing.'),
  ('Uriach / Aquilea',                                  'Consumer Health',     'Manlleu, Barcelona · 93 887 07 71 · uriach.com · uriach@uriach.com', 'Posicionament fort en esport/fisioteràpia (Fisiocrem) i autocuidado (Aquilea).'),
  ('FAES FARMA',                                        'Líder categoria àrnica','Leioa, Vizcaya · 94 647 00 00 · faesfarma.com · info@faesfarma.com', 'Lideratge en àrnica (Arnidol/Fisionatur) — el més sensible a canibalització.'),
  ('Heel España',                                       'Homeopatia/tòpics',   'Alcobendas, Madrid · 91 484 40 13 · heel.es · info@heel.es', 'Producte propi en àrnica (Traumeel). EXCLÒS per Ivy Leaf ODF (Tusheel, competidor directe).'),
  ('Arkopharma España',                                 'Fitoteràpia',         'Madrid · 91 598 99 00 · arkopharma.es · info@arkopharma.es', 'Producte propi en àrnica (Arkoflex).'),
  ('Cinfa',                                              'Genèrics/capilaritat','Huarte, Navarra · 94 833 39 00 · cinfa.com · info@cinfa.com', 'Màxima capil·laritat en farmàcia — necessita business case concret.'),
  ('Menarini España',                                   'Consumer Healthcare', 'Badalona, Barcelona · 93 462 88 00 · menarini.es · info@menarini.es', 'Categoria de prioritat relativa menor dins porfolio ampli.'),
  ('MARNYS',                                            'Natural/parafarmacia','Espinardo, Murcia · 96 836 18 00 · marnys.com · marnys@marnys.com', 'Menor múscul que els grans — aproximació oportunista.'),
  ('Ferrer Internacional / Vemedia Pharma Hispania',    'Titularitat per verificar', 'Ferrer: Av. de Rius i Taulet 6, Esplugues · 93 600 37 00 · ferrergroup.com', 'VERIFICAR en CIMA/AEMPS qui ostenta avui Prospantus/Prospan abans de contactar.'),
  ('Zambon España',                                     'Especialista respiratori','Santa Perpètua de Mogoda, Barcelona · 93 544 64 00 · zambonpharma.com/es', 'Fluimucil i gama mucolítica — visita mèdica en pneumologia/pediatria ja construïda.'),
  ('Aboca España',                                      'Fitoteràpia natural', 'Mataró, Barcelona · 93 741 03 20 · aboca.com/es · info@aboca.es', 'Líder en Grintuss — verificar capacitat de registre com a medicament.'),
  ('Reig Jofre',                                        'CDMO/registre propi', 'Sant Joan Despí, Barcelona · 93 480 67 10 · reigjofre.com · info@reigjofre.com', 'Capacitat pròpia de fabricació — clarificar llicència vs. subministrament.'),
  ('Diafarm',                                           'Distribuïdor multimarca','C/ Enric Granados 113, Barcelona · 93 309 11 70 · diafarm.es · info@diafarm.es', 'Via de distribució àgil, sense conflicte de porfolio.'),
  ('Q Pharma',                                          'Especialista urologia','C/ Moratín 15, Alicante · 965 984 446 · qpharma.es · info@q-pharma.net', 'Ja ha mostrat interès en la opció 5mg de Tadalafil ODF.'),
  ('Casen Recordati',                                   'Franquícia urologia', 'Pozuelo de Alarcón, Madrid · 91 351 88 00 · casenrecordati.com · info@casenrecordati.com', 'Decisió pot escalar a grup Recordati (Itàlia).'),
  ('Kern Pharma',                                       'Genèric diferenciació','Terrassa, Barcelona · 93 700 25 25 · kernpharma.com · info@kernpharma.com', 'Alta demanda de propostes — necessita business case clar.'),
  ('Normon',                                            'Genèric de volum',    'Tres Cantos, Madrid · 91 807 26 00 · normon.es · normon@normon.es', 'ADN de volum — plantejar com a categoria nova, no EFG més.'),
  ('Neuraxpharm / Qualigen',                            'Disfunció erèctil',   'Alcobendas, Madrid · 91 484 96 00 · neuraxpharm.com · info@neuraxpharm.com', 'Contactar via unitat Qualigen, no Neuraxpharm corporatiu.'),
  ('Grupo Ferrer',                                      'Laboratori familiar', 'Esplugues de Llobregat, Barcelona · 93 600 37 00 · ferrergroup.com · info@ferrer.com', 'Sense franquícia d''urologia consolidada — validar apetit en primer contacte.'),
  ('Teva España',                                       'Multinacional genèrics','Barcelona · 93 291 50 00 · tevafarmaceutica.es · info@teva.es', 'Plantejar oportunitat multi-territori (patent EU via PCT).'),
  ('Sandoz España',                                     'Multinacional genèrics','Boadilla del Monte, Madrid · 91 522 27 00 · sandoz.es · info@sandoz.es', 'Mateix raonament multi-territori que Teva.'),
  ('Laboratorios Alter',                                'Bucodispersable propi','Madrid · 91 343 72 20 · alter.es · alter@alter.es', 'Ja té comprimit bucodispersable — el més defensiu, guardar per 2a ona.'),
  ('Towa Pharmaceutical España',                        'Filial japonesa',     'Madrid · 91 745 19 00 · towa.es · towa@towa.es', 'Marge de maniobra a determinar davant matriu japonesa.'),
  ('GP Pharm',                                          'Laboratori mitjà',    'Barcelona · 93 218 76 49 · gppharma.es · info@gppharma.es', 'Estructura àgil, volum de llançament modest.'),
  ('Tarbis Farma',                                      'Laboratori mitjà',    'Sant Just Desvern, Barcelona · 93 318 18 95 · tarbis.es · info@tarbis.es', 'Via secundària d''agilitat.')
) AS v(nom, sector, contacte, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM bruixola_organitzacions o
  WHERE o.user_id = (SELECT p.id FROM profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'lvila@prospectia.es') AND o.nom = v.nom
);

-- ─── 3. Oportunitats — ArniPatch ─────────────────────────────────────────────

INSERT INTO bruixola_oportunitats (user_id, empresa_id, organitzacio_id, nom, estat, ona, proxima_accio, notes)
SELECT
  (SELECT p.id FROM profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'lvila@prospectia.es'),
  (SELECT id FROM bruixola_empreses WHERE nom = 'Wooshin' LIMIT 1),
  (SELECT id FROM bruixola_organitzacions WHERE nom = v.org LIMIT 1),
  'ArniPatch — ' || v.org, v.estat, v.ona, v.proxima_accio, v.notes
FROM (VALUES
  ('Laboratorios Viñas',            'qualificat', '0',  'Cerrar la conversación en curso; explorar exclusiva de cartera Wooshin (ArniPatch + Ivy Leaf ODF)', 'Ja tenen àrnica pròpia (Radio Salil) — plantejar com a extensió de formato, no substitució.'),
  ('HARTMANN España',               'nou',        '1A', 'Dosier + ángulo lesiones deportivas y recuperación', 'Sense àrnica pròpia — entrada neta.'),
  ('Angelini Pharma España',        'nou',        '1A', 'Paralelismo directo: "el ThermaCare de la árnica"', 'Necessitarà business case sòlid — categoria allunyada del seu nucli calor/fred.'),
  ('Laboratorios ERN',              'nou',        '1B', 'Aproximación directa, sin relación previa que aprovechar', 'Menor presencia en recuperación deportiva a verificar.'),
  ('Grupo Juste',                   'nou',        '1B', 'Aproximación directa', 'Menor focus històric en recuperació esportiva.'),
  ('Italfarmaco España',            'nou',        '1B', 'Aproximación directa a la filial española', 'Decisió final pot requerir validació a Itàlia.'),
  ('Cantabria Labs / Insud Pharma', 'nou',        '1B', 'Aproximación directa, ángulo de diversificación de categoría', 'Nucli dermocosmètica més que recuperació muscular.'),
  ('Uriach / Aquilea',              'nou',        '2',  'Ángulo de complementariedad: gel para el gesto, parche para las 12h', 'Ja tenen Fisiocrem — plantejar com a extensió, no substitució.'),
  ('FAES FARMA',                    'nou',        '2',  'Mensaje de extensión de gama, nunca de sustitución', 'El més sensible de la llista — lideratge de categoria en àrnica.'),
  ('Heel España',                   'nou',        '2',  'Ángulo de extensión de gama Traumeel', 'Vàlid per ArniPatch tot i excloure''s per Ivy Leaf ODF (conflictes diferents).'),
  ('Arkopharma España',             'nou',        '2',  'Ángulo de extensión de gama natural', 'Ja tenen Arkoflex — mateix enfoc d''extensió.'),
  ('Cinfa',                         'nou',        '3',  'Dosier + cifras de categoría', 'Alt volum de propostes rebudes — necessita business case concret.'),
  ('Menarini España',               'nou',        '3',  'Aproximación vía unidad Consumer Healthcare', 'Categoria de prioritat relativa menor.'),
  ('MARNYS',                        'nou',        '3',  'Aproximación oportunista si Ola 1-2 no avanzan', 'Menor múscul de farmàcia tradicional.')
) AS v(org, estat, ona, proxima_accio, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM bruixola_oportunitats op
  JOIN bruixola_organitzacions oo ON oo.id = op.organitzacio_id
  WHERE oo.nom = v.org AND op.nom = 'ArniPatch — ' || v.org
);

-- ─── 4. Oportunitats — Ivy Leaf ODF (Heel España EXCLÒS, no es crea) ────────

INSERT INTO bruixola_oportunitats (user_id, empresa_id, organitzacio_id, nom, estat, ona, proxima_accio, notes)
SELECT
  (SELECT p.id FROM profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'lvila@prospectia.es'),
  (SELECT id FROM bruixola_empreses WHERE nom = 'Wooshin' LIMIT 1),
  (SELECT id FROM bruixola_organitzacions WHERE nom = v.org LIMIT 1),
  'Ivy Leaf ODF — ' || v.org, v.estat, v.ona, v.proxima_accio, v.notes
FROM (VALUES
  ('Ferrer Internacional / Vemedia Pharma Hispania', 'nou', '0',  'Confirmar en CIMA si el representante local vigente es Ferrer o Vemedia antes de preparar el acercamiento', 'Pas previ obligatori a tota la llista — titular de Prospantus/Prospan.'),
  ('Zambon España',                 'nou', '1A', 'Dosier + reunión con la unidad de respiratorio/pediatría', 'Fluimucil — cartera ja àmplia en respiratori.'),
  ('Aboca España',                  'nou', '1A', 'Ángulo de innovación de formato dentro de su categoría natural', 'Verificar apetit per registre com a medicament (avui complement/dispositiu).'),
  ('Reig Jofre',                    'nou', '1A', 'Plantear tanto licencia/marca como opción de fabricación bajo acuerdo técnico', 'Pot preferir fabricar ells mateixos — clarificar model de col·laboració.'),
  ('Laboratorios Viñas',            'qualificat', '1B', 'Extensión directa de la conversación ya abierta por ArniPatch', 'Valorar si assumir dos productes Wooshin satura la seva capacitat de focus.'),
  ('Laboratorios ERN',              'nou', '1B', 'Aproximación directa, sin relación previa que aprovechar', 'Perfil gairebé idèntic a Viñas.'),
  ('Grupo Juste',                   'nou', '1B', 'Aproximación directa', 'Menor focus històric en pediatria/respiratori.'),
  ('Italfarmaco España',            'nou', '1B', 'Aproximación directa a la filial española', 'Filial de grup italià — validació final a Itàlia.'),
  ('Cantabria Labs / Insud Pharma', 'nou', '1B', 'Aproximación directa, ángulo de diversificación de categoría', 'Nucli dermatologia més que respiratori.'),
  ('Cinfa',                         'nou', '2',  'Dosier + cifras de categoría tos infantil en farmacia', 'Gamma pediàtrica àmplia (Cinfa Kids).'),
  ('Uriach / Aquilea',              'nou', '2',  'Aprovechar la relación ya abierta por ArniPatch/Fisiocrem', 'Aquilea centrada avui en son/digestiu — extensió a validar internament.'),
  ('Diafarm',                       'nou', '3',  'Propuesta de distribución llave en mano', 'Menor múscul mèdico-científic — l''argumentació la aportem nosaltres.')
) AS v(org, estat, ona, proxima_accio, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM bruixola_oportunitats op
  JOIN bruixola_organitzacions oo ON oo.id = op.organitzacio_id
  WHERE oo.nom = v.org AND op.nom = 'Ivy Leaf ODF — ' || v.org
);

-- ─── 5. Oportunitats — Tadalafil ODF ─────────────────────────────────────────

INSERT INTO bruixola_oportunitats (user_id, empresa_id, organitzacio_id, nom, estat, ona, proxima_accio, notes)
SELECT
  (SELECT p.id FROM profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'lvila@prospectia.es'),
  (SELECT id FROM bruixola_empreses WHERE nom = 'Wooshin' LIMIT 1),
  (SELECT id FROM bruixola_organitzacions WHERE nom = v.org LIMIT 1),
  'Tadalafil ODF — ' || v.org, v.estat, v.ona, v.proxima_accio, v.notes
FROM (VALUES
  ('Q Pharma',              'qualificat', '0',  'Retomar contacto ya iniciado; proponer reunión de cierre y ampliar alcance a 10/20 mg', 'Encaix gairebé perfecte — urologia masculina, especialització en HBP.'),
  ('Casen Recordati',       'nou', '1A', 'Dosier + reunión con equipo médico de urología', 'Decisió pot escalar a nivell de grup (Recordati, Itàlia).'),
  ('Kern Pharma',           'nou', '1A', 'Dosier + cifras de mercado (tamaño categoría, evolución bucodispersable)', 'Alta demanda de propostes — cal business case molt clar.'),
  ('Normon',                'nou', '1A', 'Ángulo margen: escapar de la guerra de precios del comprimido', 'Major jugador per volum — preparar com a "categoria nova".'),
  ('Neuraxpharm / Qualigen','nou', '1A', 'Contacto vía unidad Qualigen, no Neuraxpharm corporativo', 'Ja tenen gamma de disfunció erèctil (tadalafilo + sildenafilo).'),
  ('Grupo Ferrer',          'nou', '1B', 'Aproximación directa, ángulo de diversificación de porfolio', 'Sense franquícia d''urologia consolidada avui.'),
  ('Italfarmaco España',    'nou', '1B', 'Aproximación directa a la filial española', 'Agilitat de decisió superior a una multinacional pura.'),
  ('Grupo Juste',           'nou', '1B', 'Aproximación directa', 'Menor focus històric en salut masculina/urologia.'),
  ('Teva España',           'nou', '2',  'Plantear oportunidad multi-territorio desde el inicio', 'Patent concedida via PCT a tota la UE — rollout multi-país.'),
  ('Sandoz España',         'nou', '2',  'Plantear oportunidad multi-territorio desde el inicio', 'Mateix raonament que Teva.'),
  ('Laboratorios Alter',    'nou', '3',  'Guardar para segunda ola; enfoque de evolución de su propia gama', 'Ja té comprimit bucodispersable — el més defensiu de la llista.'),
  ('Towa Pharmaceutical España', 'nou', '3', 'Explorar apetito de la filial española primero', 'Grup japonès — cultura de qualitat galènica.'),
  ('GP Pharm',              'nou', '3',  'Aproximación oportunista si Ola 1 no avanza', 'Estructura àgil, volum de llançament més modest.'),
  ('Tarbis Farma',          'nou', '3',  'Aproximación oportunista si Ola 1 no avanza', 'Via secundària de menor escala però major agilitat.')
) AS v(org, estat, ona, proxima_accio, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM bruixola_oportunitats op
  JOIN bruixola_organitzacions oo ON oo.id = op.organitzacio_id
  WHERE oo.nom = v.org AND op.nom = 'Tadalafil ODF — ' || v.org
);
