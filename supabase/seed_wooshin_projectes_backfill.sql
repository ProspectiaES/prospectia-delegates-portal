-- ============================================================================
-- Backfill: vincula els 40 oportunitats de Wooshin ja carregades (seed
-- anterior, 065) a la nova jerarquia Producte > Projecte (mercat).
-- Idempotent. Executar DESPRÉS de 066_bruixola_negoci_projectes.sql.
-- Owner explícit: lvila@prospectia.es (veure nota a seed_wooshin_prospeccio.sql
-- sobre els dos perfils OWNER en aquest projecte).
-- ============================================================================

-- ─── 1. Productes de Wooshin (crear si no existeixen) ───────────────────────

INSERT INTO bruixola_productes (user_id, empresa_id, nom, tipus, descripcio)
SELECT
  (SELECT p.id FROM profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'lvila@prospectia.es'),
  (SELECT id FROM bruixola_empreses WHERE nom = 'Wooshin' LIMIT 1),
  v.nom, 'producte', v.descripcio
FROM (VALUES
  ('Tadalafil ODF', 'Película orodispersable de tadalafilo — patent EP3111929'),
  ('ArniPatch',     'Parche hidrogel de árnica 12h — EU-GMP Eslovenia'),
  ('Ivy Leaf ODF',  'ODF de hiedra 16mg/8mg — sin etanol, sin azúcar')
) AS v(nom, descripcio)
WHERE NOT EXISTS (
  SELECT 1 FROM bruixola_productes pr
  WHERE pr.user_id = (SELECT p.id FROM profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'lvila@prospectia.es')
    AND pr.nom = v.nom
);

-- ─── 2. Projectes (Producte × España) ────────────────────────────────────────

INSERT INTO bruixola_negoci_projectes (user_id, producte_id, mercat, estat)
SELECT
  (SELECT p.id FROM profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = 'lvila@prospectia.es'),
  (SELECT id FROM bruixola_productes WHERE nom = v.producte AND empresa_id = (SELECT id FROM bruixola_empreses WHERE nom = 'Wooshin' LIMIT 1) LIMIT 1),
  'España', 'actiu'
FROM (VALUES ('Tadalafil ODF'), ('ArniPatch'), ('Ivy Leaf ODF')) AS v(producte)
WHERE NOT EXISTS (
  SELECT 1 FROM bruixola_negoci_projectes pj
  WHERE pj.producte_id = (SELECT id FROM bruixola_productes WHERE nom = v.producte AND empresa_id = (SELECT id FROM bruixola_empreses WHERE nom = 'Wooshin' LIMIT 1) LIMIT 1)
    AND pj.mercat = 'España'
);

-- ─── 3. Vincular les oportunitats existents al seu projecte ─────────────────

UPDATE bruixola_oportunitats op
SET projecte_id = (
  SELECT pj.id FROM bruixola_negoci_projectes pj
  JOIN bruixola_productes pr ON pr.id = pj.producte_id
  WHERE pr.nom = 'ArniPatch' AND pj.mercat = 'España'
)
WHERE op.nom LIKE 'ArniPatch — %' AND op.projecte_id IS NULL;

UPDATE bruixola_oportunitats op
SET projecte_id = (
  SELECT pj.id FROM bruixola_negoci_projectes pj
  JOIN bruixola_productes pr ON pr.id = pj.producte_id
  WHERE pr.nom = 'Ivy Leaf ODF' AND pj.mercat = 'España'
)
WHERE op.nom LIKE 'Ivy Leaf ODF — %' AND op.projecte_id IS NULL;

UPDATE bruixola_oportunitats op
SET projecte_id = (
  SELECT pj.id FROM bruixola_negoci_projectes pj
  JOIN bruixola_productes pr ON pr.id = pj.producte_id
  WHERE pr.nom = 'Tadalafil ODF' AND pj.mercat = 'España'
)
WHERE op.nom LIKE 'Tadalafil ODF — %' AND op.projecte_id IS NULL;
