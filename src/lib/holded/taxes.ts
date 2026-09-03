// Shared tax-line helpers for Recargo de Equivalencia (RE), used by both the
// staff order actions and the client-portal order action.

// Add recargo de equivalencia tax codes alongside base IVA codes
export function addRecargoTaxes(taxes: string[]): string[] {
  const result = [...taxes];
  for (const t of taxes) {
    if (t === "s_iva_21" && !result.includes("s_rec_52")) result.push("s_rec_52");
    if (t === "s_iva_10" && !result.includes("s_rec_14")) result.push("s_rec_14");
    if (t === "s_iva_4"  && !result.includes("s_rec_05")) result.push("s_rec_05");
  }
  return result;
}

// Footer legal note appended to order notes when recargo de equivalencia applies
const RECARGO_FOOTER =
  "Régimen Especial del Recargo de Equivalencia aplicado según Ley 37/1992 del IVA: " +
  "IVA 10% + R.E. 1,4% · IVA 21% + R.E. 5,2%";

export function buildNotesWithRecargo(notes: string | undefined, recargo: boolean): string | undefined {
  if (!recargo) return notes || undefined;
  return notes ? `${notes}\n\n${RECARGO_FOOTER}` : RECARGO_FOOTER;
}
