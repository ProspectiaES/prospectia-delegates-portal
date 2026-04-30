-- ─── autofacturas ─────────────────────────────────────────────────────────────
-- Self-billing invoices generated on behalf of delegates/KOLs.
-- Numbering format: PO-AF-YY-NNNN (e.g. PO-AF-26-0001)

CREATE TABLE IF NOT EXISTS autofacturas (
  id                SERIAL        PRIMARY KEY,
  doc_number        TEXT          UNIQUE NOT NULL,          -- PO-AF-26-0001
  delegate_id       UUID          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_year       INT           NOT NULL,
  period_month      INT           NOT NULL,
  irpf_pct          NUMERIC(5,2)  NOT NULL DEFAULT 0,
  recargo_eq_pct    NUMERIC(5,2)  NOT NULL DEFAULT 0,
  base_commission   NUMERIC(14,2) NOT NULL,                 -- gross commission
  irpf_amount       NUMERIC(14,2) NOT NULL DEFAULT 0,       -- deduction
  recargo_eq_amount NUMERIC(14,2) NOT NULL DEFAULT 0,       -- addition
  total_payable     NUMERIC(14,2) NOT NULL,                 -- net to pay
  generated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  generated_by      UUID          REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_autofacturas_delegate ON autofacturas (delegate_id);
CREATE INDEX IF NOT EXISTS idx_autofacturas_period   ON autofacturas (period_year, period_month);

ALTER TABLE autofacturas ENABLE ROW LEVEL SECURITY;

-- Owner/Admin: full access
CREATE POLICY "autofacturas_owner" ON autofacturas FOR ALL TO authenticated
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('OWNER', 'ADMIN'))
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('OWNER', 'ADMIN'));

-- Delegate: read + insert their own
CREATE POLICY "autofacturas_self_read" ON autofacturas FOR SELECT TO authenticated
  USING (delegate_id = auth.uid());

CREATE POLICY "autofacturas_self_insert" ON autofacturas FOR INSERT TO authenticated
  WITH CHECK (delegate_id = auth.uid());
