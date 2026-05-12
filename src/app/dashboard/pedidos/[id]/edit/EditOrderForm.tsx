"use client";

import { useState, useActionState } from "react";
import { updateOrderAction } from "@/app/actions/orders";
import type { OrderFormState } from "@/app/actions/orders";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  price: number | null;
  taxes: string[];
  price_pvp: number | null;
}

interface OrderLine {
  key: number;
  productId: string;
  name: string;
  units: number;
  price: number;
  discount: number;
  taxes: string[];
}

interface Props {
  orderId: string;
  contactId: string;
  contactName: string;
  dateUnix: number;
  notes: string;
  initialLines: OrderLine[];
  products: Product[];
}

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

const inputCls = "w-full h-9 rounded-lg border border-[#E5E7EB] px-3 text-sm focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10";

export function EditOrderForm({ orderId, contactId, contactName, dateUnix, notes: initialNotes, initialLines, products }: Props) {
  const [state, action, pending] = useActionState<OrderFormState | null, FormData>(updateOrderAction, null);

  const seedLines = initialLines.length > 0
    ? initialLines
    : [{ key: 0, productId: "", name: "", units: 1, price: 0, discount: 0, taxes: [] }];

  const [lines, setLines] = useState<OrderLine[]>(seedLines);

  function addLine() {
    setLines(prev => [...prev, { key: Date.now(), productId: "", name: "", units: 1, price: 0, discount: 0, taxes: [] }]);
  }

  function removeLine(key: number) {
    setLines(prev => prev.filter(l => l.key !== key));
  }

  function handleProductChange(key: number, productId: string) {
    if (!productId) {
      setLines(prev => prev.map(l => l.key !== key ? l : { ...l, productId: "", name: "", price: 0, taxes: [] }));
      return;
    }
    const p = products.find(pr => pr.id === productId);
    if (!p) return;
    setLines(prev => prev.map(l => l.key !== key ? l : {
      ...l,
      productId,
      name: p.name,
      price: p.price_pvp ?? p.price ?? 0,
      taxes: Array.isArray(p.taxes) ? p.taxes : [],
    }));
  }

  function setLineField(key: number, field: "units" | "price" | "discount", value: number) {
    setLines(prev => prev.map(l => l.key !== key ? l : { ...l, [field]: value }));
  }

  const orderTotal = lines.reduce((sum, l) => {
    if (!l.productId) return sum;
    return sum + l.price * l.units * (1 - l.discount / 100);
  }, 0);

  if (state?.success) {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[#0A0A0A]">Pedido actualizado</h2>
        <p className="text-sm text-[#6B7280]">Los cambios se han guardado correctamente en Holded.</p>
        <div className="flex gap-3 justify-center pt-2">
          <a href="/dashboard/pedidos" className="h-9 px-4 rounded-lg bg-[#8E0E1A] text-sm font-semibold text-white hover:bg-[#6B0A14] transition-colors flex items-center">
            Ver pedidos
          </a>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6">
      {/* Hidden metadata */}
      <input type="hidden" name="order_id"             value={orderId} />
      <input type="hidden" name="contact_id"           value={contactId} />
      <input type="hidden" name="contact_name"         value={contactName} />
      <input type="hidden" name="date_unix"            value={dateUnix} />
      <input type="hidden" name="recargo_equivalencia" value="false" />

      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-[#8E0E1A]">
          {state.error}
        </div>
      )}

      {/* ── Productos ───────────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm">
        <div className="px-5 py-4 border-b border-[#F3F4F6] flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#0A0A0A]">Productos</h2>
          <button type="button" onClick={addLine}
            className="h-7 px-3 text-xs font-semibold rounded-lg bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB] transition-colors">
            + Añadir línea
          </button>
        </div>

        <div className="divide-y divide-[#F3F4F6]">
          {lines.map((line, idx) => {
            const lineTotal = line.productId ? line.price * line.units * (1 - line.discount / 100) : 0;

            return (
              <div key={line.key} className="px-5 py-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-[#9CA3AF] w-5 shrink-0">{idx + 1}</span>
                  <div className="flex-1">
                    {/*
                      name="product_id[]" on the <select> itself — the browser puts the
                      selected option value directly into FormData at submission time,
                      which is more reliable than syncing a hidden input via React state.
                    */}
                    <select
                      name="product_id[]"
                      value={line.productId}
                      onChange={e => handleProductChange(line.key, e.target.value)}
                      className={inputCls + " bg-white"}
                    >
                      <option value="">Selecciona un producto…</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}{p.sku ? ` (${p.sku})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  {lines.length > 1 && (
                    <button type="button" onClick={() => removeLine(line.key)}
                      className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-[#9CA3AF] hover:text-[#8E0E1A] hover:bg-red-50 transition-colors">
                      ✕
                    </button>
                  )}
                </div>

                {/* Derived hidden inputs — React state keeps these in sync */}
                <input type="hidden" name="product_name[]"  value={line.name} />
                <input type="hidden" name="product_taxes[]" value={(Array.isArray(line.taxes) ? line.taxes : []).join(",")} />

                {line.productId ? (
                  <div className="flex items-center gap-3 pl-7 flex-wrap">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-[#6B7280] whitespace-nowrap">Uds.</label>
                      <input
                        name="units[]"
                        type="number" min="1" step="1"
                        value={line.units}
                        onChange={e => setLineField(line.key, "units", Number(e.target.value))}
                        className="w-20 h-8 rounded-lg border border-[#E5E7EB] px-2 text-sm text-center tabular-nums focus:border-[#8E0E1A] focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-[#6B7280] whitespace-nowrap">Precio €</label>
                      <input
                        name="product_price[]"
                        type="number" min="0" step="0.01"
                        value={line.price}
                        onChange={e => setLineField(line.key, "price", Number(e.target.value))}
                        className="w-24 h-8 rounded-lg border border-[#E5E7EB] px-2 text-sm text-center tabular-nums focus:border-[#8E0E1A] focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-[#6B7280] whitespace-nowrap">Dto %</label>
                      <input
                        name="discount[]"
                        type="number" min="0" max="100" step="0.1"
                        value={line.discount}
                        onChange={e => setLineField(line.key, "discount", Number(e.target.value))}
                        className="w-20 h-8 rounded-lg border border-[#E5E7EB] px-2 text-sm text-center tabular-nums focus:border-[#8E0E1A] focus:outline-none"
                      />
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-sm font-bold text-[#0A0A0A] tabular-nums">{fmtEuro(lineTotal)}</p>
                    </div>
                  </div>
                ) : (
                  /* Emit placeholders so FormData indices stay aligned with product_id[] */
                  <>
                    <input type="hidden" name="units[]"         value="1" />
                    <input type="hidden" name="product_price[]" value="0" />
                    <input type="hidden" name="discount[]"      value="0" />
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-5 py-3 bg-[#F9FAFB] border-t border-[#E5E7EB] flex items-center justify-between">
          <span className="text-xs font-medium text-[#6B7280]">Base imponible total (s/ IVA)</span>
          <span className="text-base font-bold text-[#0A0A0A] tabular-nums">{fmtEuro(orderTotal)}</span>
        </div>
      </section>

      {/* ── Notes ───────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm px-5 py-4 space-y-3">
        <label className="block text-xs font-medium text-[#374151]">Notas del pedido</label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={initialNotes}
          placeholder="Instrucciones especiales, referencias…"
          className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 resize-none"
        />
      </section>

      <div className="flex items-center justify-between">
        <a href="/dashboard/pedidos"
          className="h-9 px-4 rounded-lg border border-[#E5E7EB] text-sm font-medium text-[#374151] hover:bg-[#F9FAFB] transition-colors flex items-center">
          Cancelar
        </a>
        <button
          type="submit"
          disabled={pending}
          className="h-10 px-6 rounded-xl bg-[#8E0E1A] text-sm font-bold text-white hover:bg-[#6B0A14] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {pending ? "Guardando…" : "Guardar cambios en Holded"}
        </button>
      </div>
    </form>
  );
}
