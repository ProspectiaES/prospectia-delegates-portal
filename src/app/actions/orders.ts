"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createContact, createSalesOrder } from "@/lib/holded/api";

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

  // ── Client ────────────────────────────────────────────────────────────────
  const mode         = formData.get("client_mode") as "existing" | "new";
  const recargoStr   = formData.get("recargo_equivalencia") as string;
  const recargo      = recargoStr === "true";

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

    if (!name) return { error: "El nombre del cliente es obligatorio" };

    try {
      const result = await createContact({
        name,
        code:     nif,
        isperson: tipoContacto === "person" ? 1 : 0,
        email,
        phone,
        type: "client",
        iban: iban || undefined,
        customFields: recargo
          ? [{ field: "Recargo Equivalencia", value: "Sí" }]
          : [{ field: "Recargo Equivalencia", value: "No" }],
        defaults: {
          paymentMethod: paymentMethodId || undefined,
          language: "es",
          currency: "eur",
        },
      });

      if (!result?.id) return { error: "Holded no devolvió ID de contacto" };
      contactId   = result.id;
      contactName = name;

      // Mirror the new contact into Supabase so it appears immediately
      const admin = createAdminClient();
      await admin.from("holded_contacts").upsert({
        id:             contactId,
        name:           contactName,
        email:          email ?? null,
        phone:          phone ?? null,
        raw:            { id: contactId, name: contactName, email, phone },
        last_synced_at: new Date().toISOString(),
      }, { onConflict: "id" });
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Error al crear el cliente en Holded" };
    }
  }

  // ── Products ──────────────────────────────────────────────────────────────
  const productIds    = formData.getAll("product_id[]")    as string[];
  const productNames  = formData.getAll("product_name[]")  as string[];
  const productPrices = formData.getAll("product_price[]") as string[];
  const productTaxes  = formData.getAll("product_taxes[]") as string[];
  const units         = formData.getAll("units[]")         as string[];
  const discounts     = formData.getAll("discount[]")      as string[];

  if (productIds.length === 0) return { error: "Añade al menos un producto" };

  const lines = productIds.map((pid, i) => {
    const baseTaxes = productTaxes[i] ? productTaxes[i].split(",").filter(Boolean) : [];
    const taxes = recargo
      ? addRecargoTaxes(baseTaxes)
      : baseTaxes;

    return {
      productId: pid || undefined,
      name:     productNames[i]  ?? "",
      units:    Number(units[i]) || 1,
      price:    Number(productPrices[i]) || 0,
      discount: Number(discounts[i])    || 0,
      taxes,
    };
  });

  // ── Create salesorder in Holded ──────────────────────────────────────────
  const notes = (formData.get("notes") as string)?.trim() || undefined;

  try {
    const result = await createSalesOrder({
      contactId,
      contactName,
      date: Math.floor(Date.now() / 1000),
      currency: "eur",
      language: "es",
      notes,
      products: lines,
    });

    if (!result?.id) return { error: "Holded no devolvió ID de pedido" };

    revalidatePath("/dashboard/pedidos");
    revalidatePath(`/dashboard/clientes/${contactId}`);
    return { success: true, orderId: result.id, docNumber: String(result.status ?? "") };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al crear el pedido en Holded" };
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
