import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";
import { renderTemplate, buildUltimaCompraClause, firstName, type EmailLang, type LastOrderInfo } from "@/lib/email-template-render";
import { ReactivacionClient, type ReactivacionRow, type TemplateOption } from "./ReactivacionClient";

interface RawProductLine { name?: string; productId?: string }

export default async function ReactivacionPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const isOwner = ["OWNER", "ADMIN"].includes(profile.role);
  const admin = createAdminClient();

  let query = admin
    .from("reactivation_actions")
    .select("id, client_id, entity_type, owner_id, status, dormancy_status, days_inactive_at_detection, sequence_step, email_personalizado, email_language, email_template_id, created_at, authorized_at")
    .in("status", ["pendiente", "autorizado"])
    .order("created_at", { ascending: false });

  if (!isOwner) query = query.eq("owner_id", profile.id);

  const { data: actionsData } = await query;
  const actions = actionsData ?? [];

  // Reactivación templates (per al selector + per calcular el text per defecte)
  const { data: templatesData } = await admin
    .from("email_templates")
    .select("id, name, subject, body_text, language, is_default")
    .eq("category", "reactivacion");
  const templates = (templatesData ?? []) as TemplateOption[];

  if (actions.length === 0) {
    return (
      <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Reactivación de clientes</h1>
        <p className="text-sm text-[#6B7280]">No hay acciones de reactivación pendientes en este momento.</p>
      </div>
    );
  }

  const clientIds = [...new Set(actions.map(a => a.client_id))];
  const ownerIds  = [...new Set(actions.map(a => a.owner_id).filter(Boolean) as string[])];

  const [viewRes, profilesRes, overridesRes, invoicesRes] = await Promise.all([
    admin
      .from("v_clients_dormits")
      .select("entity_id, entity_type, entity_name, email, days_inactive, dormancy_status, antiguity_segment, volume_segment, lifetime_revenue")
      .in("entity_id", clientIds),
    ownerIds.length > 0
      ? admin.from("profiles").select("id, full_name, delegate_name").in("id", ownerIds)
      : Promise.resolve({ data: [] }),
    admin.from("client_template_overrides").select("client_id, language, template_id").eq("category", "reactivacion").in("client_id", clientIds),
    admin.from("holded_invoices")
      .select("contact_id, doc_number, date_paid, raw")
      .in("contact_id", clientIds)
      .eq("status", 3).eq("is_credit_note", false)
      .order("date_paid", { ascending: false }),
  ]);

  const viewMap: Record<string, {
    entity_name: string; email: string | null; days_inactive: number | null;
    dormancy_status: string; antiguity_segment: string | null; volume_segment: string;
    lifetime_revenue: number;
  }> = {};
  for (const v of viewRes.data ?? []) viewMap[v.entity_id] = v;

  const ownerMap: Record<string, string> = {};
  for (const p of (profilesRes.data ?? []) as { id: string; full_name: string; delegate_name: string | null }[]) {
    ownerMap[p.id] = p.delegate_name ?? p.full_name;
  }

  // Override per (client_id, language) → template_id
  const overrideMap: Record<string, string> = {};
  for (const o of (overridesRes.data ?? []) as { client_id: string; language: string; template_id: string }[]) {
    overrideMap[`${o.client_id}:${o.language}`] = o.template_id;
  }

  // Darrera factura per client (primera fila per contact_id, ja ve ordenat per date_paid desc)
  const lastOrderMap: Record<string, LastOrderInfo> = {};
  for (const inv of (invoicesRes.data ?? []) as { contact_id: string; doc_number: string | null; date_paid: string | null; raw: Record<string, unknown> }[]) {
    if (lastOrderMap[inv.contact_id]) continue; // ja tenim la més recent
    const lines = (inv.raw?.products ?? []) as RawProductLine[];
    const products = lines.map(l => l.name).filter((n): n is string => !!n);
    lastOrderMap[inv.contact_id] = { docNumber: inv.doc_number, products };
  }

  const templatesByLang: Record<EmailLang, TemplateOption[]> = { es: [], ca: [] };
  for (const t of templates) templatesByLang[t.language as EmailLang].push(t);

  function resolveTemplate(clientId: string, lang: EmailLang): TemplateOption | null {
    const overrideId = overrideMap[`${clientId}:${lang}`];
    if (overrideId) {
      const t = templates.find(t => t.id === overrideId);
      if (t) return t;
    }
    return templatesByLang[lang].find(t => t.is_default) ?? templatesByLang[lang][0] ?? null;
  }

  function buildEmailText(clientName: string, delegateName: string, lang: EmailLang, template: TemplateOption | null, lastOrder: LastOrderInfo | undefined): string {
    if (!template) return "";
    return renderTemplate(template.body_text, {
      nombre: firstName(clientName),
      delegado: delegateName,
      ultima_compra: buildUltimaCompraClause(lang, lastOrder ?? null),
    });
  }

  const rows: ReactivacionRow[] = actions.map(a => {
    const v = viewMap[a.client_id];
    const delegateName = a.owner_id ? (ownerMap[a.owner_id] ?? "—") : "—";
    const lang = (a.email_language as EmailLang) ?? "es";
    const template = a.email_template_id
      ? templates.find(t => t.id === a.email_template_id) ?? resolveTemplate(a.client_id, lang)
      : resolveTemplate(a.client_id, lang);
    const clientName = v?.entity_name ?? a.client_id;
    const lastOrder = lastOrderMap[a.client_id];

    return {
      id: a.id,
      clientId: a.client_id,
      entityType: a.entity_type,
      clientName,
      clientEmail: v?.email ?? null,
      status: a.status,
      daysInactive: v?.days_inactive ?? a.days_inactive_at_detection,
      dormancyStatus: v?.dormancy_status ?? a.dormancy_status,
      antiguitySegment: v?.antiguity_segment ?? null,
      volumeSegment: v?.volume_segment ?? "sin_volumen",
      lifetimeRevenue: v?.lifetime_revenue ?? 0,
      delegateName,
      createdAt: a.created_at,
      authorizedAt: a.authorized_at,
      language: lang,
      templateId: template?.id ?? null,
      lastOrder: lastOrder ?? null,
      emailText: a.email_personalizado ?? buildEmailText(clientName, delegateName, lang, template, lastOrder),
    };
  }).sort((a, b) => (b.daysInactive ?? 0) - (a.daysInactive ?? 0));

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Reactivación de clientes</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          {rows.length} acci{rows.length !== 1 ? "ones" : "ón"} de reactivación
          {isOwner ? " (todos los delegados)" : " asignadas a ti"}
        </p>
      </div>
      <ReactivacionClient rows={rows} templatesByLang={templatesByLang} isOwner={isOwner} />
    </div>
  );
}
