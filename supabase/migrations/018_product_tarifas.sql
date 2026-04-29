-- Tarifa price tiers per product
ALTER TABLE holded_products
  ADD COLUMN IF NOT EXISTS price_pvp NUMERIC,   -- Precio Venta al Público
  ADD COLUMN IF NOT EXISTS price_pvd NUMERIC,   -- Precio Venta Distribuidor (OWNER-only)
  ADD COLUMN IF NOT EXISTS price_pvl NUMERIC;   -- Precio Punto de Venta
