"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toISODate, getSetmanaBounds } from "@/lib/remeses/calculs";
import type { FacturaPendent } from "@/app/api/remeses/factures-pendents/route";

type Step = "setmana" | "factures" | "generant";

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("ca-ES", { style: "currency", currency: "EUR" }).format(n);

const fmtDate = (s: string | null) => {
  if (!s) return "—";
  return new Date(s.length === 10 ? s + "T00:00:00" : s).toLocaleDateString("ca-ES", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
};

export default function GenerarRemesaButton() {
  const [open, setOpen]         = useState(false);
  const [step, setStep]         = useState<Step>("setmana");
  const [error, setError]       = useState<string | null>(null);
  const [isPending, startTr]    = useTransition();
  const router                  = useRouter();

  // Step 1 state
  const now = new Date();
  const prevWeek = new Date(now);
  prevWeek.setDate(now.getDate() - 7);
  const { inici: defaultInici } = getSetmanaBounds(prevWeek);
  const [setmanaInici, setSetmanaInici] = useState(toISODate(defaultInici));
  const [setmanaInfo, setSetmanaInfo]   = useState<{ fi: string; cobramentEstandard: string } | null>(null);

  // Step 2 state
  const [factures, setFactures]   = useState<FacturaPendent[]>([]);
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [loading, setLoading]     = useState(false);

  function reset() {
    setStep("setmana");
    setError(null);
    setFactures([]);
    setSelected(new Set());
    setSetmanaInfo(null);
  }

  function close() {
    setOpen(false);
    reset();
  }

  async function fetchFactures() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/remeses/factures-pendents?setmanaInici=${setmanaInici}`);
      const data = await res.json() as { factures?: FacturaPendent[]; setmana?: { fi: string; cobramentEstandard: string }; error?: string };
      if (!res.ok) { setError(data.error ?? "Error"); return; }
      setFactures(data.factures ?? []);
      setSetmanaInfo(data.setmana ?? null);
      // Pre-select all eligible
      setSelected(new Set((data.factures ?? []).filter((f) => f.elegible).map((f) => f.id)));
      setStep("factures");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function toggleAll() {
    const elegibles = factures.filter((f) => f.elegible).map((f) => f.id);
    if (elegibles.every((id) => selected.has(id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(elegibles));
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleGenerar() {
    if (selected.size === 0) { setError("Selecciona almenys una factura."); return; }
    setError(null);
    startTr(async () => {
      try {
        const res = await fetch("/api/remeses/generar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ setmanaInici, facturaIds: [...selected] }),
        });
        const data = await res.json() as { id?: string; error?: string };
        if (!res.ok) { setError(data.error ?? "Error desconegut"); return; }
        close();
        router.push(`/dashboard/remeses/${data.id}`);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  const totalSelected = factures
    .filter((f) => selected.has(f.id))
    .reduce((s, f) => s + f.total, 0);

  const elegibles  = factures.filter((f) => f.elegible);
  const inelegibles = factures.filter((f) => !f.elegible);

  const inp = "w-full text-sm px-3 py-2 rounded-lg border border-[#E5E7EB] focus:outline-none focus:ring-1 focus:ring-[#8E0E1A]";

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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-2xl shadow-xl w-full ${step === "factures" ? "max-w-3xl" : "max-w-sm"} max-h-[90vh] flex flex-col`}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F3F4F6] shrink-0">
              <div>
                <h2 className="text-base font-bold text-[#0A0A0A]">Nova remesa</h2>
                {step === "factures" && setmanaInfo && (
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    Setmana {fmtDate(setmanaInici)}–{fmtDate(setmanaInfo.fi)} · Cobrament est. {fmtDate(setmanaInfo.cobramentEstandard)}
                  </p>
                )}
              </div>
              <button onClick={close} className="text-[#9CA3AF] hover:text-[#374151] transition-colors">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4l10 10M14 4L4 14" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

              {/* Step 1: Selecció de setmana */}
              {step === "setmana" && (
                <>
                  <p className="text-xs text-[#6B7280]">
                    Selecciona la setmana. A continuació podràs triar quines factures incloure.
                  </p>
                  <div>
                    <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1.5">
                      Dilluns de la setmana
                    </label>
                    <input
                      type="date"
                      value={setmanaInici}
                      onChange={(e) => setSetmanaInici(e.target.value)}
                      className={inp}
                    />
                  </div>
                </>
              )}

              {/* Step 2: Selecció de factures */}
              {step === "factures" && (
                <>
                  {elegibles.length === 0 && inelegibles.length === 0 && (
                    <p className="text-sm text-[#9CA3AF] py-4 text-center">
                      Cap factura pendent per a aquesta setmana.
                    </p>
                  )}

                  {elegibles.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-[#374151]">
                          Factures elegibles ({elegibles.length})
                        </p>
                        <button
                          onClick={toggleAll}
                          className="text-[10px] font-semibold text-[#8E0E1A] hover:underline"
                        >
                          {elegibles.every((f) => selected.has(f.id)) ? "Desseleccionar-les totes" : "Seleccionar-les totes"}
                        </button>
                      </div>
                      <div className="rounded-xl border border-[#E5E7EB] overflow-hidden divide-y divide-[#F3F4F6]">
                        {elegibles.map((f) => (
                          <label
                            key={f.id}
                            className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-[#FAFAFA] transition-colors ${selected.has(f.id) ? "bg-[#FEF9F9]" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={selected.has(f.id)}
                              onChange={() => toggle(f.id)}
                              className="mt-0.5 w-4 h-4 accent-[#8E0E1A] shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-[#0A0A0A] truncate">
                                  {f.contact_name ?? "—"}
                                </span>
                                <span className="text-xs font-bold tabular-nums shrink-0 text-[#0A0A0A]">
                                  {fmtEuro(f.total)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-[10px] text-[#9CA3AF] font-mono">
                                  {f.doc_number ?? f.id.slice(0, 8)}
                                </span>
                                <span className="text-[10px] text-[#9CA3AF]">
                                  {fmtDate(f.date)}
                                </span>
                                {f.termes_pagament && (
                                  <span className={`text-[10px] font-semibold px-1.5 py-0 rounded ${f.termes_pagament === "ampliat" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>
                                    {f.termes_pagament === "ampliat" ? `Ampliat → ${fmtDate(f.data_cobrament_ampliat)}` : `Estàndard → ${fmtDate(f.data_cobrament_estandard)}`}
                                  </span>
                                )}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {inelegibles.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-[#9CA3AF] mb-2">No elegibles ({inelegibles.length})</p>
                      <div className="rounded-xl border border-[#F3F4F6] overflow-hidden divide-y divide-[#F3F4F6] opacity-60">
                        {inelegibles.map((f) => (
                          <div key={f.id} className="flex items-start gap-3 px-4 py-2.5">
                            <div className="w-4 h-4 mt-0.5 shrink-0 flex items-center justify-center">
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#9CA3AF" strokeWidth="1.5">
                                <circle cx="6" cy="6" r="5"/><path d="M4 4l4 4M8 4l-4 4" strokeLinecap="round"/>
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-[#6B7280] truncate">{f.contact_name ?? "—"}</span>
                                <span className="text-xs tabular-nums shrink-0 text-[#9CA3AF]">{fmtEuro(f.total)}</span>
                              </div>
                              <p className="text-[10px] text-red-500 mt-0.5">{f.motiu_no_elegible}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {error && (
                <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#F3F4F6] shrink-0">
              {step === "setmana" && (
                <div className="flex gap-2">
                  <button
                    onClick={fetchFactures}
                    disabled={loading || !setmanaInici}
                    className="flex-1 text-sm font-bold py-2 rounded-lg bg-[#8E0E1A] text-white hover:bg-[#7A0C17] disabled:opacity-50 transition-colors"
                  >
                    {loading ? "Carregant…" : "Veure factures →"}
                  </button>
                  <button onClick={close} className="px-4 text-sm font-medium rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]">
                    Cancel·lar
                  </button>
                </div>
              )}

              {step === "factures" && (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] text-[#9CA3AF]">{selected.size} factures seleccionades</p>
                    <p className="text-sm font-bold text-[#0A0A0A] tabular-nums">{fmtEuro(totalSelected)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setStep("setmana"); setError(null); }}
                      className="px-3 text-xs font-medium rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB] py-2"
                    >
                      ← Canviar setmana
                    </button>
                    <button
                      onClick={handleGenerar}
                      disabled={isPending || selected.size === 0}
                      className="text-sm font-bold px-5 py-2 rounded-lg bg-[#8E0E1A] text-white hover:bg-[#7A0C17] disabled:opacity-50 transition-colors"
                    >
                      {isPending ? "Generant…" : `Generar remesa (${selected.size})`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
