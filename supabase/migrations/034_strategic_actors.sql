-- ============================================================
-- INTEL·LIGÈNCIA D'ACTORS ESTRATÈGICS
-- Migració 034
-- Sistema d'intel·ligència empresarial sobre actors rellevants
-- ============================================================

-- 1. Actors Estratègics — taula principal
CREATE TABLE IF NOT EXISTS strategic_actors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- IDENTITAT
  nom                   TEXT NOT NULL,
  empresa               TEXT,
  carrec                TEXT,
  pais                  TEXT,
  idioma                TEXT,
  email                 TEXT,
  telefon               TEXT,
  canal_principal       TEXT,
  origen_contacte       TEXT,
  data_primer_contacte  DATE,
  data_ultim_contacte   DATE,
  font_informacio       TEXT,

  -- ROL EMPRESARIAL
  rol_tipus             TEXT[],           -- múltiples rols: soci, client, inversor...
  rol_formal            TEXT,
  rol_real              TEXT,
  poder_decisio         SMALLINT CHECK (poder_decisio BETWEEN 1 AND 5),
  capacitat_execucio    SMALLINT CHECK (capacitat_execucio BETWEEN 1 AND 5),
  capacitat_influencia  SMALLINT CHECK (capacitat_influencia BETWEEN 1 AND 5),
  acces_que_aporta      TEXT,
  mercat_que_pot_obrir  TEXT,

  -- RELLEVÀNCIA ESTRATÈGICA
  impacte_potencial     SMALLINT CHECK (impacte_potencial BETWEEN 1 AND 5),
  impacte_actual        SMALLINT CHECK (impacte_actual BETWEEN 1 AND 5),
  valor_estrategic      SMALLINT CHECK (valor_estrategic BETWEEN 1 AND 5),
  urgencia              SMALLINT CHECK (urgencia BETWEEN 1 AND 5),
  prioritat             SMALLINT CHECK (prioritat BETWEEN 1 AND 5),
  alineacio_objectius   SMALLINT CHECK (alineacio_objectius BETWEEN 1 AND 5),
  capacitat_caixa       SMALLINT CHECK (capacitat_caixa BETWEEN 1 AND 5),
  capacitat_portes      SMALLINT CHECK (capacitat_portes BETWEEN 1 AND 5),
  capacitat_bloqueig    SMALLINT CHECK (capacitat_bloqueig BETWEEN 1 AND 5),
  capacitat_accelerar   SMALLINT CHECK (capacitat_accelerar BETWEEN 1 AND 5),
  classificacio_relevancia TEXT,          -- critic, alt_valor, oportunitat_latent, operatiu, complementari, baixa_prioritat, risc_estrategic

  -- PERFIL CONDUCTUAL (no clínic — patrons observables)
  estil_comunicacio     TEXT,
  estil_decisio         TEXT,
  velocitat_resposta    TEXT,
  tolerancia_risc       TEXT,
  fiabilitat_percebuda  SMALLINT CHECK (fiabilitat_percebuda BETWEEN 1 AND 5),
  consistencia          SMALLINT CHECK (consistencia BETWEEN 1 AND 5),
  orientacio_resultat   SMALLINT CHECK (orientacio_resultat BETWEEN 1 AND 5),
  orientacio_relacio    SMALLINT CHECK (orientacio_relacio BETWEEN 1 AND 5),
  capacitat_negociacio  SMALLINT CHECK (capacitat_negociacio BETWEEN 1 AND 5),
  trets_conductuals     TEXT[],           -- ["racional","directe","controlador"...]
  notes_conductuals     TEXT,

  -- POTENCIALITAT
  classificacio_potencial TEXT,           -- molt_alt, alt, mitja, baix, incert, no_validat
  justificacio_potencial  TEXT,
  potencial_ia            TEXT,           -- text generat per IA

  -- RISC (0=desconegut, 1=baix, 2=mitjà, 3=alt, 4=crític)
  risc_comercial        SMALLINT DEFAULT 0 CHECK (risc_comercial BETWEEN 0 AND 4),
  risc_reputacional     SMALLINT DEFAULT 0 CHECK (risc_reputacional BETWEEN 0 AND 4),
  risc_legal            SMALLINT DEFAULT 0 CHECK (risc_legal BETWEEN 0 AND 4),
  risc_financer         SMALLINT DEFAULT 0 CHECK (risc_financer BETWEEN 0 AND 4),
  risc_dependencia      SMALLINT DEFAULT 0 CHECK (risc_dependencia BETWEEN 0 AND 4),
  risc_incompliment     SMALLINT DEFAULT 0 CHECK (risc_incompliment BETWEEN 0 AND 4),
  risc_bloqueig         SMALLINT DEFAULT 0 CHECK (risc_bloqueig BETWEEN 0 AND 4),
  risc_conflicte        SMALLINT DEFAULT 0 CHECK (risc_conflicte BETWEEN 0 AND 4),
  classificacio_risc    TEXT,             -- baix, mitja, alt, critic, desconegut
  notes_risc            TEXT,

  -- PDI — Persona d'Interès
  is_pdi                BOOLEAN DEFAULT false,
  motiu_pdi             TEXT,
  tipus_influencia_pdi  TEXT,
  pdi_notes             TEXT,

  -- IA
  estrategia_ia         TEXT,
  alertes_ia            JSONB,
  ai_analisi_complet    TEXT,
  ai_confianca          SMALLINT CHECK (ai_confianca BETWEEN 0 AND 5),
  ai_updated_at         TIMESTAMPTZ,

  -- GENERAL
  notes                 TEXT,
  notes_confidencials   TEXT,
  actiu                 BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- 2. Historial d'Interaccions
CREATE TABLE IF NOT EXISTS strategic_actor_interactions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id              UUID NOT NULL REFERENCES strategic_actors(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipus                 TEXT NOT NULL,   -- reunio, trucada, email, nota, promesa, compromis, bloqueig, seguiment
  titol                 TEXT NOT NULL,
  contingut             TEXT,
  data                  DATE DEFAULT CURRENT_DATE,
  resultat              TEXT,
  reaccio_observada     TEXT,
  seguiment_necessari   BOOLEAN DEFAULT false,
  data_seguiment        DATE,
  sensible              BOOLEAN DEFAULT false,
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- 3. Vincles i Dependències
CREATE TABLE IF NOT EXISTS strategic_actor_links (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id              UUID NOT NULL REFERENCES strategic_actors(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entitat_tipus         TEXT NOT NULL,   -- actor, projecte, objectiu, producte, mercat, institucio, client, proveidor
  entitat_id            UUID,
  entitat_nom           TEXT NOT NULL,
  tipus_vincle          TEXT,            -- fort, feble, incert, conflictiu, influencia, dependencia, confianca
  descripcio            TEXT,
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- 4. PDI — Exports controlats al Diari
CREATE TABLE IF NOT EXISTS strategic_pdi_exports (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id              UUID NOT NULL REFERENCES strategic_actors(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_export           TIMESTAMPTZ DEFAULT now(),
  contingut_exportat    JSONB,
  notes                 TEXT
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE strategic_actors             ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_actor_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_actor_links        ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_pdi_exports        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner" ON strategic_actors             FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner" ON strategic_actor_interactions FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner" ON strategic_actor_links        FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner" ON strategic_pdi_exports        FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
