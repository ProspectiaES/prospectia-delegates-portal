// Shared invoice formatting/status helpers used by both the staff and client
// (NIF/CIF portal) invoice views.

export interface InvoiceLike {
  status: number;
  total: number;
  raw: Record<string, unknown> | null;
}

export const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export const statusLabel: Record<number, string> = { 0: "Borrador", 1: "Pendiente", 2: "Vencida", 3: "Cobrada" };
export const statusVariant: Record<number, "neutral" | "warning" | "danger" | "success"> = {
  0: "neutral", 1: "warning", 2: "danger", 3: "success",
};

export function pendingAmount(inv: InvoiceLike): number {
  if (inv.status === 3) return 0;
  const raw = inv.raw ?? {};
  const pp = typeof raw.paymentsPending === "number" ? raw.paymentsPending : null;
  return pp !== null && pp > 0.02 ? pp : inv.total;
}
