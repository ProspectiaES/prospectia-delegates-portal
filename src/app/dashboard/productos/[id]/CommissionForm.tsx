"use client";

import { useActionState } from "react";
import { saveProductCommissions, SaveCommissionsState } from "@/app/actions/products";

interface Props {
  productId: string;
  commissions: {
    commission_delegate:    number | null;
    commission_recommender: number | null;
    commission_affiliate:   number | null;
    commission_4:           number | null;
    commission_5:           number | null;
    commission_6:           number | null;
  };
}

const FIELDS: { key: keyof Props["commissions"]; label: string; hint: string }[] = [
  { key: "commission_delegate",    label: "Delegado",      hint: "% sobre venta para el delegado asignado" },
  { key: "commission_recommender", label: "Recomendador",  hint: "% para el recomendador del cliente" },
  { key: "commission_affiliate",   label: "Afiliado",      hint: "% para el afiliado BixGrow" },
  { key: "commission_4",           label: "KOL",           hint: "% para Key Opinion Leader" },
  { key: "commission_5",           label: "Coordinador",   hint: "% para el coordinador" },
  { key: "commission_6",           label: "Comisión 6",    hint: "Tipo de comisión adicional" },
];

const inputCls =
  "h-9 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0A0A0A] placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors shadow-sm tabular-nums";

export function CommissionForm({ productId, commissions }: Props) {
  const [state, action, pending] = useActionState<SaveCommissionsState | null, FormData>(
    saveProductCommissions,
    null
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="product_id" value={productId} />

      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-[#8E0E1A]">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-700">
          Comisiones guardadas.
        </div>
      )}

      {FIELDS.map(({ key, label, hint }) => (
        <div key={key}>
          <label className="block text-xs font-medium text-[#374151] mb-1">
            {label}
          </label>
          <div className="relative">
            <input
              name={key}
              type="number"
              step="0.01"
              min="0"
              max="100"
              defaultValue={commissions[key] ?? ""}
              placeholder="0.00"
              className={inputCls + " pr-8"}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#9CA3AF] pointer-events-none">
              %
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-[#9CA3AF]">{hint}</p>
        </div>
      ))}

      <button
        type="submit"
        disabled={pending}
        className="w-full h-9 rounded-lg bg-[#8E0E1A] text-sm font-semibold text-white hover:bg-[#6B0A14] disabled:opacity-60 transition-colors mt-2"
      >
        {pending ? "Guardando…" : "Guardar comisiones"}
      </button>
    </form>
  );
}
