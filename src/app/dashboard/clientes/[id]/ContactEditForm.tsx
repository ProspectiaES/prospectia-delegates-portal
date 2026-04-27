"use client";

import { useActionState } from "react";
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
}

const typeOptions = [
  { value: "0", label: "Contacto / Lead" },
  { value: "1", label: "Cliente" },
  { value: "2", label: "Proveedor" },
  { value: "3", label: "Acreedor" },
  { value: "4", label: "Deudor" },
];

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

export function ContactEditForm({ contact }: Props) {
  const [state, action, pending] = useActionState<UpdateContactState | null, FormData>(
    updateContactAction,
    null
  );

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="id" value={contact.id} />

      {/* Feedback */}
      {state?.error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-[#8E0E1A]">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Guardado en Holded correctamente.
        </div>
      )}

      {/* Información básica */}
      <div>
        <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">
          Información básica
        </h3>
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
          <Field label="Código">
            <input
              name="code"
              defaultValue={contact.code ?? ""}
              className={inputCls}
              placeholder="COD-001"
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
              className="w-full h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0A0A0A] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors"
            >
              <option value="">Sin tipo</option>
              {typeOptions.map((o) => (
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

      {/* Dirección */}
      <div>
        <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">
          Dirección de facturación
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Dirección">
            <input
              name="address"
              defaultValue={contact.address ?? ""}
              className={`${inputCls} sm:col-span-2`}
              placeholder="Calle, número, piso…"
            />
          </Field>
          <Field label="Ciudad">
            <input
              name="city"
              defaultValue={contact.city ?? ""}
              className={inputCls}
              placeholder="Madrid"
            />
          </Field>
          <Field label="Código postal">
            <input
              name="postal_code"
              defaultValue={contact.postal_code ?? ""}
              className={inputCls}
              placeholder="28001"
            />
          </Field>
          <Field label="Provincia">
            <input
              name="province"
              defaultValue={contact.province ?? ""}
              className={inputCls}
              placeholder="Madrid"
            />
          </Field>
          <Field label="País">
            <input
              name="country"
              defaultValue={contact.country ?? ""}
              className={inputCls}
              placeholder="España"
            />
          </Field>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[#F3F4F6]">
        <p className="text-xs text-[#9CA3AF]">Los cambios se guardan en Holded y se sincronizan aquí.</p>
        <button
          type="submit"
          disabled={pending}
          className="h-9 px-5 rounded-lg bg-[#8E0E1A] text-sm font-semibold text-white hover:bg-[#6B0A14] disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#8E0E1A] focus:ring-offset-2"
        >
          {pending ? "Guardando…" : "Guardar en Holded"}
        </button>
      </div>
    </form>
  );
}
