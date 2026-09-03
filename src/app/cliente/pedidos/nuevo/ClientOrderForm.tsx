"use client";

import { useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { submitClientOrder } from "@/app/actions/clientOrders";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  price: number | null;
  price_pvp: number | null;
  taxes: string[];
}

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

export function ClientOrderForm({ products }: { products: Product[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(submitClientOrder, null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  if (state?.success) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-8 text-center">
        <p className="text-sm font-semibold text-emerald-800">
          Pedido {state.docNumber ? `#${state.docNumber}` : ""} creado correctamente.
        </p>
        <button
          onClick={() => router.push("/cliente/pedidos")}
          className="mt-4 text-sm font-medium text-emerald-700 hover:underline"
        >
          Ver mis pedidos →
        </button>
      </div>
    );
  }

  function setQty(id: string, qty: number) {
    setQuantities(prev => {
      const next = { ...prev };
      if (qty <= 0) delete next[id];
      else next[id] = Math.min(999, qty);
      return next;
    });
  }

  const total = products.reduce((s, p) => {
    const q = quantities[p.id] ?? 0;
    return s + q * (p.price_pvp ?? p.price ?? 0);
  }, 0);

  const selectedCount = Object.values(quantities).filter(q => q > 0).length;

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-[#8E0E1A]">
          {state.error}
        </div>
      )}

      <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm divide-y divide-[#F3F4F6]">
        {products.map(p => {
          const price = p.price_pvp ?? p.price ?? 0;
          const qty = quantities[p.id] ?? 0;
          return (
            <div key={p.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#0A0A0A] truncate">{p.name}</p>
                <p className="text-xs text-[#6B7280] tabular-nums">{fmtEuro(price)}</p>
              </div>
              <input
                type="number"
                min={0}
                max={999}
                value={qty || ""}
                placeholder="0"
                onChange={e => setQty(p.id, Number(e.target.value) || 0)}
                className="w-20 rounded-lg border border-[#E5E7EB] px-2.5 py-1.5 text-sm text-right tabular-nums focus:border-[#B8860B] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/10"
              />
              {qty > 0 && (
                <>
                  <input type="hidden" name="product_id[]" value={p.id} />
                  <input type="hidden" name="units[]" value={qty} />
                </>
              )}
            </div>
          );
        })}
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-[#374151] mb-1.5">
          Notas (opcional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className="w-full rounded-lg border border-[#E5E7EB] px-3.5 py-2.5 text-sm focus:border-[#B8860B] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/10"
        />
      </div>

      <div className="flex items-center justify-between rounded-xl border border-[#E5E7EB] bg-white px-5 py-4">
        <div>
          <p className="text-xs text-[#6B7280]">{selectedCount} producto{selectedCount !== 1 ? "s" : ""} seleccionado{selectedCount !== 1 ? "s" : ""}</p>
          <p className="text-lg font-bold text-[#0A0A0A] tabular-nums">{fmtEuro(total)}</p>
        </div>
        <button
          type="submit"
          disabled={pending || selectedCount === 0}
          className="h-10 px-6 rounded-lg bg-[#B8860B] text-sm font-semibold text-white hover:bg-[#96700A] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? "Enviando…" : "Confirmar pedido"}
        </button>
      </div>
    </form>
  );
}
