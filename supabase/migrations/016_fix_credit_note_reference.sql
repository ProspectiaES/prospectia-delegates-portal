-- Fix credit note → invoice reference.
-- The correct link is raw.from.id (Holded invoice ID), not docNumRef (doesn't exist).
-- Rename doc_num_ref → from_invoice_id and add FK constraint.

ALTER TABLE holded_invoices
  RENAME COLUMN doc_num_ref TO from_invoice_id;

-- Backfill from raw.from.id for existing CN rows.
UPDATE holded_invoices
SET from_invoice_id = raw->'from'->>'id'
WHERE is_credit_note = true
  AND raw->'from'->>'docType' = 'invoice'
  AND raw->'from'->>'id' IS NOT NULL;

-- Index for fast lookup: "which CNs cancel this invoice?"
DROP INDEX IF EXISTS idx_holded_invoices_doc_num_ref;
CREATE INDEX IF NOT EXISTS idx_holded_invoices_from_invoice_id
  ON holded_invoices (from_invoice_id)
  WHERE from_invoice_id IS NOT NULL;
