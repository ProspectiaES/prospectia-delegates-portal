-- Commission tier (tramo) table: defines escalating rates by units sold YTD.
-- OWNER configures these in Dashboard → Productos or a future admin page.
-- Delegates see their current tier in the dashboard commission section.

CREATE TABLE IF NOT EXISTS commission_tiers (
  id          SERIAL       PRIMARY KEY,
  label       TEXT         NOT NULL,          -- e.g. "Tramo 1 — hasta 100 uds"
  min_units   INTEGER      NOT NULL,          -- lower bound (inclusive)
  max_units   INTEGER,                        -- upper bound (inclusive), NULL = no cap
  rate        NUMERIC(6,4) NOT NULL,          -- commission % (5.0000 = 5%)
  sort_order  INTEGER      NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_tiers_sort ON commission_tiers (sort_order);

ALTER TABLE commission_tiers ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read (delegates need to see their tier)
CREATE POLICY "read_commission_tiers" ON commission_tiers
  FOR SELECT TO authenticated USING (true);

-- Only OWNER can manage
CREATE POLICY "owner_manage_commission_tiers" ON commission_tiers
  FOR ALL TO authenticated
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'OWNER')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'OWNER');

-- Annual bonus target configuration
CREATE TABLE IF NOT EXISTS commission_bonus (
  id            SERIAL       PRIMARY KEY,
  label         TEXT         NOT NULL,          -- e.g. "Bonus Anual 2026"
  target_units  INTEGER      NOT NULL,          -- units needed to earn bonus
  bonus_amount  NUMERIC(12,2) NOT NULL,         -- bonus €
  period_year   INTEGER,                        -- NULL = applies to all years
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE commission_bonus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_commission_bonus" ON commission_bonus
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "owner_manage_commission_bonus" ON commission_bonus
  FOR ALL TO authenticated
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'OWNER')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'OWNER');
