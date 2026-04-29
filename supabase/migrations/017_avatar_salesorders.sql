-- Avatar URL on user profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Sales orders mirrored from Holded.
-- status: 0=draft 1=pending 2=approved 3=fully-invoiced (hidden from open orders list)
CREATE TABLE IF NOT EXISTS holded_salesorders (
  id              TEXT PRIMARY KEY,
  doc_number      TEXT,
  contact_id      TEXT REFERENCES holded_contacts(id) ON DELETE SET NULL,
  contact_name    TEXT,
  date            TIMESTAMPTZ,
  due_date        TIMESTAMPTZ,
  total           NUMERIC(14,2) NOT NULL DEFAULT 0,
  status          SMALLINT NOT NULL DEFAULT 0,
  description     TEXT,
  raw             JSONB NOT NULL DEFAULT '{}',
  first_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_holded_salesorders_contact_id ON holded_salesorders (contact_id);
CREATE INDEX IF NOT EXISTS idx_holded_salesorders_status     ON holded_salesorders (status);
CREATE INDEX IF NOT EXISTS idx_holded_salesorders_date       ON holded_salesorders (date DESC);

ALTER TABLE holded_salesorders ENABLE ROW LEVEL SECURITY;
CREATE POLICY auth_select_salesorders ON holded_salesorders
  FOR SELECT TO authenticated USING (true);
