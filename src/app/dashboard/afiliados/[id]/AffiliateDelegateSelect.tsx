"use client";

import { useActionState } from "react";
import { setAffiliateDelegate } from "@/app/actions/delegates";
import type { SaveDelegatesState } from "@/app/actions/delegates";

interface DelegateOption { id: string; full_name: string; delegate_name: string | null; }

interface Props {
  affiliateId: string;
  currentDelegateId: string | null;
  delegates: DelegateOption[];
}

export function AffiliateDelegateSelect({ affiliateId, currentDelegateId, delegates }: Props) {
  const [state, action, pending] = useActionState<SaveDelegatesState | null, FormData>(
    setAffiliateDelegate, null
  );

  return (
    <form action={action} className="px-5 py-4 space-y-3">
      <input type="hidden" name="affiliate_id" value={affiliateId} />

      {state?.error && (
        <p className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-[#8E0E1A]">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-700">
          Delegado guardado.
        </p>
      )}

      <select
        name="delegate_id"
        defaultValue={currentDelegateId ?? ""}
        className="w-full h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0A0A0A] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10"
      >
        <option value="">Sin delegado asignado</option>
        {delegates.map(d => (
          <option key={d.id} value={d.id}>
            {d.delegate_name ?? d.full_name}
          </option>
        ))}
      </select>

      <button
        type="submit"
        disabled={pending}
        className="w-full h-8 rounded-lg bg-[#8E0E1A] text-xs font-semibold text-white hover:bg-[#6B0A14] disabled:opacity-60 transition-colors"
      >
        {pending ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
