"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSalesOrder, getDocument } from "@/lib/holded/api";
import { addRecargoTaxes, buildNotesWithRecargo } from "@/lib/holded/taxes";
import { sendMail, buildOrderEmail } from "@/lib/email";
import { sendTelegram, buildOrderTelegram } from "@/lib/telegram";
import { getClientContact } from "@/lib/clientSession";

export interface ClientOrderFormState {
  error?: string;
  success?: boolean;
  orderId?: string;
  docNumber?: string;
}

interface DbProduct {
  id: string;
  name: string;
  sku: string | null;
  price: number | null;
  price_pvp: number | null;
  taxes: string[];
}

export async function submitClientOrder(
  _prev: ClientOrderFormState | null,
  formData: FormData
): Promise<ClientOrderFormState> {
  const contact = await getClientContact();
  if (!contact) return { error: "Sesión no válida. Vuelve a iniciar sesión." };

  const admin = createAdminClient();

  const productIds = formData.getAll("product_id[]") as string[];
  const unitsRaw    = formData.getAll("units[]") as string[];

  const requestedUnits: Record<string, number> = {};
  productIds.forEach((pid, i) => {
    if (!pid) return;
    const u = Math.max(1, Math.min(999, Number(unitsRaw[i]) || 0));
    if (u > 0) requestedUnits[pid] = (requestedUnits[pid] ?? 0) + u;
  });

  const ids = Object.keys(requestedUnits);
  if (ids.length === 0) return { error: "Añade al menos un producto" };

  // Prices/taxes are re-derived server-side from the product catalogue —
  // never trusted from the form — since this action is reachable by a
  // public-facing NIF session, unlike the internal staff order form.
  const { data: productsData } = await admin
    .from("holded_products")
    .select("id, name, sku, price, price_pvp, taxes")
    .in("id", ids);

  const products = (productsData ?? []) as DbProduct[];
  if (products.length === 0) return { error: "Productos no válidos" };

  const recargo = contact.has_recargo_equivalencia;

  const lines = products.map(p => {
    const baseTaxes = p.taxes ?? [];
    const taxes = recargo ? addRecargoTaxes(baseTaxes) : baseTaxes;
    return {
      productId: p.id,
      name: p.name,
      units: requestedUnits[p.id],
      price: p.price_pvp ?? p.price ?? 0,
      discount: 0,
      taxes,
    };
  });

  const rawNotes = (formData.get("notes") as string)?.trim() || undefined;
  const notes = buildNotesWithRecargo(rawNotes, recargo);

  try {
    const created = await createSalesOrder({
      contactId: contact.id,
      contactName: contact.name,
      date: Math.floor(Date.now() / 1000),
      currency: "eur",
      language: "es",
      notes,
      products: lines,
    });

    if (!created?.id) return { error: "Holded no devolvió ID de pedido" };

    let docNumber: string | null = null;
    try {
      const full = await getDocument("salesorder", created.id);
      docNumber = full.docNumber ?? null;
      const fullRaw = full as Record<string, unknown>;
      await admin.from("holded_salesorders").upsert({
        id:              created.id,
        doc_number:      docNumber,
        contact_id:      contact.id,
        contact_name:    contact.name,
        date:            full.date ? new Date(full.date * 1000).toISOString() : new Date().toISOString(),
        total:           full.total ?? lines.reduce((s, l) => s + l.units * l.price, 0),
        status:          typeof full.status === "number" ? full.status : 0,
        shipping_status: typeof fullRaw.shippingStatus === "number" ? fullRaw.shippingStatus : null,
        raw:             full,
        last_synced_at:  new Date().toISOString(),
      }, { onConflict: "id" });
    } catch {
      await admin.from("holded_salesorders").upsert({
        id:             created.id,
        contact_id:     contact.id,
        contact_name:   contact.name,
        date:           new Date().toISOString(),
        total:          lines.reduce((s, l) => s + l.units * l.price, 0),
        status:         0,
        raw:            { id: created.id, contactId: contact.id, products: lines },
        last_synced_at: new Date().toISOString(),
      }, { onConflict: "id" });
    }

    revalidatePath("/cliente/pedidos");

    const notifyTo = process.env.NOTIFY_EMAIL ?? "lvila@prospectia.es";
    const orderTotal = lines.reduce((s, l) => s + l.units * l.price, 0);
    const orderUrl = `${process.env.APP_URL ?? "https://dashboard.prospectia.es"}/dashboard/pedidos/${created.id}`;

    sendMail({
      to: notifyTo,
      subject: `Nuevo pedido ${docNumber ?? created.id} de ${contact.name} (autoservicio)`,
      html: buildOrderEmail({
        docNumber, contactName: contact.name,
        delegateName: "Pedido del cliente (portal de autoservicio)",
        lines, notes, total: orderTotal, orderUrl,
      }),
    }).catch(() => { /* best-effort */ });

    sendTelegram(
      buildOrderTelegram({
        docNumber, contactName: contact.name,
        delegateName: "Portal de autoservicio", lines, notes, total: orderTotal, orderUrl,
      })
    ).catch(() => { /* best-effort */ });

    return { success: true, orderId: created.id, docNumber: docNumber ?? "" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al crear el pedido en Holded" };
  }
}
