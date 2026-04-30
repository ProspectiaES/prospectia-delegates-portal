import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToFile, Font } from "@react-pdf/renderer";

// ─── Colours ──────────────────────────────────────────────────────────────────
const C = {
  red:    "#8E0E1A",
  dark:   "#0A0A0A",
  gray:   "#6B7280",
  lgray:  "#9CA3AF",
  border: "#E5E7EB",
  bg:     "#F9FAFB",
  green:  "#059669",
  amber:  "#D97706",
  blue:   "#2563EB",
  white:  "#FFFFFF",
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page:        { fontFamily: "Helvetica", fontSize: 10, color: C.dark, paddingTop: 54, paddingBottom: 54, paddingHorizontal: 54 },

  // Cover
  coverTitle:  { fontSize: 36, fontFamily: "Helvetica-Bold", color: C.red, textAlign: "center", marginTop: 160 },
  coverSub:    { fontSize: 18, color: C.gray, textAlign: "center", marginTop: 8 },
  coverLine:   { fontSize: 14, fontFamily: "Helvetica-Bold", color: C.dark, textAlign: "center", marginTop: 32 },
  coverMeta:   { fontSize: 10, color: C.lgray, textAlign: "center", marginTop: 8 },
  coverUrl:    { fontSize: 11, color: C.red, textAlign: "center", marginTop: 48 },

  // Headings
  h1:          { fontSize: 18, fontFamily: "Helvetica-Bold", color: C.red, marginTop: 24, marginBottom: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: C.red },
  h2:          { fontSize: 14, fontFamily: "Helvetica-Bold", color: C.dark, marginTop: 16, marginBottom: 6 },
  h3:          { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.red, marginTop: 12, marginBottom: 4 },

  // Body
  p:           { fontSize: 10, lineHeight: 1.6, marginBottom: 6, color: C.dark },
  bold:        { fontFamily: "Helvetica-Bold" },
  muted:       { color: C.gray },

  // Lists
  li:          { flexDirection: "row", marginBottom: 3, paddingLeft: 8 },
  bullet:      { width: 12, color: C.red, fontSize: 10 },
  liText:      { flex: 1, fontSize: 10, lineHeight: 1.5, color: C.dark },

  // Note / warn boxes
  note:        { backgroundColor: "#EFF6FF", borderLeftWidth: 3, borderLeftColor: C.blue, paddingHorizontal: 10, paddingVertical: 6, marginVertical: 6, flexDirection: "row", gap: 4 },
  noteText:    { fontSize: 9, color: C.blue, flex: 1, lineHeight: 1.5 },
  warn:        { backgroundColor: "#FFFBEB", borderLeftWidth: 3, borderLeftColor: C.amber, paddingHorizontal: 10, paddingVertical: 6, marginVertical: 6, flexDirection: "row", gap: 4 },
  warnText:    { fontSize: 9, color: C.amber, flex: 1, lineHeight: 1.5 },

  // Table
  table:       { borderWidth: 1, borderColor: C.border, marginVertical: 6 },
  tHead:       { flexDirection: "row", backgroundColor: C.red },
  tHeadCell:   { flex: 1, padding: 5, fontSize: 9, color: C.white, fontFamily: "Helvetica-Bold" },
  tRow:        { flexDirection: "row", borderTopWidth: 1, borderTopColor: C.border },
  tRowAlt:     { flexDirection: "row", borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg },
  tCell:       { flex: 1, padding: 5, fontSize: 9, color: C.dark },
  tCellNarrow: { flex: 0.6, padding: 5, fontSize: 9, color: C.dark },
  tCellWide:   { flex: 1.4, padding: 5, fontSize: 9, color: C.dark },

  // Footer
  footer:      { position: "absolute", bottom: 28, left: 54, right: 54, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: C.border, paddingTop: 6 },
  footerText:  { fontSize: 8, color: C.lgray },

  // Spacer
  sp:          { marginVertical: 4 },
  spLg:        { marginVertical: 10 },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const H1 = ({ children }) => React.createElement(Text, { style: s.h1, break: true }, children);
const H2 = ({ children }) => React.createElement(Text, { style: s.h2 }, children);
const H3 = ({ children }) => React.createElement(Text, { style: s.h3 }, children);
const P  = ({ children, style }) => React.createElement(Text, { style: [s.p, style] }, children);
const Sp = () => React.createElement(View, { style: s.sp });
const SpLg = () => React.createElement(View, { style: s.spLg });

const Li = ({ children }) =>
  React.createElement(View, { style: s.li },
    React.createElement(Text, { style: s.bullet }, "•"),
    React.createElement(Text, { style: s.liText }, children)
  );

const OLi = ({ n, children }) =>
  React.createElement(View, { style: s.li },
    React.createElement(Text, { style: [s.bullet, { width: 16, fontFamily: "Helvetica-Bold" }] }, `${n}.`),
    React.createElement(Text, { style: s.liText }, children)
  );

const Note = ({ children }) =>
  React.createElement(View, { style: s.note },
    React.createElement(Text, { style: [s.noteText, { fontFamily: "Helvetica-Bold", width: 14 }] }, "ℹ"),
    React.createElement(Text, { style: s.noteText }, children)
  );

const Warn = ({ children }) =>
  React.createElement(View, { style: s.warn },
    React.createElement(Text, { style: [s.warnText, { fontFamily: "Helvetica-Bold", width: 14 }] }, "⚠"),
    React.createElement(Text, { style: s.warnText }, children)
  );

const Table = ({ headers, rows, widths }) => {
  const cols = widths ?? headers.map(() => 1);
  return React.createElement(View, { style: s.table },
    React.createElement(View, { style: s.tHead },
      ...headers.map((h, i) =>
        React.createElement(Text, { key: i, style: [s.tHeadCell, { flex: cols[i] }] }, h)
      )
    ),
    ...rows.map((row, ri) =>
      React.createElement(View, { key: ri, style: ri % 2 === 0 ? s.tRow : s.tRowAlt },
        ...row.map((cell, ci) =>
          React.createElement(Text, { key: ci, style: [s.tCell, { flex: cols[ci] }] }, cell)
        )
      )
    )
  );
};

const Footer = ({ pageNum }) =>
  React.createElement(View, { style: s.footer, fixed: true },
    React.createElement(Text, { style: s.footerText }, "MANUAL DASHBOARD PROSPECTIA V1 2026"),
    React.createElement(Text, { style: s.footerText }, `dashboard.prospectia.es  ·  Página ${pageNum}`)
  );

// ─── Cover page ───────────────────────────────────────────────────────────────
const CoverPage = () =>
  React.createElement(Page, { size: "A4", style: s.page },
    React.createElement(Text, { style: s.coverTitle }, "PROSPECTIA"),
    React.createElement(Text, { style: s.coverSub  }, "Delegates Portal"),
    React.createElement(View, { style: { height: 1, backgroundColor: C.red, marginHorizontal: 60, marginTop: 24 } }),
    React.createElement(Text, { style: s.coverLine }, "MANUAL DASHBOARD PROSPECTIA"),
    React.createElement(Text, { style: [s.coverLine, { fontSize: 18, color: C.gray }] }, "V1  ·  2026"),
    React.createElement(View, { style: { height: 1, backgroundColor: C.border, marginHorizontal: 60, marginTop: 24 } }),
    React.createElement(Text, { style: [s.coverMeta, { marginTop: 32 }] }, "Manual de usuario para delegados"),
    React.createElement(Text, { style: s.coverMeta }, "Prospectia Overseas Consulting SL  ·  B66560939"),
    React.createElement(Text, { style: s.coverUrl  }, "dashboard.prospectia.es"),
    React.createElement(Text, { style: s.coverMeta }, "Soporte: lvila@prospectia.es"),
  );

// ─── Content page ─────────────────────────────────────────────────────────────
const ContentPage = () =>
  React.createElement(Page, { size: "A4", style: s.page },

    // Footer fixed
    React.createElement(View, { style: s.footer, fixed: true },
      React.createElement(Text, { style: s.footerText }, "MANUAL DASHBOARD PROSPECTIA V1 2026"),
      React.createElement(Text, { style: s.footerText, render: ({ pageNumber }) => `dashboard.prospectia.es  ·  Página ${pageNumber}` })
    ),

    // ── 1. Acceso ──────────────────────────────────────────────────────────────
    React.createElement(Text, { style: s.h1 }, "1.  Acceso al portal"),
    React.createElement(P, {}, ["El portal está disponible en ", React.createElement(Text, { style: { color: C.red, fontFamily: "Helvetica-Bold" } }, "dashboard.prospectia.es"), ". Solo accesible con las credenciales que te ha proporcionado Prospectia."]),
    Sp(),
    H3({ children: "Cómo iniciar sesión" }),
    OLi({ n: 1, children: "Abre el navegador y accede a dashboard.prospectia.es" }),
    OLi({ n: 2, children: "Introduce tu correo electrónico y contraseña." }),
    OLi({ n: 3, children: "Pulsa Entrar." }),
    OLi({ n: 4, children: "Serás redirigido automáticamente a tu panel personal." }),
    Note({ children: "Si has olvidado tu contraseña contacta con Prospectia en lvila@prospectia.es para restablecerla." }),

    // ── 2. Panel principal ─────────────────────────────────────────────────────
    H1({ children: "2.  Tu panel principal (Dashboard)" }),
    P({ children: "Al iniciar sesión llegas a tu ficha personal de delegado. Esta es tu central de mando: muestra facturación, clientes, comisiones y afiliados de un vistazo." }),
    Sp(),
    Table({
      headers: ["Zona", "Contenido"],
      rows: [
        ["Cabecera",          "Tu nombre, badge de rol y fecha de alta"],
        ["Tarjetas KPI",      "Cuatro bloques de métricas: Facturación, Clientes, Comisiones, Afiliados"],
        ["Columna izquierda", "Datos personales, asignaciones y afiliados"],
        ["Columna derecha",   "Seis secciones desplegables con el detalle de tu actividad"],
      ],
      widths: [1, 2],
    }),

    // ── 3. KPIs ────────────────────────────────────────────────────────────────
    H1({ children: "3.  Indicadores clave (KPIs)" }),
    P({ children: "En la parte superior hay cuatro tarjetas compactas, cada una agrupando métricas relacionadas." }),
    Sp(),
    H3({ children: "Facturación" }),
    Table({
      headers: ["Métrica", "Qué muestra"],
      rows: [
        ["Total facturado",     "Suma de todas tus facturas (histórico completo)"],
        ["Cobradas en período", "Importe cobrado en el mes seleccionado actualmente"],
        ["Pendientes",          "Facturas emitidas aún sin pagar"],
        ["Vencidas",            "Facturas con fecha de vencimiento superada sin cobrar (en rojo)"],
      ],
      widths: [1, 2],
    }),
    Sp(),
    H3({ children: "Clientes" }),
    Table({
      headers: ["Métrica", "Qué muestra"],
      rows: [
        ["Total",    "Número de clientes asignados a ti"],
        ["Activos",  "Clientes con factura en los últimos 30 días"],
        ["Dormidos", "Clientes sin actividad en más de 30 días"],
      ],
      widths: [1, 2],
    }),
    Sp(),
    H3({ children: "Comisiones" }),
    Table({
      headers: ["Métrica", "Qué muestra"],
      rows: [
        ["Liquidable",      "Comisión neta por facturas cobradas en el período"],
        ["En riesgo",       "Comisión potencial sobre facturas vencidas"],
        ["Pendiente cobro", "Comisión potencial sobre facturas aún no vencidas"],
      ],
      widths: [1, 2],
    }),
    Sp(),
    H3({ children: "Afiliados" }),
    Table({
      headers: ["Métrica", "Qué muestra"],
      rows: [
        ["Total",      "Número de afiliados asignados"],
        ["Facturado",  "Suma de todas las órdenes de tus afiliados"],
        ["Liquidable", "Comisión aprobada pendiente de pago"],
        ["Pagado",     "Comisión ya liquidada (histórico)"],
      ],
      widths: [1, 2],
    }),

    // ── 4. Período ─────────────────────────────────────────────────────────────
    H1({ children: "4.  Cambiar de período" }),
    P({ children: "Por defecto el panel muestra el mes en curso. Puedes consultar cualquier mes anterior." }),
    Li({ children: "Usa las flechas ← y → junto al nombre del mes para avanzar o retroceder." }),
    Li({ children: "Haz clic en el nombre del mes para seleccionar la fecha manualmente." }),
    Li({ children: "El botón Hoy vuelve al mes actual." }),
    Note({ children: "El período afecta a las comisiones liquidables y a «Cobradas en período». Facturas, clientes y riesgo siempre muestran el estado actual." }),

    // ── 5. Secciones panel ─────────────────────────────────────────────────────
    H1({ children: "5.  Secciones del panel principal" }),
    P({ children: "En la columna derecha del dashboard encontrarás seis secciones desplegables. Haz clic en el encabezado para abrirla o cerrarla." }),
    Sp(),

    H2({ children: "5.1  Actividad Clientes" }),
    P({ children: "Muestra qué clientes están comprando y cuáles llevan tiempo sin actividad." }),
    H3({ children: "Nuevos en período" }),
    P({ children: "Clientes cuya primera factura cae dentro del mes seleccionado. Son tus clientes más recientes." }),
    H3({ children: "Clientes activos" }),
    P({ children: "Clientes con al menos una factura en los últimos 30 días, ordenados de más a menos reciente." }),
    H3({ children: "Clientes dormidos" }),
    P({ children: "Clientes sin actividad en más de 30 días, ordenados de mayor a menor inactividad." }),
    Table({
      headers: ["Color", "Rango", "Significado"],
      rows: [
        ["Ámbar",  "30–60 días",  "Atención — es hora de contactar"],
        ["Naranja","60–90 días",  "Urgente — riesgo real de pérdida"],
        ["Rojo",   ">90 días",    "Crítico — requiere acción inmediata"],
        ["Gris",   "Sin actividad","Nunca ha generado factura"],
      ],
      widths: [0.6, 0.7, 1.7],
    }),
    Sp(),

    H2({ children: "5.2  Riesgo Clientes" }),
    P({ children: "Muestra las facturas que requieren atención inmediata, ordenadas por urgencia." }),
    H3({ children: "Facturas vencidas" }),
    Table({
      headers: ["Columna", "Significado"],
      rows: [
        ["Factura",      "Número de factura (enlace al detalle)"],
        ["Cliente",      "Nombre del cliente"],
        ["Vencida el",   "Fecha en que venció"],
        ["Días vencida", "Días de retraso"],
        ["Importe",      "Total de la factura"],
      ],
      widths: [1, 2],
    }),
    H3({ children: "Facturas pendientes" }),
    Table({
      headers: ["Columna", "Significado"],
      rows: [
        ["Factura",    "Número de factura"],
        ["Vencimiento","Fecha prevista de cobro"],
        ["Días",       "Días restantes hasta el vencimiento"],
        ["Importe",    "Total de la factura"],
      ],
      widths: [1, 2],
    }),
    Sp(),

    H2({ children: "5.3  Comisiones liquidables" }),
    P({ children: "Consulta las comisiones generadas por facturas cobradas en el período seleccionado." }),
    Li({ children: "Flechas de mes para cambiar el período independientemente del selector global." }),
    Li({ children: "Indicador «Mes en curso» cuando estás viendo el período actual." }),
    Li({ children: "Botón Liquidación para descargar el PDF de liquidación del período." }),
    Li({ children: "Cada factura cobrada aparece como fila expandible con detalle por producto." }),
    Warn({ children: "Las comisiones de facturas pendientes o vencidas NO son liquidables hasta que Holded las marque como cobradas." }),
    Sp(),

    H2({ children: "5.4  Facturas" }),
    Table({
      headers: ["Pestaña", "Contenido"],
      rows: [
        ["Todas",     "Historial completo de facturas"],
        ["Cobradas",  "Facturas pagadas"],
        ["Pendientes","Facturas emitidas sin cobrar"],
        ["Vencidas",  "Facturas con vencimiento superado"],
      ],
      widths: [0.8, 2.2],
    }),
    Note({ children: "La tabla muestra 25 facturas por página. Usa los botones de paginación al pie para navegar." }),
    Sp(),

    H2({ children: "5.5  Clientes asociados" }),
    P({ children: "Lista de todos los clientes asignados. Haz clic en el nombre o en «Ver →» para acceder a la ficha completa del cliente." }),
    Sp(),

    H2({ children: "5.6  Autofacturas emitidas" }),
    P({ children: "Historial de todas las autofacturas generadas para tu delegación." }),
    Table({
      headers: ["Columna", "Significado"],
      rows: [
        ["Número",       "Referencia de la autofactura (PO-AF-AA-NNNN)"],
        ["Período",      "Mes al que corresponde la liquidación"],
        ["Base",         "Comisión neta antes de impuestos"],
        ["IRPF",         "Retención aplicada (si corresponde)"],
        ["Recargo eq.",  "Recargo de equivalencia (si aplica)"],
        ["Total a pagar","Importe final que Prospectia te abona"],
      ],
      widths: [1, 2],
    }),

    // ── 6. Página Clientes ─────────────────────────────────────────────────────
    H1({ children: "6.  Página de Clientes" }),
    P({ children: "Accede desde el menú lateral Clientes. Esta página es tu centro de gestión comercial con métricas, herramientas CRM y el detalle de actividad." }),
    Sp(),

    H2({ children: "6.1  Resumen de métricas" }),
    H3({ children: "Fila 1 — KPIs principales" }),
    Table({
      headers: ["Tarjeta", "Qué muestra"],
      rows: [
        ["Total",    "Número total de clientes asignados"],
        ["Activos",  "Clientes con actividad en los últimos 30 días (fondo verde)"],
        ["Dormidos", "Clientes sin actividad en más de 30 días (fondo ámbar)"],
        ["Nuevos",   "Clientes con su primer pedido en el mes actual (fondo azul)"],
      ],
      widths: [0.8, 2.2],
    }),
    H3({ children: "Fila 2 — Métricas adicionales" }),
    Table({
      headers: ["Tarjeta", "Qué muestra"],
      rows: [
        ["Distribución",    "Barra visual que muestra % activos (verde) vs % dormidos (ámbar)"],
        ["En seguimiento",  "Clientes marcados como «En seguimiento» en el CRM — se actualiza en tiempo real"],
        ["Reactivados",     "Clientes marcados como «Reactivado» en el CRM"],
      ],
      widths: [1, 2],
    }),
    Sp(),

    H2({ children: "6.2  Seguimiento CRM — Clientes dormidos" }),
    P({ children: "La sección más importante para gestión comercial. Una tarjeta visual por cada cliente dormido." }),
    Sp(),

    H3({ children: "Las tarjetas de clientes dormidos" }),
    Li({ children: "Franja de color superior: rojo (>90d crítico), naranja (60–90d urgente), ámbar (30–60d atención)." }),
    Li({ children: "Nombre del cliente, ciudad y fecha del último pedido." }),
    Li({ children: "Barra de progreso de tareas: 10 píldoras, una por tarea. Las completadas se muestran en verde." }),
    Li({ children: "Estado actual: Sin contactar / En seguimiento / Reactivado." }),
    Li({ children: "Botón «Abrir →» para acceder al panel de gestión completo." }),
    Sp(),

    H3({ children: "Panel de gestión del cliente (pantalla completa)" }),
    P({ children: "Al hacer clic en una tarjeta se abre un panel a pantalla completa con cuatro secciones:" }),
    Sp(),

    P({ style: { fontFamily: "Helvetica-Bold" }, children: "A) Estado del seguimiento" }),
    Table({
      headers: ["Estado", "Cuándo usarlo"],
      rows: [
        ["Sin contactar",  "No has iniciado contacto todavía (estado por defecto)"],
        ["En seguimiento", "Ya has contactado y estás en proceso de reactivación"],
        ["Reactivado",     "El cliente ha vuelto a comprar o confirmado su interés"],
      ],
      widths: [1, 2],
    }),
    Sp(),

    P({ style: { fontFamily: "Helvetica-Bold" }, children: "B) Key questions — LEER antes de proceder" }),
    P({ children: "Seis preguntas de reflexión que debes plantearte antes de contactar al cliente:" }),
    OLi({ n: 1, children: "¿Cuál fue la última conversación que tuviste con este cliente y qué quedó pendiente?" }),
    OLi({ n: 2, children: "¿Qué necesidad específica puedes resolver hoy con tu catálogo actual?" }),
    OLi({ n: 3, children: "¿Has presentado alguna novedad de producto que pueda despertar su interés?" }),
    OLi({ n: 4, children: "¿Existe alguna razón concreta por la que este cliente dejó de comprar?" }),
    OLi({ n: 5, children: "¿Podrías ofrecer una condición especial para reactivar la relación este mes?" }),
    OLi({ n: 6, children: "¿Cuándo fue la última vez que contactaste a este cliente de forma proactiva?" }),
    Warn({ children: "Dedica unos minutos a reflexionar sobre estas preguntas antes de llamar. El contacto preparado tiene más probabilidades de éxito." }),
    Sp(),

    P({ style: { fontFamily: "Helvetica-Bold" }, children: "C) Tareas de seguimiento" }),
    Table({
      headers: ["Tarea", "Descripción"],
      rows: [
        ["Llamar al cliente",                  "Llamada telefónica directa al contacto habitual"],
        ["Enviar WhatsApp / mensaje",           "Mensaje informal para retomar el contacto"],
        ["Enviar email de seguimiento",         "Email formal con propuesta o información relevante"],
        ["Enviar muestra o catálogo",           "Material de producto o catálogo actualizado"],
        ["Proponer reunión o visita",           "Solicitud de reunión presencial o videollamada"],
        ["Hacer visita presencial",             "Visita física a las instalaciones del cliente"],
        ["Enviar propuesta de precio especial", "Oferta personalizada o descuento para reactivar"],
        ["Informar de novedades del catálogo",  "Comunicar lanzamientos o cambios de producto"],
        ["Solicitar feedback",                  "Preguntar su experiencia y detectar incidencias"],
        ["Otros",                               "Acción personalizada — se abre un campo de texto para describir"],
      ],
      widths: [1.4, 1.6],
    }),
    Note({ children: "Al completar todas las tareas el sistema sugiere actualizar el estado a «Reactivado» si hubo respuesta positiva." }),
    Sp(),

    P({ style: { fontFamily: "Helvetica-Bold" }, children: "D) Notas de seguimiento" }),
    P({ children: "Campo de texto libre para anotar el resultado de cada acción: conversaciones, compromisos, próximos pasos. Las notas se guardan durante la sesión activa." }),
    Sp(),

    H2({ children: "6.3  Secciones de actividad (tabla de clientes)" }),
    Table({
      headers: ["Sección", "Contenido"],
      rows: [
        ["Nuevos en período",  "Clientes con su primera factura en el mes actual"],
        ["Clientes activos",   "Clientes con actividad en los últimos 30 días con fecha de última actividad"],
        ["Clientes dormidos",  "Vista de tabla con todos los dormidos e indicadores de severidad (colores)"],
      ],
      widths: [1, 2],
    }),

    // ── 7. Facturas ────────────────────────────────────────────────────────────
    H1({ children: "7.  Página de Facturas" }),
    P({ children: "Accede desde el menú lateral Facturas. Historial completo de facturas con filtros por estado." }),
    Table({
      headers: ["Pestaña", "Contenido"],
      rows: [
        ["Todas",     "Histórico completo sin filtro"],
        ["Cobradas",  "Facturas pagadas"],
        ["Pendientes","Facturas sin pagar"],
        ["Vencidas",  "Facturas con vencimiento superado"],
      ],
      widths: [0.8, 2.2],
    }),

    // ── 8. Afiliados ───────────────────────────────────────────────────────────
    H1({ children: "8.  Página de Afiliados" }),
    P({ children: "Accede desde el menú lateral Afiliados. Seguimiento de la actividad de tus afiliados y las comisiones generadas." }),
    Table({
      headers: ["Métrica", "Significado"],
      rows: [
        ["Total afiliados",  "Número de afiliados asignados a ti"],
        ["Comisiones totales","Suma de todas las comisiones generadas"],
        ["Pendiente de pago","Comisiones aprobadas aún no liquidadas"],
        ["Pagado",           "Comisiones ya pagadas"],
      ],
      widths: [1, 2],
    }),
    Sp(),
    P({ children: "Al hacer clic en un afiliado accedes a su ficha detallada con datos, órdenes, pagos y KPIs." }),

    // ── 9. Mi perfil ───────────────────────────────────────────────────────────
    H1({ children: "9.  Mi Perfil" }),
    P({ children: "Accede desde el menú lateral Mi Perfil. Actualiza tus datos personales y bancarios." }),
    Table({
      headers: ["Campo", "Descripción"],
      rows: [
        ["Nombre completo","Tu nombre y apellidos"],
        ["Email",         "Correo de acceso y contacto"],
        ["Teléfono",      "Número de contacto"],
        ["NIF",           "Número de identificación fiscal (imprescindible para autofacturas)"],
        ["Dirección",     "Calle y número de tu domicilio fiscal"],
        ["Ciudad",        "Localidad"],
        ["Código postal", "C.P. de tu domicilio fiscal"],
        ["IBAN",          "Cuenta bancaria para el cobro de comisiones (imprescindible)"],
      ],
      widths: [1, 2],
    }),
    Warn({ children: "Es imprescindible que el NIF y el IBAN estén siempre actualizados, ya que se utilizan para generar las autofacturas y las transferencias." }),

    // ── 10. FAQ ────────────────────────────────────────────────────────────────
    H1({ children: "10.  Preguntas frecuentes" }),

    P({ style: { fontFamily: "Helvetica-Bold" }, children: "¿Por qué no veo comisiones en el período actual?" }),
    P({ children: "Las comisiones solo se calculan sobre facturas que Holded marca como cobradas. Si tus facturas están pendientes o vencidas no aparecerán hasta que se registre el cobro." }),
    Sp(),

    P({ style: { fontFamily: "Helvetica-Bold" }, children: "¿Cuándo se actualiza la información del portal?" }),
    P({ children: "Los datos se sincronizan con Holded automáticamente cada 4 horas. Si acabas de registrar un cobro y no aparece, espera a la siguiente sincronización o contacta con Prospectia." }),
    Sp(),

    P({ style: { fontFamily: "Helvetica-Bold" }, children: "¿Qué diferencia hay entre «Comisión liquidable» y «Facturas pendientes»?" }),
    Li({ children: "Comisión liquidable: sobre facturas ya cobradas. Es el importe que Prospectia te debe abonar." }),
    Li({ children: "Facturas pendientes: emitidas sin cobrar. Generarán comisión cuando se cobren." }),
    Sp(),

    P({ style: { fontFamily: "Helvetica-Bold" }, children: "¿Los datos del CRM de clientes se guardan?" }),
    P({ children: "Actualmente los estados de seguimiento (tareas, notas, estado) se guardan durante la sesión activa del navegador. Si cierras o recargas la página se restablecen. Próximamente se implementará persistencia permanente." }),
    Sp(),

    P({ style: { fontFamily: "Helvetica-Bold" }, children: "¿Puedo descargar el PDF de liquidación?" }),
    P({ children: "Sí. En el dashboard, dentro de la sección Comisiones liquidables, pulsa el botón Liquidación." }),
    Sp(),

    P({ style: { fontFamily: "Helvetica-Bold" }, children: "¿Qué es una autofactura?" }),
    P({ children: "Documento fiscal que acredita el pago de tus comisiones. La genera Prospectia y aparece en el apartado Autofacturas emitidas de tu ficha de delegado." }),
    Sp(),

    P({ style: { fontFamily: "Helvetica-Bold" }, children: "No puedo acceder al portal." }),
    P({ children: "Comprueba correo y contraseña. Si persiste contacta con Prospectia en lvila@prospectia.es" }),
    SpLg(),

    // ── Final note ─────────────────────────────────────────────────────────────
    React.createElement(View, { style: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, marginTop: 16 } },
      React.createElement(Text, { style: [s.p, { color: C.lgray, fontSize: 8, textAlign: "center" }] },
        "Prospectia Overseas Consulting SL  ·  B66560939  ·  MANUAL DASHBOARD PROSPECTIA V1 2026"
      ),
      React.createElement(Text, { style: [s.p, { color: C.lgray, fontSize: 8, textAlign: "center" }] },
        "dashboard.prospectia.es  ·  Soporte: lvila@prospectia.es"
      ),
    ),
  );

// ─── Document ─────────────────────────────────────────────────────────────────
const Manual = () =>
  React.createElement(Document,
    { title: "MANUAL DASHBOARD PROSPECTIA V1 2026", author: "Prospectia" },
    React.createElement(CoverPage),
    React.createElement(ContentPage),
  );

await renderToFile(React.createElement(Manual), "public/docs/MANUAL_DASHBOARD_PROSPECTIA_V1_2026.pdf");
console.log("✅ PDF generado: public/docs/MANUAL_DASHBOARD_PROSPECTIA_V1_2026.pdf");
