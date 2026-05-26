import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_ROLES = ["OWNER", "ADMIN", "KOL", "COORDINATOR"];

const SYSTEM_PROMPT = `Eres un asistente especializado en análisis de ventas y rendimiento para una empresa de distribución directa (modelo delegados/KOL). Trabajas con los siguientes datos y métricas. Úsalos como fuente de verdad para cualquier análisis que te pidan.

Los datos reales del negocio te serán proporcionados en el primer mensaje del sistema como JSON estructurado. No inventes cifras. Si un campo falta, indícalo explícitamente.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODELO DE NEGOCIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Producto principal: spray (SKU: VIHO-OBE-SPRAY-002), PVP ~45€
Producto promo/FOC: unidades gratuitas enviadas como regalo (no generan ingresos)

Roles de red:
  - DELEGATE    : vende directamente a clientes. Cobra comisión por tramos.
  - KOL         : gestiona una red de delegados. Cobra 3% fijo sobre unidades × 31€ de toda su red.
  - COORDINATOR : gestiona operaciones. Su coste se registra manualmente en gastos (categoría "coordinador").
  - Recomendador: contacto externo que refiere clientes. Cobra X% del subtotal de cada factura de sus referidos (configurable por contacto, defecto 3%).
  - Afiliado Bixgrow: programa externo de afiliados; comisión real almacenada en bixgrow_orders.commission.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGLAS DE CÁLCULO ESENCIALES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

UNIDADES VENDIDAS (definición canónica)
  Facturas con status IN (1,2,3), filtradas por fecha de EMISIÓN (date),
  campo products[].sku === "VIHO-OBE-SPRAY-002",
  excluyendo notas de crédito (is_credit_note=false),
  excluyendo facturas cuyo id aparece en from_invoice_id de alguna nota de crédito.
  → NUNCA usar status=3 (pagadas) ni date_paid para "vendidas".

UNIDADES FOC
  Mismo filtro de facturas pero sku IN (lista de SKUs promo).
  Se muestran siempre por separado. NUNCA se suman a las vendidas.

TRAMOS DE COMISIÓN DELEGADO (base: 31€/ud)
  Tramo 1:   1–24 uds  → 15% → 4,65€/ud
  Tramo 2:  25–99 uds  → 20% → 6,20€/ud
  Tramo 3: 100–249 uds → 25% → 7,75€/ud
  Tramo 4: 250–499 uds → 28% → 8,68€/ud
  Tramo 5: 500+    uds → 29% → 8,99€/ud
  Comisión = unidades_mes × 31 × rate / 100
  El tramo se calcula por mes por delegado (no acumulado anual).

COMISIÓN KOL
  3% × unidades_red × 31€
  "Red" = todos los contactos de los delegados que tienen kol_id=este_KOL + los propios contactos del KOL.

COMISIÓN RECOMENDADOR
  revenue_factura × (recommender_commission_pct / 100)
  Se deduce del neto del delegado en autofactura.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITERIOS DE CALIDAD DEL DATO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Siempre excluir notas de crédito de las unidades vendidas.
2. Siempre excluir facturas que tengan una nota de crédito asociada (están en from_invoice_id).
3. "Vendidas" = date (emisión) + status [1,2,3]. "Cobradas" = date_paid + status [3]. Son conceptos distintos.
4. FOC nunca se suma a unidades vendidas; siempre fila separada.
5. Comisión se calcula sobre unidades × 31€ (precio base fijo), NO sobre el precio real de factura.
6. El tramo del delegado se determina por las unidades del mes en curso, no por el acumulado anual.
7. Los datos de coste (costPerUnit, estructura_pct, logistics_pct) vienen siempre de la simulación marcada como is_performance_reference=true en economic_simulations.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPORTAMIENTO DEL AGENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Responde siempre en español.
- Para métricas numéricas usa formato español: 1.234,56 €
- Si te piden una tabla, usa markdown.
- Si te piden un análisis, estructura: resumen ejecutivo → detalle → recomendaciones accionables.
- Nunca calcules unidades vendidas desde date_paid ni desde status=3 solo. Recuerda: date (emisión) + status IN (1,2,3).
- Si los datos no permiten calcular una métrica (campo ausente, simulación sin is_performance_reference=true), dilo antes de dar el resultado.
- Ante preguntas fuera del scope de ventas/rendimiento, declina educadamente y recuerda tu función.`;

// ─── Data fetcher (filtered by ecosystem) ────────────────────────────────────

async function fetchBusinessData(userId: string, role: string) {
  const admin = createAdminClient();
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 14);
  const cutoffIso = cutoff.toISOString();

  type RawInvoice = {
    id: string; contact_id: string; contact_name: string; status: number;
    date: string; date_paid: string | null; is_credit_note: boolean;
    from_invoice_id: string | null; raw: Record<string, unknown> | null;
  };
  type RawContact = {
    id: string; name: string; recommender_id: string | null;
    recommender_commission_pct: number | null; affiliate_id: string | null;
    assigned_coordinator_id: string | null;
  };

  const [invoicesRes, profilesRes, contactsRes, delegatesRes, expensesRes, bixgrowRes, simRes] =
    await Promise.all([
      admin.from("holded_invoices")
        .select("id, contact_id, contact_name, status, date, date_paid, is_credit_note, from_invoice_id, raw")
        .gte("date", cutoffIso).order("date", { ascending: false }),

      admin.from("profiles")
        .select("id, full_name, delegate_name, role, kol_id, coordinator_id")
        .in("role", ["DELEGATE", "KOL", "COORDINATOR", "ADMIN", "COM6", "CONSIGLIERE"]),

      admin.from("holded_contacts")
        .select("id, name, recommender_id, recommender_commission_pct, affiliate_id, assigned_coordinator_id"),

      admin.from("contact_delegates").select("contact_id, delegate_id"),

      admin.from("delegate_expenses")
        .select("delegate_id, category, amount, period")
        .gte("period", cutoff.toISOString().slice(0, 7)),

      admin.from("bixgrow_orders")
        .select("invoice_id, affiliate_id, commission, status")
        .gte("created_at", cutoffIso),

      admin.from("economic_simulations")
        .select("id, net_sale_price, estructura_pct, logistics_pct, production_cost_lines")
        .eq("is_performance_reference", true).maybeSingle(),
    ]);

  let allProfiles   = (profilesRes.data  ?? []) as { id: string; full_name: string; delegate_name: string | null; role: string; kol_id: string | null; coordinator_id: string | null }[];
  let allContacts   = (contactsRes.data  ?? []) as RawContact[];
  let allDelegates  = (delegatesRes.data ?? []) as { contact_id: string; delegate_id: string }[];
  let allExpenses   = (expensesRes.data  ?? []) as { delegate_id: string; category: string; amount: number; period: string }[];
  let allBixgrow    = (bixgrowRes.data   ?? []) as { invoice_id: string; affiliate_id: string; commission: number; status: string }[];
  let allRawInv     = (invoicesRes.data  ?? []) as RawInvoice[];

  // ── Ecosystem filtering — never leak cross-ecosystem data ──────────────────
  if (role === "KOL") {
    // Network = own delegates (kol_id = me) + self
    const networkIds = new Set([userId, ...allProfiles.filter(p => p.kol_id === userId).map(p => p.id)]);
    const networkContactIds = new Set(allDelegates.filter(cd => networkIds.has(cd.delegate_id)).map(cd => cd.contact_id));
    allProfiles  = allProfiles.filter(p => networkIds.has(p.id));
    allDelegates = allDelegates.filter(cd => networkIds.has(cd.delegate_id));
    allContacts  = allContacts.filter(c => networkContactIds.has(c.id));
    allRawInv    = allRawInv.filter(inv => networkContactIds.has(inv.contact_id));
    allExpenses  = allExpenses.filter(e => networkIds.has(e.delegate_id));
    const invIds = new Set(allRawInv.map(i => i.id));
    allBixgrow   = allBixgrow.filter(b => invIds.has(b.invoice_id));

  } else if (role === "COORDINATOR") {
    // Own contacts = assigned_coordinator_id = me
    const myContactIds = new Set(allContacts.filter(c => c.assigned_coordinator_id === userId).map(c => c.id));
    const myDelegateIds = new Set([userId, ...allDelegates.filter(cd => myContactIds.has(cd.contact_id)).map(cd => cd.delegate_id)]);
    allContacts  = allContacts.filter(c => myContactIds.has(c.id));
    allDelegates = allDelegates.filter(cd => myContactIds.has(cd.contact_id));
    allProfiles  = allProfiles.filter(p => myDelegateIds.has(p.id));
    allRawInv    = allRawInv.filter(inv => myContactIds.has(inv.contact_id));
    allExpenses  = allExpenses.filter(e => myDelegateIds.has(e.delegate_id));
    const invIds = new Set(allRawInv.map(i => i.id));
    allBixgrow   = allBixgrow.filter(b => invIds.has(b.invoice_id));
  }
  // OWNER / ADMIN: no filter

  // Compact invoices — strip raw JSON, keep only what the agent needs
  const invoices = allRawInv.map((inv) => {
    const raw = inv.raw as Record<string, unknown> | null;
    const products = (raw?.products as { sku?: string; name?: string; units?: number }[] | null) ?? [];
    return {
      id: inv.id, contact_id: inv.contact_id, contact_name: inv.contact_name,
      status: inv.status, date: inv.date, date_paid: inv.date_paid,
      is_credit_note: inv.is_credit_note, from_invoice_id: inv.from_invoice_id,
      subtotal: raw?.subtotal ?? null, total: raw?.total ?? null,
      products: products.map(p => ({ sku: p.sku, name: p.name, units: p.units })),
    };
  });

  const sim = simRes.data;
  const costLines = (sim?.production_cost_lines as { unit_cost?: number }[] | null) ?? [];
  const costPerUnit = costLines.reduce((s, l) => s + (l.unit_cost ?? 0), 0);

  return {
    today:            new Date().toISOString().slice(0, 10),
    scope:            role === "OWNER" || role === "ADMIN" ? "global" : `ecosistema_${role.toLowerCase()}`,
    invoices,
    profiles:         allProfiles,
    contacts:         allContacts.map(({ assigned_coordinator_id: _, ...rest }) => rest),
    contactDelegates: allDelegates,
    expenses:         allExpenses,
    bixgrowOrders:    allBixgrow,
    simulation: sim ? { net_sale_price: sim.net_sale_price, estructura_pct: sim.estructura_pct, logistics_pct: sim.logistics_pct, costPerUnit } : null,
  };
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("No autorizado", { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles")
    .select("id, role").eq("id", user.id).maybeSingle();

  if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
    return new Response("Acceso denegado", { status: 403 });
  }

  const { message, history = [] } = await req.json() as {
    message: string;
    history: { role: "user" | "assistant"; content: string }[];
  };

  if (!message?.trim()) return new Response("Mensaje vacío", { status: 400 });

  // Fetch fresh business data — filtered to this user's ecosystem
  const data = await fetchBusinessData(user.id, profile.role);
  const dataContext = `A continuación los datos actuales del negocio (snapshot ${data.today}):\n\n\`\`\`json\n${JSON.stringify(data, null, 0)}\n\`\`\``;

  // Build messages: inject data as first user/assistant exchange so it's cached
  const messages: { role: "user" | "assistant"; content: string }[] = [
    { role: "user",      content: dataContext },
    { role: "assistant", content: "Datos recibidos. Estoy listo para analizar. ¿Qué necesitas?" },
    ...history,
    { role: "user",      content: message },
  ];

  const client = new Anthropic();

  const stream = client.messages.stream({
    model:      "claude-sonnet-4-6",
    max_tokens: 4096,
    system:     SYSTEM_PROMPT,
    messages,
  });

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(new TextEncoder().encode(chunk.delta.text));
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type":  "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
