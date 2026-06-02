"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { RemesaDetall, RemesaLiniaEnriquida, RemesaEsdeveniment, EstatRemesa, TipusEsdeveniment } from "@/lib/remeses/types";

// ─── Formatting ───────────────────────────────────────────────────────────────

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("ca-ES", { style: "currency", currency: "EUR" }).format(n);

const fmtDate = (s: string | null) => {
  if (!s) return "—";
  const d = new Date(s.length === 10 ? s + "T00:00:00" : s);
  return d.toLocaleDateString("ca-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const fmtDateTime = (s: string) =>
  new Date(s).toLocaleString("ca-ES", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const maskIban = (iban: string) =>
  `${iban.slice(0, 4)} **** **** **** ${iban.slice(-4)}`;

// ─── Constants ────────────────────────────────────────────────────────────────

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

const ESTAT_LINIA_BADGE: Record<string, string> = {
  pendent:  "bg-amber-50 text-amber-700",
  cobrada:  "bg-emerald-50 text-emerald-700",
  retornada:"bg-red-50 text-red-700",
};

const ESDEV_LABEL: Record<TipusEsdeveniment, string> = {
  remesa_creada:    "Remesa creada",
  remesa_transmesa: "Transmesa a CaixaGuissona",
  remesa_cobrada:   "Cobrada",
  remesa_retornada: "Retornada",
  linia_cobrada:    "Factura cobrada",
  linia_retornada:  "Factura retornada",
  fitxer_descarregat: "Fitxer descarregat",
};

const ESDEV_COLOR: Record<TipusEsdeveniment, string> = {
  remesa_creada:    "bg-blue-50 text-blue-700",
  remesa_transmesa: "bg-amber-50 text-amber-700",
  remesa_cobrada:   "bg-emerald-50 text-emerald-700",
  remesa_retornada: "bg-red-50 text-red-700",
  linia_cobrada:    "bg-emerald-50 text-emerald-700",
  linia_retornada:  "bg-red-50 text-red-700",
  fitxer_descarregat: "bg-gray-100 text-gray-600",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function LiniesTable({
  linies,
  selectable,
  selected,
  onToggle,
}: {
  linies: RemesaLiniaEnriquida[];
  selectable?: boolean;
  selected?: Set<string>;
  onToggle?: (id: string) => void;
}) {
  if (linies.length === 0) {
    return <p className="text-xs text-[#9CA3AF] py-6 text-center">Sense línies.</p>;
  }

  return (
    <div className="rounded-xl border border-[#E5E7EB] overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
            {selectable && <th className="px-4 py-2.5 w-8" />}
            <th className="text-left text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-4 py-2.5">Client</th>
            <th className="text-left text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-4 py-2.5">Factura</th>
            <th className="text-left text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-4 py-2.5">Data emissió</th>
            <th className="text-right text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-4 py-2.5">Import</th>
            <th className="text-center text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-4 py-2.5">Cobrament</th>
            <th className="text-center text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-4 py-2.5">IBAN</th>
            <th className="text-center text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-4 py-2.5">Seq.</th>
            <th className="text-center text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-4 py-2.5">Estat</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F3F4F6]">
          {linies.map((l) => (
            <tr key={l.id} className={`hover:bg-[#FAFAFA] transition-colors ${selected?.has(l.id) ? "bg-[#FEF9F9]" : ""}`}>
              {selectable && (
                <td className="px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={selected?.has(l.id) ?? false}
                    onChange={() => onToggle?.(l.id)}
                    className="w-4 h-4 accent-[#8E0E1A]"
                  />
                </td>
              )}
              <td className="px-4 py-2.5">
                <Link href={`/dashboard/clientes/${l.contact_id}`} className="text-[#8E0E1A] hover:underline font-medium">
                  {l.contact_name}
                </Link>
              </td>
              <td className="px-4 py-2.5">
                <Link href={`/dashboard/facturas/${l.factura_id}`} className="font-mono text-[#374151] hover:text-[#8E0E1A]">
                  {l.doc_number ?? l.factura_id.slice(0, 8)}
                </Link>
              </td>
              <td className="px-4 py-2.5 text-[#6B7280]">{fmtDate(l.invoice_date)}</td>
              <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{fmtEuro(l.import)}</td>
              <td className="px-4 py-2.5 text-center text-[#374151]">{fmtDate(l.data_cobrament)}</td>
              <td className="px-4 py-2.5 text-center font-mono text-[10px] text-[#6B7280]">{maskIban(l.iban_deutor)}</td>
              <td className="px-4 py-2.5 text-center">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600">{l.sequencia_adeut}</span>
              </td>
              <td className="px-4 py-2.5 text-center">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ESTAT_LINIA_BADGE[l.estat_linia] ?? ""}`}>
                  {l.estat_linia.charAt(0).toUpperCase() + l.estat_linia.slice(1)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-[#E5E7EB] bg-[#F9FAFB]">
            {selectable && <td />}
            <td colSpan={3} className="px-4 py-2 text-[10px] font-semibold text-[#6B7280]">
              Total ({linies.length} factures)
            </td>
            <td className="px-4 py-2 text-right font-bold tabular-nums text-[#0A0A0A]">
              {fmtEuro(linies.reduce((s, l) => s + l.import, 0))}
            </td>
            <td colSpan={selectable ? 5 : 4} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function AuditoriaTab({ esdeveniments }: { esdeveniments: RemesaEsdeveniment[] }) {
  if (esdeveniments.length === 0) {
    return <p className="text-xs text-[#9CA3AF] py-6 text-center">Sense events registrats.</p>;
  }

  return (
    <div className="space-y-3">
      {esdeveniments.map((e) => (
        <div key={e.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-[#8E0E1A] mt-1 shrink-0" />
            <div className="w-px flex-1 bg-[#E5E7EB] mt-1" />
          </div>
          <div className="pb-4 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${ESDEV_COLOR[e.tipus as TipusEsdeveniment] ?? "bg-gray-100 text-gray-600"}`}>
                {ESDEV_LABEL[e.tipus as TipusEsdeveniment] ?? e.tipus}
              </span>
              <span className="text-[11px] text-[#9CA3AF]">{fmtDateTime(e.created_at)}</span>
              {e.estat_anterior && (
                <span className="text-[11px] text-[#9CA3AF]">
                  {e.estat_anterior} → {e.estat_nou}
                </span>
              )}
            </div>
            {e.metadata && Object.keys(e.metadata).length > 0 && (
              <div className="mt-1 text-[11px] text-[#6B7280] font-mono bg-[#F9FAFB] rounded px-2 py-1">
                {Object.entries(e.metadata).map(([k, v]) => (
                  <span key={k} className="mr-3">{k}: <strong>{String(v)}</strong></span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

export default function RemesaDetallClient({ detall }: { detall: RemesaDetall }) {
  const [tab, setTab]               = useState<"estandard" | "ampliat" | "auditoria" | "resum">("estandard");
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [motiu, setMotiu]           = useState("");
  const [isPending, startTr]        = useTransition();
  const [error, setError]           = useState<string | null>(null);
  const router                      = useRouter();

  const estandard = detall.linies.filter((l) => l.tipus_venciment === "estandard");
  const ampliat   = detall.linies.filter((l) => l.tipus_venciment === "ampliat");
  const pendents  = detall.linies.filter((l) => l.estat_linia === "pendent");

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function apiAction(url: string, body?: object) {
    setError(null);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json() as { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Error desconegut");
  }

  function handleTransmesa() {
    startTr(async () => {
      try {
        await apiAction(`/api/remeses/${detall.id}/marcar-transmesa`);
        router.refresh();
      } catch (e) { setError((e as Error).message); }
    });
  }

  function handleCobrada() {
    startTr(async () => {
      try {
        await apiAction(`/api/remeses/${detall.id}/cobrar`);
        router.refresh();
      } catch (e) { setError((e as Error).message); }
    });
  }

  function handleRetornada(partial: boolean) {
    startTr(async () => {
      try {
        const body = partial
          ? { liniaIds: [...selected], motiu: motiu || undefined }
          : { motiu: motiu || undefined };
        await apiAction(`/api/remeses/${detall.id}/retornar`, body);
        setSelected(new Set());
        router.refresh();
      } catch (e) { setError((e as Error).message); }
    });
  }

  function handleDownload() {
    window.open(`/api/remeses/${detall.id}/fitxer`, "_blank");
  }

  const canDownload  = ["esborrany", "generada", "transmesa"].includes(detall.estat);
  const canTransmit  = ["esborrany", "generada"].includes(detall.estat);
  const canCobrar    = detall.estat === "transmesa";
  const canRetornar  = detall.estat === "transmesa";
  const showGolPanel = ["generada", "transmesa"].includes(detall.estat);

  const importTotal = detall.linies.reduce((s, l) => s + l.import, 0);

  const tabs = [
    { id: "estandard" as const, label: `Estàndard (${estandard.length})` },
    { id: "ampliat"   as const, label: `Ampliat (${ampliat.length})`,   hidden: ampliat.length === 0 },
    { id: "auditoria" as const, label: "Auditoria" },
    { id: "resum"     as const, label: "Resum" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-[#0A0A0A]">
              Remesa {new Date(detall.setmana_inici + "T00:00:00").toLocaleDateString("ca-ES", { day: "2-digit", month: "long", year: "numeric" })}
            </h1>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${ESTAT_BADGE[detall.estat]}`}>
              {ESTAT_LABEL[detall.estat]}
            </span>
          </div>
          <p className="text-sm text-[#6B7280] mt-1">
            {detall.num_linies} factures · {fmtEuro(importTotal)} · Cobrament {new Date(detall.data_cobrament_estandard + "T00:00:00").toLocaleDateString("ca-ES")}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {canDownload && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg border border-[#8E0E1A] text-[#8E0E1A] hover:bg-[#FEF2F2] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M7 1v8M4 6l3 3 3-3M1 11v1a1 1 0 001 1h10a1 1 0 001-1v-1" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Descarregar Norma 19
            </button>
          )}
          {canTransmit && (
            <button
              onClick={handleTransmesa}
              disabled={isPending}
              className="text-xs font-bold px-3 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
            >
              {isPending ? "Marcant…" : "Marcar transmesa a GOL"}
            </button>
          )}
          {canCobrar && (
            <button
              onClick={handleCobrada}
              disabled={isPending}
              className="text-xs font-bold px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? "Marcant…" : "Marcar cobrada"}
            </button>
          )}
          {canRetornar && (
            <button
              onClick={() => handleRetornada(false)}
              disabled={isPending}
              className="text-xs font-bold px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? "Marcant…" : "Marcar retornada"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* GOL instructions panel */}
      {showGolPanel && (
        <details className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
          <summary className="px-4 py-3 text-sm font-semibold text-amber-800 cursor-pointer select-none list-none flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="6.5"/>
              <path d="M8 7v4M8 5h.01" strokeLinecap="round"/>
            </svg>
            Com transmetre a CaixaGuissona (GOL) — clica per veure instruccions
          </summary>
          <div className="px-4 pb-4 text-xs text-amber-800 space-y-1">
            <ol className="list-decimal list-inside space-y-1 mt-2">
              <li>Descarrega el fitxer XML amb el botó de dalt</li>
              <li>Accedeix a <strong>GOL</strong> (www.caixaguissona.com) amb el teu usuari i contrasenya</li>
              <li>Ves a <strong>Transmissió Fitxers</strong></li>
              <li>Selecciona <strong>Transmissió Fitxer de Rebuts</strong></li>
              <li>Indica la coordenada de la targeta de coordenades</li>
              <li>Indica l&apos;import total de la remesa: <strong>{fmtEuro(importTotal)}</strong></li>
              <li>Amb el botó "Selecciona fitxer", busca el fitxer descarregat</li>
              <li>Prem <strong>Confirmar</strong> per presentar la remesa</li>
              <li>Torna aquí i marca la remesa com a <strong>Transmesa</strong></li>
            </ol>
          </div>
        </details>
      )}

      {/* Motiu input (for retornar partial) */}
      {canRetornar && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Motiu de retorn (opcional)"
            value={motiu}
            onChange={(e) => setMotiu(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-[#E5E7EB] flex-1 max-w-xs focus:outline-none focus:ring-1 focus:ring-[#8E0E1A]"
          />
          {selected.size > 0 && (
            <button
              onClick={() => handleRetornada(true)}
              disabled={isPending}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 transition-colors"
            >
              Retornar {selected.size} seleccionades
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-[#E5E7EB]">
        <div className="flex gap-1">
          {tabs.filter((t) => !t.hidden).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                tab === t.id
                  ? "border-[#8E0E1A] text-[#8E0E1A]"
                  : "border-transparent text-[#6B7280] hover:text-[#374151]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === "estandard" && (
        <LiniesTable
          linies={estandard}
          selectable={canRetornar}
          selected={selected}
          onToggle={toggleSelected}
        />
      )}
      {tab === "ampliat" && (
        <LiniesTable
          linies={ampliat}
          selectable={canRetornar}
          selected={selected}
          onToggle={toggleSelected}
        />
      )}
      {tab === "auditoria" && (
        <AuditoriaTab esdeveniments={detall.esdeveniments} />
      )}
      {tab === "resum" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total factures", value: detall.num_linies.toString() },
            { label: "Import total",    value: fmtEuro(importTotal) },
            { label: "Estàndard",       value: fmtEuro(estandard.reduce((s, l) => s + l.import, 0)) },
            { label: "Ampliat",         value: fmtEuro(ampliat.reduce((s, l) => s + l.import, 0)) },
            { label: "Pendents",        value: pendents.length.toString() },
            { label: "Cobrades",        value: detall.linies.filter((l) => l.estat_linia === "cobrada").length.toString() },
            { label: "Retornades",      value: detall.linies.filter((l) => l.estat_linia === "retornada").length.toString() },
            { label: "Data remesa",     value: new Date(detall.data_remesa + "T00:00:00").toLocaleDateString("ca-ES") },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-[#E5E7EB] bg-white p-4">
              <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">{kpi.label}</p>
              <p className="text-xl font-bold text-[#0A0A0A] mt-1 tabular-nums">{kpi.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
