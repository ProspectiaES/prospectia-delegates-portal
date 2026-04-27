"use client";

import { useActionState } from "react";
import { saveDelegateProfile, SaveProfileState } from "@/app/actions/delegate-profile";

interface Props {
  delegate: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    nif: string | null;
    address: string | null;
    city: string | null;
    postal_code: string | null;
    iban: string | null;
  };
}

const inputCls =
  "h-9 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0A0A0A] placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors shadow-sm";

export function DelegateBillingForm({ delegate }: Props) {
  const [state, action, pending] = useActionState<SaveProfileState | null, FormData>(
    saveDelegateProfile,
    null
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="delegate_id" value={delegate.id} />

      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-xs text-[#8E0E1A]">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 text-xs text-emerald-700">
          Datos guardados correctamente.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-[#374151] mb-1.5">Nombre completo</label>
          <input name="full_name" defaultValue={delegate.full_name} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#374151] mb-1.5">Email</label>
          <input name="email" type="email" defaultValue={delegate.email ?? ""} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#374151] mb-1.5">Teléfono</label>
          <input name="phone" defaultValue={delegate.phone ?? ""} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#374151] mb-1.5">NIF / CIF</label>
          <input name="nif" defaultValue={delegate.nif ?? ""} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#374151] mb-1.5">Ciudad</label>
          <input name="city" defaultValue={delegate.city ?? ""} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-[#374151] mb-1.5">Dirección</label>
          <input name="address" defaultValue={delegate.address ?? ""} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#374151] mb-1.5">Código postal</label>
          <input name="postal_code" defaultValue={delegate.postal_code ?? ""} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#374151] mb-1.5">IBAN</label>
          <input name="iban" defaultValue={delegate.iban ?? ""} className={inputCls} placeholder="ES00 0000 0000…" />
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={pending}
          className="h-9 px-5 rounded-lg bg-[#8E0E1A] text-sm font-semibold text-white hover:bg-[#6B0A14] disabled:opacity-60 transition-colors"
        >
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
