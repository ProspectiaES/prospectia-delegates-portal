CREATE TABLE IF NOT EXISTS budget_cost_lines (
  id          SERIAL PRIMARY KEY,
  concept     TEXT        NOT NULL,
  category    TEXT        NOT NULL DEFAULT 'altres',   -- tecnologia | personal | marketing | logistica | altres
  amount      NUMERIC(12,2) NOT NULL,
  frequency   TEXT        NOT NULL DEFAULT 'mensual',  -- mensual | trimestral | anual
  starts_at   DATE,
  ends_at     DATE,
  status      TEXT        NOT NULL DEFAULT 'actiu',    -- actiu | planificat | pausat
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE budget_cost_lines ENABLE ROW LEVEL SECURITY;

-- Only OWNERs can access cost lines
CREATE POLICY "owner_all" ON budget_cost_lines
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'OWNER'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'OWNER'
    )
  );

-- Helper: auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS budget_cost_lines_updated_at ON budget_cost_lines;
CREATE TRIGGER budget_cost_lines_updated_at
  BEFORE UPDATE ON budget_cost_lines
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
