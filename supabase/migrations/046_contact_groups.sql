-- Custom contact groups (categories) — stored locally and synced to Holded as tags

CREATE TABLE IF NOT EXISTS contact_groups (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL UNIQUE,
  color      TEXT        NOT NULL DEFAULT '#6B7280',
  holded_tag TEXT        NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_group_members (
  contact_id TEXT NOT NULL REFERENCES holded_contacts(id) ON DELETE CASCADE,
  group_id   UUID NOT NULL REFERENCES contact_groups(id)  ON DELETE CASCADE,
  PRIMARY KEY (contact_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_cgm_contact ON contact_group_members (contact_id);
CREATE INDEX IF NOT EXISTS idx_cgm_group   ON contact_group_members (group_id);

ALTER TABLE contact_groups        ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_groups" ON contact_groups
  FOR ALL TO authenticated
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'OWNER')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'OWNER');

CREATE POLICY "owner_group_members" ON contact_group_members
  FOR ALL TO authenticated
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'OWNER')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'OWNER');
