-- ─── Economic Engine ─────────────────────────────────────────────────────────
-- Simulador d'escenaris econòmics per a Prospectia.
-- Calcul: marge brut → post-comissions → post-promos + alertes de viabilitat.
-- Una simulació pot ser "referència P&L" i alimenta el Motor Econòmic mensual.

CREATE TABLE IF NOT EXISTS economic_simulations (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     text        NOT NULL,
  project_type             text        NOT NULL DEFAULT 'national'
                                       CHECK (project_type IN ('national','international')),
  status                   text        NOT NULL DEFAULT 'draft'
                                       CHECK (status IN ('draft','active','archived')),
  net_sale_price           numeric(10,4),
  currency                 text        NOT NULL DEFAULT 'EUR',
  -- % overhead empresa (estructura)
  estructura_pct           numeric(5,2) NOT NULL DEFAULT 12,
  -- % logística (0 per a international)
  logistics_pct            numeric(5,2) NOT NULL DEFAULT 5,
  -- Màx. 1 simulació és referència P&L; aquesta s'injecta al Motor Econòmic
  is_performance_reference boolean     NOT NULL DEFAULT false,
  notes                    text,
  -- Mantenim production_cost_lines com a JSONB per compatibilitat amb Motor Econòmic existent
  production_cost_lines    jsonb,
  created_by               uuid        REFERENCES profiles(id),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- ─── Línies de cost de producció (normalitzades) ──────────────────────────────

CREATE TABLE IF NOT EXISTS simulation_cost_lines (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id   uuid        NOT NULL REFERENCES economic_simulations(id) ON DELETE CASCADE,
  -- packaging | labels | assembly | import | logistics | other
  cost_type       text        NOT NULL DEFAULT 'other',
  cost_label      text,
  -- erp = des d'Holded/ERP; manual = introduït manualment
  supplier_source text        NOT NULL DEFAULT 'manual'
                              CHECK (supplier_source IN ('erp','manual')),
  supplier_id     text,
  supplier_name   text        NOT NULL,
  unit_cost       numeric(10,4) NOT NULL DEFAULT 0,
  currency        text        NOT NULL DEFAULT 'EUR',
  notes           text,
  sort_order      integer     NOT NULL DEFAULT 0
);

-- ─── Capes de comissió ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS simulation_commission_layers (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id    uuid        NOT NULL REFERENCES economic_simulations(id) ON DELETE CASCADE,
  layer_order      integer     NOT NULL DEFAULT 0,
  layer_name       text        NOT NULL,   -- 'Delegado','KOL','Coordinador','Recomendador'
  -- percent | amount (€ per unitat)
  commission_type  text        NOT NULL DEFAULT 'percent'
                               CHECK (commission_type IN ('percent','amount')),
  value            numeric(10,4) NOT NULL DEFAULT 0,
  -- Sobre quin import s'aplica:
  -- net_sale_price | post_production | post_previous_layers
  base             text        NOT NULL DEFAULT 'net_sale_price'
                               CHECK (base IN ('net_sale_price','post_production','post_previous_layers')),
  active           boolean     NOT NULL DEFAULT true,
  notes            text
);

-- ─── Promocions comercials ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS simulation_promotions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id    uuid        NOT NULL REFERENCES economic_simulations(id) ON DELETE CASCADE,
  promo_type       text        NOT NULL
                               CHECK (promo_type IN (
                                 'discount_pct',      -- % descompte sobre preu net
                                 'free_units',        -- X+Y: Y unitats gratuïtes per X pagades
                                 'intro_offer',       -- import fix per unitat
                                 'marketing_support', -- suport màrqueting €/ud
                                 'bonus_stock'        -- stock addicional = % descompte
                               )),
  label            text        NOT NULL,
  discount_pct     numeric(5,2),
  free_units_paid  integer,
  free_units_free  integer,
  flat_amount      numeric(10,4),
  active           boolean     NOT NULL DEFAULT true,
  notes            text
);

-- ─── Snapshots d'auditoria ────────────────────────────────────────────────────
-- Append-only — cada vegada que es desa una simulació, es guarda el resultat calculat.

CREATE TABLE IF NOT EXISTS simulation_snapshots (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id uuid        NOT NULL REFERENCES economic_simulations(id) ON DELETE CASCADE,
  snapshot_data jsonb       NOT NULL,  -- MarginResult complet
  created_by    uuid        REFERENCES profiles(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ecsim_status    ON economic_simulations(status);
CREATE INDEX IF NOT EXISTS idx_ecsim_reference ON economic_simulations(is_performance_reference) WHERE is_performance_reference = true;
CREATE INDEX IF NOT EXISTS idx_ecscl_sim       ON simulation_cost_lines(simulation_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_eccl_sim        ON simulation_commission_layers(simulation_id, layer_order);
CREATE INDEX IF NOT EXISTS idx_ecpr_sim        ON simulation_promotions(simulation_id);
CREATE INDEX IF NOT EXISTS idx_ecss_sim        ON simulation_snapshots(simulation_id, created_at DESC);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE economic_simulations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_cost_lines        ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_commission_layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_promotions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_snapshots         ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_only" ON economic_simulations
  USING     (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'OWNER'))
  WITH CHECK(EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'OWNER'));

CREATE POLICY "owner_only" ON simulation_cost_lines
  USING     (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'OWNER'))
  WITH CHECK(EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'OWNER'));

CREATE POLICY "owner_only" ON simulation_commission_layers
  USING     (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'OWNER'))
  WITH CHECK(EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'OWNER'));

CREATE POLICY "owner_only" ON simulation_promotions
  USING     (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'OWNER'))
  WITH CHECK(EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'OWNER'));

CREATE POLICY "owner_only" ON simulation_snapshots
  USING     (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'OWNER'))
  WITH CHECK(EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'OWNER'));

-- ─── RPC atòmic: set-reference ───────────────────────────────────────────────
-- Activa una simulació com a referència P&L i desactiva l'anterior atòmicament.

CREATE OR REPLACE FUNCTION set_performance_reference(p_simulation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE economic_simulations SET is_performance_reference = false
  WHERE  is_performance_reference = true;

  UPDATE economic_simulations SET is_performance_reference = true, updated_at = now()
  WHERE  id = p_simulation_id;
END;
$$;
