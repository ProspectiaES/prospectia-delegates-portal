-- Support credit notes in holded_invoices.
-- is_credit_note: true for CN rows synced from the creditnote endpoint.
-- doc_num_ref: the doc_number of the invoice this CN cancels.

ALTER TABLE holded_invoices
  ADD COLUMN IF NOT EXISTS is_credit_note BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS doc_num_ref    TEXT;

CREATE INDEX IF NOT EXISTS idx_holded_invoices_doc_num_ref ON holded_invoices (doc_num_ref)
  WHERE doc_num_ref IS NOT NULL;
