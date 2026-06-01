-- Purchase invoices (facturas de compra) from Holded
CREATE TABLE IF NOT EXISTS holded_purchases (
  id              TEXT PRIMARY KEY,
  doc_number      TEXT,
  contact_id      TEXT,
  contact_name    TEXT,
  date            TIMESTAMPTZ,
  due_date        TIMESTAMPTZ,
  total           NUMERIC NOT NULL DEFAULT 0,
  subtotal        NUMERIC,
  -- 0=pendent  1=pagada  3=anulada
  status          SMALLINT NOT NULL DEFAULT 0,
  description     TEXT,
  -- OWNER-assigned category: personal|tecnologia|marketing|logistica|oficina|gestoria|compres|altres
  category        TEXT NOT NULL DEFAULT 'altres',
  -- Set true to exclude from P&L (e.g. autofactures comissions already counted)
  exclude_from_pnl BOOLEAN NOT NULL DEFAULT FALSE,
  raw             JSONB,
  date_paid       TIMESTAMPTZ,
  first_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS holded_purchases_date      ON holded_purchases (date);
CREATE INDEX IF NOT EXISTS holded_purchases_contact   ON holded_purchases (contact_id);
CREATE INDEX IF NOT EXISTS holded_purchases_status    ON holded_purchases (status);
CREATE INDEX IF NOT EXISTS holded_purchases_category  ON holded_purchases (category);

ALTER TABLE holded_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all_purchases" ON holded_purchases
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'OWNER')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'OWNER')
  );

-- Supplier-level category overrides (survives re-sync)
CREATE TABLE IF NOT EXISTS holded_supplier_categories (
  contact_id       TEXT PRIMARY KEY,
  contact_name     TEXT,
  category         TEXT NOT NULL DEFAULT 'altres',
  exclude_from_pnl BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE holded_supplier_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all_supplier_cat" ON holded_supplier_categories
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'OWNER')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'OWNER')
  );
