-- Self-referential FK: a contact can be recommended by another contact
ALTER TABLE holded_contacts
  ADD COLUMN IF NOT EXISTS recommender_id TEXT REFERENCES holded_contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_recommender ON holded_contacts (recommender_id);
