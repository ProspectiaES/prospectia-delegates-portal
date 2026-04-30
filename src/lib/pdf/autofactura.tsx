import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AutofacturaLine {
  description: string;   // "Comisión delegado — FAC-001 (Cliente X)"
  amount: number;
}

export interface AutofacturaProps {
  docNumber: string;                // PO-AF-26-0001
  period: string;                   // "abril 2026"
  generatedAt: string;              // "30 de abril de 2026"
  delegate: {
    full_name: string;
    delegate_name: string | null;
    nif: string | null;
    address: string | null;
    city: string | null;
    postal_code: string | null;
    iban: string | null;
    email: string | null;
  };
  company: {
    name: string;
    nif: string;
    address: string;
    city: string;
    postal_code: string;
  };
  lines: AutofacturaLine[];
  baseCommission: number;
  ivaPct: number;
  ivaAmount: number;
  irpfPct: number;
  irpfAmount: number;
  recargoEqPct: number;
  recargoEqAmount: number;
  totalPayable: number;
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
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

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

  headerStrip: {
    backgroundColor: RED,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerLeft: {},
  headerBrand: { fontFamily: "Helvetica-Bold", fontSize: 15, color: WHITE, letterSpacing: 2 },
  headerDoc: { fontSize: 9, color: WHITE, opacity: 0.85, marginTop: 3, fontFamily: "Helvetica-Bold" },
  headerRight: { alignItems: "flex-end" },
  headerPeriod: { fontFamily: "Helvetica-Bold", fontSize: 11, color: WHITE, textTransform: "capitalize" },
  headerDate: { fontSize: 7.5, color: WHITE, opacity: 0.75, marginTop: 2 },

  partiesRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  partyCard: { flex: 1, backgroundColor: LGRAY, borderRadius: 4, padding: 12 },
  partyLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: GRAY, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 6 },
  partyName: { fontSize: 10, fontFamily: "Helvetica-Bold", color: BLACK, marginBottom: 3 },
  partyDetail: { fontSize: 8, color: DARK, marginBottom: 1.5 },
  partyMono: { fontSize: 8, color: DARK, marginBottom: 1.5, fontFamily: "Helvetica-Oblique" },

  sectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: GRAY,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 6,
    marginTop: 4,
  },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: LGRAY,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 3,
    marginBottom: 2,
  },
  thDesc: { flex: 1, fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GRAY, textTransform: "uppercase" },
  thAmt: { width: 80, fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GRAY, textTransform: "uppercase", textAlign: "right" },

  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tdDesc: { flex: 1, fontSize: 8.5, color: DARK },
  tdAmt: { width: 80, fontSize: 8.5, color: BLACK, textAlign: "right", fontFamily: "Helvetica-Bold" },

  summaryBox: {
    marginTop: 16,
    borderTopWidth: 2,
    borderTopColor: BORDER,
    paddingTop: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  summaryLabel: { fontSize: 8.5, color: DARK },
  summaryValue: { fontSize: 8.5, color: BLACK, fontFamily: "Helvetica-Bold" },
  summaryLabelMuted: { fontSize: 8, color: GRAY },
  summaryValueMuted: { fontSize: 8, color: GRAY },
  summaryDivider: { borderTopWidth: 1, borderTopColor: BORDER, marginVertical: 4 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: RED,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
  },
  totalLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", color: WHITE },
  totalValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: WHITE },

  ibanBox: {
    marginTop: 16,
    backgroundColor: LGRAY,
    borderRadius: 4,
    padding: 10,
  },
  ibanLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GRAY, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  ibanValue: { fontSize: 9, fontFamily: "Helvetica-Oblique", color: BLACK },

  footer: {
    position: "absolute",
    bottom: 28,
    left: 44,
    right: 44,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 7, color: GRAY },
});

// ─── Component ────────────────────────────────────────────────────────────────

export function AutofacturaPDF({
  docNumber, period, generatedAt, delegate, company,
  lines, baseCommission, ivaPct, ivaAmount, irpfPct, irpfAmount,
  recargoEqPct, recargoEqAmount, totalPayable,
}: AutofacturaProps) {
  const displayName = delegate.delegate_name ?? delegate.full_name;

  return (
    <Document title={`Autofactura ${docNumber}`} author="Prospectia" creator="Prospectia Delegates Portal">
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.headerStrip}>
          <View style={s.headerLeft}>
            <Text style={s.headerBrand}>AUTOFACTURA</Text>
            <Text style={s.headerDoc}>{docNumber}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerPeriod}>{period}</Text>
            <Text style={s.headerDate}>Emitida el {generatedAt}</Text>
          </View>
        </View>

        {/* Parties */}
        <View style={s.partiesRow}>
          <View style={s.partyCard}>
            <Text style={s.partyLabel}>Emisor (Prestador del servicio)</Text>
            <Text style={s.partyName}>{displayName}</Text>
            {delegate.nif         && <Text style={s.partyDetail}>NIF: {delegate.nif}</Text>}
            {delegate.address     && <Text style={s.partyDetail}>{delegate.address}</Text>}
            {delegate.postal_code && <Text style={s.partyDetail}>{delegate.postal_code} {delegate.city ?? ""}</Text>}
            {delegate.email       && <Text style={s.partyMono}>{delegate.email}</Text>}
          </View>
          <View style={s.partyCard}>
            <Text style={s.partyLabel}>Receptor (Pagador)</Text>
            <Text style={s.partyName}>{company.name}</Text>
            <Text style={s.partyDetail}>NIF: {company.nif}</Text>
            <Text style={s.partyDetail}>{company.address}</Text>
            <Text style={s.partyDetail}>{company.postal_code} {company.city}</Text>
          </View>
        </View>

        {/* Lines table */}
        <Text style={s.sectionTitle}>Detalle de comisiones — {period}</Text>
        <View style={s.tableHeader}>
          <Text style={s.thDesc}>Concepto</Text>
          <Text style={s.thAmt}>Importe</Text>
        </View>
        {lines.map((line, i) => (
          <View key={i} style={s.tableRow}>
            <Text style={s.tdDesc}>{line.description}</Text>
            <Text style={s.tdAmt}>{fmtEuro(line.amount)}</Text>
          </View>
        ))}

        {/* Summary */}
        <View style={s.summaryBox}>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Base imponible</Text>
            <Text style={s.summaryValue}>{fmtEuro(baseCommission)}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabelMuted}>IVA ({ivaPct}%)</Text>
            <Text style={s.summaryValueMuted}>+ {fmtEuro(ivaAmount)}</Text>
          </View>
          {irpfPct > 0 && (
            <View style={s.summaryRow}>
              <Text style={s.summaryLabelMuted}>IRPF ({irpfPct}%) — retención</Text>
              <Text style={s.summaryValueMuted}>− {fmtEuro(irpfAmount)}</Text>
            </View>
          )}
          {recargoEqPct > 0 && (
            <View style={s.summaryRow}>
              <Text style={s.summaryLabelMuted}>Recargo de equivalencia ({recargoEqPct}%)</Text>
              <Text style={s.summaryValueMuted}>+ {fmtEuro(recargoEqAmount)}</Text>
            </View>
          )}
          <View style={s.summaryDivider} />
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>TOTAL A PAGAR</Text>
            <Text style={s.totalValue}>{fmtEuro(totalPayable)}</Text>
          </View>
        </View>

        {/* IBAN */}
        {delegate.iban && (
          <View style={s.ibanBox}>
            <Text style={s.ibanLabel}>Cuenta bancaria para el pago</Text>
            <Text style={s.ibanValue}>{delegate.iban}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{docNumber} · {displayName}</Text>
          <Text style={s.footerText}>Prospectia Delegates Portal · Documento generado automáticamente</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  );
}
