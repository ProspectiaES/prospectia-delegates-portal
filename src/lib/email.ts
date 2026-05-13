import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST ?? "smtp.1und1.de",
  port:   Number(process.env.SMTP_PORT ?? 465),
  secure: true, // SSL/TLS port 465
  auth: {
    user: process.env.SMTP_USER ?? "admin@prospectia.es",
    pass: process.env.SMTP_PASS,
  },
});

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail({ to, subject, html }: MailOptions): Promise<void> {
  if (!process.env.SMTP_PASS) return;
  await transporter.sendMail({
    from: '"Prospectia Portal" <admin@prospectia.es>',
    to,
    subject,
    html,
  });
}

// ─── Templates ───────────────────────────────────────────────────────────────

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

export interface OrderLine {
  name: string;
  units: number;
  price: number;
  discount?: number;
}

export function buildOrderEmail(opts: {
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

  const rows = lines.map(l => {
    const lineTotal = l.units * l.price * (1 - (l.discount ?? 0) / 100);
    return `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;font-size:13px;">${l.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;font-size:13px;text-align:right;">${l.units}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;font-size:13px;text-align:right;">${fmtEuro(l.price)}</td>
        ${l.discount ? `<td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;font-size:13px;text-align:right;">-${l.discount}%</td>` : `<td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;font-size:13px;text-align:right;">—</td>`}
        <td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;font-size:13px;text-align:right;font-weight:600;">${fmtEuro(lineTotal)}</td>
      </tr>`;
  }).join("");

  const notesBlock = notes
    ? `<tr><td colspan="5" style="padding:12px;background:#FFFBEB;font-size:12px;color:#92400E;border-top:2px solid #FDE68A;"><strong>Notas:</strong> ${notes}</td></tr>`
    : "";

  const ctaButton = orderUrl
    ? `<div style="text-align:center;margin-top:28px;">
        <a href="${orderUrl}" style="display:inline-block;padding:12px 28px;background:#8E0E1A;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
          Ver pedido en el portal →
        </a>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#8E0E1A;padding:24px 32px;">
            <p style="margin:0;color:#fff;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;opacity:.7;">Prospectia Portal</p>
            <h1 style="margin:4px 0 0;color:#fff;font-size:22px;font-weight:700;">Nuevo pedido</h1>
          </td>
        </tr>

        <!-- Meta info -->
        <tr>
          <td style="padding:24px 32px 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:50%;padding-bottom:12px;">
                  <p style="margin:0;font-size:11px;color:#6B7280;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Número pedido</p>
                  <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#0A0A0A;font-family:monospace;">${docNumber ?? "—"}</p>
                </td>
                <td style="width:50%;padding-bottom:12px;">
                  <p style="margin:0;font-size:11px;color:#6B7280;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Fecha</p>
                  <p style="margin:4px 0 0;font-size:14px;color:#374151;">${date}</p>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:12px;">
                  <p style="margin:0;font-size:11px;color:#6B7280;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Cliente</p>
                  <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#0A0A0A;">${contactName}</p>
                </td>
                <td style="padding-bottom:12px;">
                  <p style="margin:0;font-size:11px;color:#6B7280;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Delegado</p>
                  <p style="margin:4px 0 0;font-size:14px;color:#374151;">${delegateName}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Products table -->
        <tr>
          <td style="padding:16px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">
              <thead>
                <tr style="background:#F9FAFB;">
                  <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:1px;">Producto</th>
                  <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:1px;">Uds.</th>
                  <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:1px;">P.U.</th>
                  <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:1px;">Dto.</th>
                  <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:1px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
                ${notesBlock}
                <tr style="background:#F9FAFB;">
                  <td colspan="4" style="padding:12px;text-align:right;font-size:13px;font-weight:600;color:#374151;">TOTAL</td>
                  <td style="padding:12px;text-align:right;font-size:16px;font-weight:700;color:#0A0A0A;">${fmtEuro(total)}</td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:8px 32px 32px;">
            ${ctaButton}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;background:#F9FAFB;border-top:1px solid #E5E7EB;">
            <p style="margin:0;font-size:11px;color:#9CA3AF;text-align:center;">
              Prospectia Delegates Portal · admin@prospectia.es<br>
              Este mensaje se generó automáticamente.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
