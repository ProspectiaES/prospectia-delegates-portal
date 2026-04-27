import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

// ─── Creditor data ────────────────────────────────────────────────────────────

const CREDITOR = {
  name:    "PROSPECTIA OVERSEAS CONSULTING SL",
  address: "Gran Via Corts Catalanes, 936",
  city:    "08018 Barcelona",
  cif:     "B66560939",
  ci:      "ES29ZZZ B66560939",   // SEPA Creditor Identifier — update with real CI
};

// ─── Mandate reference ────────────────────────────────────────────────────────

function mandateRef(code: string | null, id: string): string {
  const slug = (code ?? id.slice(0, 8)).toUpperCase().replace(/[^A-Z0-9]/g, "");
  return `PROS-${slug}-${new Date().getFullYear()}`;
}

function fmtIban(raw: string): string {
  return raw.replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("holded_contacts")
    .select("id, name, code, address, city, postal_code, country, iban, bic, raw, payment_method")
    .eq("id", id)
    .maybeSingle();

  if (!data || data.payment_method !== "direct_debit" || !data.iban) {
    return notFound();
  }

  const raw    = (data.raw ?? {}) as Record<string, unknown>;
  const nif    = (raw.vatnumber ?? raw.taxid ?? raw.nif ?? "") as string;
  const today  = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
  const ref    = mandateRef(data.code, data.id);
  const iban   = fmtIban(data.iban);
  const addr   = [data.address, [data.postal_code, data.city].filter(Boolean).join(" "), data.country]
                   .filter(Boolean).join(", ");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Mandato SEPA — ${data.name}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11pt;
    color: #111;
    background: #fff;
    padding: 0;
  }
  .page {
    max-width: 740px;
    margin: 0 auto;
    padding: 32px 40px 48px;
  }
  .print-btn {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 24px;
  }
  .print-btn button {
    background: #8E0E1A;
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 8px 20px;
    font-size: 12pt;
    font-weight: 600;
    cursor: pointer;
  }
  .print-btn button:hover { background: #6B0A14; }

  h1 {
    font-size: 13pt;
    font-weight: 700;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border-bottom: 2px solid #111;
    padding-bottom: 8px;
    margin-bottom: 6px;
  }
  .subtitle {
    text-align: center;
    font-size: 9pt;
    color: #555;
    margin-bottom: 20px;
  }
  .ref-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border: 1px solid #ccc;
    padding: 7px 12px;
    margin-bottom: 18px;
    background: #f8f8f8;
    font-size: 10pt;
  }
  .ref-row strong { font-size: 10pt; }

  section {
    border: 1px solid #ccc;
    margin-bottom: 14px;
  }
  section h2 {
    font-size: 9pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    background: #222;
    color: #fff;
    padding: 5px 10px;
  }
  .fields {
    padding: 10px 12px;
    display: grid;
    grid-template-columns: 160px 1fr;
    gap: 5px 0;
    font-size: 10pt;
  }
  .fields dt { color: #555; padding-right: 8px; padding-top: 2px; font-size: 9.5pt; }
  .fields dd { font-weight: 600; border-bottom: 1px dotted #ddd; padding-bottom: 3px; }
  .fields dd.mono { font-family: 'Courier New', monospace; letter-spacing: 0.04em; }

  .legal {
    font-size: 9pt;
    color: #333;
    line-height: 1.6;
    padding: 10px 12px;
    border-top: 1px solid #eee;
  }

  .tipo-pago {
    padding: 10px 12px;
    font-size: 10pt;
    display: flex;
    gap: 32px;
  }
  .tipo-pago label { display: flex; align-items: center; gap: 6px; cursor: default; }
  .tipo-pago input[type=radio] { width: 14px; height: 14px; }

  .signature-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    padding: 12px 12px 8px;
    font-size: 10pt;
  }
  .sig-block { border-top: 1px solid #aaa; padding-top: 6px; }
  .sig-block span { font-size: 9pt; color: #555; }
  .sig-space { height: 52px; }

  .footer-note {
    margin-top: 16px;
    font-size: 8pt;
    color: #888;
    line-height: 1.5;
    border-top: 1px solid #e0e0e0;
    padding-top: 10px;
  }

  @media print {
    .print-btn { display: none !important; }
    body { padding: 0; }
    .page { padding: 20px 28px 32px; max-width: 100%; }
    @page { margin: 1.5cm 1.5cm; size: A4; }
  }
</style>
</head>
<body>
<div class="page">

  <div class="print-btn">
    <button onclick="window.print()">⬇ Imprimir / Guardar PDF</button>
  </div>

  <h1>Orden de domiciliación de adeudo directo SEPA</h1>
  <p class="subtitle">SEPA Core Direct Debit Mandate &nbsp;·&nbsp; Esquema Básico</p>

  <div class="ref-row">
    <span>Referencia del mandato (RUM): <strong>${ref}</strong></span>
    <span>Identificador del acreedor (CI): <strong>${CREDITOR.ci}</strong></span>
  </div>

  <section>
    <h2>Datos del acreedor</h2>
    <dl class="fields">
      <dt>Nombre</dt>       <dd>${CREDITOR.name}</dd>
      <dt>Dirección</dt>    <dd>${CREDITOR.address}</dd>
      <dt>Localidad</dt>    <dd>${CREDITOR.city}</dd>
      <dt>CIF</dt>          <dd>${CREDITOR.cif}</dd>
    </dl>
  </section>

  <section>
    <h2>Datos del deudor</h2>
    <dl class="fields">
      <dt>Nombre titular</dt>  <dd>${data.name}</dd>
      <dt>Dirección</dt>       <dd>${addr || "—"}</dd>
      ${nif ? `<dt>NIF / CIF</dt><dd>${nif}</dd>` : ""}
      <dt>IBAN</dt>            <dd class="mono">${iban}</dd>
      <dt>BIC / SWIFT</dt>     <dd class="mono">${data.bic || "—"}</dd>
    </dl>
  </section>

  <section>
    <h2>Tipo de pago</h2>
    <div class="tipo-pago">
      <label><input type="radio" name="tipo" checked readonly /> Recurrente</label>
      <label><input type="radio" name="tipo" readonly /> Único</label>
    </div>
    <div class="legal">
      Mediante la firma de este formulario de autorización, el deudor autoriza(n) a <strong>${CREDITOR.name}</strong>
      a enviar instrucciones a la entidad financiera del deudor para adeudar en su cuenta,
      y a dicha entidad financiera a efectuar los adeudos en su cuenta conforme a las instrucciones de
      <strong>${CREDITOR.name}</strong>.
      <br/><br/>
      Como parte de sus derechos, el deudor está legitimado al reembolso por su entidad financiera en los términos
      y condiciones del contrato suscrito con la misma. La solicitud de reembolso deberá efectuarse dentro de las
      8 semanas que siguen a la fecha de adeudo en cuenta. Puede obtener información adicional sobre sus derechos
      en su entidad financiera.
    </div>
  </section>

  <section>
    <h2>Firma</h2>
    <div class="signature-row">
      <div class="sig-block">
        <span>Lugar y fecha</span>
        <div class="sig-space"></div>
        <p style="font-size:9.5pt; color:#555">${today}</p>
      </div>
      <div class="sig-block">
        <span>Firma del titular</span>
        <div class="sig-space"></div>
      </div>
    </div>
  </section>

  <p class="footer-note">
    Este mandato debe conservarse durante la vigencia del contrato y, como mínimo, 14 meses después
    del último adeudo autorizado. Los datos personales incluidos en este formulario se tratarán
    exclusivamente para la gestión de la domiciliación bancaria, conforme al Reglamento (UE) 2016/679 (RGPD).
  </p>

</div>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
