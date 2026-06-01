-- Add IRPF retention percentage to delegate profiles
-- 0 = exempt, 7 = new autonomous, 15 = standard
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS irpf_pct NUMERIC(5,2) NOT NULL DEFAULT 0;
