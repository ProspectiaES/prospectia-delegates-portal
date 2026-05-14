"use client";

import { useState, useRef, useActionState } from "react";
import { updateContactAction, UpdateContactState } from "@/app/actions/contacts";
import { cccToIban, formatIban, validateIban } from "@/lib/iban";

interface ContactData {
  id: string;
  name: string;
  code: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  type: number | null;
  tags: string[];
  address: string | null;
  city: string | null;
  postal_code: string | null;
  province: string | null;
  country: string | null;
}

interface Props {
  contact: ContactData;
  isOwner: boolean;
  initialRecargo: boolean;
  initialPaymentMethod: string | null;
  initialIban: string | null;
  initialBic: string | null;
}

const PAYMENT_METHODS = [
  { value: "",             label: "— Sin especificar —" },
  { value: "transfer",     label: "Transferencia bancaria" },
  { value: "direct_debit", label: "Domiciliación bancaria (giro)" },
  { value: "check",        label: "Cheque" },
  { value: "cash",         label: "Efectivo" },
  { value: "other",        label: "Otro" },
];

const TYPE_OPTIONS = [
  { value: "0", label: "Contacto / Lead" },
  { value: "1", label: "Cliente" },
  { value: "2", label: "Proveedor" },
  { value: "3", label: "Acreedor" },
  { value: "4", label: "Deudor" },
];

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-3">
      {children}
    </h3>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#374151] mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0A0A0A] placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors";

const selectCls =
  "w-full h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0A0A0A] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors";

// ─── CCC → IBAN Calculator ────────────────────────────────────────────────────

function CccCalculator({ onIban }: { onIban: (iban: string) => void }) {
  const [entitat, setEntitat] = useState("");
  const [oficina, setOficina] = useState("");
  const [dc, setDc]           = useState("");
  const [compte, setCompte]   = useState("");
  const [err, setErr]         = useState("");

  const refOficina = useRef<HTMLInputElement>(null);
  const refDc      = useRef<HTMLInputElement>(null);
  const refCompte  = useRef<HTMLInputElement>(null);

  function handleEntitat(v: string) {
    const d = v.replace(/\D/g, "").slice(0, 4);
    setEntitat(d);
    if (d.length === 4) refOficina.current?.focus();
  }
  function handleOficina(v: string) {
    const d = v.replace(/\D/g, "").slice(0, 4);
    setOficina(d);
    if (d.length === 4) refDc.current?.focus();
  }
  function handleDc(v: string) {
    const d = v.replace(/\D/g, "").slice(0, 2);
    setDc(d);
    if (d.length === 2) refCompte.current?.focus();
  }
  function handleCompte(v: string) {
    setCompte(v.replace(/\D/g, "").slice(0, 10));
  }

  function calculate() {
    const result = cccToIban(entitat, oficina, dc, compte);
    if (!result) {
      setErr("Comprova les longituds: entitat (4), oficina (4), DC (2), compte (10).");
      return;
    }
    setErr("");
    onIban(formatIban(result));
  }

  const cccInputCls = "h-9 w-full rounded-lg border border-[#E5E7EB] bg-white px-2 text-sm font-mono text-center text-[#0A0A0A] placeholder-[#D1D5DB] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors";

  return (
    <div className="rounded-lg border border-dashed border-[#D1D5DB] bg-[#FAFAFA] p-3 space-y-3">
      <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">
        Calculadora CCC → IBAN
      </p>
      <div className="grid grid-cols-4 gap-2">
        <div>
          <p className="text-[10px] text-[#9CA3AF] mb-1 text-center">Entitat (4d)</p>
          <input
            value={entitat}
            onChange={(e) => handleEntitat(e.target.value)}
            placeholder="0049"
            maxLength={4}
            inputMode="numeric"
            className={cccInputCls}
          />
        </div>
        <div>
          <p className="text-[10px] text-[#9CA3AF] mb-1 text-center">Oficina (4d)</p>
          <input
            ref={refOficina}
            value={oficina}
            onChange={(e) => handleOficina(e.target.value)}
            placeholder="0003"
            maxLength={4}
            inputMode="numeric"
            className={cccInputCls}
          />
        </div>
        <div>
          <p className="text-[10px] text-[#9CA3AF] mb-1 text-center">D.C. (2d)</p>
          <input
            ref={refDc}
            value={dc}
            onChange={(e) => handleDc(e.target.value)}
            placeholder="61"
            maxLength={2}
            inputMode="numeric"
            className={cccInputCls}
          />
        </div>
        <div>
          <p className="text-[10px] text-[#9CA3AF] mb-1 text-center">Compte (10d)</p>
          <input
            ref={refCompte}
            value={compte}
            onChange={(e) => handleCompte(e.target.value)}
            placeholder="2100034456"
            maxLength={10}
            inputMode="numeric"
            className={cccInputCls}
          />
        </div>
      </div>
      {err && <p className="text-[11px] text-[#8E0E1A]">{err}</p>}
      <button
        type="button"
        onClick={calculate}
        disabled={entitat.length + oficina.length + dc.length + compte.length < 20}
        className="w-full h-8 rounded-lg bg-[#0A0A0A] text-xs font-semibold text-white hover:bg-[#374151] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Calcular IBAN →
      </button>
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function ContactEditForm({
  contact,
  isOwner,
  initialRecargo,
  initialPaymentMethod,
  initialIban,
  initialBic,
}: Props) {
  const [state, action, pending] = useActionState<UpdateContactState | null, FormData>(
    updateContactAction,
    null
  );

  const [payMethod, setPayMethod] = useState(initialPaymentMethod ?? "");
  const [iban, setIban]           = useState(initialIban ? formatIban(initialIban) : "");

  const ibanStatus = validateIban(iban); // true | false | null
  const showCalculator = payMethod === "direct_debit" && ibanStatus !== true;
  const canSepa = payMethod === "direct_debit" && ibanStatus === true;

  return (
    <form action={action} className="space-y-7">
      <input type="hidden" name="id" value={contact.id} />

      {state?.error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-[#8E0E1A]">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Guardado correctamente.
        </div>
      )}

      {/* ── Información básica ─────────────────────────────────── */}
      <div>
        <SectionHeader>Información básica</SectionHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre *">
            <input name="name" defaultValue={contact.name} required className={inputCls} placeholder="Nombre del contacto" />
          </Field>
          <Field label="NIF / CIF">
            <input name="code" defaultValue={contact.code ?? ""} className={inputCls} placeholder="B12345678" />
          </Field>
          <Field label="Email">
            <input name="email" type="email" defaultValue={contact.email ?? ""} className={inputCls} placeholder="email@empresa.com" />
          </Field>
          <Field label="Teléfono">
            <input name="phone" defaultValue={contact.phone ?? ""} className={inputCls} placeholder="+34 600 000 000" />
          </Field>
          <Field label="Móvil">
            <input name="mobile" defaultValue={contact.mobile ?? ""} className={inputCls} placeholder="+34 600 000 000" />
          </Field>
          <Field label="Tipo">
            <select name="type" defaultValue={contact.type?.toString() ?? ""} className={selectCls}>
              <option value="">Sin tipo</option>
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Etiquetas (separadas por coma)">
            <input name="tags" defaultValue={contact.tags?.join(", ") ?? ""} className={inputCls} placeholder="delegado, madrid, activo" />
          </Field>
        </div>
      </div>

      {/* ── Régimen fiscal ─────────────────────────────────────── */}
      <div>
        <SectionHeader>Régimen fiscal</SectionHeader>
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            name="recargo"
            defaultChecked={initialRecargo}
            className="mt-0.5 h-4 w-4 rounded border-[#E5E7EB] accent-[#8E0E1A]"
          />
          <div>
            <span className="text-sm font-medium text-[#0A0A0A] group-hover:text-[#8E0E1A] transition-colors">
              Recargo de equivalencia
            </span>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              Autónomos en régimen de recargo de equivalencia (codi s_rec_14).
            </p>
          </div>
        </label>
      </div>

      {/* ── Dirección de facturación ───────────────────────────── */}
      <div>
        <SectionHeader>Dirección de facturación</SectionHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Dirección">
              <input name="address" defaultValue={contact.address ?? ""} className={inputCls} placeholder="Calle, número, piso…" />
            </Field>
          </div>
          <Field label="Ciudad">
            <input name="city" defaultValue={contact.city ?? ""} className={inputCls} placeholder="Madrid" />
          </Field>
          <Field label="Código postal">
            <input name="postal_code" defaultValue={contact.postal_code ?? ""} className={inputCls} placeholder="28001" />
          </Field>
          <Field label="Provincia">
            <input name="province" defaultValue={contact.province ?? ""} className={inputCls} placeholder="Madrid" />
          </Field>
          <Field label="País">
            <input name="country" defaultValue={contact.country ?? ""} className={inputCls} placeholder="España" />
          </Field>
        </div>
      </div>

      {/* ── Datos de cobro (owner only) ───────────────────────── */}
      {isOwner && (
        <div>
          <SectionHeader>Datos de cobro</SectionHeader>
          <div className="space-y-4">
            <Field label="Forma de pago">
              <select name="payment_method" value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className={selectCls}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </Field>

            {/* IBAN with live validation */}
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">IBAN</label>
              <div className="relative">
                <input
                  name="iban"
                  value={iban}
                  onChange={(e) => setIban(e.target.value.toUpperCase())}
                  onBlur={(e) => setIban(formatIban(e.target.value))}
                  placeholder="ES00 0000 0000 0000 0000 0000"
                  className={[
                    inputCls,
                    "font-mono tracking-wide pr-9",
                    ibanStatus === true  ? "border-emerald-400 focus:border-emerald-400 focus:ring-emerald-400/10" : "",
                    ibanStatus === false ? "border-red-300 focus:border-red-400 focus:ring-red-400/10" : "",
                  ].join(" ")}
                />
                {ibanStatus === true && (
                  <span className="absolute right-3 top-2 text-emerald-500 text-sm font-bold select-none">✓</span>
                )}
                {ibanStatus === false && (
                  <span className="absolute right-3 top-2 text-[#8E0E1A] text-sm font-bold select-none">✗</span>
                )}
              </div>
              {ibanStatus === true  && <p className="text-[11px] text-emerald-600 mt-1">IBAN vàlid ✓</p>}
              {ibanStatus === false && <p className="text-[11px] text-[#8E0E1A] mt-1">IBAN no vàlid — revisa els dígits.</p>}
            </div>

            {/* CCC Calculator — shows when direct_debit and no valid IBAN yet */}
            {showCalculator && (
              <CccCalculator onIban={(computed) => setIban(computed)} />
            )}

            <Field label="BIC / SWIFT (opcional)">
              <input name="bic" defaultValue={initialBic ?? ""} placeholder="CAIXESBBXXX" className={inputCls + " font-mono uppercase"} />
            </Field>

            {canSepa && (
              <a
                href={`/api/sepa/${contact.id}`}
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
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-[#F3F4F6]">
        <p className="text-xs text-[#9CA3AF]">Los cambios se guardan en Holded y se sincronizan aquí.</p>
        <button
          type="submit"
          disabled={pending}
          className="h-9 px-5 rounded-lg bg-[#8E0E1A] text-sm font-semibold text-white hover:bg-[#6B0A14] disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#8E0E1A] focus:ring-offset-2"
        >
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
