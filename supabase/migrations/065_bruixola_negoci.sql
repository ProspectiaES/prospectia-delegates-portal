-- Bruixola Negoci — external organizations + sales/prospecting pipeline.
-- Additive only: two new tables, nothing existing is altered.

CREATE TABLE IF NOT EXISTS bruixola_organitzacions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id      UUID REFERENCES bruixola_empreses(id) ON DELETE SET NULL,
  nom             TEXT NOT NULL,
  tipus           TEXT NOT NULL DEFAULT 'prospecte'
                    CHECK (tipus IN ('prospecte','client','partner','proveidor','distribuidor','altre')),
  pais            TEXT,
  sector          TEXT,
  contacte        TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bruixola_oportunitats (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id            UUID REFERENCES bruixola_empreses(id) ON DELETE SET NULL,
  organitzacio_id       UUID NOT NULL REFERENCES bruixola_organitzacions(id) ON DELETE CASCADE,
  nom                   TEXT NOT NULL,
  estat                 TEXT NOT NULL DEFAULT 'nou'
                          CHECK (estat IN ('nou','contactat','qualificat','proposta','guanyat','perdut')),
  ona                   TEXT,                 -- e.g. "OLA 0", "1A", "1B", "2", "3"
  valor_potencial       NUMERIC,
  proxima_accio         TEXT,
  proxima_accio_data    DATE,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bruixola_organitzacions_user_id ON bruixola_organitzacions(user_id);
CREATE INDEX IF NOT EXISTS idx_bruixola_organitzacions_empresa ON bruixola_organitzacions(empresa_id) WHERE empresa_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bruixola_oportunitats_user_id   ON bruixola_oportunitats(user_id);
CREATE INDEX IF NOT EXISTS idx_bruixola_oportunitats_org       ON bruixola_oportunitats(organitzacio_id);
CREATE INDEX IF NOT EXISTS idx_bruixola_oportunitats_estat     ON bruixola_oportunitats(estat);
CREATE INDEX IF NOT EXISTS idx_bruixola_oportunitats_empresa   ON bruixola_oportunitats(empresa_id) WHERE empresa_id IS NOT NULL;

ALTER TABLE bruixola_organitzacions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bruixola_oportunitats   ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner" ON bruixola_organitzacions FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner" ON bruixola_oportunitats   FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Reuses the trigger function already created in migration 027 — not redefined here.
CREATE TRIGGER bruixola_organitzacions_updated_at BEFORE UPDATE ON bruixola_organitzacions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER bruixola_oportunitats_updated_at   BEFORE UPDATE ON bruixola_oportunitats   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON bruixola_organitzacions TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON bruixola_oportunitats   TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
