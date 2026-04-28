-- Dual-role flags: a DELEGATE can also be KOL or Coordinator
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_kol         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_coordinator BOOLEAN NOT NULL DEFAULT false;

-- KOL and Coordinator assigned to a delegate profile
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS kol_id         UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS coordinator_id UUID REFERENCES profiles(id);
