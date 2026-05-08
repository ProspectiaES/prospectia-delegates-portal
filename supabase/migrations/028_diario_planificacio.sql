-- Planning sections (one row per year per type)
CREATE TABLE IF NOT EXISTS diario_planificacio (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year_num   SMALLINT    NOT NULL,
  tipus      VARCHAR(50) NOT NULL,
  contingut  JSONB       NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year_num, tipus)
);
ALTER TABLE diario_planificacio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "private_planificacio" ON diario_planificacio
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER planificacio_updated_at
  BEFORE UPDATE ON diario_planificacio
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Weekly reviews
CREATE TABLE IF NOT EXISTS diario_setmana (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year_num      SMALLINT    NOT NULL,
  setmana       SMALLINT    NOT NULL CHECK (setmana BETWEEN 1 AND 53),
  frase_set     TEXT,
  input_miro    TEXT,
  input_llegeixo TEXT,
  input_escolto TEXT,
  millora_pare  TEXT,
  millora_marit TEXT,
  millora_personal TEXT,
  millora_caracter TEXT,
  millora_feina TEXT,
  habits_inclou TEXT,
  habits_exclou TEXT,
  seguiment     JSONB       DEFAULT '{}'::jsonb,
  resultat      TEXT,
  nota          SMALLINT    CHECK (nota BETWEEN 1 AND 5),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year_num, setmana)
);
ALTER TABLE diario_setmana ENABLE ROW LEVEL SECURITY;
CREATE POLICY "private_setmana" ON diario_setmana
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER setmana_updated_at
  BEFORE UPDATE ON diario_setmana
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Running fields in daily entries
ALTER TABLE diario_entries ADD COLUMN IF NOT EXISTS running_km   NUMERIC(5,2);
ALTER TABLE diario_entries ADD COLUMN IF NOT EXISTS running_min  INTEGER;
ALTER TABLE diario_entries ADD COLUMN IF NOT EXISTS running_notes TEXT;
