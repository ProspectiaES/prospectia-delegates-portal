import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { RichDiagnosticResult } from "@/lib/bruixola-prompts";

const RED    = "#8E0E1A";
const GOLD   = "#B45309";
const BLUE   = "#1D4ED8";
const GREEN  = "#15803D";
const AMBER  = "#D97706";
const TEXT   = "#111827";
const DIM    = "#6B7280";
const LABEL  = "#9CA3AF";
const BORDER = "#E5E7EB";
const SURF   = "#F9FAFB";

const s = StyleSheet.create({
  page: {
    backgroundColor: "#FFFFFF",
    paddingTop: 48,
    paddingBottom: 48,
    paddingLeft: 52,
    paddingRight: 52,
    fontFamily: "Helvetica",
  },
  row: { flexDirection: "row" },
  col2: { flex: 1 },
  gap: { marginRight: 12 },

  label: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  h1: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: TEXT,
    marginBottom: 4,
  },
  h2: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: TEXT,
    marginBottom: 10,
  },
  h3: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: TEXT,
    marginBottom: 6,
  },
  body: {
    fontSize: 10,
    color: DIM,
    lineHeight: 1.6,
  },
  small: {
    fontSize: 8,
    color: LABEL,
    lineHeight: 1.5,
  },
  mb4: { marginBottom: 4 },
  mb8: { marginBottom: 8 },
  mb16: { marginBottom: 16 },
  mb24: { marginBottom: 24 },
  mb32: { marginBottom: 32 },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 16,
  },
  cardAccent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: RED + "40",
    padding: 16,
    marginBottom: 16,
  },
  cardGold: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: GOLD + "50",
    padding: 16,
    marginBottom: 16,
    backgroundColor: GOLD + "08",
  },
  surface: {
    backgroundColor: SURF,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    marginBottom: 8,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginBottom: 16,
    marginTop: 0,
  },

  header: {
    marginBottom: 32,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: RED,
  },
  badge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 5,
  },
  bulletDot: {
    fontSize: 10,
    marginRight: 6,
    marginTop: 0,
    lineHeight: 1.5,
  },
  bulletText: {
    fontSize: 10,
    color: DIM,
    lineHeight: 1.5,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: TEXT,
    marginBottom: 12,
    marginTop: 4,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  colHeader: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: GOLD,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  colFocus: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: TEXT,
    marginBottom: 8,
    lineHeight: 1.4,
  },
  subLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: LABEL,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
    marginTop: 8,
  },
  roadmapCol: {
    flex: 1,
    backgroundColor: SURF,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    marginRight: 8,
  },
  roadmapColLast: {
    flex: 1,
    backgroundColor: SURF,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
  },
  kpiBadge: {
    borderRadius: 4,
    backgroundColor: GOLD + "15",
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 4,
  },
  kpiBadgeText: {
    fontSize: 8,
    color: GOLD,
    fontFamily: "Helvetica-Bold",
  },
  responsableBadge: {
    borderRadius: 4,
    backgroundColor: BLUE + "12",
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  responsableText: {
    fontSize: 8,
    color: BLUE,
    fontFamily: "Helvetica-Bold",
  },
  dispersioBadge: {
    borderRadius: 4,
    backgroundColor: AMBER + "15",
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 6,
    alignSelf: "flex-start",
  },
});

function PdfLabel({ children, color = LABEL }: { children: React.ReactNode; color?: string }) {
  return <Text style={[s.label, { color }]}>{children as string}</Text>;
}

function PdfBulletList({ items, color }: { items: string[]; color: string }) {
  if (!items?.length) return null;
  return (
    <View>
      {items.map((item, i) => (
        <View key={i} style={s.bulletRow}>
          <Text style={[s.bulletDot, { color }]}>→</Text>
          <Text style={s.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function PdfNumberedList({ items, color }: { items: string[]; color: string }) {
  if (!items?.length) return null;
  return (
    <View>
      {items.map((item, i) => (
        <View key={i} style={s.bulletRow}>
          <Text style={[s.bulletDot, { color, fontFamily: "Helvetica-Bold" }]}>{i + 1}.</Text>
          <Text style={s.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function PdfAreaCard({ title, text }: { title: string; text: string }) {
  if (!text) return null;
  return (
    <View style={[s.surface, { flex: 1 }]}>
      <Text style={[s.small, { fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }]}>{title}</Text>
      <Text style={s.body}>{text}</Text>
    </View>
  );
}

export function DiagnosticPDF({ d }: { d: RichDiagnosticResult }) {
  return (
    <Document
      title="Diagnòstic Estratègic Prospectia"
      author="Prospectia"
      subject="Diagnòstic Estratègic"
    >
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={[s.label, { color: RED, marginBottom: 8 }]}>Prospectia — Diagnòstic Estratègic</Text>
          <Text style={s.h1}>{d.estat_global}</Text>
          {d.dispersio_detectada && (
            <View style={s.dispersioBadge}>
              <Text style={{ fontSize: 8, color: AMBER, fontFamily: "Helvetica-Bold" }}>
                ⚠ Dispersió estratègica detectada
              </Text>
            </View>
          )}
        </View>

        <View style={s.card}>
          <PdfLabel color={BLUE}>Visió Executiva</PdfLabel>
          <Text style={[s.body, { fontSize: 11, color: TEXT }]}>{d.visio_executiva}</Text>
        </View>

        <View style={s.card}>
          <PdfLabel>Diagnòstic General</PdfLabel>
          <Text style={s.body}>{d.diagnostic_general}</Text>
        </View>

        <View style={[s.row, { marginBottom: 16 }]}>
          <View style={[s.card, s.col2, s.gap, { marginBottom: 0 }]}>
            <PdfLabel color={RED}>Problema Central</PdfLabel>
            <Text style={s.body}>{d.problema_central}</Text>
          </View>
          <View style={[s.card, s.col2, { marginBottom: 0 }]}>
            <PdfLabel color={AMBER}>Dispersió</PdfLabel>
            <Text style={s.body}>{d.dispersio_detall}</Text>
          </View>
        </View>

        <View style={[s.row, { marginBottom: 16 }]}>
          <View style={[s.card, s.col2, s.gap, { marginBottom: 0, borderColor: GREEN + "40" }]}>
            <PdfLabel color={GREEN}>Forces</PdfLabel>
            <PdfBulletList items={d.forces} color={GREEN} />
          </View>
          <View style={[s.card, s.col2, s.gap, { marginBottom: 0, borderColor: RED + "40" }]}>
            <PdfLabel color={RED}>Riscos</PdfLabel>
            <PdfBulletList items={d.riscos} color={RED} />
          </View>
          <View style={[s.card, s.col2, { marginBottom: 0, borderColor: BLUE + "40" }]}>
            <PdfLabel color={BLUE}>Oportunitats</PdfLabel>
            <PdfBulletList items={d.oportunitats} color={BLUE} />
          </View>
        </View>
      </Page>

      <Page size="A4" style={s.page}>
        <Text style={s.sectionTitle}>Diagnòstic per Àrees</Text>

        <View style={[s.row, { marginBottom: 8 }]}>
          <View style={[{ flex: 1, marginRight: 8 }]}>
            <PdfAreaCard title="Comercial" text={d.diagnostic_comercial} />
          </View>
          <View style={[{ flex: 1 }]}>
            <PdfAreaCard title="Execució" text={d.diagnostic_execucio} />
          </View>
        </View>
        <View style={[s.row, { marginBottom: 8 }]}>
          <View style={[{ flex: 1, marginRight: 8 }]}>
            <PdfAreaCard title="Estructura" text={d.diagnostic_estructura} />
          </View>
          <View style={[{ flex: 1 }]}>
            <PdfAreaCard title="Focus" text={d.diagnostic_focus} />
          </View>
        </View>
        <View style={[s.row, { marginBottom: 8 }]}>
          <View style={[{ flex: 1, marginRight: 8 }]}>
            <PdfAreaCard title="Dispersió" text={d.diagnostic_dispersio} />
          </View>
          <View style={[{ flex: 1 }]}>
            <PdfAreaCard title="Equip" text={d.diagnostic_equip} />
          </View>
        </View>
        <View style={[s.row, s.mb24]}>
          <View style={[{ flex: 1, marginRight: 8 }]}>
            <PdfAreaCard title="Pipeline" text={d.diagnostic_pipeline} />
          </View>
          <View style={[{ flex: 1 }]}>
            <PdfAreaCard title="Financer" text={d.diagnostic_financera} />
          </View>
        </View>

        {d.prioritats?.length > 0 && (
          <View style={[s.card, s.mb24]}>
            <PdfLabel color={GOLD}>Prioritats</PdfLabel>
            <PdfNumberedList items={d.prioritats} color={GOLD} />
          </View>
        )}

        {d.decisions_urgents?.length > 0 && (
          <View style={[s.card, { borderColor: AMBER + "40", backgroundColor: AMBER + "06" }]}>
            <PdfLabel color={AMBER}>Decisions Urgents</PdfLabel>
            <PdfBulletList items={d.decisions_urgents} color={AMBER} />
          </View>
        )}
      </Page>

      <Page size="A4" style={s.page}>
        {d.objectius_90_dies?.length > 0 && (
          <View style={s.mb32}>
            <Text style={s.sectionTitle}>Objectius 90 Dies</Text>
            {d.objectius_90_dies.map((obj, i) => (
              <View key={i} style={[s.card, { marginBottom: 10 }]}>
                <View style={[s.row, { justifyContent: "space-between", marginBottom: 4, alignItems: "flex-start" }]}>
                  <Text style={[s.body, { fontFamily: "Helvetica-Bold", color: TEXT, flex: 1 }]}>{obj.titol}</Text>
                  {obj.responsable && (
                    <View style={s.responsableBadge}>
                      <Text style={s.responsableText}>{obj.responsable}</Text>
                    </View>
                  )}
                </View>
                <Text style={[s.body, { marginBottom: 8 }]}>{obj.descripcio}</Text>
                {obj.kpis?.length > 0 && (
                  <View style={[s.row, { flexWrap: "wrap" }]}>
                    {obj.kpis.map((kpi, k) => (
                      <View key={k} style={s.kpiBadge}>
                        <Text style={s.kpiBadgeText}>{kpi}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {d.objectius_12_mesos?.length > 0 && (
          <View style={s.mb32}>
            <Text style={s.sectionTitle}>Objectius 12 Mesos</Text>
            {d.objectius_12_mesos.map((obj, i) => (
              <View key={i} style={[s.card, { marginBottom: 10 }]}>
                <Text style={[s.body, { fontFamily: "Helvetica-Bold", color: TEXT, marginBottom: 4 }]}>{obj.titol}</Text>
                <Text style={s.body}>{obj.descripcio}</Text>
              </View>
            ))}
          </View>
        )}

        {(d.projectes_potenciar?.length > 0 || d.projectes_congelar?.length > 0) && (
          <View style={s.mb32}>
            <Text style={s.sectionTitle}>Projectes</Text>
            <View style={s.row}>
              {d.projectes_potenciar?.length > 0 && (
                <View style={[s.card, s.col2, s.gap, { marginBottom: 0, borderColor: GREEN + "40", backgroundColor: GREEN + "06" }]}>
                  <PdfLabel color={GREEN}>A Potenciar</PdfLabel>
                  <PdfBulletList items={d.projectes_potenciar} color={GREEN} />
                </View>
              )}
              {d.projectes_congelar?.length > 0 && (
                <View style={[s.card, s.col2, { marginBottom: 0 }]}>
                  <PdfLabel>A Congelar</PdfLabel>
                  <PdfBulletList items={d.projectes_congelar} color={LABEL} />
                </View>
              )}
            </View>
          </View>
        )}
      </Page>

      <Page size="A4" style={s.page}>
        <Text style={s.sectionTitle}>Roadmap Estratègic</Text>
        <View style={[s.row, s.mb32]}>
          <View style={s.roadmapCol}>
            <Text style={s.colHeader}>30 Dies</Text>
            <Text style={s.colFocus}>{d.roadmap_30_dies?.focus}</Text>
            {d.roadmap_30_dies?.objectius?.length > 0 && (
              <>
                <Text style={s.subLabel}>Objectius</Text>
                <PdfBulletList items={d.roadmap_30_dies.objectius} color={BLUE} />
              </>
            )}
            {d.roadmap_30_dies?.decisions?.length > 0 && (
              <>
                <Text style={s.subLabel}>Decisions</Text>
                <PdfBulletList items={d.roadmap_30_dies.decisions} color={AMBER} />
              </>
            )}
            {d.roadmap_30_dies?.accions?.length > 0 && (
              <>
                <Text style={s.subLabel}>Accions</Text>
                <PdfBulletList items={d.roadmap_30_dies.accions} color={GREEN} />
              </>
            )}
          </View>
          <View style={s.roadmapCol}>
            <Text style={s.colHeader}>90 Dies</Text>
            <Text style={s.colFocus}>{d.roadmap_90_dies?.focus}</Text>
            {d.roadmap_90_dies?.objectius?.length > 0 && (
              <>
                <Text style={s.subLabel}>Objectius</Text>
                <PdfBulletList items={d.roadmap_90_dies.objectius} color={BLUE} />
              </>
            )}
            {d.roadmap_90_dies?.decisions?.length > 0 && (
              <>
                <Text style={s.subLabel}>Decisions</Text>
                <PdfBulletList items={d.roadmap_90_dies.decisions} color={AMBER} />
              </>
            )}
            {d.roadmap_90_dies?.accions?.length > 0 && (
              <>
                <Text style={s.subLabel}>Accions</Text>
                <PdfBulletList items={d.roadmap_90_dies.accions} color={GREEN} />
              </>
            )}
          </View>
          <View style={s.roadmapColLast}>
            <Text style={s.colHeader}>12 Mesos</Text>
            <Text style={s.colFocus}>{d.roadmap_12_mesos?.focus}</Text>
            {d.roadmap_12_mesos?.objectius?.length > 0 && (
              <>
                <Text style={s.subLabel}>Objectius</Text>
                <PdfBulletList items={d.roadmap_12_mesos.objectius} color={BLUE} />
              </>
            )}
            {d.roadmap_12_mesos?.decisions?.length > 0 && (
              <>
                <Text style={s.subLabel}>Decisions</Text>
                <PdfBulletList items={d.roadmap_12_mesos.decisions} color={AMBER} />
              </>
            )}
            {d.roadmap_12_mesos?.accions?.length > 0 && (
              <>
                <Text style={s.subLabel}>Accions</Text>
                <PdfBulletList items={d.roadmap_12_mesos.accions} color={GREEN} />
              </>
            )}
          </View>
        </View>

        <View style={s.cardAccent}>
          <View style={[s.row, { alignItems: "center", marginBottom: 12 }]}>
            <View style={{ width: 3, height: 20, backgroundColor: RED, borderRadius: 2, marginRight: 8 }} />
            <PdfLabel color={RED}>Consultoria Executiva</PdfLabel>
          </View>
          <View style={[s.row, { marginBottom: 12 }]}>
            <View style={[s.col2, s.gap]}>
              {d.consultoria?.que_faria && (
                <>
                  <Text style={s.subLabel}>Que faria jo</Text>
                  <Text style={s.body}>{d.consultoria.que_faria}</Text>
                </>
              )}
            </View>
            <View style={s.col2}>
              {d.consultoria?.mal_enfocat && (
                <>
                  <Text style={s.subLabel}>Mal enfocat</Text>
                  <Text style={s.body}>{d.consultoria.mal_enfocat}</Text>
                </>
              )}
            </View>
          </View>
          <View style={[s.row, s.mb16]}>
            <View style={[s.col2, s.gap]}>
              {d.consultoria?.on_perdent_energia && (
                <>
                  <Text style={s.subLabel}>On perdeu energia</Text>
                  <Text style={s.body}>{d.consultoria.on_perdent_energia}</Text>
                </>
              )}
            </View>
            <View style={s.col2}>
              {d.consultoria?.potencial_real && (
                <>
                  <Text style={s.subLabel}>Potencial real</Text>
                  <Text style={s.body}>{d.consultoria.potencial_real}</Text>
                </>
              )}
            </View>
          </View>
          <View style={[s.divider]} />
          <View style={s.row}>
            <View style={[s.col2, s.gap]}>
              {d.consultoria?.decisions_inajornables?.length > 0 && (
                <>
                  <Text style={[s.subLabel, { color: AMBER }]}>Decisions inajornables</Text>
                  <PdfBulletList items={d.consultoria.decisions_inajornables} color={AMBER} />
                </>
              )}
              {d.consultoria?.que_professionalitzar?.length > 0 && (
                <>
                  <Text style={[s.subLabel, { color: BLUE, marginTop: 10 }]}>Que professionalitzar</Text>
                  <PdfBulletList items={d.consultoria.que_professionalitzar} color={BLUE} />
                </>
              )}
            </View>
            <View style={s.col2}>
              {d.consultoria?.projectes_sense_sentit?.length > 0 && (
                <>
                  <Text style={s.subLabel}>Projectes sense sentit</Text>
                  <PdfBulletList items={d.consultoria.projectes_sense_sentit} color={LABEL} />
                </>
              )}
              {d.consultoria?.sistemes_falten?.length > 0 && (
                <>
                  <Text style={[s.subLabel, { color: GREEN, marginTop: 10 }]}>Sistemes que falten</Text>
                  <PdfBulletList items={d.consultoria.sistemes_falten} color={GREEN} />
                </>
              )}
            </View>
          </View>
        </View>
      </Page>

      <Page size="A4" style={s.page}>
        {d.conclusions_finals && (
          <View style={[s.card, s.mb24]}>
            <PdfLabel>Conclusions Finals</PdfLabel>
            <Text style={s.body}>{d.conclusions_finals}</Text>
          </View>
        )}

        {d.recomanacio_principal && (
          <View style={s.cardGold}>
            <PdfLabel color={GOLD}>Recomanació Principal</PdfLabel>
            <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: TEXT, lineHeight: 1.5 }}>
              {d.recomanacio_principal}
            </Text>
          </View>
        )}

        <View style={{ marginTop: 32, paddingTop: 16, borderTopWidth: 1, borderTopColor: BORDER }}>
          <Text style={[s.small, { textAlign: "center", color: LABEL }]}>
            Diagnòstic generat per Prospectia — Sistema d&apos;Intel·ligència Estratègica
          </Text>
        </View>
      </Page>
    </Document>
  );
}
