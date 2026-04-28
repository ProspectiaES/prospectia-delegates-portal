import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CommissionLine {
  productName: string;
  sku: string | null;
  units: number;
  unitPrice: number;
  discountPct: number;
  lineNet: number;
  commissionRate: number;
  commissionType: string;
  commissionAmount: number;
}

export interface InvoiceCommission {
  invoiceId: string;
  docNumber: string;
  contactId: string | null;
  contactName: string;
  invoiceTotal: number;
  lines: CommissionLine[];
  subtotalCommission: number;
  recommenderName: string | null;
  recommenderDeduction: number;
  netCommission: number;
}

export interface CommissionBlock {
  role: string;
  invoices: InvoiceCommission[];
  totalNetCommission: number;
}

export interface DelegateInfo {
  full_name: string;
  delegate_name: string | null;
  email: string | null;
  phone: string | null;
  nif: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  iban: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RED    = "#8E0E1A";
const BLACK  = "#0A0A0A";
const DARK   = "#374151";
const GRAY   = "#6B7280";
const LGRAY  = "#F3F4F6";
const BORDER = "#E5E7EB";
const WHITE  = "#FFFFFF";

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency", currency: "EUR", minimumFractionDigits: 2,
  }).format(n);

const fmtRate = (rate: number, type: string) =>
  type === "amount" ? `${fmtEuro(rate)}/ud` : `${rate}%`;

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: BLACK,
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 44,
    backgroundColor: WHITE,
  },

  // Header
  headerStrip: {
    backgroundColor: RED,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerBrand: { fontFamily: "Helvetica-Bold", fontSize: 15, color: WHITE, letterSpacing: 2 },
  headerSubtitle: { fontSize: 8, color: WHITE, opacity: 0.8, marginTop: 2 },
  headerRight: { alignItems: "flex-end" },
  headerPeriod: { fontFamily: "Helvetica-Bold", fontSize: 11, color: WHITE },
  headerDate: { fontSize: 7.5, color: WHITE, opacity: 0.75, marginTop: 2 },

  // Delegate info card
  infoCard: {
    backgroundColor: LGRAY,
    borderRadius: 4,
    padding: 14,
    flexDirection: "row",
    marginBottom: 20,
  },
  infoCol: { flex: 1 },
  infoColRight: { flex: 1, marginLeft: 20 },
  infoLabel: { fontSize: 7.5, color: GRAY, marginBottom: 2, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue: { fontSize: 9, color: BLACK, marginBottom: 8 },
  infoValueMono: { fontSize: 9, color: BLACK, marginBottom: 8, fontFamily: "Helvetica-Oblique" },
  infoTitle: { fontFamily: "Helvetica-Bold", fontSize: 11, color: BLACK, marginBottom: 10 },

  // Section headers
  blockHeader: {
    backgroundColor: BLACK,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 0,
  },
  blockHeaderText: { fontFamily: "Helvetica-Bold", fontSize: 9, color: WHITE, letterSpacing: 1 },
  blockHeaderAmount: { fontFamily: "Helvetica-Bold", fontSize: 10, color: WHITE },

  // Invoice
  invoiceHeader: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    borderBottomStyle: "solid",
  },
  invoiceDocNumber: { fontFamily: "Helvetica-Bold", fontSize: 9, color: BLACK, width: 70 },
  invoiceClient: { flex: 1, fontSize: 9, color: DARK },
  invoiceTotal: { width: 70, textAlign: "right", fontSize: 9, color: GRAY },
  invoiceComm: { width: 75, textAlign: "right", fontFamily: "Helvetica-Bold", fontSize: 9, color: BLACK },

  // Product table
  productTable: {
    paddingHorizontal: 10,
    paddingBottom: 6,
    backgroundColor: WHITE,
  },
  tableHeaderRow: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    borderBottomStyle: "solid",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    borderBottomStyle: "solid",
  },
  thProduct: { flex: 2, fontSize: 7.5, color: GRAY, fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  thNum: { width: 32, textAlign: "right", fontSize: 7.5, color: GRAY, fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  thPrice: { width: 56, textAlign: "right", fontSize: 7.5, color: GRAY, fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  thDtc: { width: 36, textAlign: "right", fontSize: 7.5, color: GRAY, fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  thNet: { width: 58, textAlign: "right", fontSize: 7.5, color: GRAY, fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  thRate: { width: 50, textAlign: "right", fontSize: 7.5, color: GRAY, fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  thComm: { width: 64, textAlign: "right", fontSize: 7.5, color: GRAY, fontFamily: "Helvetica-Bold", textTransform: "uppercase" },

  tdProduct: { flex: 2, fontSize: 8, color: DARK },
  tdSku: { fontSize: 7, color: GRAY },
  tdNum: { width: 32, textAlign: "right", fontSize: 8, color: DARK },
  tdPrice: { width: 56, textAlign: "right", fontSize: 8, color: DARK },
  tdDtc: { width: 36, textAlign: "right", fontSize: 8, color: GRAY },
  tdNet: { width: 58, textAlign: "right", fontSize: 8, color: DARK },
  tdRate: { width: 50, textAlign: "right", fontSize: 8, color: GRAY },
  tdComm: { width: 64, textAlign: "right", fontSize: 8, fontFamily: "Helvetica-Bold", color: BLACK },

  // Invoice subtotals
  subtotalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  subtotalLabel: { fontSize: 8, color: GRAY, width: 160 },
  subtotalValue: { width: 80, textAlign: "right", fontSize: 8, color: DARK },
  deductionValue: { width: 80, textAlign: "right", fontSize: 8, color: RED },
  netLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: BLACK, width: 160 },
  netValue: { width: 80, textAlign: "right", fontSize: 8, fontFamily: "Helvetica-Bold", color: BLACK },

  // Block total
  blockTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: LGRAY,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    borderTopStyle: "solid",
    marginBottom: 16,
  },
  blockTotalLabel: { fontFamily: "Helvetica-Bold", fontSize: 9, color: DARK },
  blockTotalValue: { fontFamily: "Helvetica-Bold", fontSize: 11, color: BLACK },

  // Grand total
  grandTotal: {
    backgroundColor: RED,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  grandTotalLabel: { fontFamily: "Helvetica-Bold", fontSize: 11, color: WHITE, letterSpacing: 0.5 },
  grandTotalNote: { fontSize: 7.5, color: WHITE, opacity: 0.8, marginTop: 3 },
  grandTotalValue: { fontFamily: "Helvetica-Bold", fontSize: 20, color: WHITE },

  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    borderTopStyle: "solid",
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 7, color: GRAY },

  // Separators
  divider: { height: 1, backgroundColor: BORDER, marginVertical: 10 },
  spacer: { height: 8 },
  noInvoices: { paddingHorizontal: 10, paddingVertical: 10, fontSize: 8, color: GRAY },
});

// ─── Sub-components ───────────────────────────────────────────────────────────

function InvoiceSection({ inv }: { inv: InvoiceCommission }) {
  return (
    <View wrap={false}>
      {/* Invoice header */}
      <View style={s.invoiceHeader}>
        <Text style={s.invoiceDocNumber}>{inv.docNumber}</Text>
        <Text style={s.invoiceClient}>{inv.contactName}</Text>
        <Text style={s.invoiceTotal}>{fmtEuro(inv.invoiceTotal)}</Text>
        <Text style={s.invoiceComm}>{fmtEuro(inv.netCommission)}</Text>
      </View>

      {/* Product lines */}
      {inv.lines.length > 0 && (
        <View style={s.productTable}>
          <View style={s.tableHeaderRow}>
            <Text style={s.thProduct}>Producto</Text>
            <Text style={s.thNum}>Uds</Text>
            <Text style={s.thPrice}>P.Unit.</Text>
            <Text style={s.thDtc}>Dto.</Text>
            <Text style={s.thNet}>Neto línea</Text>
            <Text style={s.thRate}>Tasa</Text>
            <Text style={s.thComm}>Comisión</Text>
          </View>
          {inv.lines.map((line, i) => (
            <View key={i} style={s.tableRow}>
              <View style={s.tdProduct}>
                <Text>{line.productName}</Text>
                {line.sku && <Text style={s.tdSku}>{line.sku}</Text>}
              </View>
              <Text style={s.tdNum}>{line.units}</Text>
              <Text style={s.tdPrice}>{fmtEuro(line.unitPrice)}</Text>
              <Text style={s.tdDtc}>{line.discountPct > 0 ? `${line.discountPct}%` : "—"}</Text>
              <Text style={s.tdNet}>{fmtEuro(line.lineNet)}</Text>
              <Text style={s.tdRate}>{fmtRate(line.commissionRate, line.commissionType)}</Text>
              <Text style={s.tdComm}>{fmtEuro(line.commissionAmount)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Subtotals */}
      <View style={{ paddingHorizontal: 10, paddingBottom: 8, paddingTop: 4 }}>
        <View style={s.subtotalRow}>
          <Text style={s.subtotalLabel}>Subtotal comisión</Text>
          <Text style={s.subtotalValue}>{fmtEuro(inv.subtotalCommission)}</Text>
        </View>
        {inv.recommenderDeduction > 0 && (
          <View style={s.subtotalRow}>
            <Text style={s.subtotalLabel}>
              Deducción recomendador{inv.recommenderName ? ` (${inv.recommenderName})` : ""}
            </Text>
            <Text style={s.deductionValue}>−{fmtEuro(inv.recommenderDeduction)}</Text>
          </View>
        )}
        <View style={[s.subtotalRow, { borderTopWidth: 1, borderTopColor: BORDER, borderTopStyle: "solid", paddingTop: 4 }]}>
          <Text style={s.netLabel}>Comisión neta</Text>
          <Text style={s.netValue}>{fmtEuro(inv.netCommission)}</Text>
        </View>
      </View>
    </View>
  );
}

function BlockSection({ block }: { block: CommissionBlock }) {
  return (
    <View style={{ marginBottom: 4 }}>
      {/* Block header */}
      <View style={s.blockHeader}>
        <Text style={s.blockHeaderText}>LIQUIDACIÓN {block.role.toUpperCase()}</Text>
        <Text style={s.blockHeaderAmount}>{fmtEuro(block.totalNetCommission)}</Text>
      </View>

      {/* Column labels */}
      <View style={[s.invoiceHeader, { backgroundColor: "#F0F0F0" }]}>
        <Text style={[s.invoiceDocNumber, { fontSize: 7.5, color: GRAY, fontFamily: "Helvetica-Bold" }]}>FACTURA</Text>
        <Text style={[s.invoiceClient, { fontSize: 7.5, color: GRAY, fontFamily: "Helvetica-Bold" }]}>CLIENTE</Text>
        <Text style={[s.invoiceTotal, { fontSize: 7.5, color: GRAY, fontFamily: "Helvetica-Bold" }]}>TOTAL FAC.</Text>
        <Text style={[s.invoiceComm, { fontSize: 7.5, color: GRAY, fontFamily: "Helvetica-Bold" }]}>COMISIÓN</Text>
      </View>

      {block.invoices.length === 0 ? (
        <Text style={s.noInvoices}>Sin facturas cobradas en este período para este rol.</Text>
      ) : (
        block.invoices.map((inv) => (
          <InvoiceSection key={inv.invoiceId} inv={inv} />
        ))
      )}

      {/* Block total */}
      <View style={s.blockTotal}>
        <Text style={s.blockTotalLabel}>Total comisión {block.role}</Text>
        <Text style={s.blockTotalValue}>{fmtEuro(block.totalNetCommission)}</Text>
      </View>
    </View>
  );
}

// ─── Main document ────────────────────────────────────────────────────────────

interface Props {
  delegate: DelegateInfo;
  blocks: CommissionBlock[];
  period: string;
  generatedAt?: string;
}

export function LiquidacionPDF({ delegate, blocks, period, generatedAt }: Props) {
  const displayName = delegate.delegate_name ?? delegate.full_name;
  const grandTotal  = blocks.reduce((s, b) => s + b.totalNetCommission, 0);
  const today       = generatedAt ?? new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });

  const infoRows = [
    { label: "NIF / NIE", value: delegate.nif ?? "—" },
    { label: "Dirección", value: [delegate.address, delegate.city, delegate.postal_code].filter(Boolean).join(", ") || "—" },
    { label: "Email",     value: delegate.email ?? "—" },
    { label: "Teléfono",  value: delegate.phone ?? "—" },
  ];

  return (
    <Document title={`Liquidación ${displayName} — ${period}`} author="Prospectia" creator="Prospectia Delegates Portal">
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.headerStrip} fixed>
          <View>
            <Text style={s.headerBrand}>PROSPECTIA</Text>
            <Text style={s.headerSubtitle}>LIQUIDACIÓN DE COMISIONES</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerPeriod}>{period.toUpperCase()}</Text>
            <Text style={s.headerDate}>Emitido: {today}</Text>
          </View>
        </View>

        {/* Delegate info */}
        <View style={s.infoCard}>
          <View style={s.infoCol}>
            <Text style={s.infoTitle}>{displayName}</Text>
            {infoRows.map(({ label, value }) => (
              <View key={label}>
                <Text style={s.infoLabel}>{label}</Text>
                <Text style={s.infoValue}>{value}</Text>
              </View>
            ))}
          </View>
          <View style={s.infoColRight}>
            <Text style={[s.infoLabel, { marginTop: 21 }]}>IBAN</Text>
            <Text style={s.infoValueMono}>{delegate.iban ?? "—"}</Text>
            <Text style={[s.infoLabel, { marginTop: 8 }]}>Período de liquidación</Text>
            <Text style={s.infoValue}>{period}</Text>
            <Text style={[s.infoLabel, { marginTop: 8 }]}>N.º bloques de comisión</Text>
            <Text style={s.infoValue}>{blocks.length} ({blocks.map((b) => b.role).join(" + ")})</Text>
          </View>
        </View>

        {/* Commission blocks */}
        {blocks.map((block) => (
          <BlockSection key={block.role} block={block} />
        ))}

        {/* Grand total */}
        <View style={s.grandTotal}>
          <View>
            <Text style={s.grandTotalLabel}>TOTAL A LIQUIDAR</Text>
            <Text style={s.grandTotalNote}>
              {blocks.length > 1
                ? `${blocks.map((b) => `${b.role}: ${fmtEuro(b.totalNetCommission)}`).join(" + ")}`
                : `Período: ${period}`}
            </Text>
          </View>
          <Text style={s.grandTotalValue}>{fmtEuro(grandTotal)}</Text>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Prospectia Delegates Portal · Documento generado automáticamente
          </Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Pág. ${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  );
}
