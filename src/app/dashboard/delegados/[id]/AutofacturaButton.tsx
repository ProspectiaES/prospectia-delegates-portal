"use client";

import { useState } from "react";

interface Props {
  delegateId: string;
  defaultMes: string; // "YYYY-MM"
}

const IRPF_PRESETS    = [{ label: "7%",  value: 7  }, { label: "15%", value: 15 }];
const RECARGO_PRESETS = [{ label: "1.4%", value: 1.4 }, { label: "5.2%", value: 5.2 }];

function PctField({
  label, presets, enabled, onToggle, value, onChange,
}: {
  label: string;
  presets: { label: string; value: number }[];
  enabled: boolean;
  onToggle: () => void;
  value: number;
  onChange: (v: number) => void;
}) {
  const [custom, setCustom] = useState(false);

  function handlePreset(v: number) {
    setCustom(false);
    onChange(v);
  }

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={enabled}
          onChange={onToggle}
          className="w-4 h-4 accent-[#8E0E1A] rounded"
        />
        <span className="text-sm font-medium text-[#374151]">{label}</span>
        {enabled && (
          <span className="text-sm font-semibold text-[#8E0E1A] tabular-nums">{value}%</span>
        )}
      </label>
      {enabled && (
        <div className="ml-6 flex flex-wrap items-center gap-2">
          {presets.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => handlePreset(p.value)}
              className={[
                "px-3 py-1 rounded-full text-xs font-semibold border transition-colors",
                !custom && value === p.value
                  ? "bg-[#8E0E1A] text-white border-[#8E0E1A]"
                  : "bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#8E0E1A]",
              ].join(" ")}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => { setCustom(true); onChange(0); }}
            className={[
              "px-3 py-1 rounded-full text-xs font-semibold border transition-colors",
              custom ? "bg-[#8E0E1A] text-white border-[#8E0E1A]" : "bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#8E0E1A]",
            ].join(" ")}
          >
            Personalizado
          </button>
          {custom && (
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0} max={100} step={0.01}
                value={value}
                onChange={(e) => onChange(Math.max(0, Math.min(100, Number(e.target.value))))}
                className="w-20 h-8 px-2 text-xs border border-[#D1D5DB] rounded-md outline-none focus:border-[#8E0E1A] tabular-nums"
                placeholder="0.00"
              />
              <span className="text-xs text-[#6B7280]">%</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AutofacturaButton({ delegateId, defaultMes }: Props) {
  const [open, setOpen]         = useState(false);
  const [mes, setMes]           = useState(defaultMes);
  const [irpfOn, setIrpfOn]     = useState(false);
  const [irpfPct, setIrpfPct]   = useState(15);
  const [recOn, setRecOn]       = useState(false);
  const [recPct, setRecPct]     = useState(1.4);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const nowMes = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  async function handleGenerar() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/delegados/${delegateId}/autofactura`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mes,
          irpf_pct:       irpfOn ? irpfPct : 0,
          recargo_eq_pct: recOn  ? recPct  : 0,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        setError(txt || `Error ${res.status}`);
        return;
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      const cd   = res.headers.get("Content-Disposition") ?? "";
      const m    = cd.match(/filename="([^"]+)"/);
      a.download = m ? m[1] : "autofactura.pdf";
      a.click();
      URL.revokeObjectURL(url);
      setOpen(false);
      // reload to show new history entry
      window.location.reload();
    } catch {
      setError("Error de red. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setMes(defaultMes); setError(null); setOpen(true); }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-[#374151] text-xs font-semibold text-[#374151] hover:bg-[#374151] hover:text-white transition-colors duration-150"
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <rect x="2" y="2" width="12" height="12" rx="1.5" />
          <path d="M5 6h6M5 9h6M5 12h3" strokeLinecap="round" />
        </svg>
        Autofactura
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#0A0A0A]">Generar autofactura</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[#9CA3AF] hover:text-[#374151] transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 4l10 10M14 4L4 14" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Period */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Período</label>
              <input
                type="month"
                value={mes}
                max={nowMes}
                onChange={(e) => setMes(e.target.value)}
                className="h-9 w-full px-3 text-sm border border-[#D1D5DB] rounded-lg outline-none focus:border-[#8E0E1A] transition-colors"
              />
            </div>

            <div className="border-t border-[#F3F4F6]" />

            {/* IRPF */}
            <PctField
              label="IRPF (retención)"
              presets={IRPF_PRESETS}
              enabled={irpfOn}
              onToggle={() => setIrpfOn((v) => !v)}
              value={irpfPct}
              onChange={setIrpfPct}
            />

            {/* Recargo de equivalencia */}
            <PctField
              label="Recargo de equivalencia"
              presets={RECARGO_PRESETS}
              enabled={recOn}
              onToggle={() => setRecOn((v) => !v)}
              value={recPct}
              onChange={setRecPct}
            />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-[#8E0E1A]">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="px-4 py-2 rounded-lg border border-[#E5E7EB] text-sm text-[#6B7280] hover:bg-[#F3F4F6] transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGenerar}
                disabled={loading}
                className="px-5 py-2 rounded-lg bg-[#8E0E1A] text-sm font-semibold text-white hover:bg-[#7a0c16] transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
                    </svg>
                    Generando…
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                      <path d="M8 2v9M5 8l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M3 13h10" strokeLinecap="round" />
                    </svg>
                    Generar PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
