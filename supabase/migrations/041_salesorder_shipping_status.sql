-- Holded shippingStatus for salesorders (Etapa column):
-- null/0 = No seleccionado  1 = Recepcionado  2 = Preparado
-- 3 = Facturado  4 = Enviado  5 = Recibido
-- Orders are archived (hidden) only when shipping_status = 5 (Recibido).
ALTER TABLE holded_salesorders
  ADD COLUMN IF NOT EXISTS shipping_status SMALLINT;

CREATE INDEX IF NOT EXISTS idx_holded_salesorders_shipping
  ON holded_salesorders (shipping_status);
