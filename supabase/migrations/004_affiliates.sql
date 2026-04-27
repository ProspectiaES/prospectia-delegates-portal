-- ─── bixgrow_affiliates ───────────────────────────────────────────────────────
-- UUID primary key; referral_code and email are both unique but referral_code
-- may arrive later (via webhook) if affiliate was imported by email first.

CREATE TABLE IF NOT EXISTS bixgrow_affiliates (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code TEXT        UNIQUE,          -- nullable until BixGrow sends it
  email         TEXT        NOT NULL UNIQUE,
  first_name    TEXT,
  last_name     TEXT,
  program       TEXT,
  status        TEXT        NOT NULL DEFAULT 'Approved',
  standard_link TEXT,
  contact_id    TEXT REFERENCES holded_contacts(id) ON DELETE SET NULL,
  raw           JSONB       NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bg_affiliates_email ON bixgrow_affiliates (email);
CREATE INDEX IF NOT EXISTS idx_bg_affiliates_code  ON bixgrow_affiliates (referral_code);
CREATE INDEX IF NOT EXISTS idx_bg_affiliates_cid   ON bixgrow_affiliates (contact_id);

-- ─── bixgrow_orders ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bixgrow_orders (
  id              TEXT        PRIMARY KEY,
  affiliate_id    UUID        NOT NULL REFERENCES bixgrow_affiliates(id) ON DELETE CASCADE,
  contact_id      TEXT REFERENCES holded_contacts(id) ON DELETE SET NULL,
  invoice_id      TEXT REFERENCES holded_invoices(id) ON DELETE SET NULL,
  customer_email  TEXT,
  order_number    TEXT,
  amount          NUMERIC(14,2) NOT NULL DEFAULT 0,
  commission_rate NUMERIC(6,3),
  commission      NUMERIC(14,2) NOT NULL DEFAULT 0,
  -- pending → approved → settled (batched into a payment) → paid
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'settled', 'paid')),
  raw             JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bg_orders_affiliate ON bixgrow_orders (affiliate_id);
CREATE INDEX IF NOT EXISTS idx_bg_orders_contact   ON bixgrow_orders (contact_id);
CREATE INDEX IF NOT EXISTS idx_bg_orders_status    ON bixgrow_orders (status);

-- ─── bixgrow_payments ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bixgrow_payments (
  id           TEXT PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES bixgrow_affiliates(id) ON DELETE CASCADE,
  amount       NUMERIC(14,2) NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'generated'
               CHECK (status IN ('generated', 'paid')),
  raw          JSONB       NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bg_payments_affiliate ON bixgrow_payments (affiliate_id);

-- ─── bixgrow_events ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bixgrow_events (
  id         BIGSERIAL   PRIMARY KEY,
  event_type TEXT        NOT NULL,
  payload    JSONB       NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── RLS — owner only ─────────────────────────────────────────────────────────

ALTER TABLE bixgrow_affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bixgrow_orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE bixgrow_payments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE bixgrow_events     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_affiliates" ON bixgrow_affiliates FOR ALL TO authenticated
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'OWNER')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'OWNER');

CREATE POLICY "owner_orders" ON bixgrow_orders FOR ALL TO authenticated
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'OWNER')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'OWNER');

CREATE POLICY "owner_payments" ON bixgrow_payments FOR ALL TO authenticated
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'OWNER')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'OWNER');

CREATE POLICY "owner_events" ON bixgrow_events FOR ALL TO authenticated
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'OWNER')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'OWNER');
