export type ProjectType   = "national" | "international";
export type SimStatus     = "draft" | "active" | "archived";
export type CommType      = "percent" | "amount";
export type CommBase      = "net_sale_price" | "post_production" | "post_previous_layers";
export type PromoType     = "discount_pct" | "free_units" | "intro_offer" | "marketing_support" | "bonus_stock";
export type CostType      = "packaging" | "labels" | "assembly" | "fabricacio" | "import" | "logistics" | "other" | "custom";

export interface CostLine {
  id?: string;
  cost_type:       CostType;
  cost_label?:     string | null;
  supplier_source: "erp" | "manual";
  supplier_name:   string;
  unit_cost:       number;
  currency:        string;
  notes?:          string | null;
  sort_order:      number;
}

export interface CommissionLayer {
  id?:             string;
  layer_order:     number;
  layer_name:      string;
  commission_type: CommType;
  value:           number;
  base:            CommBase;
  active:          boolean;
  notes?:          string | null;
}

export interface Promotion {
  id?:              string;
  promo_type:       PromoType;
  label:            string;
  discount_pct?:    number | null;
  free_units_paid?: number | null;
  free_units_free?: number | null;
  flat_amount?:     number | null;
  active:           boolean;
  notes?:           string | null;
}

export interface EconomicSimulation {
  id?:                      string;
  name:                     string;
  project_type:             ProjectType;
  status:                   SimStatus;
  net_sale_price:           number | null;
  currency:                 string;
  estructura_pct:           number;
  logistics_pct:            number;
  is_performance_reference: boolean;
  notes?:                   string | null;
  created_by?:              string | null;
  created_at?:              string;
  updated_at?:              string;
  // Related
  cost_lines?:         CostLine[];
  commission_layers?:  CommissionLayer[];
  promotions?:         Promotion[];
}

// ─── Calculation output ───────────────────────────────────────────────────────

export type AlertSeverity = "error" | "warning" | "info";

export interface Alert {
  severity: AlertSeverity;
  message:  string;
}

export interface CommissionDetail {
  layer_name:      string;
  base_amount:     number;
  commission_type: CommType;
  value:           number;
  amount:          number;
}

export interface PromoDetail {
  label:         string;
  promo_type:    PromoType;
  impact_amount: number;
  description:   string;
}

export interface MarginResult {
  // Inputs
  netSalePrice:         number;
  // Step 1
  unitProductionCost:   number;
  // Step 2
  estructuraCost:       number;
  logisticsCost:        number;
  // Step 3
  grossMargin:          number;
  grossMarginPct:       number;
  // Step 4
  commissionBreakdown:  CommissionDetail[];
  totalCommissions:     number;
  marginAfterCommissions:    number;
  marginAfterCommissionsPct: number;
  // Step 5
  promoDetails:         PromoDetail[];
  totalPromoImpact:     number;
  marginAfterPromos:    number;
  marginAfterPromosPct: number;
  // Step 6
  minimumViablePrice:   number;
  isViable:             boolean;
  // Alerts
  alerts:               Alert[];
}
