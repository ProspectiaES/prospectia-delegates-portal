-- Payment data on contacts (persists across Holded syncs)
ALTER TABLE holded_contacts
  ADD COLUMN IF NOT EXISTS payment_method TEXT,  -- transfer | direct_debit | check | cash | other
  ADD COLUMN IF NOT EXISTS iban           TEXT,
  ADD COLUMN IF NOT EXISTS bic            TEXT;
