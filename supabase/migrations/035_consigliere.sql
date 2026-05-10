-- ============================================================
-- ROL CONSIGLIERE — Assessor estratègic de l'OWNER
-- Migració 035
-- ============================================================

-- 1. owner_id a profiles: vincle CONSIGLIERE → OWNER
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES profiles(id);

-- 2. Traçabilitat de creador a objectius i projectes
ALTER TABLE bruixola_objectius ADD COLUMN IF NOT EXISTS created_by      UUID REFERENCES profiles(id);
ALTER TABLE bruixola_objectius ADD COLUMN IF NOT EXISTS created_by_nom  TEXT;
ALTER TABLE bruixola_projectes ADD COLUMN IF NOT EXISTS created_by      UUID REFERENCES profiles(id);
ALTER TABLE bruixola_projectes ADD COLUMN IF NOT EXISTS created_by_nom  TEXT;

-- 3. Funció helper per RLS: retorna l'ID de l'OWNER efectiu
--    - Si és OWNER: retorna el seu propi ID
--    - Si és CONSIGLIERE: retorna l'owner_id (l'OWNER al qual treballa)
--    - Qualsevol altre rol: retorna NULL (sense accés)
CREATE OR REPLACE FUNCTION get_bruixola_owner_id()
RETURNS UUID
LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT CASE
    WHEN role = 'OWNER'       THEN id
    WHEN role = 'CONSIGLIERE' THEN owner_id
    ELSE NULL
  END
  FROM profiles
  WHERE id = auth.uid()
$$;

-- 4. Actualitzar RLS de les taules on CONSIGLIERE té accés:
--    objectius, projectes, kpis, kpis_historial, bloquejos, focus, diagnostic
--    (anamnesi, empreses, actors, productes → mantenen "owner" policy original)

DROP POLICY IF EXISTS "owner" ON bruixola_objectius;
DROP POLICY IF EXISTS "owner" ON bruixola_projectes;
DROP POLICY IF EXISTS "owner" ON bruixola_kpis;
DROP POLICY IF EXISTS "owner" ON bruixola_kpis_historial;
DROP POLICY IF EXISTS "owner" ON bruixola_bloquejos;
DROP POLICY IF EXISTS "owner" ON bruixola_focus;
DROP POLICY IF EXISTS "owner" ON bruixola_diagnostic;

CREATE POLICY "bruixola_access" ON bruixola_objectius
  FOR ALL USING (user_id = get_bruixola_owner_id())
  WITH CHECK (user_id = get_bruixola_owner_id());

CREATE POLICY "bruixola_access" ON bruixola_projectes
  FOR ALL USING (user_id = get_bruixola_owner_id())
  WITH CHECK (user_id = get_bruixola_owner_id());

CREATE POLICY "bruixola_access" ON bruixola_kpis
  FOR ALL USING (user_id = get_bruixola_owner_id())
  WITH CHECK (user_id = get_bruixola_owner_id());

CREATE POLICY "bruixola_access" ON bruixola_kpis_historial
  FOR ALL USING (user_id = get_bruixola_owner_id())
  WITH CHECK (user_id = get_bruixola_owner_id());

CREATE POLICY "bruixola_access" ON bruixola_bloquejos
  FOR ALL USING (user_id = get_bruixola_owner_id())
  WITH CHECK (user_id = get_bruixola_owner_id());

CREATE POLICY "bruixola_access" ON bruixola_focus
  FOR ALL USING (user_id = get_bruixola_owner_id())
  WITH CHECK (user_id = get_bruixola_owner_id());

CREATE POLICY "bruixola_access" ON bruixola_diagnostic
  FOR ALL USING (user_id = get_bruixola_owner_id())
  WITH CHECK (user_id = get_bruixola_owner_id());
