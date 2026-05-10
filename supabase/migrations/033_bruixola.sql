-- ============================================================
-- BRÚIXOLA ESTRATÈGICA — Sistema de govern empresarial
-- Migració 033
-- ============================================================

-- 1. Empreses / Marques del grup
CREATE TABLE IF NOT EXISTS bruixola_empreses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nom         TEXT NOT NULL,
  tipus       TEXT,
  sector      TEXT,
  descripcio  TEXT,
  activa      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. Actors / Persones / Rols
CREATE TABLE IF NOT EXISTS bruixola_actors (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id          UUID REFERENCES bruixola_empreses(id) ON DELETE SET NULL,
  nom                 TEXT NOT NULL,
  rol_formal          TEXT,
  rol_real            TEXT,
  area                TEXT,
  responsabilitats    TEXT[],
  poder_decisio       SMALLINT CHECK (poder_decisio BETWEEN 1 AND 5),
  capacitat_execucio  SMALLINT CHECK (capacitat_execucio BETWEEN 1 AND 5),
  carrega_actual      SMALLINT CHECK (carrega_actual BETWEEN 1 AND 5),
  extern              BOOLEAN DEFAULT false,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- 3. Productes / Serveis
CREATE TABLE IF NOT EXISTS bruixola_productes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id      UUID REFERENCES bruixola_empreses(id) ON DELETE SET NULL,
  responsable_id  UUID REFERENCES bruixola_actors(id) ON DELETE SET NULL,
  nom             TEXT NOT NULL,
  tipus           TEXT CHECK (tipus IN ('producte','servei','subscripcio','event','formacio','plataforma','altre')),
  descripcio      TEXT,
  estat           TEXT DEFAULT 'actiu' CHECK (estat IN ('actiu','congelat','experimental','discontinuat')),
  recurrent       BOOLEAN DEFAULT false,
  caixa_actual    NUMERIC,
  caixa_esperada  NUMERIC,
  esforc          SMALLINT CHECK (esforc BETWEEN 1 AND 5),
  potencial       SMALLINT CHECK (potencial BETWEEN 1 AND 5),
  risc            SMALLINT CHECK (risc BETWEEN 1 AND 5),
  seguent_accio   TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 4. Projectes Estratègics
CREATE TABLE IF NOT EXISTS bruixola_projectes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id            UUID REFERENCES bruixola_empreses(id) ON DELETE SET NULL,
  producte_id           UUID REFERENCES bruixola_productes(id) ON DELETE SET NULL,
  responsable_id        UUID REFERENCES bruixola_actors(id) ON DELETE SET NULL,
  nom                   TEXT NOT NULL,
  descripcio            TEXT,
  tipus                 TEXT DEFAULT 'estratègic',
  estat                 TEXT DEFAULT 'actiu' CHECK (estat IN ('actiu','congelat','completat','cancelat','pendent')),
  prioritat             SMALLINT CHECK (prioritat BETWEEN 1 AND 5),
  impacte               SMALLINT CHECK (impacte BETWEEN 1 AND 5),
  urgencia              SMALLINT CHECK (urgencia BETWEEN 1 AND 5),
  esforc                SMALLINT CHECK (esforc BETWEEN 1 AND 5),
  alineacio_estrategica SMALLINT CHECK (alineacio_estrategica BETWEEN 1 AND 5),
  data_inici            DATE,
  data_objectiu         DATE,
  progress              SMALLINT DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  seguent_accio         TEXT,
  decisio_pendent       TEXT,
  caixa_actual          NUMERIC,
  caixa_esperada        NUMERIC,
  risc_text             TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- 5. Objectius (Anuals / Trimestrals / Mensuals)
CREATE TABLE IF NOT EXISTS bruixola_objectius (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id            UUID REFERENCES bruixola_empreses(id) ON DELETE SET NULL,
  projecte_id           UUID REFERENCES bruixola_projectes(id) ON DELETE SET NULL,
  responsable_id        UUID REFERENCES bruixola_actors(id) ON DELETE SET NULL,
  titol                 TEXT NOT NULL,
  descripcio            TEXT,
  tipus                 TEXT DEFAULT 'trimestral' CHECK (tipus IN ('anual','trimestral','mensual')),
  "any"                 INT,
  trimestre             SMALLINT CHECK (trimestre BETWEEN 1 AND 4),
  mes                   SMALLINT CHECK (mes BETWEEN 1 AND 12),
  estat                 TEXT DEFAULT 'actiu' CHECK (estat IN ('actiu','assolit','bloquejat','desviat','cancelat','pendent')),
  prioritat             SMALLINT CHECK (prioritat BETWEEN 1 AND 5),
  impacte               SMALLINT CHECK (impacte BETWEEN 1 AND 5),
  urgencia              SMALLINT CHECK (urgencia BETWEEN 1 AND 5),
  esforc                SMALLINT CHECK (esforc BETWEEN 1 AND 5),
  alineacio_estrategica SMALLINT CHECK (alineacio_estrategica BETWEEN 1 AND 5),
  data_inici            DATE,
  data_objectiu         DATE,
  progress              SMALLINT DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  metrica               TEXT,
  valor_objectiu        NUMERIC,
  valor_actual          NUMERIC,
  desviacio             NUMERIC,
  risc_text             TEXT,
  seguent_accio         TEXT,
  decisio_pendent       TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- 6. KPIs
CREATE TABLE IF NOT EXISTS bruixola_kpis (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id      UUID REFERENCES bruixola_empreses(id) ON DELETE SET NULL,
  objectiu_id     UUID REFERENCES bruixola_objectius(id) ON DELETE SET NULL,
  responsable_id  UUID REFERENCES bruixola_actors(id) ON DELETE SET NULL,
  nom             TEXT NOT NULL,
  categoria       TEXT,
  valor_actual    NUMERIC,
  valor_objectiu  NUMERIC,
  unitat          TEXT,
  tendencia       TEXT CHECK (tendencia IN ('pujant','estable','baixant')),
  impacte         SMALLINT CHECK (impacte BETWEEN 1 AND 5),
  frequencia      TEXT DEFAULT 'mensual' CHECK (frequencia IN ('diari','setmanal','mensual','trimestral')),
  actiu           BOOLEAN DEFAULT true,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 7. Historial KPI
CREATE TABLE IF NOT EXISTS bruixola_kpis_historial (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id     UUID NOT NULL REFERENCES bruixola_kpis(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  valor      NUMERIC NOT NULL,
  data       DATE NOT NULL DEFAULT CURRENT_DATE,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Bloquejos
CREATE TABLE IF NOT EXISTS bruixola_bloquejos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  projecte_id       UUID REFERENCES bruixola_projectes(id) ON DELETE SET NULL,
  objectiu_id       UUID REFERENCES bruixola_objectius(id) ON DELETE SET NULL,
  actor_id          UUID REFERENCES bruixola_actors(id) ON DELETE SET NULL,
  titol             TEXT NOT NULL,
  descripcio        TEXT,
  tipus             TEXT CHECK (tipus IN ('decisio','recurs','persona','tecnic','extern','indefinit')),
  severitat         SMALLINT DEFAULT 3 CHECK (severitat BETWEEN 1 AND 5),
  resolt            BOOLEAN DEFAULT false,
  accio_necessaria  TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- 9. Anamnesi Estratègica IA (conversa adaptativa)
CREATE TABLE IF NOT EXISTS bruixola_anamnesi (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fase        SMALLINT NOT NULL CHECK (fase BETWEEN 1 AND 5),
  pregunta    TEXT NOT NULL,
  resposta    TEXT,
  completada  BOOLEAN DEFAULT false,
  ordre       INT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 10. Diagnòstic IA
CREATE TABLE IF NOT EXISTS bruixola_diagnostic (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_diagnostic     DATE DEFAULT CURRENT_DATE,
  estat_global        TEXT,
  resum_executiu      TEXT,
  forces              TEXT[],
  riscos              TEXT[],
  oportunitats        TEXT[],
  problemes           TEXT[],
  dispersio_detectada BOOLEAN DEFAULT false,
  focus_recomanat     TEXT,
  projectes_congelar  TEXT[],
  projectes_potenciar TEXT[],
  decisions_pendents  TEXT[],
  seguents_accions    TEXT[],
  recomanacio         TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- 11. Focus Actual
CREATE TABLE IF NOT EXISTS bruixola_focus (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  declaracio   TEXT NOT NULL,
  periode      TEXT,
  prioritats   TEXT[],
  notes        TEXT,
  actiu        BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE bruixola_empreses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE bruixola_actors         ENABLE ROW LEVEL SECURITY;
ALTER TABLE bruixola_productes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE bruixola_projectes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE bruixola_objectius      ENABLE ROW LEVEL SECURITY;
ALTER TABLE bruixola_kpis           ENABLE ROW LEVEL SECURITY;
ALTER TABLE bruixola_kpis_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE bruixola_bloquejos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE bruixola_anamnesi       ENABLE ROW LEVEL SECURITY;
ALTER TABLE bruixola_diagnostic     ENABLE ROW LEVEL SECURITY;
ALTER TABLE bruixola_focus          ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner" ON bruixola_empreses       FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner" ON bruixola_actors         FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner" ON bruixola_productes      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner" ON bruixola_projectes      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner" ON bruixola_objectius      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner" ON bruixola_kpis           FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner" ON bruixola_kpis_historial FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner" ON bruixola_bloquejos      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner" ON bruixola_anamnesi       FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner" ON bruixola_diagnostic     FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner" ON bruixola_focus          FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
