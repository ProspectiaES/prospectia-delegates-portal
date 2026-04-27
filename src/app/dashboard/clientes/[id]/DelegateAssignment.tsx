"use client";

import { useActionState } from "react";
import { saveDelegateAssignments, SaveDelegatesState } from "@/app/actions/delegates";

interface Delegate {
  id: string;
  full_name: string;
}

interface Props {
  contactId: string;
  delegates: Delegate[];
  assignedIds: string[];
}

export function DelegateAssignment({ contactId, delegates, assignedIds }: Props) {
  const [state, action, pending] = useActionState<SaveDelegatesState | null, FormData>(
    saveDelegateAssignments,
    null
  );

  if (delegates.length === 0) {
    return (
      <p className="text-xs text-[#9CA3AF] px-5 py-4">No hay delegados configurados.</p>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="contact_id" value={contactId} />

      {state?.error && (
        <div className="mx-5 mb-3 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-[#8E0E1A]">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="mx-5 mb-3 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-700">
          Asignaciones guardadas.
        </div>
      )}

      <ul className="divide-y divide-[#F3F4F6]">
        {delegates.map((d) => (
          <li key={d.id} className="flex items-center gap-3 px-5 py-3">
            <input
              type="checkbox"
              id={`del-${d.id}`}
              name="delegate_ids"
              value={d.id}
              defaultChecked={assignedIds.includes(d.id)}
              className="h-4 w-4 rounded border-[#E5E7EB] text-[#8E0E1A] accent-[#8E0E1A] cursor-pointer"
            />
            <label htmlFor={`del-${d.id}`} className="text-sm text-[#0A0A0A] cursor-pointer select-none">
              {d.full_name}
            </label>
          </li>
        ))}
      </ul>

      <div className="px-5 py-3 border-t border-[#F3F4F6]">
        <button
          type="submit"
          disabled={pending}
          className="w-full h-8 rounded-lg bg-[#8E0E1A] text-xs font-semibold text-white hover:bg-[#6B0A14] disabled:opacity-60 transition-colors"
        >
          {pending ? "Guardando…" : "Guardar asignaciones"}
        </button>
      </div>
    </form>
  );
}
