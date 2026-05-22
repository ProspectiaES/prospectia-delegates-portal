"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";

export interface AnaliticMessage {
  role: "user" | "assistant";
  content: string;
}

const MONTH_LABELS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function monthRange(year: number, month: number) {
  return {
    start: new Date(Date.UTC(year, month, 1)).toISOString(),
    end:   new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)).toISOString(),
  };
}

function normName(s: string) {
  return s.trim().toLowerCase().replace(/\s*&\s*/g, " and ").replace(/\s+/g, " ");
}

type RawLine = { sku?: string; units?: number | string; name?: string };
type Inv = {
  id: string;
  contact_id: string;
  date: string;
  raw: { subtotal?: number; products?: RawLine[]; items?: RawLine[] } | null;
};

async function getAnalyticsContext(): Promise<string> {
  const admin = createAdminClient();
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();

  const windowStart = new Date(Date.UTC(year, month - 5, 1)).toISOString();
  const { end: windowEnd } = monthRange(year, month);

  const [invRes, creditRes, profilesRes, cdRes, simRes] = await Promise.all([
    admin.from("holded_invoices")
      .select("id, contact_id, status, date, is_credit_note, from_invoice_id, raw")
      .in("status", [1, 2, 3])
      .eq("is_credit_note", false)
      .gte("date", windowStart)
      .lte("date", windowEnd),
    admin.from("holded_invoices")
      .select("from_invoice_id")
      .eq("is_credit_note", true)
      .not("from_invoice_id", "is", null),
    admin.from("profiles")
      .select("id, full_name, delegate_name, role")
      .in("role", ["DELEGATE", "KOL", "COORDINATOR"]),
    admin.from("contact_delegates").select("contact_id, delegate_id"),
    admin.from("economic_simulations")
      .select("net_sale_price, estructura_pct, logistics_pct, production_cost_lines")
      .eq("is_performance_reference", true)
      .maybeSingle(),
  ]);

  const cancelled = new Set(
    ((creditRes.data ?? []) as { from_invoice_id: string | null }[])
      .map(r => r.from_invoice_id).filter(Boolean) as string[]
  );

  const allInv = ((invRes.data ?? []) as Inv[]).filter(i => !cancelled.has(i.id));
  const profiles = (profilesRes.data ?? []) as { id: string; full_name: string; delegate_name: string | null }[];
  const cdRows   = (cdRes.data ?? []) as { contact_id: string; delegate_id: string }[];

  const sim = simRes.data as {
    net_sale_price?: number; estructura_pct?: number; logistics_pct?: number;
    production_cost_lines?: { unit_cost?: number }[];
  } | null;
  const costPerUnit = sim
    ? (sim.production_cost_lines ?? []).reduce((s, l) => s + (l.unit_cost ?? 0), 0)
    : null;

  function agg(start: string, end: string) {
    const invs = allInv.filter(i => i.date >= start && i.date <= end);
    let revenue = 0;
    let totalUnits = 0;
    const byProduct: Record<string, number> = {};
    const byDelegate: Record<string, number> = {};
    const clients = new Set<string>();

    for (const inv of invs) {
      revenue += inv.raw?.subtotal ?? 0;
      clients.add(inv.contact_id);
      const lines = inv.raw?.products ?? inv.raw?.items ?? [];
      const delegId = cdRows.find(r => r.contact_id === inv.contact_id)?.delegate_id;
      for (const l of lines) {
        const u = Number(l.units ?? 0);
        totalUnits += u;
        const key = normName((l.name ?? l.sku ?? "").trim());
        if (key) byProduct[key] = (byProduct[key] ?? 0) + u;
        if (delegId) byDelegate[delegId] = (byDelegate[delegId] ?? 0) + u;
      }
    }
    return { revenue, units: totalUnits, clients: clients.size, byProduct, byDelegate, count: invs.length };
  }

  const { start: curStart, end: curEnd }   = monthRange(year, month);
  const { start: prevStart, end: prevEnd } = monthRange(year, month - 1);
  const cur  = agg(curStart, curEnd);
  const prev = agg(prevStart, prevEnd);

  const history = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 5 + i, 1));
    const y = d.getUTCFullYear(), m = d.getUTCMonth();
    const { start, end } = monthRange(y, m);
    const data = agg(start, end);
    return { label: `${MONTH_LABELS[m]} ${y}`, revenue: data.revenue, units: data.units, clients: data.clients };
  });

  const topProducts = Object.entries(cur.byProduct)
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, units]) => ({ name, units }));

  const topDelegates = Object.entries(cur.byDelegate)
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([id, units]) => {
      const p = profiles.find(p => p.id === id);
      return { name: p?.delegate_name ?? p?.full_name ?? "—", units };
    });

  const fmtEur = (n: number) => `${Math.round(n).toLocaleString("es-ES")}€`;
  const varPct = (c: number, p: number) =>
    p > 0 ? ` (${c >= p ? "+" : ""}${((c - p) / p * 100).toFixed(1)}% vs mes ant.)` : "";

  const grossMarginNote = costPerUnit
    ? `Marge brut estimat mes actual: ${fmtEur(cur.revenue - cur.units * costPerUnit)} (cost unitari: ${fmtEur(costPerUnit)})`
    : "Marge brut: sense dades de cost configurades";

  return `=== CONTEXT ANALÍTIC PROSPECTIA — ${MONTH_LABELS[month]} ${year} ===
MES ACTUAL:
- Facturació: ${fmtEur(cur.revenue)}${varPct(cur.revenue, prev.revenue)}
- Unitats venudes: ${cur.units}${varPct(cur.units, prev.units)}
- Factures emeses: ${cur.count}
- Clients actius: ${cur.clients}${varPct(cur.clients, prev.clients)}
- ${grossMarginNote}

MES ANTERIOR (${MONTH_LABELS[month > 0 ? month - 1 : 11]}):
- Facturació: ${fmtEur(prev.revenue)} | Unitats: ${prev.units} | Clients: ${prev.clients}

TOP 8 PRODUCTES per unitats (mes actual):
${topProducts.map((p, i) => `${i + 1}. ${p.name}: ${p.units} ut`).join("\n")}

TOP 10 DELEGATS per unitats (mes actual):
${topDelegates.map((d, i) => `${i + 1}. ${d.name}: ${d.units} ut`).join("\n")}

TENDÈNCIA 6 MESOS:
${history.map(h => `${h.label}: ${fmtEur(h.revenue)} / ${h.units} ut / ${h.clients} clients`).join("\n")}
=== FI CONTEXT ===`;
}

function buildSystemPrompt(context: string): string {
  const today = new Date().toLocaleDateString("ca-ES", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  return `Ets Próspero Analític, l'agent d'intel·ligència financera i comercial de Prospectia.
Data avui: ${today}.

DADES REALS DEL PORTAL (actualitzades ara):
${context}

SOBRE PROSPECTIA:
Empresa de distribució de productes cosmètics/sanitaris via xarxa de delegats comercials.
Els delegats venen a professionals (clientes). Hi ha KOLs i Coordinadors que supervisen delegats.
La facturació prové de Holded (ERP). Els SKUs principals són productes físics.

COM ANALITZAR:
- Usa les dades injectades per respondre preguntes sobre vendes, rendiment, tendències
- Fes sempre comparativa mes actual vs anterior quan sigui rellevant
- Variacions: ▲ pujada · ▼ baixada. Usa % i valors absoluts
- Usa taules markdown per dades comparatives (productes, delegats, períodes)
- Respostes executives: concises, max 3 paràgrafs + taula si cal
- Conclusió executiva de 2 línies al final de cada anàlisi
- Si detectes alguna cosa preocupant, comença amb ⚠️

IDIOMA: Respon en català. Si l'usuari escriu en castellà, respon en castellà.

LÍMITS: Treballes amb les dades del context. Si cal informació no disponible (ex. marge exacte per SKU, dades d'anys anteriors), digues-ho i suggereix com obtenir-la. MAI inventes xifres.`;
}

export async function sendProsperoAnaliticMessage(
  history: AnaliticMessage[],
  newMessage: string,
): Promise<{ reply: string } | { error: string }> {
  const profile = await getProfile();
  if (!profile || (profile.role !== "OWNER" && profile.role !== "CONSIGLIERE")) {
    return { error: "Accés no autoritzat" };
  }

  const [context, anthropicKey] = await Promise.all([
    getAnalyticsContext(),
    Promise.resolve(process.env.ANTHROPIC_API_KEY),
  ]);

  if (!anthropicKey) return { error: "No s'ha configurat ANTHROPIC_API_KEY" };

  const systemPrompt = buildSystemPrompt(context);
  const messages: AnaliticMessage[] = [
    ...history.slice(-12),
    { role: "user", content: newMessage },
  ];

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { error: `Error IA: ${text.slice(0, 200)}` };
  }

  const data = await res.json() as { content: Array<{ type: string; text: string }> };
  const reply = data.content.find(b => b.type === "text")?.text ?? "No he pogut respondre.";
  return { reply };
}
