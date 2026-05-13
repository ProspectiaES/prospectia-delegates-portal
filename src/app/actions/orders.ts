"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createContact, createSalesOrder, updateSalesOrder, getDocument, getHoldedTaxes } from "@/lib/holded/api";
import { sendMail, buildOrderEmail } from "@/lib/email";

export interface OrderFormState {
  error?: string;
  success?: boolean;
  orderId?: string;
  docNumber?: string;
}

export async function submitOrder(
  _prev: OrderFormState | null,
  formData: FormData
): Promise<OrderFormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const admin = createAdminClient();

  // Fetch profile to know the role (needed for contact_delegates)
  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, full_name, delegate_name")
    .eq("id", user.id)
    .maybeSingle();
  const isDelegate = profile?.role === "DELEGATE";

  // ── Client ────────────────────────────────────────────────────────────────
  const mode       = formData.get("client_mode") as "existing" | "new";
  const recargoStr = formData.get("recargo_equivalencia") as string;
  const recargo    = recargoStr === "true";

  let contactId: string;
  let contactName: string;

  if (mode === "existing") {
    contactId   = formData.get("contact_id")   as string;
    contactName = formData.get("contact_name") as string;
    if (!contactId) return { error: "Selecciona un cliente existente" };
  } else {
    // Create new contact in Holded
    const name            = (formData.get("new_name")    as string)?.trim();
    const nif             = (formData.get("new_nif")     as string)?.trim() || undefined;
    const email           = (formData.get("new_email")   as string)?.trim() || undefined;
    const phone           = (formData.get("new_phone")   as string)?.trim() || undefined;
    const tipoContacto    = (formData.get("tipo_contacto") as string) ?? "company";
    const paymentMethodId = formData.get("payment_method_id") as string;
    const iban            = (formData.get("new_iban")    as string)?.trim() || undefined;
    const newAddress      = (formData.get("new_address")     as string)?.trim() || undefined;
    const newCity         = (formData.get("new_city")        as string)?.trim() || undefined;
    const newPostalCode   = (formData.get("new_postal_code") as string)?.trim() || undefined;
    const newProvince     = (formData.get("new_province")    as string)?.trim() || undefined;
    const newCountry      = (formData.get("new_country")     as string)?.trim() || undefined;

    if (!name) return { error: "El nombre del cliente es obligatorio" };

    // Resolve recargo de equivalencia tax ID (REC 1,4%)
    let recTaxId: string | undefined;
    if (recargo) {
      try {
        const taxes = await getHoldedTaxes();
        const recTax = taxes.find(t =>
          /rec.*1[,.]4/i.test(t.name) || /1[,.]4.*rec/i.test(t.name)
        );
        recTaxId = recTax?.id;
      } catch { /* non-fatal */ }
    }

    try {
      const result = await createContact({
        name,
        code:     nif,
        isperson: tipoContacto === "person" ? 1 : 0,
        email,
        phone,
        type: "client",
        iban: iban || undefined,
        billAddress: (newAddress || newCity || newPostalCode || newProvince || newCountry)
          ? { address: newAddress, city: newCity, postalCode: newPostalCode, province: newProvince, country: newCountry }
          : undefined,
        defaults: {
          paymentMethod: paymentMethodId || undefined,
          salesTax:      recTaxId,
          language: "es",
          currency: "eur",
        },
      });

      if (!result?.id) return { error: "Holded no devolvió ID de contacto" };
      contactId   = result.id;
      contactName = name;

      const recommenderId = (formData.get("recommender_id") as string)?.trim() || null;

      await admin.from("holded_contacts").upsert({
        id:             contactId,
        name:           contactName,
        email:          email ?? null,
        phone:          phone ?? null,
        address:        newAddress    ?? null,
        city:           newCity       ?? null,
        postal_code:    newPostalCode ?? null,
        province:       newProvince   ?? null,
        country:        newCountry    ?? null,
        recommender_id: recommenderId,
        raw:            { id: contactId, name: contactName, email, phone,
                          billAddress: { address: newAddress, city: newCity, postalCode: newPostalCode, province: newProvince, country: newCountry } },
        last_synced_at: new Date().toISOString(),
      }, { onConflict: "id" });
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Error al crear el cliente en Holded" };
    }
  }

  // ── Link delegate to contact ───────────────────────────────────────────────
  if (isDelegate) {
    await admin.from("contact_delegates")
      .upsert({ contact_id: contactId, delegate_id: user.id }, { onConflict: "contact_id,delegate_id" })
      .then(() => {}); // non-fatal
  }

  // ── Products ──────────────────────────────────────────────────────────────
  const productIds    = formData.getAll("product_id[]")    as string[];
  const productNames  = formData.getAll("product_name[]")  as string[];
  const productPrices = formData.getAll("product_price[]") as string[];
  const productTaxes  = formData.getAll("product_taxes[]") as string[];
  const units         = formData.getAll("units[]")         as string[];
  const discounts     = formData.getAll("discount[]")      as string[];

  const lines = productIds
    .map((pid, i) => {
      const baseTaxes = productTaxes[i] ? productTaxes[i].split(",").filter(Boolean) : [];
      const taxes = recargo ? addRecargoTaxes(baseTaxes) : baseTaxes;
      return {
        productId: pid || undefined,
        name:      productNames[i]  ?? "",
        units:     Number(units[i]) || 1,
        price:     Number(productPrices[i]) || 0,
        discount:  Number(discounts[i])     || 0,
        taxes,
      };
    })
    .filter(l => l.productId);

  if (lines.length === 0) return { error: "Añade al menos un producto" };

  // ── Create salesorder in Holded ──────────────────────────────────────────
  const notes = (formData.get("notes") as string)?.trim() || undefined;

  try {
    const created = await createSalesOrder({
      contactId,
      contactName,
      date: Math.floor(Date.now() / 1000),
      currency: "eur",
      language: "es",
      notes,
      products: lines,
    });

    if (!created?.id) return { error: "Holded no devolvió ID de pedido" };

    // Fetch the complete order from Holded to get doc_number and all fields
    let docNumber: string | null = null;
    try {
      const full = await getDocument("salesorder", created.id);
      docNumber = full.docNumber ?? null;

      const fullRaw = full as Record<string, unknown>;
      await admin.from("holded_salesorders").upsert({
        id:              created.id,
        doc_number:      docNumber,
        contact_id:      contactId,
        contact_name:    contactName,
        date:            full.date ? new Date(full.date * 1000).toISOString() : new Date().toISOString(),
        total:           full.total ?? lines.reduce((s, l) => s + l.units * l.price * (1 - (l.discount ?? 0) / 100), 0),
        status:          typeof full.status === "number" ? full.status : 0,
        shipping_status: typeof fullRaw.shippingStatus === "number" ? fullRaw.shippingStatus : null,
        raw:             full,
        last_synced_at:  new Date().toISOString(),
      }, { onConflict: "id" });
    } catch {
      // Fallback: mirror with partial data if Holded fetch fails
      await admin.from("holded_salesorders").upsert({
        id:             created.id,
        contact_id:     contactId,
        contact_name:   contactName,
        date:           new Date().toISOString(),
        total:          lines.reduce((s, l) => s + l.units * l.price * (1 - (l.discount ?? 0) / 100), 0),
        status:         0,
        raw:            { id: created.id, contactId, products: lines },
        last_synced_at: new Date().toISOString(),
      }, { onConflict: "id" });
    }

    revalidatePath("/dashboard/pedidos");
    revalidatePath(`/dashboard/clientes/${contactId}`);

    // Email notification — non-blocking, never fails the action
    const notifyTo = process.env.NOTIFY_EMAIL ?? "lvila@prospectia.es";
    const delegateName = (profile as Record<string, unknown> | null)?.delegate_name as string
      ?? (profile as Record<string, unknown> | null)?.full_name as string
      ?? "Portal";
    const orderTotal = lines.reduce((s, l) => s + l.units * l.price * (1 - (l.discount ?? 0) / 100), 0);
    sendMail({
      to: notifyTo,
      subject: `Nuevo pedido ${docNumber ?? created.id} de ${delegateName}`,
      html: buildOrderEmail({
        docNumber,
        contactName,
        delegateName,
        lines,
        notes,
        total: orderTotal,
        orderUrl: `${process.env.APP_URL ?? "https://dashboard.prospectia.es"}/dashboard/pedidos/${created.id}`,
      }),
    }).catch(() => { /* best-effort */ });

    return { success: true, orderId: created.id, docNumber: docNumber ?? "" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al crear el pedido en Holded" };
  }
}

// ── Update salesorder contents (products + notes) — only for Borrador orders ──
export async function updateOrderAction(
  _prev: OrderFormState | null,
  formData: FormData
): Promise<OrderFormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const admin = createAdminClient();
  const orderId     = formData.get("order_id")     as string;
  const contactId   = formData.get("contact_id")   as string;
  const contactName = formData.get("contact_name") as string;
  const dateUnix    = Number(formData.get("date_unix"));
  const recargo     = formData.get("recargo_equivalencia") === "true";
  const notes       = (formData.get("notes") as string)?.trim() || undefined;

  if (!orderId || !contactId) return { error: "Datos del pedido incompletos" };

  // Permission: OWNER or delegate linked to the contact
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "OWNER") {
    const { data: link } = await admin
      .from("contact_delegates")
      .select("delegate_id")
      .eq("contact_id", contactId)
      .eq("delegate_id", user.id)
      .maybeSingle();
    if (!link) return { error: "Sin permiso para modificar este pedido" };
  }

  const productIds    = formData.getAll("product_id[]")    as string[];
  const productNames  = formData.getAll("product_name[]")  as string[];
  const productPrices = formData.getAll("product_price[]") as string[];
  const productTaxes  = formData.getAll("product_taxes[]") as string[];
  const units         = formData.getAll("units[]")         as string[];
  const discounts     = formData.getAll("discount[]")      as string[];

  const lines = productIds
    .map((pid, i) => {
      const baseTaxes = productTaxes[i] ? productTaxes[i].split(",").filter(Boolean) : [];
      const taxes = recargo ? addRecargoTaxes(baseTaxes) : baseTaxes;
      return { productId: pid || undefined, name: productNames[i] ?? "", units: Number(units[i]) || 1, price: Number(productPrices[i]) || 0, discount: Number(discounts[i]) || 0, taxes };
    })
    .filter(l => l.productId);

  if (lines.length === 0) return { error: "Añade al menos un producto" };

  try {
    await updateSalesOrder(orderId, {
      contactId,
      contactName,
      date: dateUnix || Math.floor(Date.now() / 1000),
      currency: "eur",
      language: "es",
      notes,
      products: lines,
    });

    let docNumber: string | null = null;
    try {
      const full = await getDocument("salesorder", orderId);
      docNumber = full.docNumber ?? null;
      const fullRaw = full as Record<string, unknown>;
      await admin.from("holded_salesorders").upsert({
        id:              orderId,
        doc_number:      docNumber,
        contact_id:      contactId,
        contact_name:    contactName,
        date:            full.date ? new Date(full.date * 1000).toISOString() : new Date().toISOString(),
        total:           full.total ?? lines.reduce((s, l) => s + l.units * l.price * (1 - (l.discount ?? 0) / 100), 0),
        status:          typeof full.status === "number" ? full.status : 0,
        shipping_status: typeof fullRaw.shippingStatus === "number" ? fullRaw.shippingStatus : null,
        raw:             full,
        last_synced_at:  new Date().toISOString(),
      }, { onConflict: "id" });
    } catch { /* fallback: update only totals */ }

    revalidatePath("/dashboard/pedidos");
    return { success: true, orderId, docNumber: docNumber ?? "" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al actualizar el pedido en Holded" };
  }
}

// Add recargo de equivalencia tax codes alongside base IVA codes
function addRecargoTaxes(taxes: string[]): string[] {
  const result = [...taxes];
  for (const t of taxes) {
    if (t === "s_iva_21" && !result.includes("s_rec_52")) result.push("s_rec_52");
    if (t === "s_iva_10" && !result.includes("s_rec_14")) result.push("s_rec_14");
    if (t === "s_iva_4"  && !result.includes("s_rec_05")) result.push("s_rec_05");
  }
  return result;
}
