"use client";

import { useActionState } from "react";
import { saveContactAffiliate, UpdateContactState } from "@/app/actions/contacts";

interface Affiliate {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  referral_code: string | null;
}

interface Props {
  contactId: string;
  affiliates: Affiliate[];
  currentAffiliateId: string | null;
}

export function AffiliateSelect({ contactId, affiliates, currentAffiliateId }: Props) {
  const [state, action, pending] = useActionState<UpdateContactState | null, FormData>(
    saveContactAffiliate,
    null
  );

  if (affiliates.length === 0) {
    return <p className="text-xs text-[#9CA3AF] px-5 py-4">No hay afiliados registrados.</p>;
  }

  return (
    <form action={action} className="px-5 py-4 space-y-3">
      <input type="hidden" name="contact_id" value={contactId} />

      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-[#8E0E1A]">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-700">
          Afiliado guardado.
        </div>
      )}

      <select
        name="affiliate_id"
        defaultValue={currentAffiliateId ?? ""}
        className="h-9 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0A0A0A] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors shadow-sm"
      >
        <option value="">— Sin afiliado —</option>
        {affiliates.map((a) => {
          const name = [a.first_name, a.last_name].filter(Boolean).join(" ") || a.email;
          return (
            <option key={a.id} value={a.id}>
              {name}{a.referral_code ? ` (${a.referral_code})` : ""}
            </option>
          );
        })}
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
