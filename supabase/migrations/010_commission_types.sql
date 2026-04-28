-- Per-commission type: 'percent' (default) or 'amount' (fixed €)
ALTER TABLE holded_products
  ADD COLUMN IF NOT EXISTS commission_delegate_type    TEXT NOT NULL DEFAULT 'percent',
  ADD COLUMN IF NOT EXISTS commission_recommender_type TEXT NOT NULL DEFAULT 'percent',
  ADD COLUMN IF NOT EXISTS commission_affiliate_type   TEXT NOT NULL DEFAULT 'percent',
  ADD COLUMN IF NOT EXISTS commission_4_type           TEXT NOT NULL DEFAULT 'percent',
  ADD COLUMN IF NOT EXISTS commission_5_type           TEXT NOT NULL DEFAULT 'percent',
  ADD COLUMN IF NOT EXISTS commission_6_type           TEXT NOT NULL DEFAULT 'percent';
