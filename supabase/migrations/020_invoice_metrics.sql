-- Base imponible (excl. taxes) and unit counters for KPI dashboards

ALTER TABLE holded_invoices
  ADD COLUMN IF NOT EXISTS subtotal    NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS units_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS units_foc   NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Backfill subtotal: try raw.subtotal first, then compute from product lines
UPDATE holded_invoices
SET subtotal = (raw->>'subtotal')::numeric
WHERE subtotal IS NULL
  AND raw->>'subtotal' IS NOT NULL
  AND raw->>'subtotal' ~ '^-?[0-9]+(\.[0-9]+)?$';

UPDATE holded_invoices
SET subtotal = COALESCE((
  SELECT ROUND(SUM(
    COALESCE((p->>'units')::numeric, 0) *
    COALESCE((p->>'price')::numeric, 0) *
    (1 - COALESCE((p->>'discount')::numeric, 0) / 100)
  ), 2)
  FROM jsonb_array_elements(raw->'products') p
), 0)
WHERE subtotal IS NULL
  AND raw->'products' IS NOT NULL
  AND jsonb_array_length(raw->'products') > 0;

-- Backfill unit totals from product lines
UPDATE holded_invoices
SET
  units_total = COALESCE((
    SELECT SUM(COALESCE((p->>'units')::numeric, 0))
    FROM jsonb_array_elements(raw->'products') p
  ), 0),
  units_foc = COALESCE((
    SELECT SUM(COALESCE((p->>'units')::numeric, 0))
    FROM jsonb_array_elements(raw->'products') p
    WHERE COALESCE((p->>'price')::numeric, 1) = 0
  ), 0)
WHERE raw->'products' IS NOT NULL
  AND jsonb_array_length(raw->'products') > 0;

CREATE INDEX IF NOT EXISTS idx_holded_invoices_subtotal
  ON holded_invoices (subtotal) WHERE subtotal IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_holded_invoices_units
  ON holded_invoices (units_total) WHERE units_total > 0;
