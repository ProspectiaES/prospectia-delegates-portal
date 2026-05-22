-- División Internacional: flag a holded_contacts
-- El sync de Holded NO sobreescriu aquesta columna (no és al toContactRow)

ALTER TABLE holded_contacts
  ADD COLUMN IF NOT EXISTS is_internacional BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_holded_contacts_internacional
  ON holded_contacts (is_internacional)
  WHERE is_internacional = true;
