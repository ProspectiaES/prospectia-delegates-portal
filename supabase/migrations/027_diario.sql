-- Diari d'Alt Rendiment — private diary for OWNER only
-- Full RLS: only the authenticated user can read/write their own entries

CREATE TABLE IF NOT EXISTS diario_entries (
  id                   UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha                DATE         NOT NULL,
  hora_inici           TIME,
  estat_anim           SMALLINT     CHECK (estat_anim       BETWEEN 1 AND 5),
  energia              SMALLINT     CHECK (energia          BETWEEN 1 AND 5),
  focus_mat            SMALLINT     CHECK (focus_mat        BETWEEN 1 AND 5),
  son_hores            NUMERIC(3,1),
  serenitat            SMALLINT     CHECK (serenitat        BETWEEN 1 AND 5),
  temps                VARCHAR(50),
  efemeride            TEXT,
  nota_dia             SMALLINT     CHECK (nota_dia         BETWEEN 1 AND 5),
  tasca_clau           TEXT,
  disciplina_compromis TEXT,
  espai_lliure         TEXT,
  reflexio_personal    TEXT,
  objectius_dia        JSONB        DEFAULT '[]'::jsonb,
  ritual_mat           JSONB        DEFAULT '{}'::jsonb,
  activitats           TEXT,
  examen_vespre        TEXT,
  tasca_completada     BOOLEAN,
  disciplina_complerta BOOLEAN,
  criteri_mantingut    BOOLEAN,
  resultat             TEXT,
  av_disciplina        SMALLINT     CHECK (av_disciplina    BETWEEN 1 AND 5),
  av_mentalitat        SMALLINT     CHECK (av_mentalitat    BETWEEN 1 AND 5),
  av_excelencia        SMALLINT     CHECK (av_excelencia    BETWEEN 1 AND 5),
  av_relacions         SMALLINT     CHECK (av_relacions     BETWEEN 1 AND 5),
  av_serenitat         SMALLINT     CHECK (av_serenitat     BETWEEN 1 AND 5),
  avui_menduc          TEXT,
  created_at           TIMESTAMPTZ  DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(user_id, fecha)
);

ALTER TABLE diario_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "private_diary" ON diario_entries
  FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER diario_updated_at
  BEFORE UPDATE ON diario_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
