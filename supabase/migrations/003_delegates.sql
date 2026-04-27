-- ─── contact_delegates ────────────────────────────────────────────────────────
-- Maps which contacts each delegate can see.

CREATE TABLE IF NOT EXISTS contact_delegates (
  contact_id  TEXT NOT NULL REFERENCES holded_contacts(id) ON DELETE CASCADE,
  delegate_id UUID NOT NULL REFERENCES profiles(id)        ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (contact_id, delegate_id)
);

CREATE INDEX IF NOT EXISTS idx_cd_delegate ON contact_delegates (delegate_id);
CREATE INDEX IF NOT EXISTS idx_cd_contact  ON contact_delegates (contact_id);

ALTER TABLE contact_delegates ENABLE ROW LEVEL SECURITY;

-- Owner can do everything
CREATE POLICY "owner_all_assignments" ON contact_delegates
  FOR ALL TO authenticated
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'OWNER')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'OWNER');

-- Delegates can read their own rows (needed for the policy subquery to work)
CREATE POLICY "delegate_read_own_assignments" ON contact_delegates
  FOR SELECT TO authenticated
  USING (delegate_id = auth.uid());

-- ─── holded_contacts — replace open policy with role-based ones ───────────────

DROP POLICY IF EXISTS "auth_select_contacts" ON holded_contacts;

CREATE POLICY "owner_select_contacts" ON holded_contacts
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'OWNER');

CREATE POLICY "delegate_select_contacts" ON holded_contacts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contact_delegates
      WHERE contact_id = holded_contacts.id
        AND delegate_id = auth.uid()
    )
  );

-- ─── holded_invoices — replace open policy with role-based ones ──────────────

DROP POLICY IF EXISTS "auth_select_invoices" ON holded_invoices;

CREATE POLICY "owner_select_invoices" ON holded_invoices
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'OWNER');

CREATE POLICY "delegate_select_invoices" ON holded_invoices
  FOR SELECT TO authenticated
  USING (
    contact_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM contact_delegates
      WHERE contact_id = holded_invoices.contact_id
        AND delegate_id = auth.uid()
    )
  );

-- ─── holded_sync_log — owner only ────────────────────────────────────────────

DROP POLICY IF EXISTS "auth_select_sync_log" ON holded_sync_log;

CREATE POLICY "owner_select_sync_log" ON holded_sync_log
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'OWNER');
