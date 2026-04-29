"use client";

import { useState, useActionState } from "react";
import { submitOrder } from "@/app/actions/orders";
import type { OrderFormState } from "@/app/actions/orders";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaymentMethod { id: string; name: string; }
interface Contact       { id: string; name: string; }
interface Product {
  id: string;
  name: string;
  sku: string | null;
  price: number | null;
  total: number | null;
  taxes: string[];
}

interface Props {
  paymentMethods: PaymentMethod[];
  contacts: Contact[];
  products: Product[];
}

interface OrderLine {
  key: number;
  productId: string;
  productName: string;
  productPrice: number;
  productTaxes: string;
  units: number;
  discount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

const GIRO_KEYWORDS = ["giro"];
function isGiro(name: string) {
  return GIRO_KEYWORDS.some(k => name.toLowerCase().includes(k));
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NewOrderForm({ paymentMethods, contacts, products }: Props) {
  const [state, action, pending] = useActionState<OrderFormState | null, FormData>(submitOrder, null);

  // Client mode
  const [clientMode, setClientMode]         = useState<"existing" | "new">("existing");
  const [selectedContactId, setContactId]   = useState("");
  const [selectedContactName, setContactName] = useState("");
  const [contactSearch, setContactSearch]   = useState("");

  // New client fields
  const [paymentMethodId, setPaymentMethodId] = useState(paymentMethods[0]?.id ?? "");
  const [recargo, setRecargo]                 = useState(false);
  const [showIban, setShowIban]               = useState(false);

  // Product lines
  const [lines, setLines] = useState<OrderLine[]>([{ key: 0, productId: "", productName: "", productPrice: 0, productTaxes: "", units: 1, discount: 0 }]);
  const nextKey = () => Date.now();

  const filteredContacts = contactSearch.length >= 2
    ? contacts.filter(c => c.name.toLowerCase().includes(contactSearch.toLowerCase())).slice(0, 15)
    : [];

  function addLine() {
    setLines(prev => [...prev, { key: nextKey(), productId: "", productName: "", productPrice: 0, productTaxes: "", units: 1, discount: 0 }]);
  }

  function removeLine(key: number) {
    setLines(prev => prev.filter(l => l.key !== key));
  }

  function setLineProduct(key: number, p: Product) {
    setLines(prev => prev.map(l => l.key !== key ? l : {
      ...l,
      productId:    p.id,
      productName:  p.name,
      productPrice: p.price ?? 0,
      productTaxes: (p.taxes ?? []).join(","),
    }));
  }

  function setLineField(key: number, field: "units" | "discount", value: number) {
    setLines(prev => prev.map(l => l.key !== key ? l : { ...l, [field]: value }));
  }

  const orderTotal = lines.reduce((sum, l) => {
    const product = products.find(p => p.id === l.productId);
    const priceWithTax = product?.total ?? l.productPrice;
    return sum + priceWithTax * l.units * (1 - l.discount / 100);
  }, 0);

  if (state?.success) {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[#0A0A0A]">Pedido creado</h2>
        <p className="text-sm text-[#6B7280]">El pedido se ha creado correctamente en Holded.</p>
        <div className="flex gap-3 justify-center pt-2">
          <a href="/dashboard/pedidos/nuevo" className="h-9 px-4 rounded-lg bg-[#8E0E1A] text-sm font-semibold text-white hover:bg-[#6B0A14] transition-colors flex items-center">
            Nuevo pedido
          </a>
          <a href="/dashboard/clientes" className="h-9 px-4 rounded-lg border border-[#E5E7EB] text-sm font-medium text-[#374151] hover:bg-[#F9FAFB] transition-colors flex items-center">
            Ver clientes
          </a>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-8">
      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-[#8E0E1A]">
          {state.error}
        </div>
      )}

      {/* ── Section 1: Client ─────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm">
        <div className="px-5 py-4 border-b border-[#F3F4F6] flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#0A0A0A]">Cliente</h2>
          <div className="flex rounded-lg border border-[#E5E7EB] overflow-hidden text-xs font-medium">
            {(["existing", "new"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setClientMode(m)}
                className={[
                  "h-7 px-3 transition-colors",
                  clientMode === m ? "bg-[#8E0E1A] text-white" : "bg-white text-[#6B7280] hover:bg-[#F3F4F6]",
                ].join(" ")}
              >
                {m === "existing" ? "Existente" : "Nuevo cliente"}
              </button>
            ))}
          </div>
        </div>

        <input type="hidden" name="client_mode" value={clientMode} />
        <input type="hidden" name="recargo_equivalencia" value={String(recargo)} />

        <div className="px-5 py-4 space-y-4">
          {clientMode === "existing" ? (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-[#374151]">Buscar cliente</label>
              <input
                type="text"
                value={contactSearch}
                onChange={e => { setContactSearch(e.target.value); setContactId(""); setContactName(""); }}
                placeholder="Escribe 2+ caracteres…"
                className="w-full h-9 rounded-lg border border-[#E5E7EB] px-3 text-sm focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10"
              />
              {filteredContacts.length > 0 && !selectedContactId && (
                <ul className="border border-[#E5E7EB] rounded-lg overflow-hidden shadow-sm">
                  {filteredContacts.map(c => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => { setContactId(c.id); setContactName(c.name); setContactSearch(c.name); }}
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-[#F9FAFB] transition-colors border-b border-[#F3F4F6] last:border-0"
                      >
                        {c.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {selectedContactId && (
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-100">
                  <span className="text-xs font-semibold text-emerald-700 flex-1">{selectedContactName}</span>
                  <button type="button" onClick={() => { setContactId(""); setContactName(""); setContactSearch(""); }} className="text-[10px] text-[#9CA3AF] hover:text-[#8E0E1A]">✕</button>
                </div>
              )}
              <input type="hidden" name="contact_id"   value={selectedContactId} />
              <input type="hidden" name="contact_name" value={selectedContactName} />

              {/* Recargo de equivalencia for existing client */}
              <div className="flex items-center justify-between pt-2">
                <label className="text-xs font-medium text-[#374151]">¿Recargo de equivalencia?</label>
                <button
                  type="button"
                  onClick={() => setRecargo(r => !r)}
                  className={["relative inline-flex h-5 w-9 rounded-full transition-colors", recargo ? "bg-[#8E0E1A]" : "bg-[#E5E7EB]"].join(" ")}
                >
                  <span className={["absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform", recargo ? "translate-x-4" : ""].join(" ")} />
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-[#374151] mb-1">Nombre <span className="text-[#8E0E1A]">*</span></label>
                <input name="new_name" type="text" required className="w-full h-9 rounded-lg border border-[#E5E7EB] px-3 text-sm focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Email</label>
                <input name="new_email" type="email" className="w-full h-9 rounded-lg border border-[#E5E7EB] px-3 text-sm focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Teléfono</label>
                <input name="new_phone" type="tel" className="w-full h-9 rounded-lg border border-[#E5E7EB] px-3 text-sm focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10" />
              </div>

              {/* Payment method */}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-[#374151] mb-1">Forma de pago <span className="text-[#8E0E1A]">*</span></label>
                <select
                  name="payment_method_id"
                  value={paymentMethodId}
                  onChange={e => { setPaymentMethodId(e.target.value); setShowIban(isGiro(paymentMethods.find(p => p.id === e.target.value)?.name ?? "")); }}
                  className="w-full h-9 rounded-lg border border-[#E5E7EB] px-3 text-sm bg-white focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10"
                >
                  {paymentMethods.map(pm => (
                    <option key={pm.id} value={pm.id}>{pm.name}</option>
                  ))}
                </select>
              </div>

              {/* IBAN — shown when payment method contains "giro" */}
              {showIban && (
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-[#374151] mb-1">
                    IBAN <span className="text-[#8E0E1A]">*</span>
                    <span className="text-[#9CA3AF] font-normal ml-1">(obligatorio para giro bancario)</span>
                  </label>
                  <input
                    name="new_iban"
                    type="text"
                    required={showIban}
                    placeholder="ES12 0000 0000 0000 0000 0000"
                    className="w-full h-9 rounded-lg border border-[#E5E7EB] px-3 text-sm font-mono focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10"
                  />
                </div>
              )}

              {/* Recargo de equivalencia */}
              <div className="col-span-2 flex items-center justify-between py-1">
                <div>
                  <p className="text-xs font-medium text-[#374151]">¿Recargo de equivalencia?</p>
                  <p className="text-[11px] text-[#9CA3AF]">Aplica recargo sobre IVA en cada línea de producto</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRecargo(r => !r)}
                  className={["relative inline-flex h-5 w-9 rounded-full transition-colors", recargo ? "bg-[#8E0E1A]" : "bg-[#E5E7EB]"].join(" ")}
                >
                  <span className={["absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform", recargo ? "translate-x-4" : ""].join(" ")} />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Section 2: Products ───────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm">
        <div className="px-5 py-4 border-b border-[#F3F4F6] flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#0A0A0A]">Productos</h2>
          <button type="button" onClick={addLine} className="h-7 px-3 text-xs font-semibold rounded-lg bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB] transition-colors">
            + Añadir línea
          </button>
        </div>

        <div className="divide-y divide-[#F3F4F6]">
          {lines.map((line, idx) => {
            const selectedProduct = products.find(p => p.id === line.productId);
            const priceWithTax    = selectedProduct?.total ?? line.productPrice;
            const lineTotal       = priceWithTax * line.units * (1 - line.discount / 100);
            return (
              <div key={line.key} className="px-5 py-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-[#9CA3AF] w-5 shrink-0">{idx + 1}</span>
                  <div className="flex-1">
                    <select
                      onChange={e => {
                        const p = products.find(p => p.id === e.target.value);
                        if (p) setLineProduct(line.key, p);
                      }}
                      className="w-full h-9 rounded-lg border border-[#E5E7EB] px-3 text-sm bg-white focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10"
                      defaultValue=""
                    >
                      <option value="" disabled>Selecciona un producto…</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}{p.sku ? ` (${p.sku})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  {lines.length > 1 && (
                    <button type="button" onClick={() => removeLine(line.key)} className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-[#9CA3AF] hover:text-[#8E0E1A] hover:bg-red-50 transition-colors">
                      ✕
                    </button>
                  )}
                </div>

                {/* Hidden inputs */}
                <input type="hidden" name="product_id[]"    value={line.productId} />
                <input type="hidden" name="product_name[]"  value={line.productName} />
                <input type="hidden" name="product_price[]" value={selectedProduct?.price ?? line.productPrice} />
                <input type="hidden" name="product_taxes[]" value={line.productTaxes} />

                {line.productId && (
                  <div className="flex items-center gap-3 pl-7">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-[#6B7280] whitespace-nowrap">Unidades</label>
                      <input
                        name="units[]"
                        type="number"
                        min="1"
                        step="1"
                        value={line.units}
                        onChange={e => setLineField(line.key, "units", Number(e.target.value))}
                        className="w-20 h-8 rounded-lg border border-[#E5E7EB] px-2 text-sm text-center tabular-nums focus:border-[#8E0E1A] focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-[#6B7280] whitespace-nowrap">Dto %</label>
                      <input
                        name="discount[]"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={line.discount}
                        onChange={e => setLineField(line.key, "discount", Number(e.target.value))}
                        className="w-20 h-8 rounded-lg border border-[#E5E7EB] px-2 text-sm text-center tabular-nums focus:border-[#8E0E1A] focus:outline-none"
                      />
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-[10px] text-[#9CA3AF]">{fmtEuro(priceWithTax)} / ud · IVA incl.</p>
                      <p className="text-sm font-bold text-[#0A0A0A] tabular-nums">{fmtEuro(lineTotal)}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-5 py-3 bg-[#F9FAFB] border-t border-[#E5E7EB] flex items-center justify-between">
          <span className="text-xs font-medium text-[#6B7280]">Total pedido (IVA incl.)</span>
          <span className="text-base font-bold text-[#0A0A0A] tabular-nums">{fmtEuro(orderTotal)}</span>
        </div>
      </section>

      {/* ── Section 3: Notes + submit ─────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm px-5 py-4 space-y-3">
        <label className="block text-xs font-medium text-[#374151]">Notas del pedido</label>
        <textarea
          name="notes"
          rows={3}
          placeholder="Instrucciones especiales, referencias…"
          className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 resize-none"
        />
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="h-10 px-6 rounded-xl bg-[#8E0E1A] text-sm font-bold text-white hover:bg-[#6B0A14] disabled:opacity-60 transition-colors shadow-sm"
        >
          {pending ? "Creando pedido…" : "Crear pedido en Holded"}
        </button>
      </div>
    </form>
  );
}
