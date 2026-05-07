-- Per-recommender fixed commission rate (replaces per-product commission_recommender)
ALTER TABLE holded_contacts
  ADD COLUMN IF NOT EXISTS recommender_rate NUMERIC(6,4) DEFAULT NULL;
