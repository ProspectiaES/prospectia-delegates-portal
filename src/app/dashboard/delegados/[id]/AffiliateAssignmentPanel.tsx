"use client";

import { useState, useTransition } from "react";
import { saveAffiliateDelegates } from "@/app/actions/delegates";

interface Affiliate {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
  referral_code: string | null;
}

interface Props {
  delegateId: string;
  allAffiliates: Affiliate[];
  assignedIds: string[];
}

export function AffiliateAssignmentPanel({ delegateId, allAffiliates, assignedIds: initial }: Props) {
  const [assigned, setAssigned] = useState<Set<string>>(new Set(initial));
  const [status, setStatus] = useState<{ error?: string; success?: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggle = (id: string) => {
    setAssigned((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setStatus(null);
  };

  const save = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("delegate_id", delegateId);
      for (const id of allAffiliates) fd.append("all_affiliate_ids", id.id);
      for (const id of assigned) fd.append("affiliate_ids", id);
      const result = await saveAffiliateDelegates(null, fd);
      setStatus(result);
    });
  };

  if (allAffiliates.length === 0) {
    return (
      <p className="px-5 py-4 text-xs text-[#9CA3AF]">
        No hay afiliados registrados en el sistema.
      </p>
    );
  }

  return (
    <div className="px-5 py-4 space-y-3">
      {status?.error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-[#8E0E1A]">
          {status.error}
        </div>
      )}
      {status?.success && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-700">
          Afiliados guardados.
        </div>
      )}

      <ul className="divide-y divide-[#F3F4F6] border border-[#E5E7EB] rounded-lg overflow-hidden">
        {allAffiliates.map((a) => {
          const name = [a.first_name, a.last_name].filter(Boolean).join(" ") || a.email;
          const isChecked = assigned.has(a.id);
          return (
            <li
              key={a.id}
              className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-[#F9FAFB] cursor-pointer"
              onClick={() => toggle(a.id)}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggle(a.id)}
                onClick={(e) => e.stopPropagation()}
                className="h-4 w-4 rounded border-[#E5E7EB] text-[#8E0E1A] accent-[#8E0E1A] cursor-pointer shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#0A0A0A] truncate">{name}</p>
                <p className="text-xs text-[#9CA3AF]">
                  {a.email}{a.referral_code && ` · ${a.referral_code}`}
                </p>
              </div>
              <span className={[
                "shrink-0 text-xs font-medium px-2 py-0.5 rounded-full",
                a.status === "Approved"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-[#FEF3C7] text-[#92400E]",
              ].join(" ")}>
                {a.status}
              </span>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={save}
        disabled={isPending}
        className="w-full h-9 rounded-lg bg-[#8E0E1A] text-sm font-semibold text-white hover:bg-[#6B0A14] disabled:opacity-60 transition-colors"
      >
        {isPending ? "Guardando…" : `Guardar asignaciones (${assigned.size})`}
      </button>
    </div>
  );
}
