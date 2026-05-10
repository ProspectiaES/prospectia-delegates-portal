-- Rich diagnostic schema: replace flat columns with a JSONB full_data column
-- while keeping backwards-compatible flat columns for simple queries.
ALTER TABLE bruixola_diagnostic
  ADD COLUMN IF NOT EXISTS full_data JSONB,
  ADD COLUMN IF NOT EXISTS versio INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS revisada BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes_revisio TEXT;
