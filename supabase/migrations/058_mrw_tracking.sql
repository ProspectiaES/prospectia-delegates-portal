-- MRW tracking integration
-- Suporta 3 modes: webhook de MRW, SMS via Twilio, o polling manual

ALTER TABLE holded_salesorders
  ADD COLUMN IF NOT EXISTS mrw_tracking_number TEXT,          -- Número de albarà MRW
  ADD COLUMN IF NOT EXISTS mrw_status          TEXT,          -- Último estado MRW (En trànsit, Entregat, etc.)
  ADD COLUMN IF NOT EXISTS mrw_delivered_at    TIMESTAMPTZ,   -- Timestamp de lliurament
  ADD COLUMN IF NOT EXISTS mrw_last_event      TEXT,          -- Darrer event de tracking (descripció)
  ADD COLUMN IF NOT EXISTS mrw_last_checked_at TIMESTAMPTZ;   -- Última comprovació API

CREATE INDEX IF NOT EXISTS idx_salesorders_mrw_tracking
  ON holded_salesorders(mrw_tracking_number)
  WHERE mrw_tracking_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_salesorders_mrw_pending
  ON holded_salesorders(shipping_status)
  WHERE mrw_tracking_number IS NOT NULL
    AND shipping_status < 5;  -- Pedidos amb tracking però no entregats
