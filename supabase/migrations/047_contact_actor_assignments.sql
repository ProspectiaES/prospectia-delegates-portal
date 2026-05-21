-- Direct KOL and Coordinator assignment per contact (independent of delegate hierarchy)
ALTER TABLE holded_contacts
  ADD COLUMN IF NOT EXISTS assigned_kol_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_coordinator_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_kol   ON holded_contacts (assigned_kol_id)   WHERE assigned_kol_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_coord ON holded_contacts (assigned_coordinator_id) WHERE assigned_coordinator_id IS NOT NULL;
