-- Bruixola Negoci — jerarquia Proveïdor > Producte > Projecte (mercat) > Oportunitat.
-- Additiu: taula nova + columnes noves sobre bruixola_oportunitats, taula
-- pròpia creada avui (065) — no es toca cap taula pre-existent d'altres rols.

CREATE TABLE IF NOT EXISTS bruixola_negoci_projectes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  producte_id     UUID NOT NULL REFERENCES bruixola_productes(id) ON DELETE CASCADE,
  mercat          TEXT NOT NULL,               -- país/mercat, ex: "España", "Irán", "Kenia"
  nom             TEXT,                        -- nom opcional; per defecte es mostra "<Producte> — <Mercat>"
  estat           TEXT NOT NULL DEFAULT 'actiu'
                    CHECK (estat IN ('actiu','pausat','aturat','completat')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bruixola_negoci_tasques (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  projecte_id     UUID NOT NULL REFERENCES bruixola_negoci_projectes(id) ON DELETE CASCADE,
  titol           TEXT NOT NULL,
  descripcio      TEXT,
  data_limit      DATE,
  completada      BOOLEAN NOT NULL DEFAULT false,
  completada_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Vincular les oportunitats existents (organitzacio_id) també a un projecte
-- concret. Nullable per compatibilitat amb les 40 files ja carregades avui
-- (es completaran en un script de dades a part).
ALTER TABLE bruixola_oportunitats ADD COLUMN IF NOT EXISTS projecte_id UUID REFERENCES bruixola_negoci_projectes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bruixola_negoci_projectes_user_id   ON bruixola_negoci_projectes(user_id);
CREATE INDEX IF NOT EXISTS idx_bruixola_negoci_projectes_producte ON bruixola_negoci_projectes(producte_id);
CREATE INDEX IF NOT EXISTS idx_bruixola_negoci_tasques_user_id     ON bruixola_negoci_tasques(user_id);
CREATE INDEX IF NOT EXISTS idx_bruixola_negoci_tasques_projecte    ON bruixola_negoci_tasques(projecte_id);
CREATE INDEX IF NOT EXISTS idx_bruixola_negoci_tasques_data_limit  ON bruixola_negoci_tasques(data_limit) WHERE completada = false;
CREATE INDEX IF NOT EXISTS idx_bruixola_oportunitats_projecte      ON bruixola_oportunitats(projecte_id) WHERE projecte_id IS NOT NULL;

ALTER TABLE bruixola_negoci_projectes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bruixola_negoci_tasques   ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner" ON bruixola_negoci_projectes FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner" ON bruixola_negoci_tasques   FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER bruixola_negoci_projectes_updated_at BEFORE UPDATE ON bruixola_negoci_projectes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER bruixola_negoci_tasques_updated_at   BEFORE UPDATE ON bruixola_negoci_tasques   FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON bruixola_negoci_projectes TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON bruixola_negoci_tasques   TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
