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

export function buildDelegateOrderEmail(opts: {
  docNumber: string | null;
  contactName: string;
  delegateName: string;
  lines: OrderLine[];
  notes?: string;
  total: number;
  orderUrl?: string;
  createdByName?: string;
}): string {
  const { docNumber, contactName, delegateName, lines, notes, total, orderUrl, createdByName } = opts;
  const date = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });

  const rows = lines.map(l => {
    const lineTotal = l.units * l.price * (1 - (l.discount ?? 0) / 100);
    const isFoc = lineTotal === 0;
    return `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #F3F4F6;font-size:13px;color:#0A0A0A;">${l.name}${isFoc ? ' <span style="font-size:10px;font-weight:700;color:#059669;background:#DCFCE7;padding:1px 6px;border-radius:4px;margin-left:4px;">FOC</span>' : ''}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #F3F4F6;font-size:13px;text-align:center;color:#374151;">${l.units}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #F3F4F6;font-size:13px;text-align:right;font-weight:600;color:${isFoc ? '#9CA3AF' : '#0A0A0A'};">${isFoc ? '0,00 €' : fmtEuro(lineTotal)}</td>
      </tr>`;
  }).join("");

  const notesBlock = notes
    ? `<tr style="background:#FFFBEB;">
        <td colspan="3" style="padding:12px 16px;font-size:12px;color:#92400E;border-top:1px solid #FDE68A;">
          <strong>Nota:</strong> ${notes}
        </td>
       </tr>`
    : "";

  const createdByBlock = createdByName
    ? `<p style="margin:0 0 4px;font-size:11px;color:#6B7280;">Pedido creado por <strong style="color:#374151;">${createdByName}</strong></p>`
    : "";

  const ctaButton = orderUrl
    ? `<div style="text-align:center;margin-top:32px;">
        <a href="${orderUrl}" style="display:inline-block;padding:13px 32px;background:#8E0E1A;color:#ffffff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;letter-spacing:0.3px;">
          Ver pedido en el portal →
        </a>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:580px;width:100%;box-shadow:0 2px 8px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr>
          <td style="background:#8E0E1A;padding:28px 36px;">
            <p style="margin:0 0 2px;color:rgba(255,255,255,.65);font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Prospectia</p>
            <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">Nuevo pedido asignado</p>
          </td>
        </tr>

        <!-- Salutation -->
        <tr>
          <td style="padding:28px 36px 0;">
            <p style="margin:0 0 8px;font-size:15px;color:#0A0A0A;">Hola <strong>${delegateName}</strong>,</p>
            <p style="margin:0;font-size:14px;color:#6B7280;line-height:1.6;">
              Te informamos de que se ha creado un nuevo pedido asignado a tu cartera de clientes y ha pasado a producción para su preparación.
            </p>
          </td>
        </tr>

        <!-- Order meta -->
        <tr>
          <td style="padding:20px 36px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border-radius:10px;overflow:hidden;border:1px solid #E5E7EB;">
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid #E5E7EB;">
                  <p style="margin:0;font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:1.5px;">Número de pedido</p>
                  <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#8E0E1A;font-family:monospace;">${docNumber ? `#${docNumber}` : '—'}</p>
                </td>
                <td style="padding:16px 20px;border-bottom:1px solid #E5E7EB;vertical-align:top;">
                  <p style="margin:0;font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:1.5px;">Estado</p>
                  <p style="margin:6px 0 0;font-size:13px;"><span style="display:inline-block;background:#DCFCE7;color:#166534;font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;">En producción</span></p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0;font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:1.5px;">Cliente</p>
                  <p style="margin:6px 0 0;font-size:15px;font-weight:600;color:#0A0A0A;">${contactName}</p>
                </td>
                <td style="padding:16px 20px;vertical-align:top;">
                  <p style="margin:0;font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:1.5px;">Fecha</p>
                  <p style="margin:6px 0 0;font-size:13px;color:#374151;">${date}</p>
                  ${createdByBlock}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Lines table -->
        <tr>
          <td style="padding:20px 36px 0;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:1.5px;">Líneas del pedido</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;">
              <thead>
                <tr style="background:#F9FAFB;">
                  <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:1px;">Producto</th>
                  <th style="padding:10px 16px;text-align:center;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:1px;">Ud.</th>
                  <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:1px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
                ${notesBlock}
                <tr style="background:#F9FAFB;">
                  <td colspan="2" style="padding:12px 16px;text-align:right;font-size:12px;font-weight:600;color:#374151;">Total neto (s/ IVA)</td>
                  <td style="padding:12px 16px;text-align:right;font-size:16px;font-weight:700;color:#0A0A0A;">${fmtEuro(total)}</td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:8px 36px 36px;">
            ${ctaButton}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 36px;background:#F9FAFB;border-top:1px solid #E5E7EB;">
            <p style="margin:0;font-size:11px;color:#9CA3AF;text-align:center;line-height:1.7;">
              <strong style="color:#6B7280;">Prospectia</strong> · portal.prospectia.es<br>
              Este mensaje es automático. Si tienes dudas, contacta con el equipo de administración.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
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
