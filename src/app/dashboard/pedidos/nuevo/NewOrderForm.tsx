"use client";

import { useState, useActionState } from "react";
import { submitOrder } from "@/app/actions/orders";
import type { OrderFormState } from "@/app/actions/orders";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaymentMethod { id: string; name: string; }
interface Contact       { id: string; name: string; }
interface Product {
  id: string;
  name: string;
  sku: string | null;
  price: number | null;
  total: number | null;
  taxes: string[];
  price_pvp: number | null;
  price_pvd: number | null;
  price_pvl: number | null;
}

type Tarifa = "pvp" | "pvl" | "pvd";

interface Props {
  paymentMethods: PaymentMethod[];
  contacts: Contact[];
  products: Product[];
  userRole: string;
}

interface OrderLine {
  key: number;
  productId: string;
  units: number;
  discount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

function isGiro(name: string) {
  return name.toLowerCase().includes("giro");
}

function effectiveBasePrice(p: Product, tarifa: Tarifa): number {
  if (tarifa === "pvp") return p.price_pvp ?? p.price ?? 0;
  if (tarifa === "pvd") return p.price_pvd ?? p.price ?? 0;
  if (tarifa === "pvl") return p.price_pvl ?? p.price ?? 0;
  return p.price ?? 0;
}

function priceWithTax(p: Product, tarifa: Tarifa): number {
  const base = effectiveBasePrice(p, tarifa);
  if (!p.price || p.price === 0) return base;
  const multiplier = (p.total ?? p.price) / p.price;
  return base * multiplier;
}

// ─── Radio group helper ────────────────────────────────────────────────────────

function RadioGroup({
  name, value, onChange, options, required, label, hint,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  label: string;
  hint?: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-[#374151] mb-1.5">
        {label} {required && <span className="text-[#8E0E1A]">*</span>}
      </p>
      {hint && <p className="text-[11px] text-[#9CA3AF] mb-1.5">{hint}</p>}
      <div className="flex rounded-lg border border-[#E5E7EB] overflow-hidden w-fit">
        {options.map(opt => (
          <label
            key={opt.value}
            className={[
              "flex items-center gap-1.5 h-8 px-3 text-xs font-medium cursor-pointer transition-colors select-none",
              value === opt.value
                ? "bg-[#8E0E1A] text-white"
                : "bg-white text-[#6B7280] hover:bg-[#F3F4F6]",
            ].join(" ")}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              required={required && value === ""}
              className="sr-only"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NewOrderForm({ paymentMethods, contacts, products, userRole }: Props) {
  const [state, action, pending] = useActionState<OrderFormState | null, FormData>(submitOrder, null);

  // Client mode
  const [clientMode, setClientMode]           = useState<"existing" | "new">("existing");
  const [selectedContactId, setContactId]     = useState("");
  const [selectedContactName, setContactName] = useState("");
  const [contactSearch, setContactSearch]     = useState("");

  // New contact fields
  const [tipoContacto, setTipoContacto]         = useState<"company" | "person">("company");
  const [paymentMethodId, setPaymentMethodId]   = useState(paymentMethods[0]?.id ?? "");
  const [showIban, setShowIban]                 = useState(false);

  // Recargo — mandatory, no default
  const [recargo, setRecargo] = useState<"true" | "false" | "">("");

  // Tarifa
  const [tarifa, setTarifa] = useState<Tarifa>("pvp");

  // Product lines
  const [lines, setLines] = useState<OrderLine[]>([{ key: 0, productId: "", units: 1, discount: 0 }]);

  const filteredContacts = contactSearch.length >= 2
    ? contacts.filter(c => c.name.toLowerCase().includes(contactSearch.toLowerCase())).slice(0, 15)
    : [];

  function addLine() {
    setLines(prev => [...prev, { key: Date.now(), productId: "", units: 1, discount: 0 }]);
  }

  function removeLine(key: number) {
    setLines(prev => prev.filter(l => l.key !== key));
  }

  function setLineProduct(key: number, productId: string) {
    setLines(prev => prev.map(l => l.key !== key ? l : { ...l, productId }));
  }

  function setLineField(key: number, field: "units" | "discount", value: number) {
    setLines(prev => prev.map(l => l.key !== key ? l : { ...l, [field]: value }));
  }

  const orderTotal = lines.reduce((sum, l) => {
    const p = products.find(p => p.id === l.productId);
    if (!p) return sum;
    return sum + priceWithTax(p, tarifa) * l.units * (1 - l.discount / 100);
  }, 0);

  const TARIFA_OPTIONS: { value: Tarifa; label: string; desc: string }[] = [
    { value: "pvp", label: "PVP", desc: "Precio Venta Público" },
    { value: "pvl", label: "PVL", desc: "Precio Punto de Venta" },
    ...(userRole === "OWNER"
      ? [{ value: "pvd" as Tarifa, label: "PVD", desc: "Precio Distribuidor" }]
      : []),
  ];

  if (state?.success) {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[#0A0A0A]">Pedido creado</h2>
        <p className="text-sm text-[#6B7280]">El pedido se ha creado correctamente en Holded.</p>
        <div className="flex gap-3 justify-center pt-2">
          <a href="/dashboard/pedidos/nuevo" className="h-9 px-4 rounded-lg bg-[#8E0E1A] text-sm font-semibold text-white hover:bg-[#6B0A14] transition-colors flex items-center">
            Nuevo pedido
          </a>
          <a href="/dashboard/clientes" className="h-9 px-4 rounded-lg border border-[#E5E7EB] text-sm font-medium text-[#374151] hover:bg-[#F9FAFB] transition-colors flex items-center">
            Ver clientes
          </a>
        </div>
      </div>
    );
  }

  const inputCls = "w-full h-9 rounded-lg border border-[#E5E7EB] px-3 text-sm focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10";
  const labelCls = "block text-xs font-medium text-[#374151] mb-1";

  return (
    <form action={action} className="space-y-6">
      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-[#8E0E1A]">
          {state.error}
        </div>
      )}

      {/* ── Section 1: Cliente ────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm">
        <div className="px-5 py-4 border-b border-[#F3F4F6] flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#0A0A0A]">Cliente</h2>
          <div className="flex rounded-lg border border-[#E5E7EB] overflow-hidden text-xs font-medium">
            {(["existing", "new"] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setClientMode(m)}
                className={["h-7 px-3 transition-colors", clientMode === m ? "bg-[#8E0E1A] text-white" : "bg-white text-[#6B7280] hover:bg-[#F3F4F6]"].join(" ")}
              >
                {m === "existing" ? "Existente" : "Nuevo cliente"}
              </button>
            ))}
          </div>
        </div>

        <input type="hidden" name="client_mode" value={clientMode} />

        <div className="px-5 py-4 space-y-4">
          {clientMode === "existing" ? (
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Buscar cliente</label>
                <input
                  type="text"
                  value={contactSearch}
                  onChange={e => { setContactSearch(e.target.value); setContactId(""); setContactName(""); }}
                  placeholder="Escribe 2+ caracteres…"
                  className={inputCls}
                />
                {filteredContacts.length > 0 && !selectedContactId && (
                  <ul className="mt-1 border border-[#E5E7EB] rounded-lg overflow-hidden shadow-sm">
                    {filteredContacts.map(c => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => { setContactId(c.id); setContactName(c.name); setContactSearch(c.name); }}
                          className="w-full text-left px-3 py-2.5 text-sm hover:bg-[#F9FAFB] transition-colors border-b border-[#F3F4F6] last:border-0"
                        >
                          {c.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {selectedContactId && (
                  <div className="mt-1 flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-100">
                    <span className="text-xs font-semibold text-emerald-700 flex-1">{selectedContactName}</span>
                    <button type="button" onClick={() => { setContactId(""); setContactName(""); setContactSearch(""); }} className="text-[10px] text-[#9CA3AF] hover:text-[#8E0E1A]">✕</button>
                  </div>
                )}
                <input type="hidden" name="contact_id"   value={selectedContactId} />
                <input type="hidden" name="contact_name" value={selectedContactName} />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Empresa / Persona */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#374151]">Tipo:</span>
                <div className="flex rounded-lg border border-[#E5E7EB] overflow-hidden">
                  {(["company", "person"] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTipoContacto(t)}
                      className={["h-7 px-3 text-xs font-medium transition-colors", tipoContacto === t ? "bg-[#8E0E1A] text-white" : "bg-white text-[#6B7280] hover:bg-[#F3F4F6]"].join(" ")}
                    >
                      {t === "company" ? "Empresa" : "Persona"}
                    </button>
                  ))}
                </div>
                <input type="hidden" name="tipo_contacto" value={tipoContacto} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Nombre */}
                <div className="col-span-2">
                  <label className={labelCls}>
                    {tipoContacto === "company" ? "Razón social" : "Nombre completo"}{" "}
                    <span className="text-[#8E0E1A]">*</span>
                  </label>
                  <input name="new_name" type="text" required className={inputCls} />
                </div>

                {/* NIF / CIF */}
                <div className="col-span-2">
                  <label className={labelCls}>
                    {tipoContacto === "company" ? "CIF" : "NIF / DNI"}
                  </label>
                  <input name="new_nif" type="text" placeholder={tipoContacto === "company" ? "B12345678" : "12345678A"} className={inputCls} />
                </div>

                {/* Email + Phone */}
                <div>
                  <label className={labelCls}>Email</label>
                  <input name="new_email" type="email" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Teléfono</label>
                  <input name="new_phone" type="tel" className={inputCls} />
                </div>

                {/* Payment method */}
                <div className="col-span-2">
                  <label className={labelCls}>Forma de pago <span className="text-[#8E0E1A]">*</span></label>
                  <select
                    name="payment_method_id"
                    value={paymentMethodId}
                    onChange={e => {
                      setPaymentMethodId(e.target.value);
                      setShowIban(isGiro(paymentMethods.find(p => p.id === e.target.value)?.name ?? ""));
                    }}
                    className={inputCls + " bg-white"}
                  >
                    {paymentMethods.map(pm => (
                      <option key={pm.id} value={pm.id}>{pm.name}</option>
                    ))}
                  </select>
                </div>

                {/* IBAN — giro only */}
                {showIban && (
                  <div className="col-span-2">
                    <label className={labelCls}>
                      IBAN <span className="text-[#8E0E1A]">*</span>
                      <span className="text-[#9CA3AF] font-normal ml-1">(obligatorio para giro bancario)</span>
                    </label>
                    <input
                      name="new_iban"
                      type="text"
                      required={showIban}
                      placeholder="ES12 0000 0000 0000 0000 0000"
                      className={inputCls + " font-mono"}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recargo de equivalencia — always visible, mandatory */}
          <div className="pt-2 border-t border-[#F3F4F6]">
            <RadioGroup
              name="recargo_equivalencia"
              label="Recargo de equivalencia"
              hint="Aplica recargo sobre IVA en cada línea de producto"
              required
              value={recargo}
              onChange={v => setRecargo(v as "true" | "false")}
              options={[
                { value: "true",  label: "Sí" },
                { value: "false", label: "No" },
              ]}
            />
            {recargo === "" && state?.error?.includes("recargo") && (
              <p className="mt-1 text-[11px] text-[#8E0E1A]">Obligatorio</p>
            )}
          </div>
        </div>
      </section>

      {/* ── Section 2: Tarifa ─────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-[#0A0A0A] mb-0.5">Tarifa</h2>
            <p className="text-[11px] text-[#9CA3AF]">Determina el precio de cada producto en el pedido</p>
          </div>
          <div className="flex rounded-lg border border-[#E5E7EB] overflow-hidden shrink-0">
            {TARIFA_OPTIONS.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTarifa(t.value)}
                title={t.desc}
                className={["h-8 px-3 text-xs font-semibold transition-colors", tarifa === t.value ? "bg-[#8E0E1A] text-white" : "bg-white text-[#6B7280] hover:bg-[#F3F4F6]"].join(" ")}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <input type="hidden" name="tarifa" value={tarifa} />
        {/* Show selected tarifa description */}
        <p className="mt-2 text-xs text-[#6B7280]">
          {TARIFA_OPTIONS.find(t => t.value === tarifa)?.desc}
          {tarifa === "pvd" && <span className="ml-2 text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">Solo OWNER</span>}
        </p>
      </section>

      {/* ── Section 3: Productos ──────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm">
        <div className="px-5 py-4 border-b border-[#F3F4F6] flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#0A0A0A]">Productos</h2>
          <button type="button" onClick={addLine} className="h-7 px-3 text-xs font-semibold rounded-lg bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB] transition-colors">
            + Añadir línea
          </button>
        </div>

        <div className="divide-y divide-[#F3F4F6]">
          {lines.map((line, idx) => {
            const product  = products.find(p => p.id === line.productId);
            const pvtax    = product ? priceWithTax(product, tarifa) : 0;
            const lineTotal = pvtax * line.units * (1 - line.discount / 100);

            return (
              <div key={line.key} className="px-5 py-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-[#9CA3AF] w-5 shrink-0">{idx + 1}</span>
                  <div className="flex-1">
                    <select
                      onChange={e => setLineProduct(line.key, e.target.value)}
                      className={inputCls + " bg-white"}
                      defaultValue=""
                    >
                      <option value="" disabled>Selecciona un producto…</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}{p.sku ? ` (${p.sku})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  {lines.length > 1 && (
                    <button type="button" onClick={() => removeLine(line.key)} className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-[#9CA3AF] hover:text-[#8E0E1A] hover:bg-red-50 transition-colors">
                      ✕
                    </button>
                  )}
                </div>

                {/* Hidden inputs for action */}
                <input type="hidden" name="product_id[]"    value={line.productId} />
                <input type="hidden" name="product_name[]"  value={product?.name ?? ""} />
                <input type="hidden" name="product_price[]" value={product ? effectiveBasePrice(product, tarifa) : 0} />
                <input type="hidden" name="product_taxes[]" value={(product?.taxes ?? []).join(",")} />

                {line.productId && (
                  <div className="flex items-center gap-3 pl-7">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-[#6B7280] whitespace-nowrap">Uds.</label>
                      <input
                        name="units[]"
                        type="number"
                        min="1"
                        step="1"
                        value={line.units}
                        onChange={e => setLineField(line.key, "units", Number(e.target.value))}
                        className="w-20 h-8 rounded-lg border border-[#E5E7EB] px-2 text-sm text-center tabular-nums focus:border-[#8E0E1A] focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-[#6B7280] whitespace-nowrap">Dto %</label>
                      <input
                        name="discount[]"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={line.discount}
                        onChange={e => setLineField(line.key, "discount", Number(e.target.value))}
                        className="w-20 h-8 rounded-lg border border-[#E5E7EB] px-2 text-sm text-center tabular-nums focus:border-[#8E0E1A] focus:outline-none"
                      />
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-[10px] text-[#9CA3AF]">
                        {fmtEuro(pvtax)} / ud · IVA incl.
                        {product && effectiveBasePrice(product, tarifa) !== (product.price ?? 0) && (
                          <span className="ml-1 text-[#8E0E1A] font-semibold">{tarifa.toUpperCase()}</span>
                        )}
                      </p>
                      <p className="text-sm font-bold text-[#0A0A0A] tabular-nums">{fmtEuro(lineTotal)}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-5 py-3 bg-[#F9FAFB] border-t border-[#E5E7EB] flex items-center justify-between">
          <span className="text-xs font-medium text-[#6B7280]">Total pedido (IVA incl.)</span>
          <span className="text-base font-bold text-[#0A0A0A] tabular-nums">{fmtEuro(orderTotal)}</span>
        </div>
      </section>

      {/* ── Section 4: Notes + submit ──────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm px-5 py-4 space-y-3">
        <label className="block text-xs font-medium text-[#374151]">Notas del pedido</label>
        <textarea
          name="notes"
          rows={3}
          placeholder="Instrucciones especiales, referencias…"
          className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 resize-none"
        />
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending || recargo === ""}
          className="h-10 px-6 rounded-xl bg-[#8E0E1A] text-sm font-bold text-white hover:bg-[#6B0A14] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          title={recargo === "" ? "Debes seleccionar recargo de equivalencia" : undefined}
        >
          {pending ? "Creando pedido…" : "Crear pedido en Holded"}
        </button>
      </div>
    </form>
  );
}
