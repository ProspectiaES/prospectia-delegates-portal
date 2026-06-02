-- ─── Configuració global de marges ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_config (
  id         SERIAL PRIMARY KEY,
  margen_tienda_pct        NUMERIC(5,2) NOT NULL DEFAULT 35,
  margen_distribuidor_pct  NUMERIC(5,2) NOT NULL DEFAULT 20,
  iva_pct                  NUMERIC(5,2) NOT NULL DEFAULT 21,
  units_per_lot            INTEGER      NOT NULL DEFAULT 2300,
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Seed default config
INSERT INTO price_config (margen_tienda_pct, margen_distribuidor_pct, iva_pct, units_per_lot)
VALUES (35, 20, 21, 2300);

-- ─── Costos de landing (importació + manipulació per unitat) ─────────────────
CREATE TABLE IF NOT EXISTS price_landing_costs (
  id         SERIAL PRIMARY KEY,
  concept    TEXT         NOT NULL,
  amount     NUMERIC(12,4) NOT NULL,
  -- FALSE = cost total del lot (es divideix per units_per_lot)
  -- TRUE  = cost per unitat directe
  is_per_unit BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed from Excel (LAST PROPUESTA DE PRECIOS_1.xlsx)
INSERT INTO price_landing_costs (concept, amount, is_per_unit, sort_order) VALUES
  ('Documentos + ENS',      55.00,  false, 10),
  ('Flete',                650.00,  false, 20),
  ('Despacho aduanas',      75.00,  false, 30),
  ('Entrega y recogidas',   55.81,  false, 40),
  ('Manipulación',          49.50,  false, 50),
  ('Movimiento contenedor', 10.08,  false, 60),
  ('T3',                     3.96,  false, 70),
  ('Carga camión',          90.00,  false, 80),
  ('Provisión de fondos',  200.00,  false, 90),
  ('Almacenaje',          1200.00,  false,100),
  ('Expedición',            50.00,  false,110),
  ('Recepción',             50.00,  false,120),
  ('Etiquetaje',             0.30,  true, 200),
  ('Etiquetes',              0.15,  true, 210),
  ('Picking',                0.40,  true, 220);

-- ─── PVP per producte (override sobre holded_products.price) ─────────────────
CREATE TABLE IF NOT EXISTS product_prices (
  id                      SERIAL PRIMARY KEY,
  product_id              TEXT         NOT NULL REFERENCES holded_products(id),
  pvp_sin_iva             NUMERIC(10,4),
  purchase_cost_override  NUMERIC(10,4),   -- sobreescriu holded_products.cost si informat
  notes                   TEXT,
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(product_id)
);

-- ─── RLS: OWNER only ─────────────────────────────────────────────────────────
ALTER TABLE price_config        ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_landing_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_prices      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_only" ON price_config
  USING     (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'OWNER'))
  WITH CHECK(EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'OWNER'));

CREATE POLICY "owner_only" ON price_landing_costs
  USING     (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'OWNER'))
  WITH CHECK(EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'OWNER'));

CREATE POLICY "owner_only" ON product_prices
  USING     (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'OWNER'))
  WITH CHECK(EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'OWNER'));
