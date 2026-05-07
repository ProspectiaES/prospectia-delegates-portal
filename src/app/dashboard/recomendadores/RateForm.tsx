"use client";

import { useRef, useState, useTransition } from "react";
import { saveRecommenderRate } from "./actions";

export function RateForm({ contactId, currentRate }: { contactId: string; currentRate: number | null }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function submit() {
    const val = inputRef.current?.value;
    const rate = val === "" || val === undefined ? null : Number(val);
    startTransition(async () => {
      await saveRecommenderRate(contactId, rate);
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-sm font-semibold text-[#0A0A0A] hover:text-[#8E0E1A] transition-colors tabular-nums"
      >
        {currentRate != null ? `${currentRate}%` : <span className="text-[#6B7280] font-normal italic">sin configurar</span>}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        ref={inputRef}
        type="number"
        min="0"
        max="100"
        step="0.01"
        defaultValue={currentRate ?? ""}
        autoFocus
        className="w-20 h-7 px-2 text-sm border border-[#8E0E1A] rounded-lg outline-none tabular-nums"
        onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") setEditing(false); }}
      />
      <span className="text-sm text-[#6B7280]">%</span>
      <button
        disabled={pending}
        onClick={submit}
        className="h-7 px-2.5 text-xs font-semibold bg-[#8E0E1A] text-white rounded-lg hover:bg-[#7a0c17] disabled:opacity-50 transition-colors"
      >
        {pending ? "…" : "Guardar"}
      </button>
      <button
        onClick={() => setEditing(false)}
        className="h-7 px-2 text-xs text-[#6B7280] hover:text-[#0A0A0A] transition-colors"
      >
        Cancelar
      </button>
    </div>
  );
}
