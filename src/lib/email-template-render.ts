export type EmailLang = "ca" | "es";

export interface LastOrderInfo {
  docNumber: string | null;
  products: string[]; // product names, in order
}

// "Vimos que tu última compra fue X (factura Y)." — o cadena buida si no hi ha dades.
export function buildUltimaCompraClause(lang: EmailLang, lastOrder: LastOrderInfo | null): string {
  if (!lastOrder || lastOrder.products.length === 0) return "";
  const list = formatProductList(lastOrder.products, lang);
  const facturaPart = lastOrder.docNumber
    ? (lang === "ca" ? ` (factura ${lastOrder.docNumber})` : ` (factura ${lastOrder.docNumber})`)
    : "";
  return lang === "ca"
    ? `Vam veure que la teva darrera compra va ser ${list}${facturaPart}.`
    : `Vimos que tu última compra fue ${list}${facturaPart}.`;
}

function formatProductList(products: string[], lang: EmailLang): string {
  const unique = [...new Set(products)];
  if (unique.length === 1) return unique[0];
  const conjunction = lang === "ca" ? "i" : "y";
  return `${unique.slice(0, -1).join(", ")} ${conjunction} ${unique[unique.length - 1]}`;
}

// Substitueix {{placeholder}} pel valor corresponent. Placeholders desconeguts es deixen tal qual.
export function renderTemplate(bodyText: string, vars: Record<string, string>): string {
  return bodyText.replace(/\{\{(\w+)\}\}/g, (match, key: string) => vars[key] ?? match);
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}
