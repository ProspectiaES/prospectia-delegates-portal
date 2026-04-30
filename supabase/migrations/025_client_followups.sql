CREATE TABLE IF NOT EXISTS client_followups (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id   TEXT NOT NULL,
  delegate_id  UUID REFERENCES profiles(id),
  status       TEXT NOT NULL DEFAULT 'sin_contactar'
               CHECK (status IN ('sin_contactar','en_seguimiento','reactivado')),
  tasks_done   TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  otros_done   BOOLEAN NOT NULL DEFAULT FALSE,
  otros_text   TEXT DEFAULT '',
  notes        TEXT DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, delegate_id)
);

CREATE INDEX IF NOT EXISTS idx_followups_delegate ON client_followups(delegate_id);
CREATE INDEX IF NOT EXISTS idx_followups_contact  ON client_followups(contact_id);
