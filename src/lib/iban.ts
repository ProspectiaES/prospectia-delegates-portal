// MOD-97 for arbitrarily large numeric strings
function mod97(numStr: string): number {
  let remainder = 0;
  for (const ch of numStr) {
    remainder = (remainder * 10 + parseInt(ch, 10)) % 97;
  }
  return remainder;
}

/**
 * Convert a Spanish CCC (4+4+2+10 digits) to IBAN ES.
 * The DC (dígit de control) must already be calculated by the bank —
 * we just repack the 20-digit CCC into the IBAN structure.
 */
export function cccToIban(entitat: string, oficina: string, dc: string, compte: string): string | null {
  const digits = (entitat + oficina + dc + compte).replace(/\D/g, "");
  if (digits.length !== 20) return null;
  // Numeric equivalent of "ES00" appended: E=14, S=28, placeholder 00
  const numericStr = digits + "142800";
  const checkDigits = 98 - mod97(numericStr);
  return "ES" + String(checkDigits).padStart(2, "0") + digits;
}

/** Format IBAN with a space every 4 chars: ES91 2100 0418 4502 0005 1332 */
export function formatIban(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase().replace(/(.{4})/g, "$1 ").trim();
}

/**
 * Validate any IBAN (ISO 13616).
 * Returns true | false | null (null = empty / too short to judge).
 */
export function validateIban(raw: string): true | false | null {
  const clean = raw.replace(/\s+/g, "").toUpperCase();
  if (clean.length < 5) return null;
  if (clean.length < 15 || clean.length > 34) return false;
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(clean)) return false;
  // Move first 4 chars to end, replace letters → numbers (A=10…Z=35)
  const rearranged = (clean.slice(4) + clean.slice(0, 4)).replace(
    /[A-Z]/g,
    (c) => String(c.charCodeAt(0) - 55)
  );
  return mod97(rearranged) === 1;
}
