-- Products catalogue mirrored from Holded + 5 OWNER-editable commission rates

CREATE TABLE IF NOT EXISTS holded_products (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL DEFAULT '',
  description      TEXT,
  sku              TEXT,
  barcode          TEXT,
  factory_code     TEXT,
  kind             TEXT,
  price            NUMERIC(12,4),        -- base price (excl. tax)
  total            NUMERIC(12,4),        -- price incl. taxes
  cost             NUMERIC(12,4),
  purchase_price   NUMERIC(12,4),
  taxes            TEXT[]  NOT NULL DEFAULT '{}',
  stock            NUMERIC(12,4),
  has_stock        BOOLEAN NOT NULL DEFAULT false,
  tags             TEXT[]  NOT NULL DEFAULT '{}',
  raw              JSONB,
  last_synced_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Commission rates (%) — never overwritten by Holded sync
  commission_delegate     NUMERIC(8,4),
  commission_recommender  NUMERIC(8,4),
  commission_affiliate    NUMERIC(8,4),
  commission_4            NUMERIC(8,4),
  commission_5            NUMERIC(8,4)
);

ALTER TABLE holded_sync_log ADD COLUMN IF NOT EXISTS products_synced INT NOT NULL DEFAULT 0;

ALTER TABLE holded_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY authenticated_read_products ON holded_products
  FOR SELECT TO authenticated USING (true);
