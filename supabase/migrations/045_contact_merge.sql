-- Track which contacts have been merged into another
ALTER TABLE holded_contacts
  ADD COLUMN IF NOT EXISTS merged_into_id TEXT REFERENCES holded_contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_merged_into ON holded_contacts (merged_into_id) WHERE merged_into_id IS NOT NULL;
