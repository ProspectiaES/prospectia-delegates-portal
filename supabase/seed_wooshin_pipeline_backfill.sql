-- ============================================================================
-- Backfill: crea el "Pipeline general" amb les 6 etapes equivalents a l'antic
-- `estat` fix, i hi vincula les 40 oportunitats ja carregades (065/066).
-- Idempotent. Executar DESPRÉS de 067_bruixola_negoci_crm.sql.
-- Owner explícit: lvila@prospectia.es.
-- ============================================================================

-- ─── 1. Pipeline per defecte ─────────────────────────────────────────────────

INSERT INTO bruixola_negoci_pipelines (user_id, nom, descripcio, sort_order)
SELECT
  (SELECT p.id FROM profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'lvila@prospectia.es'),
  'Pipeline general', 'Pipeline per defecte — creat en migrar del sistema d''estat fix', 0
WHERE NOT EXISTS (
  SELECT 1 FROM bruixola_negoci_pipelines
  WHERE user_id = (SELECT p.id FROM profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'lvila@prospectia.es')
    AND nom = 'Pipeline general'
);

-- ─── 2. Etapes equivalents als antics valors d'estat ─────────────────────────

INSERT INTO bruixola_negoci_stages (user_id, pipeline_id, nom, sort_order, probabilitat, es_guanyat, es_perdut)
SELECT
  (SELECT p.id FROM profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'lvila@prospectia.es'),
  (SELECT id FROM bruixola_negoci_pipelines WHERE nom = 'Pipeline general' AND user_id = (SELECT p.id FROM profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'lvila@prospectia.es') LIMIT 1),
  v.nom, v.sort_order, v.probabilitat, v.es_guanyat, v.es_perdut
FROM (VALUES
  ('Nou',        0, 10,  false, false),
  ('Contactat',  1, 25,  false, false),
  ('Qualificat', 2, 50,  false, false),
  ('Proposta',   3, 75,  false, false),
  ('Guanyat',    4, 100, true,  false),
  ('Perdut',     5, 0,   false, true)
) AS v(nom, sort_order, probabilitat, es_guanyat, es_perdut)
WHERE NOT EXISTS (
  SELECT 1 FROM bruixola_negoci_stages s
  WHERE s.pipeline_id = (SELECT id FROM bruixola_negoci_pipelines WHERE nom = 'Pipeline general' AND user_id = (SELECT p.id FROM profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'lvila@prospectia.es') LIMIT 1)
    AND s.nom = v.nom
);

-- ─── 3. Vincular les 40 oportunitats existents al pipeline/etapa segons `estat` ─

UPDATE bruixola_oportunitats op
SET
  pipeline_id = (SELECT id FROM bruixola_negoci_pipelines WHERE nom = 'Pipeline general' AND user_id = op.user_id LIMIT 1),
  stage_id = (
    SELECT s.id FROM bruixola_negoci_stages s
    JOIN bruixola_negoci_pipelines pl ON pl.id = s.pipeline_id
    WHERE pl.nom = 'Pipeline general' AND pl.user_id = op.user_id
      AND s.nom = CASE op.estat
        WHEN 'nou'        THEN 'Nou'
        WHEN 'contactat'  THEN 'Contactat'
        WHEN 'qualificat' THEN 'Qualificat'
        WHEN 'proposta'   THEN 'Proposta'
        WHEN 'guanyat'    THEN 'Guanyat'
        WHEN 'perdut'     THEN 'Perdut'
      END
  ),
  probabilitat = (
    SELECT s.probabilitat FROM bruixola_negoci_stages s
    JOIN bruixola_negoci_pipelines pl ON pl.id = s.pipeline_id
    WHERE pl.nom = 'Pipeline general' AND pl.user_id = op.user_id
      AND s.nom = CASE op.estat
        WHEN 'nou'        THEN 'Nou'
        WHEN 'contactat'  THEN 'Contactat'
        WHEN 'qualificat' THEN 'Qualificat'
        WHEN 'proposta'   THEN 'Proposta'
        WHEN 'guanyat'    THEN 'Guanyat'
        WHEN 'perdut'     THEN 'Perdut'
      END
  )
WHERE op.pipeline_id IS NULL;
