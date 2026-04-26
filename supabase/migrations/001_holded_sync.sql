-- ─── Contacts ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS holded_contacts (
  id               TEXT PRIMARY KEY,
  name             TEXT        NOT NULL DEFAULT '',
  code             TEXT,
  email            TEXT,
  phone            TEXT,
  mobile           TEXT,
  -- 0=lead 1=client 2=provider 3=creditor 4=debtor
  type             SMALLINT,
  tags             TEXT[]      NOT NULL DEFAULT '{}',
  address          TEXT,
  city             TEXT,
  postal_code      TEXT,
  province         TEXT,
  country          TEXT,
  country_code     TEXT,
  raw              JSONB       NOT NULL DEFAULT '{}',
  first_synced_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_holded_contacts_name  ON holded_contacts (name);
CREATE INDEX IF NOT EXISTS idx_holded_contacts_email ON holded_contacts (email);
CREATE INDEX IF NOT EXISTS idx_holded_contacts_type  ON holded_contacts (type);

-- ─── Invoices ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS holded_invoices (
  id                   TEXT PRIMARY KEY,
  doc_number           TEXT,
  contact_id           TEXT REFERENCES holded_contacts(id) ON DELETE SET NULL,
  contact_name         TEXT,
  date                 TIMESTAMPTZ,
  due_date             TIMESTAMPTZ,
  date_last_modified   TIMESTAMPTZ,
  total                NUMERIC(14,2) NOT NULL DEFAULT 0,
  -- 0=draft 1=pending 2=overdue 3=paid
  status               SMALLINT      NOT NULL DEFAULT 0,
  description          TEXT,
  raw                  JSONB         NOT NULL DEFAULT '{}',
  first_synced_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  last_synced_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_holded_invoices_contact_id ON holded_invoices (contact_id);
CREATE INDEX IF NOT EXISTS idx_holded_invoices_status     ON holded_invoices (status);
CREATE INDEX IF NOT EXISTS idx_holded_invoices_date       ON holded_invoices (date DESC);
CREATE INDEX IF NOT EXISTS idx_holded_invoices_due_date   ON holded_invoices (due_date);

-- ─── Sync log ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS holded_sync_log (
  id               BIGSERIAL PRIMARY KEY,
  sync_type        TEXT        NOT NULL CHECK (sync_type IN ('full', 'status_only')),
  status           TEXT        NOT NULL DEFAULT 'running'
                               CHECK (status IN ('running', 'completed', 'failed')),
  contacts_synced  INTEGER     NOT NULL DEFAULT 0,
  invoices_synced  INTEGER     NOT NULL DEFAULT 0,
  error_message    TEXT,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at      TIMESTAMPTZ
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
-- Authenticated users can read; service role (used by sync) bypasses RLS entirely.

ALTER TABLE holded_contacts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE holded_invoices  ENABLE ROW LEVEL SECURITY;
ALTER TABLE holded_sync_log  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_contacts"
  ON holded_contacts FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_select_invoices"
  ON holded_invoices FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_select_sync_log"
  ON holded_sync_log FOR SELECT TO authenticated USING (true);
