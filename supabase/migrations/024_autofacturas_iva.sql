-- Add IVA columns to autofacturas table
ALTER TABLE autofacturas
  ADD COLUMN IF NOT EXISTS iva_pct          NUMERIC(5,2)  NOT NULL DEFAULT 21,
  ADD COLUMN IF NOT EXISTS iva_amount       NUMERIC(14,2) NOT NULL DEFAULT 0;
