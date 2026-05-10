-- Ecosistema Humà v2: sistema d'intel·ligència relacional i perfilatge humà

-- 1. Expand categoria constraint to include familia
ALTER TABLE ecosistema_persones
  DROP CONSTRAINT IF EXISTS ecosistema_persones_categoria_check;

ALTER TABLE ecosistema_persones
  ADD CONSTRAINT ecosistema_persones_categoria_check
    CHECK (categoria IN ('nucli','estrategic','expansio','drenant','familia'));

-- 2. Família subcategory & structured role
ALTER TABLE ecosistema_persones
  ADD COLUMN IF NOT EXISTS subcategoria_familiar  TEXT,
  ADD COLUMN IF NOT EXISTS rol_vital_codi         TEXT;

-- 3. Behavioral profiling
ALTER TABLE ecosistema_persones
  ADD COLUMN IF NOT EXISTS perfil_conductual       TEXT[]    DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS intensitat_perfil       JSONB     DEFAULT '{}';

-- 4. Risk & stability KPIs (0–10)
ALTER TABLE ecosistema_persones
  ADD COLUMN IF NOT EXISTS risc_emocional          SMALLINT  CHECK (risc_emocional BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS risc_professional       SMALLINT  CHECK (risc_professional BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS estabilitat_kpi         SMALLINT  CHECK (estabilitat_kpi BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS fiabilitat_kpi          SMALLINT  CHECK (fiabilitat_kpi BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS coherencia_kpi          SMALLINT  CHECK (coherencia_kpi BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS reciprocitat            SMALLINT  CHECK (reciprocitat BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS potencial_conflicte     SMALLINT  CHECK (potencial_conflicte BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS desgast_energetic       SMALLINT  CHECK (desgast_energetic BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS influencia_focus        SMALLINT  CHECK (influencia_focus BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS influencia_mental       SMALLINT  CHECK (influencia_mental BETWEEN 0 AND 10);

-- 5. AI intelligence outputs
ALTER TABLE ecosistema_persones
  ADD COLUMN IF NOT EXISTS estrategia_ia           TEXT,
  ADD COLUMN IF NOT EXISTS alertes_ia              JSONB     DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS impacte_ia              TEXT,
  ADD COLUMN IF NOT EXISTS ai_updated_at           TIMESTAMPTZ;
