-- ─── Extend profiles with contact + billing fields ───────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email       TEXT,
  ADD COLUMN IF NOT EXISTS phone       TEXT,
  ADD COLUMN IF NOT EXISTS nif         TEXT,
  ADD COLUMN IF NOT EXISTS address     TEXT,
  ADD COLUMN IF NOT EXISTS city        TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS iban        TEXT;

-- OWNER can update any profile (delegates update their own via action)
CREATE POLICY "owner_update_profiles" ON profiles
  FOR UPDATE TO authenticated
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'OWNER')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'OWNER');

-- ─── Link affiliates to a delegate ───────────────────────────────────────────

ALTER TABLE bixgrow_affiliates
  ADD COLUMN IF NOT EXISTS delegate_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_affiliates_delegate ON bixgrow_affiliates (delegate_id);
