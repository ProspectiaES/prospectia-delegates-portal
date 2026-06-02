"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toISODate, getCobramentEstandard, parseDate, getDataRemesa, getSetmanaBounds } from "@/lib/remeses/calculs";
import type { RemesaConResum, EstatRemesa } from "@/lib/remeses/types";
import type { FacturaPendent } from "@/app/api/remeses/factures-pendents/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("ca-ES", { style: "currency", currency: "EUR" }).format(n);

const fmtDate = (s: string | null | undefined) => {
  if (!s) return "—";
  return new Date(s.length === 10 ? s + "T00:00:00" : s).toLocaleDateString("ca-ES", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
};

const ESTAT_BADGE: Record<EstatRemesa, string> = {
  esborrany: "bg-gray-100 text-gray-600",
  generada:  "bg-blue-50 text-blue-700",
  transmesa: "bg-amber-50 text-amber-700",
  cobrada:   "bg-emerald-50 text-emerald-700",
  retornada: "bg-red-50 text-red-700",
};
const ESTAT_LABEL: Record<EstatRemesa, string> = {
  esborrany: "Esborrany", generada: "Generada", transmesa: "Transmesa",
  cobrada: "Cobrada", retornada: "Retornada",
};

// Next Monday from today (default remesa date)
function nextMonday(): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = today.getDay();
  const add = day === 1 ? 7 : (8 - day) % 7;
  today.setDate(today.getDate() + add);
  return toISODate(today);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RemesesPageClient({
  remesesInicials,
}: {
  remesesInicials: RemesaConResum[];
}) {
  const router = useRouter();

  // Date of the remesa file (defaults to next Monday)
  const [dataRemesa, setDataRemesa] = useState(nextMonday);

  // Derived: collection date
  const cobramentEst = toISODate(getCobramentEstandard(parseDate(dataRemesa)));

  // Invoice list
  const [factures, setFactures]   = useState<FacturaPendent[] | null>(null);
  const [loading, setLoading]     = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selected, setSelected]   = useState<Set<string>>(new Set());

  // Generate
  const [isPending, startTr] = useTransition();
  const [genError, setGenError] = useState<string | null>(null);

  // Load on mount
  useEffect(() => {
    loadFactures(dataRemesa);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadFactures(dr: string) {
    setLoading(true);
    setFetchError(null);
    setFactures(null);
    try {
      const res = await fetch(`/api/remeses/factures-pendents?dataRemesa=${dr}`);
      const data = await res.json() as { factures?: FacturaPendent[]; error?: string };
      if (!res.ok) { setFetchError(data.error ?? "Error"); return; }
      const facts = data.factures ?? [];
      setFactures(facts);
      // Pre-select all eligible
      setSelected(new Set(facts.filter((f) => f.elegible).map((f) => f.id)));
    } catch (e) {
      setFetchError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleDateChange(newDate: string) {
    setDataRemesa(newDate);
    loadFactures(newDate);
  }

  function toggle(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function toggleAll() {
    const elegibles = (factures ?? []).filter((f) => f.elegible).map((f) => f.id);
    if (elegibles.every((id) => selected.has(id))) setSelected(new Set());
    else setSelected(new Set(elegibles));
  }

  function handleGenerar() {
    if (selected.size === 0) { setGenError("Selecciona almenys una factura."); return; }
    setGenError(null);
    startTr(async () => {
      try {
        const res = await fetch("/api/remeses/generar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataRemesa, facturaIds: [...selected] }),
        });
        const data = await res.json() as { id?: string; error?: string };
        if (!res.ok) { setGenError(data.error ?? "Error"); return; }
        router.push(`/dashboard/remeses/${data.id}`);
      } catch (e) {
        setGenError((e as Error).message);
      }
    });
  }

  const elegibles    = (factures ?? []).filter((f) => f.elegible);
  const inelegibles  = (factures ?? []).filter((f) => !f.elegible);
  const totalSelected = (factures ?? []).filter((f) => selected.has(f.id)).reduce((s, f) => s + f.total, 0);
  const allElegiblesSelected = elegibles.length > 0 && elegibles.every((f) => selected.has(f.id));

  // KPIs
  const now = new Date();
  const mesStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const totalMes = remesesInicials
    .filter((r) => r.setmana_inici.slice(0, 7) === mesStr)
    .reduce((s, r) => s + r.import_total, 0);
  const pendentsTransmetre = remesesInicials.filter((r) => r.estat === "generada").length;
  const totalPendent = remesesInicials.filter((r) => r.estat === "transmesa").reduce((s, r) => s + r.import_total, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#0A0A0A]">Remeses</h1>
        <p className="text-sm text-[#6B7280] mt-1">Rebuts SEPA per a CaixaGuissona · Norma 19 / pain.008.001.02</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Import mes actual",      value: fmtEuro(totalMes),            sub: "cobrat + pendent" },
          { label: "Pendents de transmetre", value: String(pendentsTransmetre),   sub: "remeses generades", warn: pendentsTransmetre > 0 },
          { label: "En trànsit",             value: fmtEuro(totalPendent),        sub: "transmeses a CaixaGuissona" },
        ].map((kpi) => (
          <div key={kpi.label} className={`rounded-xl border p-4 ${kpi.warn ? "border-amber-200 bg-amber-50" : "border-[#E5E7EB] bg-white"}`}>
            <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">{kpi.label}</p>
            <p className="text-2xl font-bold text-[#0A0A0A] mt-1 tabular-nums">{kpi.value}</p>
            <p className="text-[11px] text-[#9CA3AF] mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Crear nova remesa ─────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-[#E5E7EB] bg-white overflow-hidden">

        {/* Header: date pickers */}
        <div className="px-6 py-4 border-b border-[#F3F4F6] bg-[#FAFAFA]">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1">
              <h2 className="text-sm font-bold text-[#0A0A0A]">Nova remesa</h2>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Selecciona les factures a girar i la data en què presentaràs la remesa a CaixaGuissona.
              </p>
            </div>
            <div className="flex items-end gap-4 flex-wrap">
              <div>
                <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">
                  Data de presentació (remesa)
                </label>
                <input
                  type="date"
                  value={dataRemesa}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="text-sm px-3 py-1.5 rounded-lg border border-[#E5E7EB] focus:outline-none focus:ring-1 focus:ring-[#8E0E1A] bg-white"
                />
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Data de gir (cobrament)</p>
                <p className="text-sm font-semibold text-[#0A0A0A] py-1.5">{fmtDate(cobramentEst)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice list */}
        {loading && (
          <div className="flex items-center justify-center py-14">
            <div className="w-6 h-6 border-2 border-[#8E0E1A] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {fetchError && !loading && (
          <div className="mx-6 my-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{fetchError}</div>
        )}

        {!loading && factures !== null && (
          <>
            {/* Column headers */}
            <div className="flex items-center gap-4 px-6 py-2 border-b border-[#F3F4F6] bg-[#FAFAFA]">
              <input
                type="checkbox"
                checked={allElegiblesSelected}
                onChange={toggleAll}
                disabled={elegibles.length === 0}
                className="w-4 h-4 accent-[#8E0E1A] shrink-0"
                title="Seleccionar/desseleccionar totes"
              />
              <div className="flex-1 grid grid-cols-12 gap-2 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">
                <span className="col-span-3">Client</span>
                <span className="col-span-2">Factura</span>
                <span className="col-span-2">Emissió</span>
                <span className="col-span-2">Venciment</span>
                <span className="col-span-1 text-center">Tipus</span>
                <span className="col-span-1 text-center">Data gir</span>
                <span className="col-span-1 text-right">Import</span>
              </div>
            </div>

            {/* Eligible rows */}
            {elegibles.length === 0 && inelegibles.length === 0 && (
              <div className="py-12 text-center text-sm text-[#9CA3AF]">
                Cap factura pendent o vençuda al sistema.
              </div>
            )}

            <div className="divide-y divide-[#F3F4F6]">
              {elegibles.map((f) => {
                const isSelected = selected.has(f.id);
                const dataGir = f.termes_pagament === "ampliat" ? f.data_cobrament_ampliat : f.data_cobrament_estandard;
                const isVencida = f.status === 2;
                return (
                  <label
                    key={f.id}
                    className={`flex items-center gap-4 px-6 py-3 cursor-pointer hover:bg-[#FAFAFA] transition-colors ${isSelected ? "bg-[#FEF9F9]" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(f.id)}
                      className="w-4 h-4 accent-[#8E0E1A] shrink-0"
                    />
                    <div className="flex-1 grid grid-cols-12 gap-2 items-center text-xs min-w-0">
                      <div className="col-span-3 min-w-0">
                        <p className="font-semibold text-[#0A0A0A] truncate">{f.contact_name ?? "—"}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="font-mono text-[#6B7280]">{f.doc_number ?? f.id.slice(0, 8)}</span>
                      </div>
                      <div className="col-span-2 text-[#6B7280]">{fmtDate(f.date)}</div>
                      <div className="col-span-2">
                        <span className={isVencida ? "text-red-600 font-semibold" : "text-[#6B7280]"}>
                          {fmtDate(f.due_date)}
                          {isVencida && <span className="ml-1 text-[9px] font-bold bg-red-100 text-red-600 px-1 rounded">VENÇUDA</span>}
                        </span>
                      </div>
                      <div className="col-span-1 text-center">
                        {f.termes_pagament && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${f.termes_pagament === "ampliat" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>
                            {f.termes_pagament === "ampliat" ? "Ampl." : "Est."}
                          </span>
                        )}
                      </div>
                      <div className="col-span-1 text-center text-[#374151] font-medium">
                        {fmtDate(dataGir)}
                      </div>
                      <div className="col-span-1 text-right font-bold tabular-nums text-[#0A0A0A]">
                        {fmtEuro(f.total)}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Ineligible rows */}
            {inelegibles.length > 0 && (
              <div className="border-t border-[#F3F4F6]">
                <div className="px-6 py-2 bg-[#FAFAFA]">
                  <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">
                    No elegibles — no es poden incloure
                  </span>
                </div>
                <div className="divide-y divide-[#F3F4F6] opacity-55">
                  {inelegibles.map((f) => (
                    <div key={f.id} className="flex items-center gap-4 px-6 py-3">
                      <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#D1D5DB" strokeWidth="1.5">
                          <circle cx="7" cy="7" r="6"/>
                          <path d="M5 5l4 4M9 5l-4 4" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div className="flex-1 grid grid-cols-12 gap-2 items-center text-xs min-w-0">
                        <div className="col-span-3 min-w-0">
                          <p className="text-[#9CA3AF] truncate">{f.contact_name ?? "—"}</p>
                        </div>
                        <div className="col-span-2">
                          <span className="font-mono text-[#D1D5DB]">{f.doc_number ?? f.id.slice(0, 8)}</span>
                        </div>
                        <div className="col-span-2 text-[#D1D5DB]">{fmtDate(f.date)}</div>
                        <div className="col-span-4 text-red-400 text-[11px]">{f.motiu_no_elegible}</div>
                        <div className="col-span-1 text-right tabular-nums text-[#D1D5DB]">{fmtEuro(f.total)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer: totals + generate */}
            {elegibles.length > 0 && (
              <div className="border-t-2 border-[#E5E7EB] bg-[#FAFAFA] px-6 py-4">
                {genError && (
                  <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-2 mb-3">{genError}</p>
                )}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">Seleccionades</p>
                      <p className="text-sm font-bold text-[#0A0A0A]">{selected.size} de {elegibles.length}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">Total a girar</p>
                      <p className="text-xl font-bold text-[#0A0A0A] tabular-nums">{fmtEuro(totalSelected)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">Data de gir</p>
                      <p className="text-sm font-bold text-[#0A0A0A]">{fmtDate(cobramentEst)}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleGenerar}
                    disabled={isPending || selected.size === 0}
                    className="flex items-center gap-2 text-sm font-bold px-6 py-3 rounded-xl bg-[#8E0E1A] text-white hover:bg-[#7A0C17] disabled:opacity-50 transition-colors"
                  >
                    {isPending ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Generant…</>
                    ) : (
                      <><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 2v10M2 7h10" strokeLinecap="round"/></svg>Generar remesa ({selected.size})</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Historial ─────────────────────────────────────────────────────────── */}
      {remesesInicials.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[#0A0A0A]">Historial de remeses</h2>
          <div className="rounded-xl border border-[#E5E7EB] overflow-hidden bg-white">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  {["Setmana", "Data presentació", "Data gir", "Factures", "Import", "Estat", ""].map((h) => (
                    <th key={h} className="text-left text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-4 py-2.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {remesesInicials.map((r) => (
                  <tr key={r.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-4 py-3 font-medium text-[#0A0A0A]">
                      {fmtDate(r.setmana_inici)} – {fmtDate(r.setmana_fi)}
                    </td>
                    <td className="px-4 py-3 text-[#374151]">{fmtDate(r.data_remesa)}</td>
                    <td className="px-4 py-3 text-[#374151]">{fmtDate(r.data_cobrament_estandard)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-semibold">{r.num_linies}</span>
                      {r.num_ampliat > 0 && <span className="ml-1 text-[#9CA3AF]">(+{r.num_ampliat} amp.)</span>}
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums">{fmtEuro(r.import_total)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${ESTAT_BADGE[r.estat]}`}>
                        {ESTAT_LABEL[r.estat]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/dashboard/remeses/${r.id}`} className="text-[#8E0E1A] font-semibold hover:underline">
                        Veure →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
