-- Link a profile to its own Holded contact, used to prevent self-referral commissions.
-- A KOL must not earn commission on their own contact's invoices.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS contact_id TEXT REFERENCES holded_contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_contact_id ON profiles (contact_id) WHERE contact_id IS NOT NULL;
