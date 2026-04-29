ALTER TABLE holded_invoices
  ADD COLUMN IF NOT EXISTS date_paid TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_holded_invoices_date_paid ON holded_invoices (date_paid);
