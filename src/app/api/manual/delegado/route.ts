export const runtime = "nodejs";

import React from "react";
import { Document, Page, Text, View, renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { getProfile } from "@/lib/profile";
import { redirect } from "next/navigation";

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  red:     "#8E0E1A", redD:  "#6B0A14", redL:  "#FFF5F5",
  dark:    "#0A0A0A", mid:   "#374151", gray:  "#6B7280", lg: "#9CA3AF",
  border:  "#E5E7EB", bg:    "#F9FAFB", white: "#FFFFFF",
  green:   "#059669", greenL:"#ECFDF5", greenB:"#BBF7D0",
  amber:   "#D97706", amberL:"#FFFBEB", amberB:"#FDE68A",
  blue:    "#2563EB", blueL: "#EFF6FF", blueB: "#BFDBFE",
  orange:  "#EA580C", orangeL:"#FFF7ED",
  teal:    "#0D9488", tealL: "#F0FDFA",
  purple:  "#7C3AED", purpleL:"#F5F3FF",
  indigo:  "#4338CA", indigoL:"#EEF2FF",
};

const ce = React.createElement;

// ─── Primitives ───────────────────────────────────────────────────────────────

const Txt = (text: string, style: Record<string, unknown> = {}) =>
  ce(Text, { style: { fontFamily: "Helvetica", fontSize: 9, color: C.mid, lineHeight: 1.5, ...style } }, text);

const Bold = (text: string, style: Record<string, unknown> = {}) =>
  ce(Text, { style: { fontFamily: "Helvetica-Bold", fontSize: 9, color: C.dark, ...style } }, text);

const Sp = (n = 6) => ce(View, { style: { height: n } });

// ─── Section banner ───────────────────────────────────────────────────────────
const Banner = (num: string, title: string, desc: string, color: string) =>
  ce(View, { style: { backgroundColor: color, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 14 } },
    ce(View, { style: { flexDirection: "row", alignItems: "center", marginBottom: 4 } },
      ce(View, { style: { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center", alignItems: "center", marginRight: 10, flexShrink: 0 } },
        ce(Text, { style: { color: C.white, fontFamily: "Helvetica-Bold", fontSize: 12 } }, num)
      ),
      ce(Text, { style: { color: C.white, fontFamily: "Helvetica-Bold", fontSize: 16 } }, title)
    ),
    ce(Text, { style: { color: "rgba(255,255,255,0.82)", fontSize: 8.5 } }, desc)
  );

// ─── KPI card ─────────────────────────────────────────────────────────────────
const KpiCard = (value: string, label: string, sub: string, accent: string, valColor: string) =>
  ce(View, { style: { flex: 1, borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: C.border } },
    ce(View, { style: { height: 5, backgroundColor: accent } }),
    ce(View, { style: { backgroundColor: C.white, padding: 9 } },
      ce(Text, { style: { fontSize: 22, fontFamily: "Helvetica-Bold", color: valColor, lineHeight: 1 } }, value),
      ce(Text, { style: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.mid, marginTop: 4 } }, label),
      ce(Text, { style: { fontSize: 6.5, color: C.lg, marginTop: 2 } }, sub)
    )
  );

// ─── Severity row ─────────────────────────────────────────────────────────────
const SevRow = (color: string, label: string, range: string, desc: string) =>
  ce(View, { style: { flexDirection: "row", alignItems: "center", marginBottom: 6, padding: 9, backgroundColor: C.bg, borderRadius: 7, borderLeftWidth: 5, borderLeftColor: color } },
    ce(View, { style: { flex: 1 } },
      ce(View, { style: { flexDirection: "row", alignItems: "baseline", marginBottom: 2 } },
        ce(Text, { style: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: C.dark, marginRight: 6 } }, label),
        ce(Text, { style: { fontSize: 8, color: C.lg, fontFamily: "Helvetica-Bold" } }, range)
      ),
      ce(Text, { style: { fontSize: 8, color: C.gray } }, desc)
    )
  );

// ─── Task item ────────────────────────────────────────────────────────────────
const Task = (label: string, done = false) =>
  ce(View, { style: { flexDirection: "row", alignItems: "flex-start", padding: 7, borderRadius: 7, marginBottom: 4, borderWidth: 1, borderColor: done ? C.greenB : C.border, backgroundColor: done ? C.greenL : C.white } },
    ce(View, { style: { width: 14, height: 14, borderRadius: 3, marginRight: 8, flexShrink: 0, backgroundColor: done ? C.green : C.white, borderWidth: done ? 0 : 1.5, borderColor: C.red, justifyContent: "center", alignItems: "center", marginTop: 0.5 } },
      done ? ce(Text, { style: { color: C.white, fontSize: 9, fontFamily: "Helvetica-Bold" } }, "v") : null
    ),
    ce(Text, { style: { fontSize: 8, color: done ? "#065F46" : C.mid, flex: 1, lineHeight: 1.4 } }, label)
  );

// ─── Step ─────────────────────────────────────────────────────────────────────
const Step = (n: number, title: string, desc: string, color = C.red) =>
  ce(View, { style: { flexDirection: "row", marginBottom: 9 } },
    ce(View, { style: { width: 24, height: 24, borderRadius: 12, backgroundColor: color, justifyContent: "center", alignItems: "center", marginRight: 10, flexShrink: 0, marginTop: 1 } },
      ce(Text, { style: { color: C.white, fontFamily: "Helvetica-Bold", fontSize: 11 } }, String(n))
    ),
    ce(View, { style: { flex: 1 } },
      ce(Text, { style: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: C.dark, marginBottom: 2 } }, title),
      ce(Text, { style: { fontSize: 8, color: C.gray, lineHeight: 1.5 } }, desc)
    )
  );

// ─── Callout ──────────────────────────────────────────────────────────────────
const Callout = (sym: string, title: string, body: string, bg: string, border: string, fg: string) =>
  ce(View, { style: { backgroundColor: bg, borderLeftWidth: 3, borderLeftColor: border, borderRadius: 6, padding: 10, marginVertical: 5 } },
    ce(View, { style: { flexDirection: "row", alignItems: "flex-start" } },
      ce(View, { style: { width: 18, height: 18, borderRadius: 9, backgroundColor: border, justifyContent: "center", alignItems: "center", marginRight: 8, flexShrink: 0 } },
        ce(Text, { style: { color: C.white, fontFamily: "Helvetica-Bold", fontSize: 9 } }, sym)
      ),
      ce(View, { style: { flex: 1 } },
        ce(Text, { style: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: fg, marginBottom: 2 } }, title),
        ce(Text, { style: { fontSize: 8, color: fg, lineHeight: 1.5 } }, body)
      )
    )
  );

// ─── Table ────────────────────────────────────────────────────────────────────
const Tbl = (headers: string[], rows: string[][], widths?: number[]) => {
  const cols = widths ?? headers.map(() => 1);
  return ce(View, { style: { borderWidth: 1, borderColor: C.border, borderRadius: 7, overflow: "hidden", marginVertical: 6 } },
    ce(View, { style: { flexDirection: "row", backgroundColor: C.red } },
      ...headers.map((h, i) => ce(Text, { key: i, style: { flex: cols[i], padding: 6, fontSize: 8, color: C.white, fontFamily: "Helvetica-Bold" } }, h))
    ),
    ...rows.map((row, ri) =>
      ce(View, { key: ri, style: { flexDirection: "row", backgroundColor: ri % 2 === 0 ? C.white : C.bg, borderTopWidth: 1, borderTopColor: C.border } },
        ...row.map((cell, ci) => ce(Text, { key: ci, style: { flex: cols[ci], padding: 6, fontSize: 7.5, color: C.mid } }, cell))
      )
    )
  );
};

// ─── Screen mockup shell ──────────────────────────────────────────────────────
const Mock = (...children: React.ReactNode[]) =>
  ce(View, { style: { borderWidth: 1.5, borderColor: "#D1D5DB", borderRadius: 10, overflow: "hidden" } },
    ce(View, { style: { backgroundColor: "#1F2937", height: 20, flexDirection: "row", alignItems: "center", paddingHorizontal: 10 } },
      ce(View, { style: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#EF4444", marginRight: 4 } }),
      ce(View, { style: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#F59E0B", marginRight: 4 } }),
      ce(View, { style: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#10B981", marginRight: 10 } }),
      ce(View, { style: { flex: 1, height: 10, backgroundColor: "#374151", borderRadius: 3 } },
        ce(Text, { style: { color: "#9CA3AF", fontSize: 5, paddingLeft: 6, paddingTop: 2 } }, "dashboard.prospectia.es")
      )
    ),
    ce(View, { style: { flexDirection: "row" } },
      ce(View, { style: { width: 76, backgroundColor: "#111827", padding: 8 } },
        ce(View, { style: { backgroundColor: C.red, borderRadius: 4, padding: 5, marginBottom: 8 } },
          ce(Text, { style: { color: C.white, fontSize: 5.5, fontFamily: "Helvetica-Bold", textAlign: "center" } }, "PROSPECTIA")
        ),
        ...["Inicio", "Clientes", "CRM", "Calendario", "Emails", "Afiliados", "Mi Perfil", "Manual"].map((item, i) =>
          ce(View, { key: i, style: { paddingVertical: 3.5, paddingHorizontal: 5, borderRadius: 3, marginBottom: 2, backgroundColor: i === 0 ? "rgba(142,14,26,0.25)" : "transparent" } },
            ce(Text, { style: { color: i === 0 ? "#FCA5A5" : "#6B7280", fontSize: 5.5 } }, item)
          )
        )
      ),
      ce(View, { style: { flex: 1, backgroundColor: C.bg, padding: 8 } }, ...children)
    )
  );

// ─── Dormant card mockup ──────────────────────────────────────────────────────
const DormCard = (name: string, city: string, days: number, tasks: number, status: string, statusColor: string, borderColor: string) =>
  ce(View, { style: { flex: 1, borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: C.border, backgroundColor: C.white, marginRight: 5 } },
    ce(View, { style: { height: 5, backgroundColor: borderColor } }),
    ce(View, { style: { padding: 8 } },
      ce(View, { style: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 } },
        ce(View, {},
          ce(Text, { style: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.dark } }, name),
          ce(Text, { style: { fontSize: 6.5, color: C.lg } }, city)
        ),
        ce(View, { style: { backgroundColor: borderColor + "22", borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2, borderWidth: 1, borderColor: borderColor + "55" } },
          ce(Text, { style: { fontSize: 7, fontFamily: "Helvetica-Bold", color: borderColor } }, `${days}d`)
        )
      ),
      ce(View, { style: { flexDirection: "row", marginBottom: 4 } },
        ...[...Array(10)].map((_, i) =>
          ce(View, { key: i, style: { flex: 1, height: 4, borderRadius: 2, backgroundColor: i < tasks ? C.green : C.border, marginRight: i < 9 ? 1 : 0 } })
        )
      ),
      ce(Text, { style: { fontSize: 6, color: C.lg, marginBottom: 6 } }, `${tasks}/9 tareas`),
      ce(View, { style: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" } },
        ce(View, { style: { flexDirection: "row", alignItems: "center" } },
          ce(View, { style: { width: 6, height: 6, borderRadius: 3, backgroundColor: statusColor, marginRight: 4 } }),
          ce(Text, { style: { fontSize: 6.5, color: statusColor, fontFamily: "Helvetica-Bold" } }, status)
        ),
        ce(View, { style: { backgroundColor: C.red, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2.5 } },
          ce(Text, { style: { color: C.white, fontSize: 6, fontFamily: "Helvetica-Bold" } }, "Gestionar")
        )
      )
    )
  );

// ─── Pipeline chip ────────────────────────────────────────────────────────────
const PChip = (label: string, dot: string, bg: string, fg: string, arrow: boolean) =>
  ce(View, { style: { flexDirection: "row", alignItems: "center" } },
    ce(View, { style: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 7, backgroundColor: bg, alignItems: "center", minWidth: 52 } },
      ce(View, { style: { width: 8, height: 8, borderRadius: 4, backgroundColor: dot, marginBottom: 3 } }),
      ce(Text, { style: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: fg, textAlign: "center" } }, label)
    ),
    arrow ? ce(Text, { style: { color: C.lg, fontSize: 12, marginHorizontal: 2 } }, ">") : null
  );

// ─── Footer ───────────────────────────────────────────────────────────────────
const Footer = () =>
  ce(View, { style: { position: "absolute", bottom: 28, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: C.border, paddingTop: 6 } },
    ce(Text, { style: { fontSize: 7, color: C.lg } }, "Manual del Delegado · Prospectia"),
    ce(Text, { style: { fontSize: 7, color: C.lg }, render: ({ pageNumber }: { pageNumber: number }) => `dashboard.prospectia.es  ·  pág. ${pageNumber}` })
  );

// ════════════════════════════════════════════════════════ PAGES

// ─── COVER ────────────────────────────────────────────────────────────────────
const Cover = () =>
  ce(Page, { size: "A4" },
    ce(View, { style: { flex: 1, backgroundColor: C.red } },
      ce(View, { style: { padding: 50 } },

        ce(View, { style: { flexDirection: "row", alignItems: "center", marginBottom: 70 } },
          ce(View, { style: { width: 38, height: 38, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.18)", justifyContent: "center", alignItems: "center", marginRight: 10 } },
            ce(Text, { style: { color: C.white, fontFamily: "Helvetica-Bold", fontSize: 16 } }, "P")
          ),
          ce(View, {},
            ce(Text, { style: { color: C.white, fontFamily: "Helvetica-Bold", fontSize: 14, letterSpacing: 2 } }, "PROSPECTIA"),
            ce(Text, { style: { color: "rgba(255,255,255,0.55)", fontSize: 8 } }, "Delegates Portal")
          )
        ),

        ce(Text, { style: { color: C.white, fontFamily: "Helvetica-Bold", fontSize: 46, lineHeight: 1.05, marginBottom: 10 } }, "Manual\ndel Delegado"),
        ce(View, { style: { width: 50, height: 3, backgroundColor: "rgba(255,255,255,0.4)", borderRadius: 2, marginBottom: 12 } }),
        ce(Text, { style: { color: "rgba(255,255,255,0.7)", fontSize: 14, marginBottom: 52 } }, "Todo lo que necesitas saber para\ngestionar tu cartera con el portal"),

        ce(View, { style: { flexDirection: "row", flexWrap: "wrap" } },
          ...[
            { n: "01", t: "Panel principal",     s: "KPIs, comisiones, período"   },
            { n: "02", t: "Clientes",             s: "Actividad y riesgo"          },
            { n: "03", t: "Clientes dormidos",    s: "CRM de reactivación"         },
            { n: "04", t: "CRM — Prospectos",     s: "Pipeline de ventas"          },
            { n: "05", t: "Ficha prospecto",      s: "Etapas y actividades"        },
            { n: "06", t: "Calendario",           s: "Agenda comercial"            },
            { n: "07", t: "Tracking de emails",   s: "Aperturas y clics"           },
            { n: "08", t: "Mi Perfil + FAQ",      s: "Datos, IBAN y preguntas"     },
          ].map((b, i) =>
            ce(View, { key: i, style: {
              width: "47%", marginRight: i % 2 === 0 ? "6%" : 0, marginBottom: 8,
              backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 8, padding: 10,
              flexDirection: "row", alignItems: "center",
              borderWidth: 1, borderColor: "rgba(255,255,255,0.15)"
            } },
              ce(View, { style: { width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", marginRight: 9, flexShrink: 0 } },
                ce(Text, { style: { color: C.white, fontFamily: "Helvetica-Bold", fontSize: 9 } }, b.n)
              ),
              ce(View, {},
                ce(Text, { style: { color: C.white, fontFamily: "Helvetica-Bold", fontSize: 8.5 } }, b.t),
                ce(Text, { style: { color: "rgba(255,255,255,0.55)", fontSize: 7, marginTop: 1 } }, b.s)
              )
            )
          )
        ),

        ce(View, { style: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.2)", marginTop: 36, paddingTop: 14 } },
          ce(Text, { style: { color: "rgba(255,255,255,0.45)", fontSize: 7.5 } }, "dashboard.prospectia.es  ·  Prospectia Overseas Consulting SL  ·  lvila@prospectia.es")
        )
      )
    )
  );

// ─── P1: PANEL PRINCIPAL ──────────────────────────────────────────────────────
const P1 = () =>
  ce(Page, { size: "A4", style: { padding: 40, fontFamily: "Helvetica" } },
    Footer(),
    Banner("01", "Panel Principal", "Tu central de mando: facturación, clientes, comisiones y afiliados de un vistazo", C.red),

    // Screen mockup with KPI cards inside
    Mock(
      ce(View, { style: { marginBottom: 6 } },
        ce(View, { style: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 } },
          ce(View, {},
            ce(Text, { style: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.dark } }, "Judith Fibla"),
            ce(Text, { style: { fontSize: 6.5, color: C.lg } }, "Delegado · Banyoles")
          ),
          ce(View, { style: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: C.border, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, backgroundColor: C.white } },
            ce(Text, { style: { fontSize: 7, color: C.mid, marginRight: 4 } }, "<"),
            ce(Text, { style: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.mid } }, "mayo 2026"),
            ce(Text, { style: { fontSize: 7, color: C.mid, marginLeft: 4 } }, ">")
          )
        ),
        ce(View, { style: { flexDirection: "row" } },
          KpiCard("18.430 €", "Facturación", "11 facturas emitidas", C.green, C.green),
          ce(View, { style: { width: 5 } }),
          KpiCard("47", "Clientes", "7 activos · 5 dormidos", C.blue, C.blue),
          ce(View, { style: { width: 5 } }),
          KpiCard("1.250 €", "Comisiones", "liquidable este mes", C.amber, C.amber),
          ce(View, { style: { width: 5 } }),
          KpiCard("3", "Afiliados", "asignados", C.purple, C.purple)
        )
      )
    ),
    Sp(10),

    // 2-column description
    ce(View, { style: { flexDirection: "row" } },
      ce(View, { style: { flex: 1, marginRight: 10 } },
        ce(View, { style: { backgroundColor: C.greenL, borderRadius: 8, padding: 10, marginBottom: 6 } },
          ce(Text, { style: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.green, marginBottom: 4 } }, "Facturacion"),
          ...([
            ["Total facturado",     "Histórico completo de todas tus facturas"],
            ["Cobradas en período", "Facturas cobradas en el mes seleccionado"],
            ["Pendientes",          "Emitidas y aún sin pagar"],
            ["Vencidas",            "Han superado el vencimiento sin cobrar"],
          ] as [string, string][]).map(([k, v], i) =>
            ce(View, { key: i, style: { marginBottom: 3 } },
              ce(Text, { style: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.mid } }, k),
              ce(Text, { style: { fontSize: 7.5, color: C.gray } }, v)
            )
          )
        ),
        ce(View, { style: { backgroundColor: C.blueL, borderRadius: 8, padding: 10 } },
          ce(Text, { style: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.blue, marginBottom: 4 } }, "Clientes"),
          ...([
            ["Total",    "Clientes asignados a ti en Holded"],
            ["Activos",  "Con alguna factura en los últimos 30 días"],
            ["Dormidos", "Sin actividad en más de 30 días"],
          ] as [string, string][]).map(([k, v], i) =>
            ce(View, { key: i, style: { marginBottom: 3 } },
              ce(Text, { style: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.mid } }, k),
              ce(Text, { style: { fontSize: 7.5, color: C.gray } }, v)
            )
          )
        )
      ),
      ce(View, { style: { flex: 1 } },
        ce(View, { style: { backgroundColor: C.amberL, borderRadius: 8, padding: 10, marginBottom: 6 } },
          ce(Text, { style: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.amber, marginBottom: 4 } }, "Comisiones"),
          ...([
            ["Liquidable",      "Calculada sobre facturas ya cobradas"],
            ["En riesgo",       "Sobre facturas vencidas sin cobrar"],
            ["Pendiente cobro", "Sobre facturas pendientes de vencer"],
          ] as [string, string][]).map(([k, v], i) =>
            ce(View, { key: i, style: { marginBottom: 3 } },
              ce(Text, { style: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.mid } }, k),
              ce(Text, { style: { fontSize: 7.5, color: C.gray } }, v)
            )
          )
        ),
        ce(View, { style: { backgroundColor: C.purpleL, borderRadius: 8, padding: 10, marginBottom: 6 } },
          ce(Text, { style: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.purple, marginBottom: 4 } }, "Afiliados"),
          ...([
            ["Total",      "Afiliados asignados a ti"],
            ["Facturado",  "Total órdenes generadas"],
            ["Liquidable", "Comisión aprobada sin pagar"],
            ["Pagado",     "Comisión ya liquidada"],
          ] as [string, string][]).map(([k, v], i) =>
            ce(View, { key: i, style: { marginBottom: 3 } },
              ce(Text, { style: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.mid } }, k),
              ce(Text, { style: { fontSize: 7.5, color: C.gray } }, v)
            )
          )
        ),
        Callout("!", "Selector de mes", "Usa las flechas < > junto al nombre del mes para navegar a cualquier mes anterior. El boton Hoy vuelve al mes actual.", C.redL, C.red, C.red)
      )
    )
  );

// ─── P2: CLIENTES ─────────────────────────────────────────────────────────────
const P2 = () =>
  ce(Page, { size: "A4", style: { padding: 40, fontFamily: "Helvetica" } },
    Footer(),
    Banner("02", "Clientes", "Tu cartera completa sincronizada con Holded. Filtra, busca y sigue la actividad de cada cliente.", C.blue),

    ce(View, { style: { flexDirection: "row" } },
      // Left
      ce(View, { style: { flex: 1, marginRight: 12 } },
        Bold("Metricas de actividad", { fontSize: 10, marginBottom: 8 }),
        // Summary cards
        ce(View, { style: { flexDirection: "row", marginBottom: 8 } },
          ...[
            { n: "47",  l: "Total",    c: C.dark },
            { n: "35",  l: "Activos",  c: C.green },
            { n: "12",  l: "Dormidos", c: C.amber },
            { n: "5",   l: "Nuevos",   c: C.blue },
          ].map((k, i) =>
            ce(View, { key: i, style: { flex: 1, backgroundColor: C.bg, borderRadius: 7, padding: 8, alignItems: "center", marginRight: i < 3 ? 4 : 0, borderWidth: 1, borderColor: C.border } },
              ce(Text, { style: { fontSize: 20, fontFamily: "Helvetica-Bold", color: k.c, lineHeight: 1 } }, k.n),
              ce(Text, { style: { fontSize: 7, color: C.lg, marginTop: 3, fontFamily: "Helvetica-Bold" } }, k.l)
            )
          )
        ),
        // Distribution bar
        ce(View, { style: { marginBottom: 10 } },
          ce(View, { style: { flexDirection: "row", height: 10, borderRadius: 5, overflow: "hidden", marginBottom: 3 } },
            ce(View, { style: { flex: 35, backgroundColor: C.green } }),
            ce(View, { style: { flex: 12, backgroundColor: C.amber } }),
            ce(View, { style: { flex: 0, backgroundColor: C.border } })
          ),
          ce(View, { style: { flexDirection: "row", justifyContent: "space-between" } },
            ce(Text, { style: { fontSize: 7, color: C.green, fontFamily: "Helvetica-Bold" } }, "75% activos"),
            ce(Text, { style: { fontSize: 7, color: C.amber, fontFamily: "Helvetica-Bold" } }, "25% dormidos")
          )
        ),
        Bold("Ficha de cada cliente", { fontSize: 10, marginBottom: 6 }),
        ...[
          { icon: "CRM", color: C.red,    label: "Etapa del pipeline + últimas actividades + crear prospecto"    },
          { icon: "€€€", color: C.green,  label: "Resumen economico: total facturado, cobrado, pendiente"         },
          { icon: "PDF", color: C.blue,   label: "Ultimas 10 facturas enlazadas con numero, fecha y estado"       },
          { icon: "BOX", color: C.orange, label: "Pedidos en curso pendientes de facturar"                        },
          { icon: "AFF", color: C.purple, label: "Afiliado asignado a este cliente"                              },
        ].map((item, i) =>
          ce(View, { key: i, style: { flexDirection: "row", alignItems: "flex-start", marginBottom: 5 } },
            ce(View, { style: { width: 28, paddingHorizontal: 4, paddingVertical: 3, borderRadius: 4, backgroundColor: item.color + "18", marginRight: 7, alignItems: "center", flexShrink: 0 } },
              ce(Text, { style: { fontSize: 6, fontFamily: "Helvetica-Bold", color: item.color } }, item.icon)
            ),
            ce(Text, { style: { fontSize: 8, color: C.mid, flex: 1, lineHeight: 1.4 } }, item.label)
          )
        )
      ),
      // Right — severity
      ce(View, { style: { flex: 1 } },
        Bold("Escala de alerta — tiempo sin actividad", { fontSize: 10, marginBottom: 8 }),
        SevRow("#D1D5DB", "Sin actividad", "—",          "Sin historial registrado"),
        SevRow(C.amber,   "Atencion",      "30–60 dias", "Hora de retomar el contacto"),
        SevRow(C.orange,  "Urgente",       "60–90 dias", "Riesgo real de perder al cliente"),
        SevRow(C.red,     "Critico",       ">90 dias",   "Accion inmediata necesaria"),
        Sp(10),
        Bold("Estado CRM del seguimiento", { fontSize: 10, marginBottom: 8 }),
        ...[
          { dot: "#D1D5DB", label: "Sin contactar",  desc: "No has iniciado contacto todavia" },
          { dot: C.blue,    label: "En seguimiento", desc: "Ya has tomado acciones de contacto" },
          { dot: C.green,   label: "Reactivado",     desc: "Ha vuelto a comprar o responder" },
        ].map((s, i) =>
          ce(View, { key: i, style: { flexDirection: "row", alignItems: "flex-start", padding: 8, backgroundColor: C.bg, borderRadius: 7, marginBottom: 5 } },
            ce(View, { style: { width: 10, height: 10, borderRadius: 5, backgroundColor: s.dot, marginRight: 8, marginTop: 1, flexShrink: 0 } }),
            ce(View, {},
              ce(Text, { style: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.dark, marginBottom: 1 } }, s.label),
              ce(Text, { style: { fontSize: 7.5, color: C.gray } }, s.desc)
            )
          )
        ),
        Sp(8),
        Callout("i", "Guardado automatico", "Todo lo que marcas —tareas, estado, notas— se guarda automaticamente en la nube. Sin boton de guardar.", C.blueL, C.blue, C.blue)
      )
    )
  );

// ─── P3: CLIENTES DORMIDOS — TARJETAS ─────────────────────────────────────────
const P3 = () =>
  ce(Page, { size: "A4", style: { padding: 40, fontFamily: "Helvetica" } },
    Footer(),
    Banner("03", "Clientes dormidos — Seguimiento CRM", "La herramienta mas importante del portal. Gestiona la reactivacion de cada cliente dormido.", C.amber),

    Bold("Asi se ve la cuadricula de clientes dormidos", { fontSize: 10, marginBottom: 6 }),
    Txt("Un cliente es 'dormido' cuando lleva mas de 30 dias sin ninguna factura en Holded. Cada tarjeta muestra el estado de seguimiento.", { marginBottom: 10 }),

    // 3 dormant cards
    ce(View, { style: { flexDirection: "row", marginBottom: 14 } },
      DormCard("Farmacia Lopez",    "Barcelona",  92, 0, "Sin contactar",  "#D1D5DB", C.red),
      DormCard("Clinica Salud SL",  "Valencia",   67, 4, "En seguimiento", C.blue,    C.orange),
      DormCard("Centro Medico Norte","Madrid",     38, 7, "Reactivado",     C.green,   C.amber)
    ),

    Bold("Anatomia de la tarjeta", { fontSize: 10, marginBottom: 6 }),
    ce(View, { style: { flexDirection: "row", flexWrap: "wrap" } },
      ...[
        { color: C.red,    n: "A", title: "Franja de color",    desc: "Rojo >90d / Naranja 60-90d / Ambar 30-60d" },
        { color: C.orange, n: "B", title: "Dias sin actividad", desc: "Contador exacto desde el ultimo pedido" },
        { color: C.green,  n: "C", title: "Barra de progreso",  desc: "10 pildoras: una por tarea completada" },
        { color: C.blue,   n: "D", title: "Estado CRM",         desc: "Sin contactar / En seguimiento / Reactivado" },
        { color: C.purple, n: "E", title: "Boton Gestionar",    desc: "Abre el panel completo de seguimiento" },
      ].map((item, i) =>
        ce(View, { key: i, style: { width: "48%", marginRight: i % 2 === 0 ? "4%" : 0, flexDirection: "row", alignItems: "flex-start", marginBottom: 6, padding: 7, backgroundColor: C.bg, borderRadius: 7 } },
          ce(View, { style: { width: 20, height: 20, borderRadius: 10, backgroundColor: item.color, justifyContent: "center", alignItems: "center", marginRight: 7, flexShrink: 0 } },
            ce(Text, { style: { color: C.white, fontFamily: "Helvetica-Bold", fontSize: 9 } }, item.n)
          ),
          ce(View, { style: { flex: 1 } },
            ce(Text, { style: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.dark, marginBottom: 1 } }, item.title),
            ce(Text, { style: { fontSize: 7.5, color: C.gray } }, item.desc)
          )
        )
      )
    ),

    Sp(8),
    Bold("Como gestionar un cliente dormido — 6 pasos", { fontSize: 10, marginBottom: 8 }),
    ce(View, { style: { flexDirection: "row" } },
      ce(View, { style: { flex: 1, marginRight: 10 } },
        Step(1, "Pulsa 'Gestionar'", "Se abre un panel a pantalla completa dedicado a este cliente."),
        Step(2, "Lee las Key Questions", "6 preguntas para preparar el contacto. Desplegables en el panel."),
        Step(3, "Marca las tareas realizadas", "9 acciones predefinidas + campo 'Otros' libre.")
      ),
      ce(View, { style: { flex: 1 } },
        Step(4, "Actualiza el estado", "Sin contactar → En seguimiento → Reactivado segun la situacion.", C.blue),
        Step(5, "Escribe notas", "Resultado de la llamada, compromisos, proximos pasos.", C.teal),
        Step(6, "Vincula al CRM (recomendado)", "Pulsa 'Crear prospecto en CRM' para enlazar con el pipeline.", C.green)
      )
    )
  );

// ─── P4: LAS 9 TAREAS + KEY QUESTIONS ────────────────────────────────────────
const P4 = () =>
  ce(Page, { size: "A4", style: { padding: 40, fontFamily: "Helvetica" } },
    Footer(),
    Banner("03b", "Panel de gestion — Tareas y Key Questions", "Dentro del panel de seguimiento encontraras estas herramientas para gestionar cada cliente.", C.orange),

    ce(View, { style: { flexDirection: "row" } },
      // Left: tasks
      ce(View, { style: { flex: 1.1, marginRight: 12 } },
        Bold("Las 9 tareas de seguimiento", { fontSize: 10, marginBottom: 4 }),
        Txt("Marca las acciones realizadas. Las completadas se registran en el Calendario CRM si el cliente esta vinculado a un prospecto.", { marginBottom: 8 }),
        Task("Llamar al cliente", false),
        Task("Enviar WhatsApp / mensaje", true),
        Task("Enviar email de seguimiento", false),
        Task("Enviar muestra o catalogo", false),
        Task("Proponer reunion o visita", true),
        Task("Hacer visita presencial", false),
        Task("Enviar propuesta de precio especial", false),
        Task("Informar de novedades del catalogo", false),
        Task("Solicitar feedback sobre ultimos pedidos", false),
        Task("Otros (campo de texto libre)", false),
        Sp(6),
        Callout("cal", "Sincronizacion con Calendario", "Cada tarea completada que marques, si el cliente tiene un prospecto CRM vinculado, se registra automaticamente como actividad en el Calendario.", C.tealL, C.teal, C.teal)
      ),
      // Right: key questions + notes
      ce(View, { style: { flex: 1 } },
        Bold("Key Questions — LEER antes de llamar", { fontSize: 10, marginBottom: 4 }),
        ce(View, { style: { backgroundColor: C.amberL, borderWidth: 1, borderColor: C.amberB, borderRadius: 8, padding: 10, marginBottom: 10 } },
          ce(Text, { style: { fontSize: 7.5, color: "#92400E", fontFamily: "Helvetica-Bold", marginBottom: 6 } }, "Reflexiona sobre estas 6 preguntas antes de contactar al cliente:"),
          ...[
            "¿Cual fue la ultima conversacion que tuviste con este cliente y que quedo pendiente?",
            "¿Que necesidad especifica puedes resolver hoy con tu catalogo actual?",
            "¿Has presentado alguna novedad de producto que pueda despertar su interes?",
            "¿Existe alguna razon concreta por la que este cliente dejo de comprar?",
            "¿Podrias ofrecer una condicion especial para reactivar la relacion este mes?",
            "¿Cuando fue la ultima vez que contactaste a este cliente de forma proactiva?",
          ].map((q, i) =>
            ce(View, { key: i, style: { flexDirection: "row", alignItems: "flex-start", marginBottom: 5 } },
              ce(View, { style: { width: 16, height: 16, borderRadius: 8, backgroundColor: C.amber, justifyContent: "center", alignItems: "center", marginRight: 7, flexShrink: 0 } },
                ce(Text, { style: { color: C.white, fontFamily: "Helvetica-Bold", fontSize: 8 } }, String(i + 1))
              ),
              ce(Text, { style: { fontSize: 7.5, color: "#92400E", flex: 1, lineHeight: 1.45 } }, q)
            )
          )
        ),
        Bold("Notas de seguimiento", { fontSize: 10, marginBottom: 4 }),
        ce(View, { style: { borderWidth: 1.5, borderColor: C.border, borderRadius: 8, padding: 10, minHeight: 55, backgroundColor: C.white } },
          ce(Text, { style: { fontSize: 7.5, color: C.lg, fontStyle: "italic" } }, "Anota el resultado de la llamada, compromisos acordados, proximos pasos..."),
          Sp(24)
        ),
        Callout("!", "Guardado automatico", "Las notas y el estado se guardan solos en la nube. No hay boton de guardar.", C.greenL, C.green, C.green)
      )
    )
  );

// ─── P5: CRM PIPELINE ─────────────────────────────────────────────────────────
const P5 = () =>
  ce(Page, { size: "A4", style: { padding: 40, fontFamily: "Helvetica" } },
    Footer(),
    Banner("04", "CRM — Mis Prospectos", "Tu pipeline de ventas. Gestiona oportunidades desde el primer contacto hasta cerrar la venta.", C.purple),

    Bold("El flujo del pipeline — 8 etapas", { fontSize: 10, marginBottom: 8 }),
    // Pipeline flow
    ce(View, { style: { flexDirection: "row", alignItems: "center", marginBottom: 12 } },
      PChip("Nuevo",      "#9CA3AF", "#F9FAFB",    "#374151", true),
      PChip("Contactado", C.blue,    C.blueL,      C.blue,    true),
      PChip("Interesado", C.purple,  C.purpleL,    C.purple,  true),
      PChip("Propuesta",  C.amber,   C.amberL,     C.amber,   true),
      PChip("Negociacion",C.orange,  C.orangeL,    C.orange,  true),
      PChip("Ganado",     C.green,   C.greenL,     C.green,   true),
      PChip("Seguimiento",C.teal,    C.tealL,      C.teal,    true),
      PChip("Perdido",    C.red,     C.redL,       C.red,     false),
    ),
    Txt("Haz clic en la etapa dentro de la ficha del prospecto para cambiarla al instante. No hay que guardar.", { marginBottom: 12 }),

    ce(View, { style: { flexDirection: "row" } },
      // Left: views + create
      ce(View, { style: { flex: 1, marginRight: 12 } },
        Bold("Dos formas de ver tus prospectos", { fontSize: 10, marginBottom: 6 }),
        ce(View, { style: { flexDirection: "row", marginBottom: 10 } },
          ce(View, { style: { flex: 1, marginRight: 5, borderWidth: 1.5, borderColor: C.red, borderRadius: 8, padding: 9 } },
            ce(Text, { style: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.red, marginBottom: 3 } }, "Vista Kanban"),
            ce(Text, { style: { fontSize: 7.5, color: C.gray, lineHeight: 1.4 } }, "Columnas por etapa. Vision global de todo el pipeline de un vistazo.")
          ),
          ce(View, { style: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 9 } },
            ce(Text, { style: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.mid, marginBottom: 3 } }, "Vista Lista"),
            ce(Text, { style: { fontSize: 7.5, color: C.gray, lineHeight: 1.4 } }, "Tabla con busqueda y filtro por etapa. Mas datos en menos espacio.")
          )
        ),
        Bold("Crear un prospecto nuevo", { fontSize: 10, marginBottom: 6 }),
        Step(1, "Boton 'Nuevo prospecto'", "Esquina superior derecha de la pagina CRM."),
        Step(2, "Rellena los datos", "Nombre, email, telefono, empresa, ciudad y etapa inicial."),
        Step(3, "Guarda", "Aparece en el pipeline inmediatamente en la etapa seleccionada."),
        Callout("*", "Desde cliente dormido", "En el panel de seguimiento de un cliente dormido, pulsa el boton ambar 'Crear prospecto en CRM' para vincularlo directamente.", C.amberL, C.amber, C.amber)
      ),
      // Right: ficha prospecto
      ce(View, { style: { flex: 1 } },
        Bold("Ficha del prospecto — 3 pestanas", { fontSize: 10, marginBottom: 6 }),
        // Tab mockup
        ce(View, { style: { borderWidth: 1, borderColor: C.border, borderRadius: 8, overflow: "hidden", marginBottom: 8 } },
          ce(View, { style: { flexDirection: "row", backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border } },
            ...[
              { t: "Actividad", a: true },
              { t: "Emails", a: false },
              { t: "Notas", a: false },
            ].map((tab, i) =>
              ce(View, { key: i, style: { paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: tab.a ? 2 : 0, borderBottomColor: C.red } },
                ce(Text, { style: { fontSize: 7.5, fontFamily: tab.a ? "Helvetica-Bold" : "Helvetica", color: tab.a ? C.red : C.lg } }, tab.t)
              )
            )
          ),
          ce(View, { style: { padding: 8 } },
            ...["Llamada realizada — hace 2 dias", "Email enviado — hace 1 semana", "Nota interna — hace 10 dias"].map((act, i) =>
              ce(View, { key: i, style: { flexDirection: "row", alignItems: "center", paddingVertical: 4, borderBottomWidth: i < 2 ? 1 : 0, borderBottomColor: C.border } },
                ce(View, { style: { width: 7, height: 7, borderRadius: 4, backgroundColor: [C.blue, C.purple, C.amber][i], marginRight: 7 } }),
                ce(Text, { style: { fontSize: 7, color: C.mid } }, act)
              )
            )
          )
        ),
        Bold("Tipos de actividad registrables", { fontSize: 10, marginBottom: 6 }),
        ce(View, { style: { flexDirection: "row", flexWrap: "wrap" } },
          ...[
            { t: "Llamada",      c: C.blue   },
            { t: "Email",        c: C.purple },
            { t: "Reunion",      c: C.green  },
            { t: "Nota",         c: C.amber  },
            { t: "Tarea",        c: C.teal   },
            { t: "Visita",       c: C.orange },
            { t: "WhatsApp",     c: C.green  },
            { t: "Propuesta",    c: C.red    },
          ].map((a, i) =>
            ce(View, { key: i, style: { marginRight: 4, marginBottom: 4, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 5, backgroundColor: a.c + "15", borderWidth: 1, borderColor: a.c + "40" } },
              ce(Text, { style: { fontSize: 7, fontFamily: "Helvetica-Bold", color: a.c } }, a.t)
            )
          )
        ),
        Callout("cal", "Actividades en Calendario", "Todo lo que registres en un prospecto aparece automaticamente en el Calendario.", C.tealL, C.teal, C.teal)
      )
    )
  );

// ─── P6: CALENDARIO + EMAILS + PERFIL ────────────────────────────────────────
const P6 = () =>
  ce(Page, { size: "A4", style: { padding: 40, fontFamily: "Helvetica" } },
    Footer(),

    ce(View, { style: { flexDirection: "row", marginBottom: 10 } },
      // Calendario
      ce(View, { style: { flex: 1, marginRight: 8 } },
        ce(View, { style: { backgroundColor: C.orange, borderRadius: 10, padding: 12, marginBottom: 8 } },
          ce(View, { style: { flexDirection: "row", alignItems: "center" } },
            ce(View, { style: { width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center", alignItems: "center", marginRight: 8 } },
              ce(Text, { style: { color: C.white, fontFamily: "Helvetica-Bold", fontSize: 10 } }, "05")
            ),
            ce(Text, { style: { color: C.white, fontFamily: "Helvetica-Bold", fontSize: 12 } }, "Calendario")
          )
        ),
        Txt("Tu agenda comercial completa. Todas las actividades registradas en prospectos aparecen aqui automaticamente.", { marginBottom: 8 }),
        Bold("¿Que aparece en el Calendario?", { fontSize: 9, marginBottom: 5 }),
        ...[
          "Actividades registradas en fichas de prospectos",
          "Tareas marcadas en el panel de clientes dormidos (si estan vinculados a un prospecto CRM)",
          "Llamadas, emails, reuniones y visitas registradas",
        ].map((item, i) =>
          ce(View, { key: i, style: { flexDirection: "row", alignItems: "flex-start", marginBottom: 4 } },
            ce(View, { style: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.orange, marginRight: 7, marginTop: 3, flexShrink: 0 } }),
            ce(Text, { style: { fontSize: 7.5, color: C.mid, flex: 1, lineHeight: 1.4 } }, item)
          )
        ),
        Callout("i", "Solo tus actividades", "El Calendario es personal: ves solo las actividades de tus propios prospectos.", C.orangeL, C.orange, C.orange)
      ),
      // Emails
      ce(View, { style: { flex: 1 } },
        ce(View, { style: { backgroundColor: C.indigo, borderRadius: 10, padding: 12, marginBottom: 8 } },
          ce(View, { style: { flexDirection: "row", alignItems: "center" } },
            ce(View, { style: { width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center", alignItems: "center", marginRight: 8 } },
              ce(Text, { style: { color: C.white, fontFamily: "Helvetica-Bold", fontSize: 10 } }, "06")
            ),
            ce(Text, { style: { color: C.white, fontFamily: "Helvetica-Bold", fontSize: 12 } }, "Tracking Emails")
          )
        ),
        Txt("Envia emails a tus prospectos desde la ficha y haz seguimiento en tiempo real.", { marginBottom: 8 }),
        Bold("Datos rastreados", { fontSize: 9, marginBottom: 5 }),
        ...[
          { icon: "ok", color: C.green,  label: "Entregado",  desc: "Email en el buzon del destinatario" },
          { icon: "[]", color: C.blue,   label: "Abierto",    desc: "Cuantas veces lo ha leido" },
          { icon: "->", color: C.purple, label: "Clics",      desc: "Hizo clic en un enlace" },
          { icon: "xx", color: C.red,    label: "Rebote",     desc: "No pudo entregarse" },
          { icon: "!!", color: C.orange, label: "Spam",       desc: "Marcado como no deseado" },
        ].map((d, i) =>
          ce(View, { key: i, style: { flexDirection: "row", alignItems: "center", marginBottom: 4, padding: 5, backgroundColor: C.bg, borderRadius: 5 } },
            ce(View, { style: { width: 18, paddingHorizontal: 3, paddingVertical: 2, borderRadius: 3, backgroundColor: d.color + "20", marginRight: 7, alignItems: "center" } },
              ce(Text, { style: { fontSize: 6, fontFamily: "Helvetica-Bold", color: d.color } }, d.icon)
            ),
            ce(Text, { style: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.dark, marginRight: 5, width: 40 } }, d.label),
            ce(Text, { style: { fontSize: 7.5, color: C.gray, flex: 1 } }, d.desc)
          )
        )
      )
    ),

    // Perfil
    ce(View, { style: { backgroundColor: C.dark, borderRadius: 10, padding: 12, marginBottom: 10 } },
      ce(View, { style: { flexDirection: "row", alignItems: "center" } },
        ce(View, { style: { width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", marginRight: 8 } },
          ce(Text, { style: { color: C.white, fontFamily: "Helvetica-Bold", fontSize: 10 } }, "07")
        ),
        ce(Text, { style: { color: C.white, fontFamily: "Helvetica-Bold", fontSize: 12 } }, "Mi Perfil")
      )
    ),
    ce(View, { style: { flexDirection: "row" } },
      ce(View, { style: { flex: 1, marginRight: 10 } },
        Txt("Accede desde el menu lateral. Mantén tus datos siempre actualizados.", { marginBottom: 6 }),
        Tbl(
          ["Campo", "Para que sirve"],
          [
            ["Nombre completo", "Tu nombre y apellidos"],
            ["Email",           "Correo de acceso y contacto"],
            ["Telefono",        "Numero de contacto"],
            ["NIF",             "Imprescindible para autofacturas"],
            ["Direccion",       "Domicilio fiscal"],
            ["IBAN",            "Cuenta para cobro de comisiones"],
          ],
          [0.9, 2.1]
        )
      ),
      ce(View, { style: { flex: 1 } },
        Callout("!", "NIF e IBAN son obligatorios", "Sin NIF e IBAN correctos no se pueden generar autofacturas ni procesar transferencias de comisiones. Mantenlos siempre actualizados.", "#FFF1F2", C.red, C.red),
        Sp(6),
        Bold("¿Que es una autofactura?", { fontSize: 9, marginBottom: 4 }),
        Txt("La autofactura es el documento fiscal que acredita el pago de tus comisiones. La genera Prospectia y aparece en el apartado 'Autofacturas emitidas' de tu ficha de delegado. Recibes una copia en PDF."),
      )
    )
  );

// ─── P7: FAQ ──────────────────────────────────────────────────────────────────
const P7 = () =>
  ce(Page, { size: "A4", style: { padding: 40, fontFamily: "Helvetica" } },
    Footer(),
    Banner("FAQ", "Preguntas frecuentes", "Respuestas rapidas a las dudas mas comunes del portal.", C.mid),

    ce(View, { style: { flexDirection: "row" } },
      ce(View, { style: { flex: 1, marginRight: 10 } },
        ...[
          {
            q: "¿Por que no veo comisiones en el mes actual?",
            a: "Las comisiones solo se calculan sobre facturas que Holded marca como COBRADAS. Si tus facturas estan pendientes o vencidas, no generan comision hasta que se registre el cobro en Holded."
          },
          {
            q: "¿Cuando se actualiza la informacion del portal?",
            a: "Los datos se sincronizan con Holded automaticamente cada 4 horas. Si acabas de registrar un cobro y no aparece, espera a la siguiente sincronizacion o contacta con Prospectia."
          },
          {
            q: "¿Puedo ver las comisiones de meses anteriores?",
            a: "Si. Usa el selector de mes en la cabecera de tu panel: las flechas < > para ir mes a mes, o haz clic en el nombre del mes para seleccionar directamente."
          },
          {
            q: "¿Los datos de seguimiento de clientes dormidos se guardan?",
            a: "Si, se guardan automaticamente en la nube. No hay boton de guardar. La proxima vez que accedas encontraras el estado exactamente igual."
          },
        ].map((faq, i) =>
          ce(View, { key: i, style: { marginBottom: 8, padding: 10, backgroundColor: C.bg, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: C.red } },
            ce(Text, { style: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.dark, marginBottom: 4 } }, faq.q),
            ce(Text, { style: { fontSize: 8, color: C.gray, lineHeight: 1.5 } }, faq.a)
          )
        )
      ),
      ce(View, { style: { flex: 1 } },
        ...[
          {
            q: "¿Que diferencia hay entre 'Liquidable' y 'Facturas pendientes'?",
            a: "Liquidable: comision calculada sobre facturas YA cobradas. Es lo que Prospectia te debe abonar. Pendiente: facturas emitidas sin cobrar que generaran comision cuando se cobren."
          },
          {
            q: "¿Puedo descargar el PDF de liquidacion?",
            a: "Si. En el panel dentro de 'Comisiones liquidables', pulsa el boton 'Liquidacion' para descargar el PDF del periodo seleccionado."
          },
          {
            q: "¿Como vinculo un cliente dormido al CRM?",
            a: "Desde el panel de seguimiento (boton 'Gestionar' en la tarjeta), pulsa el boton ambar 'Crear prospecto en CRM'. Se crea el prospecto en etapa 'Nuevo' vinculado a ese cliente."
          },
          {
            q: "No puedo acceder al portal.",
            a: "Comprueba que estas usando el correo y contraseña correctos. Si el problema persiste, contacta con Prospectia en lvila@prospectia.es"
          },
        ].map((faq, i) =>
          ce(View, { key: i, style: { marginBottom: 8, padding: 10, backgroundColor: C.bg, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: C.red } },
            ce(Text, { style: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.dark, marginBottom: 4 } }, faq.q),
            ce(Text, { style: { fontSize: 8, color: C.gray, lineHeight: 1.5 } }, faq.a)
          )
        )
      )
    ),

    Sp(10),
    ce(View, { style: { backgroundColor: C.redL, borderWidth: 1, borderColor: "#FECACA", borderRadius: 10, padding: 14, flexDirection: "row", alignItems: "center" } },
      ce(View, { style: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.red, justifyContent: "center", alignItems: "center", marginRight: 12, flexShrink: 0 } },
        ce(Text, { style: { color: C.white, fontFamily: "Helvetica-Bold", fontSize: 14 } }, "?")
      ),
      ce(View, {},
        ce(Text, { style: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.dark, marginBottom: 3 } }, "¿Tienes otra duda?"),
        ce(Text, { style: { fontSize: 8.5, color: C.gray } }, "Contacta con el equipo de Prospectia en lvila@prospectia.es"),
        ce(Text, { style: { fontSize: 8.5, color: C.gray, marginTop: 2 } }, "Portal: dashboard.prospectia.es  ·  Prospectia Overseas Consulting SL  ·  B66560939")
      )
    )
  );

// ─── Document ─────────────────────────────────────────────────────────────────
const Manual = () =>
  ce(
    Document as React.ComponentType<DocumentProps & { children?: React.ReactNode }>,
    { title: "Manual del Delegado · Prospectia", author: "Prospectia" },
    ce(Cover),
    ce(P1),
    ce(P2),
    ce(P3),
    ce(P4),
    ce(P5),
    ce(P6),
    ce(P7),
  );

// ─── Route ────────────────────────────────────────────────────────────────────
export async function GET() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const buffer = await renderToBuffer(ce(Manual) as React.ReactElement<DocumentProps>);

  return new Response(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": 'inline; filename="Manual_Delegado_Prospectia.pdf"',
      "Cache-Control":       "private, max-age=3600",
    },
  });
}
