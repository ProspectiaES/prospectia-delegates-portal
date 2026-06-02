/**
 * Economic Engine — Pure calculation function.
 * No side effects. Runs on server (API) or client (what-if preview).
 *
 * Algorisme (ordre estricte per spec):
 *  1. Cost de producció
 *  2. Estructura + logística
 *  3. Marge brut
 *  4. Comissions (per capes, en ordre layer_order)
 *  5. Impacte de promocions
 *  6. Indicadors derivats + alertes
 */

import type {
  EconomicSimulation, MarginResult, CommissionDetail,
  PromoDetail, Alert,
} from "./types";

const VIABILITY_THRESHOLD = 15; // % marge mínim per considerar viable

export function calculate(sim: EconomicSimulation): MarginResult {
  const alerts: Alert[] = [];

  // ── Guard: preu net ────────────────────────────────────────────────────────
  const netSalePrice = sim.net_sale_price ?? 0;
  if (netSalePrice <= 0) {
    alerts.push({ severity: "error", message: "El preu de venda net ha de ser > 0." });
    return emptyResult(netSalePrice, alerts);
  }

  // ── STEP 1: Cost de producció ─────────────────────────────────────────────
  const activeCostLines = (sim.cost_lines ?? []).filter(l => l.unit_cost > 0);
  const unitProductionCost = activeCostLines.reduce((s, l) => s + Number(l.unit_cost), 0);

  // Warn: cost lines amb cost = 0
  const zeroCosts = (sim.cost_lines ?? []).filter(l => Number(l.unit_cost) === 0);
  if (zeroCosts.length > 0) {
    alerts.push({ severity: "warning", message: `${zeroCosts.length} línia(es) de cost amb valor 0.` });
  }
  // Info: proveïdors manuals
  const manualSuppliers = activeCostLines.filter(l => l.supplier_source === "manual");
  if (manualSuppliers.length > 0) {
    alerts.push({ severity: "info", message: `${manualSuppliers.length} cost(os) manual(s) — no normalitzats a l'ERP.` });
  }

  // ── STEP 2: Estructura i logística ────────────────────────────────────────
  const estructuraCost = netSalePrice * (sim.estructura_pct / 100);
  const logisticsCost  = sim.project_type === "international" ? 0 : netSalePrice * (sim.logistics_pct / 100);

  // ── STEP 3: Marge brut ────────────────────────────────────────────────────
  const grossMargin    = netSalePrice - unitProductionCost - estructuraCost - logisticsCost;
  const grossMarginPct = (grossMargin / netSalePrice) * 100;

  // ── STEP 4: Comissions ────────────────────────────────────────────────────
  const activeLayers = (sim.commission_layers ?? [])
    .filter(l => l.active)
    .sort((a, b) => a.layer_order - b.layer_order);

  const commissionBreakdown: CommissionDetail[] = [];
  let totalPreviousCommissions = 0;

  for (const layer of activeLayers) {
    const baseAmount =
      layer.base === "net_sale_price"        ? netSalePrice :
      layer.base === "post_production"       ? netSalePrice - unitProductionCost :
      /* post_previous_layers */               netSalePrice - totalPreviousCommissions;

    const amount = layer.commission_type === "percent"
      ? baseAmount * (layer.value / 100)
      : layer.value;

    commissionBreakdown.push({
      layer_name:      layer.layer_name,
      base_amount:     baseAmount,
      commission_type: layer.commission_type,
      value:           layer.value,
      amount,
    });
    totalPreviousCommissions += amount;
  }

  const totalCommissions           = commissionBreakdown.reduce((s, c) => s + c.amount, 0);
  const marginAfterCommissions     = grossMargin - totalCommissions;
  const marginAfterCommissionsPct  = (marginAfterCommissions / netSalePrice) * 100;

  // Warn: comissions > 80% del marge brut
  if (grossMargin > 0 && totalCommissions > grossMargin * 0.8) {
    alerts.push({ severity: "warning", message: `Les comissions (${fmtPct(totalCommissions / grossMargin * 100)}) superen el 80% del marge brut.` });
  }

  // ── STEP 5: Promocions ────────────────────────────────────────────────────
  const activePromos = (sim.promotions ?? []).filter(p => p.active);
  const promoDetails: PromoDetail[] = [];

  for (const promo of activePromos) {
    let impact = 0;
    let description = "";

    switch (promo.promo_type) {
      case "discount_pct":
        impact = netSalePrice * ((promo.discount_pct ?? 0) / 100);
        description = `Descompte ${promo.discount_pct}% sobre preu net`;
        break;
      case "free_units": {
        // X+Y: Y unitats gratuïtes per X pagades.
        // Impacte = cost de les unitats gratuïtes amortitzat entre les pagades.
        // NO és un descompte en preu — és un increment de cost efectiu per unitat venuda.
        const paid = promo.free_units_paid ?? 1;
        const free = promo.free_units_free ?? 0;
        impact = (free / paid) * unitProductionCost;
        description = `${paid}+${free}: cost de ${free} ud gratuïtes amortitzat (≠ descompte)`;
        break;
      }
      case "intro_offer":
        impact = promo.flat_amount ?? 0;
        description = `Oferta introducció: ${fmtEur(promo.flat_amount ?? 0)}/ud`;
        break;
      case "marketing_support":
        impact = promo.flat_amount ?? 0;
        description = `Suport màrqueting: ${fmtEur(promo.flat_amount ?? 0)}/ud`;
        break;
      case "bonus_stock":
        impact = netSalePrice * ((promo.discount_pct ?? 0) / 100);
        description = `Stock addicional equivalent a ${promo.discount_pct}% descompte`;
        break;
    }

    promoDetails.push({ label: promo.label, promo_type: promo.promo_type, impact_amount: impact, description });
  }

  const totalPromoImpact    = promoDetails.reduce((s, p) => s + p.impact_amount, 0);
  const marginAfterPromos   = marginAfterCommissions - totalPromoImpact;
  const marginAfterPromosPct = (marginAfterPromos / netSalePrice) * 100;

  // ── STEP 6: Indicadors + alertes ─────────────────────────────────────────
  // Preu mínim viable: resol p = costProd / (1 - estructura% - logistics% - totalCommPct%)
  // On totalCommPct = suma de capes de tipus "percent" sobre net_sale_price
  const totalCommPct = activeLayers
    .filter(l => l.commission_type === "percent" && l.base === "net_sale_price")
    .reduce((s, l) => s + Number(l.value), 0);
  const denominator = 1 - (sim.estructura_pct / 100) - (sim.logistics_pct / 100) - (totalCommPct / 100);
  const minimumViablePrice = denominator > 0 ? unitProductionCost / denominator : 0;

  const isViable = marginAfterPromos > 0 && marginAfterPromosPct >= VIABILITY_THRESHOLD;

  if (marginAfterPromos <= 0) {
    alerts.push({ severity: "error", message: "Marge negatiu — la simulació no és viable." });
  } else if (marginAfterPromosPct < VIABILITY_THRESHOLD) {
    alerts.push({ severity: "warning", message: `Marge post-promos (${fmtPct(marginAfterPromosPct)}) per sota del llindar recomanat (${VIABILITY_THRESHOLD}%).` });
  }

  if (!sim.is_performance_reference) {
    alerts.push({ severity: "info", message: "Aquesta simulació no és la referència P&L. Els càlculs del Motor Econòmic utilitzen una altra simulació." });
  }

  return {
    netSalePrice,
    unitProductionCost,
    estructuraCost,
    logisticsCost,
    grossMargin,
    grossMarginPct,
    commissionBreakdown,
    totalCommissions,
    marginAfterCommissions,
    marginAfterCommissionsPct,
    promoDetails,
    totalPromoImpact,
    marginAfterPromos,
    marginAfterPromosPct,
    minimumViablePrice,
    isViable,
    alerts,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyResult(price: number, alerts: Alert[]): MarginResult {
  return {
    netSalePrice: price,
    unitProductionCost: 0, estructuraCost: 0, logisticsCost: 0,
    grossMargin: 0, grossMarginPct: 0,
    commissionBreakdown: [], totalCommissions: 0,
    marginAfterCommissions: 0, marginAfterCommissionsPct: 0,
    promoDetails: [], totalPromoImpact: 0,
    marginAfterPromos: 0, marginAfterPromosPct: 0,
    minimumViablePrice: 0, isViable: false,
    alerts,
  };
}

function fmtPct(n: number)  { return `${n.toFixed(1)}%`; }
function fmtEur(n: number)  { return `${n.toFixed(2)}€`; }

// ─── Sensitivity analysis helper ─────────────────────────────────────────────

export function sensitivityAnalysis(
  sim: EconomicSimulation,
  param: "net_sale_price" | "estructura_pct" | "logistics_pct",
  min: number,
  max: number,
  steps: number
): { paramValue: number; marginAfterPromos: number; marginPct: number; isViable: boolean }[] {
  const results = [];
  const step = (max - min) / steps;
  for (let v = min; v <= max + step * 0.01; v += step) {
    const s = { ...sim, [param]: Math.round(v * 100) / 100 };
    const r = calculate(s);
    results.push({ paramValue: v, marginAfterPromos: r.marginAfterPromos, marginPct: r.marginAfterPromosPct, isViable: r.isViable });
  }
  return results;
}
