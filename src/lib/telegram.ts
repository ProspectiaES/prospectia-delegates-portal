import type { OrderLine } from "./email";

const API = "https://api.telegram.org";

export async function sendTelegram(text: string): Promise<void> {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  await fetch(`${API}/bot${token}/sendMessage`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id:    chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
}

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

export function buildOrderTelegram(opts: {
  docNumber: string | null;
  contactName: string;
  delegateName: string;
  lines: OrderLine[];
  notes?: string;
  total: number;
  orderUrl?: string;
}): string {
  const { docNumber, contactName, delegateName, lines, notes, total, orderUrl } = opts;
  const date = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });

  const lineRows = lines
    .map(l => {
      const lineTotal = l.units * l.price * (1 - (l.discount ?? 0) / 100);
      const disc = l.discount ? ` -${l.discount}%` : "";
      return `  • ${l.name} × ${l.units}${disc} → <b>${fmtEuro(lineTotal)}</b>`;
    })
    .join("\n");

  const notesLine = notes ? `\n📝 <i>${notes}</i>` : "";
  const urlLine   = orderUrl ? `\n\n🔗 <a href="${orderUrl}">Ver pedido en el portal</a>` : "";

  return [
    `🛒 <b>Nuevo pedido ${docNumber ?? "—"}</b>`,
    `📅 ${date}`,
    ``,
    `👤 <b>Cliente:</b> ${contactName}`,
    `👨‍💼 <b>Delegado:</b> ${delegateName}`,
    ``,
    `<b>Productos:</b>`,
    lineRows,
    notesLine,
    ``,
    `💰 <b>Total: ${fmtEuro(total)}</b>`,
    urlLine,
  ].join("\n");
}
