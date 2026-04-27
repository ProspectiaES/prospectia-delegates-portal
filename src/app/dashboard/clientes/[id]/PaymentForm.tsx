"use client";

import { useState, useActionState } from "react";
import { saveContactPayment, UpdateContactState } from "@/app/actions/contacts";

interface Props {
  contactId: string;
  initialMethod: string | null;
  initialIban: string | null;
  initialBic: string | null;
}

const inputCls =
  "h-9 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0A0A0A] placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors shadow-sm";

const METHODS = [
  { value: "",              label: "— Sin especificar —" },
  { value: "transfer",      label: "Transferencia bancaria" },
  { value: "direct_debit",  label: "Domiciliación bancaria (giro)" },
  { value: "check",         label: "Cheque" },
  { value: "cash",          label: "Efectivo" },
  { value: "other",         label: "Otro" },
];

export function PaymentForm({ contactId, initialMethod, initialIban, initialBic }: Props) {
  const [method, setMethod] = useState(initialMethod ?? "");
  const [iban,   setIban]   = useState(initialIban   ?? "");

  const [state, action, pending] = useActionState<UpdateContactState | null, FormData>(
    saveContactPayment,
    null
  );

  const canSepa = method === "direct_debit" && iban.trim().length >= 15;

  const formatIban = (raw: string) =>
    raw.replace(/\s+/g, "").toUpperCase().replace(/(.{4})/g, "$1 ").trim();

  return (
    <div className="space-y-4">
      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-[#8E0E1A]">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-700">
          Datos de cobro guardados.
        </div>
      )}

      <form action={action} className="space-y-3">
        <input type="hidden" name="contact_id" value={contactId} />

        <div>
          <label className="block text-xs font-medium text-[#374151] mb-1.5">Forma de pago</label>
          <select
            name="payment_method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className={inputCls}
          >
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#374151] mb-1.5">IBAN</label>
          <input
            name="iban"
            value={iban}
            onChange={(e) => setIban(e.target.value)}
            onBlur={(e) => setIban(formatIban(e.target.value))}
            placeholder="ES00 0000 0000 0000 0000 0000"
            className={inputCls + " font-mono tracking-wide"}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#374151] mb-1.5">
            BIC / SWIFT <span className="text-[#9CA3AF] font-normal">(opcional)</span>
          </label>
          <input
            name="bic"
            defaultValue={initialBic ?? ""}
            placeholder="CAIXESBBXXX"
            className={inputCls + " font-mono uppercase"}
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full h-8 rounded-lg bg-[#8E0E1A] text-xs font-semibold text-white hover:bg-[#6B0A14] disabled:opacity-60 transition-colors"
        >
          {pending ? "Guardando…" : "Guardar datos de cobro"}
        </button>
      </form>

      {canSepa && (
        <a
          href={`/api/sepa/${contactId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full h-9 rounded-lg border-2 border-[#8E0E1A] text-sm font-semibold text-[#8E0E1A] hover:bg-[#FEF2F2] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <path d="M4 4h8v2H4zM4 8h6M4 11h4" strokeLinecap="round" />
            <rect x="1.5" y="1.5" width="13" height="13" rx="1.5" />
          </svg>
          Emitir mandato SEPA
        </a>
      )}
    </div>
  );
}
