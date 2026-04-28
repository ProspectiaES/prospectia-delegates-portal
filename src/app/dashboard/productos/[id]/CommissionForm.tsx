"use client";

import { useState } from "react";
import { useActionState } from "react";
import { saveProductCommissions, SaveCommissionsState } from "@/app/actions/products";

type CommType = "percent" | "amount";

export interface CommissionValues {
  commission_delegate:         number | null;
  commission_delegate_type:    CommType;
  commission_recommender:      number | null;
  commission_recommender_type: CommType;
  commission_affiliate:        number | null;
  commission_affiliate_type:   CommType;
  commission_4:                number | null;
  commission_4_type:           CommType;
  commission_5:                number | null;
  commission_5_type:           CommType;
  commission_6:                number | null;
  commission_6_type:           CommType;
}

interface Props {
  productId: string;
  commissions: CommissionValues;
}

type ValueKey = "commission_delegate" | "commission_recommender" | "commission_affiliate" | "commission_4" | "commission_5" | "commission_6";

const FIELDS: { key: ValueKey; label: string; hint: string }[] = [
  { key: "commission_delegate",    label: "Delegado",     hint: "para el delegado asignado" },
  { key: "commission_recommender", label: "Recomendador", hint: "para el recomendador del cliente" },
  { key: "commission_affiliate",   label: "Afiliado",     hint: "para el afiliado BixGrow" },
  { key: "commission_4",           label: "KOL",          hint: "para Key Opinion Leader" },
  { key: "commission_5",           label: "Coordinador",  hint: "para el coordinador" },
  { key: "commission_6",           label: "Comisión 6",   hint: "comisión adicional" },
];

export function CommissionForm({ productId, commissions }: Props) {
  const [types, setTypes] = useState<Record<ValueKey, CommType>>({
    commission_delegate:    commissions.commission_delegate_type,
    commission_recommender: commissions.commission_recommender_type,
    commission_affiliate:   commissions.commission_affiliate_type,
    commission_4:           commissions.commission_4_type,
    commission_5:           commissions.commission_5_type,
    commission_6:           commissions.commission_6_type,
  });

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

      {FIELDS.map(({ key, label, hint }) => {
        const t = types[key];
        return (
          <div key={key}>
            <label className="block text-xs font-medium text-[#374151] mb-1">{label}</label>
            <div className="flex">
              <input
                name={key}
                type="number"
                step="0.01"
                min="0"
                defaultValue={commissions[key] ?? ""}
                placeholder="0.00"
                className="h-9 flex-1 min-w-0 rounded-l-lg border border-r-0 border-[#E5E7EB] bg-white px-3 text-sm text-[#0A0A0A] placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors shadow-sm tabular-nums"
              />
              <div className="flex border border-[#E5E7EB] rounded-r-lg overflow-hidden shadow-sm shrink-0">
                <button
                  type="button"
                  onClick={() => setTypes(prev => ({ ...prev, [key]: "percent" }))}
                  className={[
                    "h-9 w-9 text-xs font-semibold transition-colors",
                    t === "percent" ? "bg-[#8E0E1A] text-white" : "bg-white text-[#6B7280] hover:bg-[#F3F4F6]",
                  ].join(" ")}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => setTypes(prev => ({ ...prev, [key]: "amount" }))}
                  className={[
                    "h-9 w-9 text-xs font-semibold border-l border-[#E5E7EB] transition-colors",
                    t === "amount" ? "bg-[#8E0E1A] text-white" : "bg-white text-[#6B7280] hover:bg-[#F3F4F6]",
                  ].join(" ")}
                >
                  €
                </button>
              </div>
              <input type="hidden" name={`${key}_type`} value={t} />
            </div>
            <p className="mt-0.5 text-[11px] text-[#9CA3AF]">
              {t === "percent" ? "%" : "€"} {hint}
            </p>
          </div>
        );
      })}

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
