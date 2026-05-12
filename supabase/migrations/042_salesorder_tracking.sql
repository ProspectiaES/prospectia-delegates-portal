-- Holded salesorder tracking fields (from raw.trackingkey/name/num + pickupdate/deliverydate)
ALTER TABLE holded_salesorders
  ADD COLUMN IF NOT EXISTS tracking_company_key  TEXT,
  ADD COLUMN IF NOT EXISTS tracking_company_name TEXT,
  ADD COLUMN IF NOT EXISTS tracking_number       TEXT,
  ADD COLUMN IF NOT EXISTS tracking_pickup_date  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tracking_delivery_date TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_holded_salesorders_tracking
  ON holded_salesorders (tracking_number)
  WHERE tracking_number IS NOT NULL;
