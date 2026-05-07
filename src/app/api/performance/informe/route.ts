import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import React from "react";
import { PerformanceReport, type PerfDelegateRow, type PerfReportData } from "@/lib/pdf/performance-report";
import { delegateStatus } from "@/lib/skus";

const AFFILIATE_RATE = 0.20;
type CommType = "percent" | "amount";

function calcLine(units: number, price: number, disc: number, rate: number | null, type: CommType) {
  if (!rate) return 0;
  const net = units * price * (1 - disc / 100);
  return type === "amount" ? units * rate : (net * rate) / 100;
}

export async function GET(request: Request) {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER")
    return new Response("Forbidden", { status: 403 });

  const url = new URL(request.url);
  const mesParam = url.searchParams.get("mes") ?? "";
  const now = new Date();
  let pYear  = now.getFullYear();
  let pMonth = now.getMonth();
  if (/^\d{4}-\d{2}$/.test(mesParam)) {
    const [y, m] = mesParam.split("-").map(Number);
    pYear = y; pMonth = m - 1;
  }

  const start = new Date(Date.UTC(pYear, pMonth, 1)).toISOString();
  const end   = new Date(Date.UTC(pYear, pMonth + 1, 0, 23, 59, 59, 999)).toISOString();
  const prevD = pMonth === 0 ? { y: pYear - 1, m: 11 } : { y: pYear, m: pMonth - 1 };
  const prevStart = new Date(Date.UTC(prevD.y, prevD.m, 1)).toISOString();
  const prevEnd   = new Date(Date.UTC(prevD.y, prevD.m + 1, 0, 23, 59, 59, 999)).toISOString();
  const yoyStart  = new Date(Date.UTC(pYear - 1, pMonth, 1)).toISOString();
  const yoyEnd    = new Date(Date.UTC(pYear - 1, pMonth + 1, 0, 23, 59, 59, 999)).toISOString();
  const ninetyAgo = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const yearAgo   = new Date(Date.UTC(pYear - 1, pMonth + 1, 1)).toISOString();

  const admin = createAdminClient();

  const [delegatesRes, cdRes, curInvRes, prevInvRes, yoyInvRes, productsRes, contactsRes, yearInvRes] = await Promise.all([
    admin.from("profiles").select("id, full_name, delegate_name, email, is_kol").in("role", ["DELEGATE", "KOL", "COORDINATOR"]).order("full_name"),
    admin.from("contact_delegates").select("delegate_id, contact_id, assigned_at"),
    admin.from("holded_invoices").select("id, contact_id, subtotal, raw").eq("status", 3).eq("is_credit_note", false).gte("date_paid", start).lte("date_paid", end),
    admin.from("holded_invoices").select("contact_id, subtotal, raw").eq("status", 3).eq("is_credit_note", false).gte("date_paid", prevStart).lte("date_paid", prevEnd),
    admin.from("holded_invoices").select("contact_id, subtotal").eq("status", 3).eq("is_credit_note", false).gte("date_paid", yoyStart).lte("date_paid", yoyEnd),
    admin.from("holded_products").select("id, sku, cost, purchase_price, commission_delegate, commission_delegate_type, commission_4, commission_4_type, commission_5, commission_5_type"),
    admin.from("holded_contacts").select("id, kol_id, affiliate_id, coordinator_id, recommender_id, recommender_rate"),
    admin.from("holded_invoices").select("contact_id").eq("status", 3).eq("is_credit_note", false).gte("date_paid", yearAgo),
  ]);

  type RawLine = { productId?: string; units?: number | string; price?: number | string; discount?: number | string };
  type ContactMeta = { kol_id: string | null; affiliate_id: string | null; coordinator_id: string | null; recommender_id: string | null; recommender_rate: number | null };

  const delegates = (delegatesRes.data ?? []) as { id: string; full_name: string; delegate_name: string | null; email: string | null; is_kol: boolean }[];
  const cdRows    = (cdRes.data ?? []) as { delegate_id: string; contact_id: string; assigned_at: string }[];
  const curInvs   = (curInvRes.data  ?? []) as { id: string; contact_id: string; subtotal: number | null; raw: Record<string, unknown> }[];
  const prevInvs  = (prevInvRes.data ?? []) as { contact_id: string; subtotal: number | null; raw: Record<string, unknown> }[];
  const yoyInvs   = (yoyInvRes.data  ?? []) as { contact_id: string; subtotal: number | null }[];
  const yearInvs  = (yearInvRes.data ?? []) as { contact_id: string }[];

  const productMap: Record<string, { sku: string | null; cost: number | null; commission_delegate: number | null; commission_delegate_type: CommType; commission_4: number | null; commission_4_type: CommType; commission_5: number | null; commission_5_type: CommType }> = {};
  let sprayCost = 6;
  for (const p of (productsRes.data ?? []) as { id: string; sku: string | null; cost: number | null; purchase_price: number | null; commission_delegate: number | null; commission_delegate_type: string; commission_4: number | null; commission_4_type: string; commission_5: number | null; commission_5_type: string }[]) {
    const cost = p.cost ?? p.purchase_price ?? null;
    productMap[p.id] = { sku: p.sku, cost, commission_delegate: p.commission_delegate, commission_delegate_type: (p.commission_delegate_type ?? "percent") as CommType, commission_4: p.commission_4, commission_4_type: (p.commission_4_type ?? "percent") as CommType, commission_5: p.commission_5, commission_5_type: (p.commission_5_type ?? "percent") as CommType };
    if (p.sku === "VIHO-OBE-SPRAY-002" && cost != null) sprayCost = cost;
  }

  const contactMeta: Record<string, ContactMeta> = {};
  for (const c of (contactsRes.data ?? []) as (ContactMeta & { id: string })[]) contactMeta[c.id] = c;

  // Secondary
  const invoiceIds          = curInvs.map(i => i.id);
  const curActiveContactIds = [...new Set(curInvs.map(i => i.contact_id))];
  const [bixgrowRes, priorRes] = await Promise.all([
    invoiceIds.length > 0
      ? admin.from("bixgrow_orders").select("invoice_id, commission").in("invoice_id", invoiceIds)
      : { data: [] },
    curActiveContactIds.length > 0
      ? admin.from("holded_invoices").select("contact_id").in("contact_id", curActiveContactIds).eq("status", 3).eq("is_credit_note", false).lt("date_paid", start).limit(500)
      : { data: [] },
  ]);

  const bixgrowMap: Record<string, number> = {};
  for (const bo of (bixgrowRes.data ?? []) as { invoice_id: string | null; commission: number }[]) {
    if (bo.invoice_id) bixgrowMap[bo.invoice_id] = (bixgrowMap[bo.invoice_id] ?? 0) + bo.commission;
  }
  const priorContactIds = new Set((priorRes.data ?? []).map(r => (r as { contact_id: string }).contact_id));
  const newClientIds    = new Set(curActiveContactIds.filter(id => !priorContactIds.has(id)));
  const yearActiveIds   = new Set(yearInvs.map(i => i.contact_id));
  const recentActiveIds = new Set(yearInvs.filter(i => { const dp = (i as { date_paid?: string }).date_paid; return dp != null && dp >= ninetyAgo; }).map(i => i.contact_id));

  // Build contact aggregates helper
  function buildAgg(invs: { id?: string; contact_id: string; subtotal: number | null; raw: Record<string, unknown> }[], useBixgrow = false) {
    const agg: Record<string, { subtotal: number; count: number; sprayUnits: number; focUnits: number; cogs: number; focCogs: number; commDelegate: number; commRec: number; commKol: number; commAffiliate: number; commCoord: number }> = {};
    for (const inv of invs) {
      const cid  = inv.contact_id;
      const meta = contactMeta[cid] ?? { kol_id: null, affiliate_id: null, coordinator_id: null, recommender_id: null, recommender_rate: null };
      if (!agg[cid]) agg[cid] = { subtotal: 0, count: 0, sprayUnits: 0, focUnits: 0, cogs: 0, focCogs: 0, commDelegate: 0, commRec: 0, commKol: 0, commAffiliate: 0, commCoord: 0 };
      const sub = inv.subtotal ?? 0;
      agg[cid].subtotal += sub;
      agg[cid].count++;
      if (meta.recommender_id) {
        const rr = contactMeta[meta.recommender_id]?.recommender_rate ?? 0;
        if (rr > 0) agg[cid].commRec += sub * (rr / 100);
      }
      const invId = inv.id ?? "";
      if (useBixgrow && bixgrowMap[invId] != null) agg[cid].commAffiliate += bixgrowMap[invId];
      else if (meta.affiliate_id) agg[cid].commAffiliate += sub * AFFILIATE_RATE;
      for (const rp of ((inv.raw?.products ?? []) as RawLine[])) {
        if (!rp.productId) continue;
        const prod = productMap[rp.productId];
        if (!prod) continue;
        const units = Number(rp.units) || 0;
        const price = Number(rp.price) || 0;
        const disc  = Number(rp.discount) || 0;
        const isFoc = price === 0;
        if (isFoc) { agg[cid].focUnits += units; agg[cid].focCogs += units * sprayCost; }
        else {
          agg[cid].sprayUnits  += units;
          agg[cid].cogs        += units * sprayCost;
          agg[cid].commDelegate += calcLine(units, price, disc, prod.commission_delegate, prod.commission_delegate_type);
          if (meta.kol_id)         agg[cid].commKol   += calcLine(units, price, disc, prod.commission_4, prod.commission_4_type);
          if (meta.coordinator_id) agg[cid].commCoord += calcLine(units, price, disc, prod.commission_5, prod.commission_5_type);
        }
      }
    }
    return agg;
  }

  const curAgg  = buildAgg(curInvs, true);
  const prevAgg = buildAgg(prevInvs);
  const yoySubByContact: Record<string, number> = {};
  for (const inv of yoyInvs) yoySubByContact[inv.contact_id] = (yoySubByContact[inv.contact_id] ?? 0) + (inv.subtotal ?? 0);

  const delegateContacts: Record<string, Set<string>> = {};
  for (const cd of cdRows) {
    if (!delegateContacts[cd.delegate_id]) delegateContacts[cd.delegate_id] = new Set();
    delegateContacts[cd.delegate_id].add(cd.contact_id);
  }

  const rows: PerfDelegateRow[] = delegates.map(d => {
    const contacts = delegateContacts[d.id] ?? new Set<string>();
    let ingresos = 0, prevIngresos = 0, yoyIngresos = 0;
    let sprayUnits = 0, focUnits = 0, prevSprayUnits = 0;
    let cogs = 0, focCogs = 0;
    let commDelegate = 0, commRec = 0, commKol = 0, commAffiliate = 0, commCoord = 0;
    let invoiceCount = 0;
    const activeSet = new Set<string>();
    let newClients = 0, dormantClients = 0;
    for (const cid of contacts) {
      const cur  = curAgg[cid];
      const prev = prevAgg[cid];
      if (cur) { ingresos += cur.subtotal; sprayUnits += cur.sprayUnits; focUnits += cur.focUnits; cogs += cur.cogs; focCogs += cur.focCogs; commDelegate += cur.commDelegate; commRec += cur.commRec; commKol += cur.commKol; commAffiliate += cur.commAffiliate; commCoord += cur.commCoord; invoiceCount += cur.count; activeSet.add(cid); }
      prevIngresos   += prev?.subtotal ?? 0;
      prevSprayUnits += prev?.sprayUnits ?? 0;
      yoyIngresos    += yoySubByContact[cid] ?? 0;
      if (newClientIds.has(cid)) newClients++;
      if (yearActiveIds.has(cid) && !recentActiveIds.has(cid)) dormantClients++;
    }
    const grossMargin  = ingresos - cogs - focCogs;
    const totalChain   = commDelegate + commKol + commAffiliate + commCoord;
    const netContrib   = grossMargin - totalChain;
    const netMarginPct = ingresos > 0 ? (netContrib / ingresos) * 100 : null;
    const roi          = totalChain > 0 ? ingresos / totalChain : null;
    const deltaUnits   = prevSprayUnits > 0 ? ((sprayUnits - prevSprayUnits) / prevSprayUnits) * 100 : null;
    const deltaYoy     = yoyIngresos > 0 ? ((ingresos - yoyIngresos) / yoyIngresos) * 100 : null;
    return { id: d.id, name: d.delegate_name ?? d.full_name, is_kol: d.is_kol, sprayUnits, focUnits, prevSprayUnits, deltaUnits, deltaYoy, ingresos, grossMargin, commDelegate, commRec, totalChain, netContribution: netContrib, netMarginPct, roi, invoiceCount, activeClients: activeSet.size, totalClients: contacts.size, newClients, dormantClients, status: delegateStatus(sprayUnits) };
  }).sort((a, b) => b.sprayUnits - a.sprayUnits);

  const totalIngresos = rows.reduce((s, r) => s + r.ingresos, 0);
  const totalChain    = rows.reduce((s, r) => s + r.totalChain, 0);
  const data: PerfReportData = {
    periodLabel: new Date(pYear, pMonth).toLocaleDateString("es-ES", { month: "long", year: "numeric" }),
    prevLabel:   new Date(prevD.y, prevD.m).toLocaleDateString("es-ES",   { month: "long", year: "numeric" }),
    generatedAt: new Date().toLocaleString("es-ES"),
    rows,
    totals: {
      ingresos:    totalIngresos,
      sprayUnits:  rows.reduce((s, r) => s + r.sprayUnits, 0),
      commChain:   totalChain,
      netContrib:  rows.reduce((s, r) => s + r.netContribution, 0),
      newClients:  rows.reduce((s, r) => s + r.newClients, 0),
      invoices:    rows.reduce((s, r) => s + r.invoiceCount, 0),
      active:      rows.filter(r => r.sprayUnits > 0).length,
      total:       rows.length,
      roi:         totalChain > 0 ? totalIngresos / totalChain : null,
      grossMargin: rows.reduce((s, r) => s + r.grossMargin, 0),
    },
  };

  try {
    const element = React.createElement(PerformanceReport, { data });
    const buffer = await renderToBuffer(element as React.ReactElement<DocumentProps>);
    const mesLabel = `${String(pMonth + 1).padStart(2, "0")}-${pYear}`;
    return new Response(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `attachment; filename="performance-${mesLabel}.pdf"`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[performance/informe]", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
