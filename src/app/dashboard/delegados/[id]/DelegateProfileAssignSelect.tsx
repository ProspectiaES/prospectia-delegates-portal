"use client";

import { useActionState } from "react";
import { saveDelegateKOL, saveDelegateCoordinator, SaveProfileState } from "@/app/actions/delegate-profile";

interface Profile {
  id: string;
  display_name: string;
}

interface Props {
  delegateId: string;
  profiles: Profile[];
  currentId: string | null;
  field: "kol" | "coordinator";
  placeholder?: string;
}

export function DelegateProfileAssignSelect({ delegateId, profiles, currentId, field, placeholder = "Sin asignar" }: Props) {
  const action = field === "kol" ? saveDelegateKOL : saveDelegateCoordinator;
  const [state, formAction, pending] = useActionState<SaveProfileState | null, FormData>(action, null);

  return (
    <form action={formAction} className="px-5 py-4 space-y-3">
      <input type="hidden" name="delegate_id" value={delegateId} />
      <select
        name="profile_id"
        defaultValue={currentId ?? ""}
        className="w-full h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0A0A0A] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors shadow-sm"
      >
        <option value="">{placeholder}</option>
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>{p.display_name}</option>
        ))}
      </select>
      {state?.error && <p className="text-xs text-[#8E0E1A]">{state.error}</p>}
      {state?.success && <p className="text-xs text-emerald-600">Guardado.</p>}
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
