"use client";

import { useState, useActionState } from "react";
import { updateContactAction, UpdateContactState } from "@/app/actions/contacts";

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

function formatIban(raw: string) {
  return raw.replace(/\s+/g, "").toUpperCase().replace(/(.{4})/g, "$1 ").trim();
}

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
  const [iban, setIban] = useState(initialIban ?? "");

  const canSepa = payMethod === "direct_debit" && iban.trim().replace(/\s+/g, "").length >= 15;

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
            <input
              name="name"
              defaultValue={contact.name}
              required
              className={inputCls}
              placeholder="Nombre del contacto"
            />
          </Field>
          <Field label="NIF / CIF">
            <input
              name="code"
              defaultValue={contact.code ?? ""}
              className={inputCls}
              placeholder="B12345678"
            />
          </Field>
          <Field label="Email">
            <input
              name="email"
              type="email"
              defaultValue={contact.email ?? ""}
              className={inputCls}
              placeholder="email@empresa.com"
            />
          </Field>
          <Field label="Teléfono">
            <input
              name="phone"
              defaultValue={contact.phone ?? ""}
              className={inputCls}
              placeholder="+34 600 000 000"
            />
          </Field>
          <Field label="Móvil">
            <input
              name="mobile"
              defaultValue={contact.mobile ?? ""}
              className={inputCls}
              placeholder="+34 600 000 000"
            />
          </Field>
          <Field label="Tipo">
            <select
              name="type"
              defaultValue={contact.type?.toString() ?? ""}
              className={selectCls}
            >
              <option value="">Sin tipo</option>
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Etiquetas (separadas por coma)">
            <input
              name="tags"
              defaultValue={contact.tags?.join(", ") ?? ""}
              className={inputCls}
              placeholder="delegado, madrid, activo"
            />
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
            className="mt-0.5 h-4 w-4 rounded border-[#E5E7EB] text-[#8E0E1A] focus:ring-[#8E0E1A]/20 accent-[#8E0E1A]"
          />
          <div>
            <span className="text-sm font-medium text-[#0A0A0A] group-hover:text-[#8E0E1A] transition-colors">
              Recargo de equivalencia
            </span>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              Autónomos en régimen de recargo de equivalencia (código s_rec_14).
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
              <input
                name="address"
                defaultValue={contact.address ?? ""}
                className={inputCls}
                placeholder="Calle, número, piso…"
              />
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
              <select
                name="payment_method"
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className={selectCls}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </Field>
            <Field label="IBAN">
              <input
                name="iban"
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                onBlur={(e) => setIban(formatIban(e.target.value))}
                placeholder="ES00 0000 0000 0000 0000 0000"
                className={inputCls + " font-mono tracking-wide"}
              />
            </Field>
            <Field label="BIC / SWIFT (opcional)">
              <input
                name="bic"
                defaultValue={initialBic ?? ""}
                placeholder="CAIXESBBXXX"
                className={inputCls + " font-mono uppercase"}
              />
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
