-- Bruixola Negoci — CRM real: pipelines/etapes configurables, contactes reals,
-- historial de canvis, activitat/timeline i comentaris. Additiu (ALTER només
-- sobre taules pròpies creades avui: bruixola_oportunitats, bruixola_negoci_tasques).

-- ─── Pipelines + etapes configurables ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS bruixola_negoci_pipelines (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nom         TEXT NOT NULL,
  descripcio  TEXT,
  color       TEXT,
  actiu       BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bruixola_negoci_stages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pipeline_id   UUID NOT NULL REFERENCES bruixola_negoci_pipelines(id) ON DELETE CASCADE,
  nom           TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  probabilitat  SMALLINT CHECK (probabilitat BETWEEN 0 AND 100),
  color         TEXT,
  max_dies      SMALLINT,
  es_guanyat    BOOLEAN NOT NULL DEFAULT false,
  es_perdut     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ─── Contactes reals per organització ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bruixola_negoci_persones (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organitzacio_id  UUID NOT NULL REFERENCES bruixola_organitzacions(id) ON DELETE CASCADE,
  nom              TEXT NOT NULL,
  cognoms          TEXT,
  carrec           TEXT,
  email            TEXT,
  telefon          TEXT,
  mobil            TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- ─── Extensió d'oportunitats: pipeline/etapa reals + camps de deal ──────────

ALTER TABLE bruixola_oportunitats
  ADD COLUMN IF NOT EXISTS pipeline_id       UUID REFERENCES bruixola_negoci_pipelines(id),
  ADD COLUMN IF NOT EXISTS stage_id          UUID REFERENCES bruixola_negoci_stages(id),
  ADD COLUMN IF NOT EXISTS stage_entered_at  TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS probabilitat      SMALLINT CHECK (probabilitat BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS moneda            TEXT DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS lost_reason       TEXT,
  ADD COLUMN IF NOT EXISTS persona_id        UUID REFERENCES bruixola_negoci_persones(id);

-- ─── Historial de canvis d'etapa ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bruixola_negoci_stage_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  oportunitat_id UUID NOT NULL REFERENCES bruixola_oportunitats(id) ON DELETE CASCADE,
  from_stage_id  UUID REFERENCES bruixola_negoci_stages(id),
  to_stage_id    UUID REFERENCES bruixola_negoci_stages(id),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ─── Activitat genèrica (timeline) i comentaris ─────────────────────────────

CREATE TABLE IF NOT EXISTS bruixola_negoci_activitats (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id   UUID NOT NULL,
  action      TEXT NOT NULL,
  detail      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bruixola_negoci_comentaris (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id   UUID NOT NULL,
  contingut   TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ─── Extensió de tasques: tipus, hora, enllaç directe a una oportunitat ─────

ALTER TABLE bruixola_negoci_tasques
  ADD COLUMN IF NOT EXISTS tipus         TEXT DEFAULT 'tasca' CHECK (tipus IN ('trucada','reunio','email','tasca')),
  ADD COLUMN IF NOT EXISTS hora          TIME,
  ADD COLUMN IF NOT EXISTS oportunitat_id UUID REFERENCES bruixola_oportunitats(id) ON DELETE CASCADE;

-- ─── Índexs ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_bn_pipelines_user_id       ON bruixola_negoci_pipelines(user_id);
CREATE INDEX IF NOT EXISTS idx_bn_stages_user_id          ON bruixola_negoci_stages(user_id);
CREATE INDEX IF NOT EXISTS idx_bn_stages_pipeline         ON bruixola_negoci_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_bn_persones_user_id        ON bruixola_negoci_persones(user_id);
CREATE INDEX IF NOT EXISTS idx_bn_persones_organitzacio   ON bruixola_negoci_persones(organitzacio_id);
CREATE INDEX IF NOT EXISTS idx_bo_pipeline                ON bruixola_oportunitats(pipeline_id) WHERE pipeline_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bo_stage                   ON bruixola_oportunitats(stage_id) WHERE stage_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bn_stage_history_user_id   ON bruixola_negoci_stage_history(user_id);
CREATE INDEX IF NOT EXISTS idx_bn_stage_history_oport     ON bruixola_negoci_stage_history(oportunitat_id);
CREATE INDEX IF NOT EXISTS idx_bn_activitats_user_id      ON bruixola_negoci_activitats(user_id);
CREATE INDEX IF NOT EXISTS idx_bn_activitats_entity       ON bruixola_negoci_activitats(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_bn_comentaris_user_id      ON bruixola_negoci_comentaris(user_id);
CREATE INDEX IF NOT EXISTS idx_bn_comentaris_entity       ON bruixola_negoci_comentaris(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_bn_tasques_oportunitat     ON bruixola_negoci_tasques(oportunitat_id) WHERE oportunitat_id IS NOT NULL;

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE bruixola_negoci_pipelines      ENABLE ROW LEVEL SECURITY;
ALTER TABLE bruixola_negoci_stages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE bruixola_negoci_persones       ENABLE ROW LEVEL SECURITY;
ALTER TABLE bruixola_negoci_stage_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE bruixola_negoci_activitats     ENABLE ROW LEVEL SECURITY;
ALTER TABLE bruixola_negoci_comentaris     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner" ON bruixola_negoci_pipelines      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner" ON bruixola_negoci_stages         FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner" ON bruixola_negoci_persones       FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner" ON bruixola_negoci_stage_history  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner" ON bruixola_negoci_activitats     FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner" ON bruixola_negoci_comentaris     FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ─── Triggers updated_at ──────────────────────────────────────────────────────

CREATE TRIGGER bn_pipelines_updated_at BEFORE UPDATE ON bruixola_negoci_pipelines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER bn_stages_updated_at    BEFORE UPDATE ON bruixola_negoci_stages    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER bn_persones_updated_at  BEFORE UPDATE ON bruixola_negoci_persones  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── Grants ───────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON bruixola_negoci_pipelines     TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON bruixola_negoci_stages        TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON bruixola_negoci_persones      TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON bruixola_negoci_stage_history TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON bruixola_negoci_activitats    TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON bruixola_negoci_comentaris    TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
