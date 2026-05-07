import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

// ─── Helpers (ASCII only — no Unicode special chars) ─────────────────────────
const fmt0 = (n: number) => new Intl.NumberFormat("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
const fmtE = (n: number) => `${n < 0 ? "-" : ""}${fmt0(Math.abs(n))} EUR`;
const fmtP = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
const fmtR = (n: number | null) => n != null ? `${n.toFixed(1)}x` : "-";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PerfDelegateRow {
  id: string;
  name: string;
  is_kol: boolean;
  sprayUnits: number;
  focUnits: number;
  prevSprayUnits: number;
  deltaUnits: number | null;
  deltaYoy: number | null;
  ingresos: number;
  grossMargin: number;
  commDelegate: number;
  commRec: number;
  totalChain: number;
  netContribution: number;
  netMarginPct: number | null;
  roi: number | null;
  invoiceCount: number;
  activeClients: number;
  totalClients: number;
  newClients: number;
  dormantClients: number;
  status: string;
}

export interface PerfReportData {
  periodLabel: string;
  prevLabel: string;
  generatedAt: string;
  rows: PerfDelegateRow[];
  totals: {
    ingresos: number;
    sprayUnits: number;
    commChain: number;
    netContrib: number;
    newClients: number;
    invoices: number;
    active: number;
    total: number;
    roi: number | null;
    grossMargin: number;
  };
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const C = {
  brand:  "#5A2E3A",
  black:  "#0A0A0A",
  muted:  "#6B7280",
  border: "#E5E7EB",
  bg:     "#F9FAFB",
  white:  "#FFFFFF",
  green:  "#059669",
  amber:  "#D97706",
  red:    "#DC2626",
  purple: "#7C3AED",
  blue:   "#2563EB",
};

const ss = StyleSheet.create({
  page:        { fontFamily: "Helvetica", fontSize: 8, color: C.black, backgroundColor: C.white, padding: 30 },
  pagePort:    { fontFamily: "Helvetica", fontSize: 8, color: C.black, backgroundColor: C.white, padding: 24 },
  header:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16, paddingBottom: 10, borderBottom: `1px solid ${C.border}` },
  title:       { fontSize: 16, fontFamily: "Helvetica-Bold", color: C.brand },
  subtitle:    { fontSize: 9,  color: C.muted, marginTop: 2 },
  // KPI strip
  kpiRow:      { flexDirection: "row", gap: 8, marginBottom: 14 },
  kpiCard:     { flex: 1, backgroundColor: C.bg, borderRadius: 4, padding: 8 },
  kpiLabel:    { fontSize: 6, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  kpiValue:    { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.black },
  kpiSub:      { fontSize: 6,  color: C.muted, marginTop: 1 },
  // Table
  tHead:       { flexDirection: "row", backgroundColor: C.bg, borderBottom: `1px solid ${C.border}`, paddingVertical: 4 },
  tRow:        { flexDirection: "row", borderBottom: `1px solid ${C.border}`, paddingVertical: 3 },
  tFoot:       { flexDirection: "row", backgroundColor: C.black, paddingVertical: 4 },
  tCell:       { fontSize: 7, paddingHorizontal: 4 },
  tHead_cell:  { fontSize: 6, fontFamily: "Helvetica-Bold", color: C.muted, paddingHorizontal: 4, textTransform: "uppercase" },
  tFoot_cell:  { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.white, paddingHorizontal: 4 },
  // Ranking
  rankCol:     { flex: 1, border: `1px solid ${C.border}`, borderRadius: 4, marginHorizontal: 4 },
  rankHead:    { backgroundColor: C.bg, padding: 6, borderBottom: `1px solid ${C.border}` },
  rankTitle:   { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.black, textTransform: "uppercase" },
  rankRow:     { flexDirection: "row", alignItems: "flex-start", padding: 5, borderBottom: `1px solid ${C.border}` },
  rankPos:     { fontSize: 10, width: 18, textAlign: "center" },
  rankName:    { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.black, flex: 1 },
  rankMain:    { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.brand },
  rankSub:     { fontSize: 6, color: C.muted },
  // Cards
  cardGrid:    { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  card:        { width: "31%", borderRadius: 5, border: `1.5px solid ${C.border}`, overflow: "hidden", marginBottom: 8 },
  cardHeader:  { padding: "6 8", borderBottom: `1px solid ${C.border}` },
  cardName:    { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.black },
  cardRole:    { fontSize: 6, color: C.muted },
  cardBody:    { padding: "6 8" },
  cardRow:     { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  cardLabel:   { fontSize: 6, color: C.muted },
  cardVal:     { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.black },
  // Page number
  footer:      { position: "absolute", bottom: 16, left: 30, right: 30, flexDirection: "row", justifyContent: "space-between", borderTop: `1px solid ${C.border}`, paddingTop: 4 },
  footerTxt:   { fontSize: 6, color: C.muted },
});

// ─── Sub-components ───────────────────────────────────────────────────────────

function PageHeader({ title, sub, period, generated }: { title: string; sub: string; period: string; generated: string }) {
  return (
    <View style={ss.header}>
      <View>
        <Text style={ss.title}>{title}</Text>
        <Text style={ss.subtitle}>{sub}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: C.brand }}>{period}</Text>
        <Text style={{ fontSize: 6, color: C.muted, marginTop: 2 }}>Generado: {generated}</Text>
      </View>
    </View>
  );
}

function PageFooter({ label }: { label: string }) {
  return (
    <View style={ss.footer} fixed>
      <Text style={ss.footerTxt}>Prospectia - Informe de Performance</Text>
      <Text style={ss.footerTxt}>{label}</Text>
      <Text style={ss.footerTxt} render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} de ${totalPages}`} />
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; color: string }> = {
    "top":        { label: "Top",        color: C.green  },
    "activo":     { label: "Activo",     color: C.blue   },
    "bajo":       { label: "Bajo",       color: C.amber  },
    "sin-ventas": { label: "Sin ventas", color: C.muted  },
  };
  const c = cfg[status] ?? { label: status, color: C.muted };
  return <Text style={{ fontSize: 6, color: c.color, fontFamily: "Helvetica-Bold" }}>{c.label}</Text>;
}

// ─── Page 1: Executive Summary (landscape) ───────────────────────────────────

function Page1({ data }: { data: PerfReportData }) {
  const { rows, totals, periodLabel, prevLabel, generatedAt } = data;
  const T = totals;

  const kpis = [
    { label: "Delegados activos", value: `${T.active}/${T.total}`, sub: `vs ${prevLabel}` },
    { label: "Unidades vendidas", value: T.sprayUnits.toString(), sub: `${T.invoices} facturas` },
    { label: "Base imponible", value: fmtE(T.ingresos), sub: `${T.newClients} clientes nuevos` },
    { label: "Comisiones pagadas", value: fmtE(T.commChain), sub: "cadena completa" },
    { label: "ROI global", value: fmtR(T.roi), sub: `Contrib: ${fmtE(T.netContrib)}` },
  ];

  const COL = [16, 5, 6, 9, 8, 8, 8, 6, 5, 4, 4, 4, 7];
  const HEADS = ["Delegado","Uds","Delt%","Ingresos","Com.Bruta","Com.Rec","Com.Neta","ROI","Fact","Act","Nue","Dorm","Estado"];

  return (
    <Page size="A4" orientation="landscape" style={ss.page}>
      <PageHeader title="Performance de Delegados" sub="Resumen ejecutivo mensual" period={periodLabel} generated={generatedAt} />

      {/* KPIs */}
      <View style={ss.kpiRow}>
        {kpis.map(k => (
          <View key={k.label} style={ss.kpiCard}>
            <Text style={ss.kpiLabel}>{k.label}</Text>
            <Text style={ss.kpiValue}>{k.value}</Text>
            <Text style={ss.kpiSub}>{k.sub}</Text>
          </View>
        ))}
      </View>

      {/* Table header */}
      <View style={ss.tHead}>
        {HEADS.map((h, i) => (
          <Text key={h} style={[ss.tHead_cell, { flex: COL[i], textAlign: i >= 7 ? "right" : "left" }]}>{h}</Text>
        ))}
      </View>
      {rows.map((r, ri) => {
        const commNeta = r.commDelegate - r.commRec;
        const isEven   = ri % 2 === 0;
        return (
          <View key={r.id} style={[ss.tRow, { backgroundColor: isEven ? C.white : "#FAFAFA" }]}>
            <Text style={[ss.tCell, { flex: COL[0] }]}>{r.name}{r.is_kol ? " [KOL]" : ""}</Text>
            <Text style={[ss.tCell, { flex: COL[1], textAlign: "right", fontFamily: "Helvetica-Bold" }]}>{r.sprayUnits || "-"}</Text>
            <Text style={[ss.tCell, { flex: COL[2], textAlign: "right", color: r.deltaUnits == null ? C.muted : r.deltaUnits >= 0 ? C.green : C.red }]}>
              {r.deltaUnits != null ? fmtP(r.deltaUnits) : "-"}
            </Text>
            <Text style={[ss.tCell, { flex: COL[3], textAlign: "right" }]}>{r.ingresos > 0 ? fmtE(r.ingresos) : "-"}</Text>
            <Text style={[ss.tCell, { flex: COL[4], textAlign: "right", color: C.purple }]}>{r.commDelegate > 0 ? fmtE(r.commDelegate) : "-"}</Text>
            <Text style={[ss.tCell, { flex: COL[5], textAlign: "right", color: C.amber }]}>{r.commRec > 0 ? fmtE(r.commRec) : "-"}</Text>
            <Text style={[ss.tCell, { flex: COL[6], textAlign: "right", fontFamily: "Helvetica-Bold" }]}>{r.commDelegate > 0 ? fmtE(commNeta) : "-"}</Text>
            <Text style={[ss.tCell, { flex: COL[7], textAlign: "right", color: r.roi == null ? C.muted : r.roi >= 10 ? C.green : r.roi >= 5 ? C.amber : C.red }]}>
              {fmtR(r.roi)}
            </Text>
            <Text style={[ss.tCell, { flex: COL[8],  textAlign: "right" }]}>{r.invoiceCount || "-"}</Text>
            <Text style={[ss.tCell, { flex: COL[9],  textAlign: "right" }]}>{r.activeClients || "-"}</Text>
            <Text style={[ss.tCell, { flex: COL[10], textAlign: "right", color: r.newClients > 0 ? C.blue : C.muted }]}>{r.newClients > 0 ? `+${r.newClients}` : "-"}</Text>
            <Text style={[ss.tCell, { flex: COL[11], textAlign: "right", color: r.dormantClients > 0 ? C.amber : C.muted }]}>{r.dormantClients || "-"}</Text>
            <Text style={[ss.tCell, { flex: COL[12] }]}><StatusBadge status={r.status} /></Text>
          </View>
        );
      })}
      {/* Footer row */}
      <View style={ss.tFoot}>
        <Text style={[ss.tFoot_cell, { flex: COL[0] }]}>{rows.length} delegados</Text>
        <Text style={[ss.tFoot_cell, { flex: COL[1], textAlign: "right" }]}>{T.sprayUnits}</Text>
        <Text style={[ss.tFoot_cell, { flex: COL[2] }]} />
        <Text style={[ss.tFoot_cell, { flex: COL[3], textAlign: "right" }]}>{fmtE(T.ingresos)}</Text>
        <Text style={[ss.tFoot_cell, { flex: COL[4], textAlign: "right" }]}>{fmtE(rows.reduce((s,r) => s+r.commDelegate, 0))}</Text>
        <Text style={[ss.tFoot_cell, { flex: COL[5], textAlign: "right" }]}>{fmtE(rows.reduce((s,r) => s+r.commRec, 0))}</Text>
        <Text style={[ss.tFoot_cell, { flex: COL[6], textAlign: "right" }]}>{fmtE(rows.reduce((s,r) => s+r.commDelegate-r.commRec, 0))}</Text>
        <Text style={[ss.tFoot_cell, { flex: COL[7], textAlign: "right" }]}>{fmtR(T.roi)}</Text>
        <Text style={[ss.tFoot_cell, { flex: COL[8], textAlign: "right" }]}>{T.invoices}</Text>
        <Text style={[ss.tFoot_cell, { flex: COL[9], textAlign: "right" }]}>{rows.reduce((s,r) => s+r.activeClients, 0)}</Text>
        <Text style={[ss.tFoot_cell, { flex: COL[10], textAlign: "right" }]}>+{T.newClients}</Text>
        <Text style={[ss.tFoot_cell, { flex: COL[11], textAlign: "right" }]}>{rows.reduce((s,r) => s+r.dormantClients, 0)}</Text>
        <Text style={[ss.tFoot_cell, { flex: COL[12] }]} />
      </View>

      <PageFooter label="Pagina 1 - Resumen ejecutivo" />
    </Page>
  );
}

// ─── Page 2: Rankings (landscape) ────────────────────────────────────────────

function Page2({ data }: { data: PerfReportData }) {
  const { rows, periodLabel, generatedAt } = data;
  const RANK_MEDALS = ["1.", "2.", "3.", "4.", "5."];

  const byUnits  = rows.filter(r => r.sprayUnits > 0).slice(0, 5);
  const byGrowth = rows.filter(r => r.deltaUnits != null).sort((a, b) => (b.deltaUnits ?? 0) - (a.deltaUnits ?? 0)).slice(0, 5);
  const byRoi    = rows.filter(r => r.roi != null && r.roi > 0).sort((a, b) => (b.roi ?? 0) - (a.roi ?? 0)).slice(0, 5);
  const byNew    = rows.filter(r => r.newClients > 0).sort((a, b) => b.newClients - a.newClients).slice(0, 5);

  const rankings = [
    {
      title: "Por unidades vendidas",
      items: byUnits.map((r, i) => ({
        pos: RANK_MEDALS[i] ?? `${i+1}.`,
        name: r.name,
        main: `${r.sprayUnits} uds`,
        sub1: r.deltaUnits != null ? `${fmtP(r.deltaUnits)} vs mes ant.` : null,
        sub2: r.deltaYoy != null   ? `${fmtP(r.deltaYoy)} vs ano ant.`   : null,
      })),
    },
    {
      title: "Mayor crecimiento",
      items: byGrowth.map((r, i) => ({
        pos: RANK_MEDALS[i] ?? `${i+1}.`,
        name: r.name,
        main: r.deltaUnits != null ? fmtP(r.deltaUnits) : "-",
        sub1: `${r.prevSprayUnits} -> ${r.sprayUnits} uds`,
        sub2: null,
      })),
    },
    {
      title: "Mejor ROI",
      items: byRoi.map((r, i) => ({
        pos: RANK_MEDALS[i] ?? `${i+1}.`,
        name: r.name,
        main: fmtR(r.roi),
        sub1: fmtE(r.ingresos) + " ingresos",
        sub2: fmtE(r.totalChain) + " comisiones",
      })),
    },
    {
      title: "Mas clientes nuevos",
      items: byNew.map((r, i) => ({
        pos: RANK_MEDALS[i] ?? `${i+1}.`,
        name: r.name,
        main: `+${r.newClients} nuevos`,
        sub1: `${r.activeClients}/${r.totalClients} activos`,
        sub2: null,
      })),
    },
  ];

  return (
    <Page size="A4" orientation="landscape" style={ss.page}>
      <PageHeader title="Rankings del Periodo" sub="Clasificacion por indicadores clave" period={periodLabel} generated={generatedAt} />

      <View style={{ flexDirection: "row", marginHorizontal: -4 }}>
        {rankings.map(rank => (
          <View key={rank.title} style={ss.rankCol}>
            <View style={ss.rankHead}>
              <Text style={ss.rankTitle}>{rank.title}</Text>
            </View>
            {rank.items.length === 0 ? (
              <Text style={{ fontSize: 7, color: C.muted, padding: 8 }}>Sin datos</Text>
            ) : rank.items.map((item, i) => (
              <View key={i} style={[ss.rankRow, { backgroundColor: i === 0 ? "#FFFBEB" : C.white }]}>
                <Text style={ss.rankPos}>{item.pos}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={ss.rankName}>{item.name}</Text>
                  <Text style={ss.rankMain}>{item.main}</Text>
                  {item.sub1 && <Text style={ss.rankSub}>{item.sub1}</Text>}
                  {item.sub2 && <Text style={ss.rankSub}>{item.sub2}</Text>}
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>

      <PageFooter label="Pagina 2 - Rankings" />
    </Page>
  );
}

// ─── Page 3: Individual cards (portrait) ─────────────────────────────────────

function Page3({ data }: { data: PerfReportData }) {
  const { rows, periodLabel, generatedAt } = data;

  const borderColor = (status: string) => ({
    "top":        C.green,
    "activo":     C.blue,
    "bajo":       C.amber,
    "sin-ventas": C.muted,
  }[status] ?? C.muted);

  return (
    <Page size="A4" style={ss.pagePort}>
      <PageHeader title="Fichas individuales" sub="Resumen por delegado" period={periodLabel} generated={generatedAt} />

      <View style={ss.cardGrid}>
        {rows.map(r => {
          const commNeta = r.commDelegate - r.commRec;
          const bc = borderColor(r.status);
          return (
            <View key={r.id} style={[ss.card, { borderColor: bc }]}>
              <View style={[ss.cardHeader, { borderLeftWidth: 3, borderLeftColor: bc }]}>
                <Text style={ss.cardName}>{r.name}{r.is_kol ? " [KOL]" : ""}</Text>
                <Text style={ss.cardRole}><StatusBadge status={r.status} /> - {r.sprayUnits} uds{r.focUnits > 0 ? ` + ${r.focUnits} FOC` : ""}</Text>
              </View>
              <View style={ss.cardBody}>
                {[
                  ["Ingresos",    r.ingresos > 0 ? fmtE(r.ingresos) : "-"],
                  ["Com. bruta",  r.commDelegate > 0 ? fmtE(r.commDelegate) : "-"],
                  ["Com. rec.",   r.commRec > 0 ? fmtE(r.commRec) : "-"],
                  ["Com. neta",   r.commDelegate > 0 ? fmtE(commNeta) : "-"],
                  ["ROI",         fmtR(r.roi)],
                  ["Nuevos",      r.newClients > 0 ? `+${r.newClients}` : "-"],
                  ["Dormidos",    r.dormantClients > 0 ? r.dormantClients.toString() : "-"],
                  ["Activos",     `${r.activeClients}/${r.totalClients}`],
                  ["Delta mes",   r.deltaUnits != null ? fmtP(r.deltaUnits) : "-"],
                  ["Margen neto", r.netMarginPct != null ? `${r.netMarginPct.toFixed(1)}%` : "-"],
                ].map(([label, value]) => (
                  <View key={label} style={ss.cardRow}>
                    <Text style={ss.cardLabel}>{label}</Text>
                    <Text style={ss.cardVal}>{value}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </View>

      <PageFooter label="Pagina 3 - Fichas individuales" />
    </Page>
  );
}

// ─── Main document ────────────────────────────────────────────────────────────

export function PerformanceReport({ data }: { data: PerfReportData }) {
  return (
    <Document title={`Performance Delegados - ${data.periodLabel}`} author="Prospectia" creator="Portal Prospectia">
      <Page1 data={data} />
      <Page2 data={data} />
      <Page3 data={data} />
    </Document>
  );
}
