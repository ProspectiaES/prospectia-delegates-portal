-- Link contacts to an affiliate (the affiliate that referred/manages them)
ALTER TABLE holded_contacts
  ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES bixgrow_affiliates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_affiliate ON holded_contacts (affiliate_id);
