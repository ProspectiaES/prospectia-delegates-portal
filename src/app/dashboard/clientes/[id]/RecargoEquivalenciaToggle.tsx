"use client";

import { useTransition } from "react";
import { toggleRecargoEquivalencia } from "@/app/actions/contacts";

export function RecargoEquivalenciaToggle({
  contactId,
  value,
}: {
  contactId: string;
  value: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.checked;
    startTransition(async () => {
      await toggleRecargoEquivalencia(contactId, next);
    });
  }

  return (
    <label className={`flex items-center gap-3 cursor-pointer select-none ${pending ? "opacity-60" : ""}`}>
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={value}
          onChange={handleChange}
          disabled={pending}
        />
        <div className="w-10 h-6 rounded-full bg-[#E5E7EB] peer-checked:bg-amber-500 transition-colors" />
        <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </div>
      <div>
        <p className="text-sm font-medium text-[#111827]">Recargo de Equivalencia</p>
        <p className="text-xs text-[#6B7280]">
          {value
            ? "IVA 10% + R.E. 1,4% · IVA 21% + R.E. 5,2% — nota legal inclosa als pedidos"
            : "Règim general d'IVA"}
        </p>
      </div>
    </label>
  );
}
