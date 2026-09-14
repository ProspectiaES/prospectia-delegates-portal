import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, BorderStyle, VerticalAlign,
} from "docx";
import { getProfile } from "@/lib/profile";
import { getHistoricoData } from "@/lib/bruixola/historicoData";

export const runtime = "nodejs";

const RED = "8E0E1A";
const GREY = "6B7280";

const fmt = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 100));

function cell(text: string, opts?: { bold?: boolean; color?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; shading?: string }) {
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    shading: opts?.shading ? { fill: opts.shading } : undefined,
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    children: [new Paragraph({
      alignment: opts?.align ?? AlignmentType.LEFT,
      children: [new TextRun({ text, bold: opts?.bold, color: opts?.color })],
    })],
  });
}

export async function GET() {
  const profile = await getProfile();
  if (!profile || (profile.role !== "OWNER" && profile.role !== "CONSIGLIERE")) {
    return new Response("Forbidden", { status: 403 });
  }

  const { totalIntl, totalOtros, countIntl, countOtros, total, invoiceCount, byYear, byProduct, firstDate, lastDate } = await getHistoricoData();

  const periodLabel = firstDate && lastDate
    ? `${firstDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" })} — ${lastDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}`
    : "Sin datos disponibles";

  const summaryTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          cell("Categoría", { bold: true, color: "FFFFFF", shading: RED }),
          cell("Importe", { bold: true, color: "FFFFFF", shading: RED, align: AlignmentType.RIGHT }),
          cell("% del total", { bold: true, color: "FFFFFF", shading: RED, align: AlignmentType.RIGHT }),
          cell("Facturas", { bold: true, color: "FFFFFF", shading: RED, align: AlignmentType.RIGHT }),
        ],
      }),
      new TableRow({
        children: [
          cell("Internacional"),
          cell(fmt(totalIntl), { align: AlignmentType.RIGHT }),
          cell(`${pct(totalIntl, total)}%`, { align: AlignmentType.RIGHT }),
          cell(String(countIntl), { align: AlignmentType.RIGHT }),
        ],
      }),
      new TableRow({
        children: [
          cell("Otros"),
          cell(fmt(totalOtros), { align: AlignmentType.RIGHT }),
          cell(`${pct(totalOtros, total)}%`, { align: AlignmentType.RIGHT }),
          cell(String(countOtros), { align: AlignmentType.RIGHT }),
        ],
      }),
      new TableRow({
        children: [
          cell("TOTAL", { bold: true, shading: "F9FAFB" }),
          cell(fmt(total), { bold: true, color: RED, align: AlignmentType.RIGHT, shading: "F9FAFB" }),
          cell("100%", { bold: true, align: AlignmentType.RIGHT, shading: "F9FAFB" }),
          cell(String(invoiceCount), { bold: true, align: AlignmentType.RIGHT, shading: "F9FAFB" }),
        ],
      }),
    ],
  });

  const yearRows = [
    new TableRow({
      children: [
        cell("Año", { bold: true, color: "FFFFFF", shading: RED }),
        cell("Internacional", { bold: true, color: "FFFFFF", shading: RED, align: AlignmentType.RIGHT }),
        cell("Otros", { bold: true, color: "FFFFFF", shading: RED, align: AlignmentType.RIGHT }),
        cell("Total", { bold: true, color: "FFFFFF", shading: RED, align: AlignmentType.RIGHT }),
      ],
    }),
    ...byYear.map(b => new TableRow({
      children: [
        cell(String(b.year), { bold: true }),
        cell(fmt(b.intl), { align: AlignmentType.RIGHT }),
        cell(fmt(b.otros), { align: AlignmentType.RIGHT }),
        cell(fmt(b.intl + b.otros), { bold: true, color: RED, align: AlignmentType.RIGHT }),
      ],
    })),
  ];
  const yearTable = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: yearRows });

  const productRows = [
    new TableRow({
      children: [
        cell("Producto", { bold: true, color: "FFFFFF", shading: RED }),
        cell("Internacional", { bold: true, color: "FFFFFF", shading: RED, align: AlignmentType.RIGHT }),
        cell("Otros", { bold: true, color: "FFFFFF", shading: RED, align: AlignmentType.RIGHT }),
        cell("Total", { bold: true, color: "FFFFFF", shading: RED, align: AlignmentType.RIGHT }),
      ],
    }),
    ...byProduct.map(p => new TableRow({
      children: [
        cell(p.producto),
        cell(p.intl > 0 ? fmt(p.intl) : "—", { align: AlignmentType.RIGHT }),
        cell(p.otros > 0 ? fmt(p.otros) : "—", { align: AlignmentType.RIGHT }),
        cell(fmt(p.intl + p.otros), { bold: true, color: RED, align: AlignmentType.RIGHT }),
      ],
    })),
  ];
  const productTable = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: productRows });

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [new TextRun({ text: "PROSPECTIA", bold: true, color: RED, size: 20 })],
        }),
        new Paragraph({
          heading: HeadingLevel.TITLE,
          spacing: { before: 100, after: 100 },
          children: [new TextRun({ text: "Facturación histórica" })],
        }),
        new Paragraph({
          spacing: { after: 300 },
          children: [new TextRun({ text: `Periodo: ${periodLabel}`, color: GREY, italics: true })],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({
            text: `Este documento resume el volumen total facturado desde que existen datos en el sistema, desglosado entre negocio Internacional y el resto de la actividad ("Otros"). Cifras en base imponible, sobre facturas emitidas (excluye borradores y facturas anuladas por nota de crédito).`,
          })],
        }),
        new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 150 }, children: [new TextRun("Resumen")] }),
        summaryTable,
        new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 150 }, children: [new TextRun("Evolución por año")] }),
        yearTable,
        new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 150 }, children: [new TextRun("Por producto")] }),
        new Paragraph({
          spacing: { after: 150 },
          children: [new TextRun({ text: "Importe neto por línea de factura (precio × unidades − descuento); puede diferir ligeramente del total de factura por redondeos.", color: GREY, italics: true, size: 16 })],
        }),
        productTable,
        new Paragraph({
          spacing: { before: 500 },
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB", space: 8 } },
          children: [new TextRun({ text: `Documento generado el ${new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })} · Prospectia`, color: GREY, size: 16 })],
        }),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);

  return new Response(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="prospectia-facturacion-historica.docx"`,
    },
  });
}
