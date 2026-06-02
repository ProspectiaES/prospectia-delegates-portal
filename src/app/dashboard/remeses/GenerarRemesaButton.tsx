"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toISODate, getSetmanaBounds } from "@/lib/remeses/calculs";

export default function GenerarRemesaButton() {
  const [open, setOpen]       = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [isPending, startTr]  = useTransition();
  const router                = useRouter();

  // Default: previous week Monday
  const now = new Date();
  const prevWeek = new Date(now);
  prevWeek.setDate(now.getDate() - 7);
  const { inici: defaultInici } = getSetmanaBounds(prevWeek);
  const [setmanaInici, setSetmanaInici] = useState(toISODate(defaultInici));

  function handleSubmit() {
    setError(null);
    startTr(async () => {
      try {
        const res = await fetch("/api/remeses/generar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ setmanaInici }),
        });
        const data = await res.json() as { id?: string; error?: string };
        if (!res.ok) { setError(data.error ?? "Error desconegut"); return; }
        setOpen(false);
        router.push(`/dashboard/remeses/${data.id}`);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-lg bg-[#8E0E1A] text-white hover:bg-[#7A0C17] transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M7 2v10M2 7h10" strokeLinecap="round" />
        </svg>
        Generar remesa
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-bold text-[#0A0A0A]">Nova remesa</h2>
            <p className="text-xs text-[#6B7280]">
              Selecciona la setmana d&apos;inici. S&apos;inclouran totes les factures pendents emeses durant aquella setmana (dilluns–diumenge) amb IBAN i mandat configurat.
            </p>

            <div>
              <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">
                Dilluns de la setmana
              </label>
              <input
                type="date"
                value={setmanaInici}
                onChange={(e) => setSetmanaInici(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-[#E5E7EB] focus:outline-none focus:ring-1 focus:ring-[#8E0E1A]"
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSubmit}
                disabled={isPending || !setmanaInici}
                className="flex-1 text-sm font-bold py-2 rounded-lg bg-[#8E0E1A] text-white hover:bg-[#7A0C17] disabled:opacity-50 transition-colors"
              >
                {isPending ? "Generant…" : "Generar"}
              </button>
              <button
                onClick={() => { setOpen(false); setError(null); }}
                className="px-4 text-sm font-medium rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB] transition-colors"
              >
                Cancel·lar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
