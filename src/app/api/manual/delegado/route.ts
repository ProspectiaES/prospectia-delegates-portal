export const runtime = "nodejs";

import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { getProfile } from "@/lib/profile";
import { redirect } from "next/navigation";

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

  coverTitle:  { fontSize: 36, fontFamily: "Helvetica-Bold", color: C.red, textAlign: "center", marginTop: 160 },
  coverSub:    { fontSize: 18, color: C.gray, textAlign: "center", marginTop: 8 },
  coverLine:   { fontSize: 14, fontFamily: "Helvetica-Bold", color: C.dark, textAlign: "center", marginTop: 32 },
  coverMeta:   { fontSize: 10, color: C.lgray, textAlign: "center", marginTop: 8 },
  coverUrl:    { fontSize: 11, color: C.red, textAlign: "center", marginTop: 48 },

  h1:          { fontSize: 18, fontFamily: "Helvetica-Bold", color: C.red, marginTop: 24, marginBottom: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: C.red },
  h2:          { fontSize: 14, fontFamily: "Helvetica-Bold", color: C.dark, marginTop: 16, marginBottom: 6 },
  h3:          { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.red, marginTop: 12, marginBottom: 4 },

  p:           { fontSize: 10, lineHeight: 1.6, marginBottom: 6, color: C.dark },
  li:          { flexDirection: "row" as const, marginBottom: 3, paddingLeft: 8 },
  bullet:      { width: 12, color: C.red, fontSize: 10 },
  liText:      { flex: 1, fontSize: 10, lineHeight: 1.5, color: C.dark },

  note:        { backgroundColor: "#EFF6FF", borderLeftWidth: 3, borderLeftColor: C.blue, paddingHorizontal: 10, paddingVertical: 6, marginVertical: 6, flexDirection: "row" as const, gap: 4 },
  noteText:    { fontSize: 9, color: C.blue, flex: 1, lineHeight: 1.5 },
  warn:        { backgroundColor: "#FFFBEB", borderLeftWidth: 3, borderLeftColor: C.amber, paddingHorizontal: 10, paddingVertical: 6, marginVertical: 6, flexDirection: "row" as const, gap: 4 },
  warnText:    { fontSize: 9, color: C.amber, flex: 1, lineHeight: 1.5 },

  table:       { borderWidth: 1, borderColor: C.border, marginVertical: 6 },
  tHead:       { flexDirection: "row" as const, backgroundColor: C.red },
  tHeadCell:   { flex: 1, padding: 5, fontSize: 9, color: C.white, fontFamily: "Helvetica-Bold" },
  tRow:        { flexDirection: "row" as const, borderTopWidth: 1, borderTopColor: C.border },
  tRowAlt:     { flexDirection: "row" as const, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg },
  tCell:       { flex: 1, padding: 5, fontSize: 9, color: C.dark },

  footer:      { position: "absolute" as const, bottom: 28, left: 54, right: 54, flexDirection: "row" as const, justifyContent: "space-between" as const, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 6 },
  footerText:  { fontSize: 8, color: C.lgray },
  sp:          { marginVertical: 4 },
  spLg:        { marginVertical: 10 },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ce = React.createElement;

const H1  = (t: string) => ce(Text, { style: s.h1, break: true }, t);
const H2  = (t: string) => ce(Text, { style: s.h2 }, t);
const H3  = (t: string) => ce(Text, { style: s.h3 }, t);
const P   = (t: string | React.ReactNode, bold = false) => ce(Text, { style: [s.p, bold ? { fontFamily: "Helvetica-Bold" } : {}] }, t);
const Sp  = () => ce(View, { style: s.sp });
const SpLg = () => ce(View, { style: s.spLg });

const Li = (t: string) =>
  ce(View, { style: s.li },
    ce(Text, { style: s.bullet }, "•"),
    ce(Text, { style: s.liText }, t)
  );

const OLi = (n: number, t: string) =>
  ce(View, { style: s.li },
    ce(Text, { style: [s.bullet, { width: 16, fontFamily: "Helvetica-Bold" }] }, `${n}.`),
    ce(Text, { style: s.liText }, t)
  );

const Note = (t: string) =>
  ce(View, { style: s.note },
    ce(Text, { style: [s.noteText, { fontFamily: "Helvetica-Bold", width: 14 }] }, "ℹ"),
    ce(Text, { style: s.noteText }, t)
  );

const Warn = (t: string) =>
  ce(View, { style: s.warn },
    ce(Text, { style: [s.warnText, { fontFamily: "Helvetica-Bold", width: 14 }] }, "⚠"),
    ce(Text, { style: s.warnText }, t)
  );

const Table = (headers: string[], rows: string[][], widths?: number[]) => {
  const cols = widths ?? headers.map(() => 1);
  return ce(View, { style: s.table },
    ce(View, { style: s.tHead },
      ...headers.map((h, i) => ce(Text, { key: i, style: [s.tHeadCell, { flex: cols[i] }] }, h))
    ),
    ...rows.map((row, ri) =>
      ce(View, { key: ri, style: ri % 2 === 0 ? s.tRow : s.tRowAlt },
        ...row.map((cell, ci) => ce(Text, { key: ci, style: [s.tCell, { flex: cols[ci] }] }, cell))
      )
    )
  );
};

// ─── Cover ────────────────────────────────────────────────────────────────────
const CoverPage = () =>
  ce(Page, { size: "A4", style: s.page },
    ce(Text, { style: s.coverTitle }, "PROSPECTIA"),
    ce(Text, { style: s.coverSub   }, "Delegates Portal"),
    ce(View, { style: { height: 1, backgroundColor: C.red, marginHorizontal: 60, marginTop: 24 } }),
    ce(Text, { style: s.coverLine  }, "MANUAL DE USUARIO — DELEGADOS"),
    ce(View, { style: { height: 1, backgroundColor: C.border, marginHorizontal: 60, marginTop: 24 } }),
    ce(Text, { style: { ...s.coverMeta, marginTop: 32 } }, "Manual de usuario para delegados"),
    ce(Text, { style: s.coverMeta  }, "Prospectia Overseas Consulting SL  ·  B66560939"),
    ce(Text, { style: s.coverUrl   }, "dashboard.prospectia.es"),
    ce(Text, { style: s.coverMeta  }, "Soporte: lvila@prospectia.es"),
  );

// ─── Content ──────────────────────────────────────────────────────────────────
const ContentPage = () =>
  ce(Page, { size: "A4", style: s.page },

    ce(View, { style: s.footer, fixed: true },
      ce(Text, { style: s.footerText }, "MANUAL DELEGADOS · PROSPECTIA"),
      ce(Text, { style: s.footerText, render: ({ pageNumber }: { pageNumber: number }) => `dashboard.prospectia.es  ·  Página ${pageNumber}` })
    ),

    // 1. Acceso
    ce(Text, { style: s.h1, break: false }, "1.  Acceso al portal"),
    P(["El portal está disponible en ", ce(Text, { style: { color: C.red, fontFamily: "Helvetica-Bold" } }, "dashboard.prospectia.es"), ". Solo accesible con las credenciales que te ha proporcionado Prospectia."] as unknown as string),
    Sp(),
    H3("Cómo iniciar sesión"),
    OLi(1, "Abre el navegador y accede a dashboard.prospectia.es"),
    OLi(2, "Introduce tu correo electrónico y contraseña."),
    OLi(3, "Pulsa Entrar."),
    OLi(4, "Serás redirigido automáticamente a tu panel personal."),
    Note("Si has olvidado tu contraseña contacta con Prospectia en lvila@prospectia.es para restablecerla."),

    // 2. Dashboard
    H1("2.  Tu panel principal (Dashboard)"),
    P("Al iniciar sesión llegas a tu ficha personal de delegado. Esta es tu central de mando: muestra facturación, clientes, comisiones y afiliados de un vistazo."),
    Sp(),
    Table(
      ["Zona", "Contenido"],
      [
        ["Cabecera",          "Tu nombre, selector de mes y fecha de alta"],
        ["Tarjetas KPI",      "Cuatro bloques: Facturación, Clientes, Comisiones, Afiliados"],
        ["Columna izquierda", "Datos personales, asignaciones y afiliados"],
        ["Columna derecha",   "Seis secciones desplegables con el detalle de tu actividad"],
      ],
      [1, 2],
    ),

    // 3. KPIs
    H1("3.  Indicadores clave (KPIs)"),
    P("Cuatro tarjetas en la parte superior del panel con métricas agrupadas por tema."),
    Sp(),
    H3("Facturación"),
    Table(
      ["Métrica", "Qué muestra"],
      [
        ["Total facturado",     "Suma de todas tus facturas (histórico completo)"],
        ["Cobradas en período", "Importe cobrado en el mes seleccionado"],
        ["Pendientes",          "Facturas emitidas aún sin pagar"],
        ["Vencidas",            "Facturas con fecha de vencimiento superada (en rojo)"],
      ],
      [1, 2],
    ),
    Sp(),
    H3("Clientes"),
    Table(
      ["Métrica", "Qué muestra"],
      [
        ["Total",    "Número de clientes asignados a ti"],
        ["Activos",  "Clientes con factura en los últimos 30 días"],
        ["Dormidos", "Clientes sin actividad en más de 30 días"],
      ],
      [1, 2],
    ),
    Sp(),
    H3("Comisiones"),
    Table(
      ["Métrica", "Qué muestra"],
      [
        ["Liquidable",      "Comisión neta por facturas cobradas en el período"],
        ["En riesgo",       "Comisión potencial sobre facturas vencidas"],
        ["Pendiente cobro", "Comisión potencial sobre facturas aún no vencidas"],
      ],
      [1, 2],
    ),
    Sp(),
    H3("Afiliados"),
    Table(
      ["Métrica", "Qué muestra"],
      [
        ["Total",      "Número de afiliados asignados"],
        ["Facturado",  "Suma de todas las órdenes de tus afiliados"],
        ["Liquidable", "Comisión aprobada pendiente de pago"],
        ["Pagado",     "Comisión ya liquidada (histórico)"],
      ],
      [1, 2],
    ),

    // 4. Período
    H1("4.  Cambiar de período"),
    P("Por defecto el panel muestra el mes en curso. Puedes consultar cualquier mes anterior para revisar comisiones, facturas o actividad histórica."),
    Li("Usa las flechas ← y → junto al nombre del mes para avanzar o retroceder un mes."),
    Li("Haz clic en el nombre del mes para seleccionar la fecha manualmente."),
    Li("El botón Hoy vuelve al mes actual."),
    Note("El período afecta a las comisiones liquidables y a «Cobradas en período». Facturas, clientes y riesgo siempre muestran el estado actual."),

    // 5. Secciones
    H1("5.  Secciones del panel principal"),
    P("En la columna derecha encontrarás seis secciones desplegables. Haz clic en el encabezado para abrirla o cerrarla."),
    Sp(),

    H2("5.1  Actividad Clientes"),
    P("Muestra qué clientes están comprando y cuáles llevan tiempo sin actividad."),
    H3("Nuevos en período"),
    P("Clientes cuya primera factura cae dentro del mes seleccionado."),
    H3("Clientes activos"),
    P("Clientes con al menos una factura en los últimos 30 días, ordenados de más reciente a menos."),
    H3("Clientes dormidos"),
    P("Clientes sin actividad en más de 30 días, ordenados de mayor a menor inactividad."),
    Table(
      ["Color", "Rango", "Significado"],
      [
        ["Ámbar",  "30–60 días",  "Atención — es hora de contactar"],
        ["Naranja","60–90 días",  "Urgente — riesgo real de pérdida"],
        ["Rojo",   ">90 días",    "Crítico — requiere acción inmediata"],
        ["Gris",   "Sin actividad","Nunca ha generado factura"],
      ],
      [0.6, 0.7, 1.7],
    ),
    Sp(),

    H2("5.2  Riesgo Clientes"),
    P("Muestra las facturas que requieren atención inmediata, ordenadas por urgencia."),
    H3("Facturas vencidas"),
    Table(
      ["Columna", "Significado"],
      [
        ["Factura",      "Número de factura (enlace al detalle)"],
        ["Cliente",      "Nombre del cliente"],
        ["Vencida el",   "Fecha en que venció"],
        ["Días vencida", "Días de retraso"],
        ["Importe",      "Total de la factura"],
      ],
      [1, 2],
    ),
    H3("Facturas pendientes"),
    Table(
      ["Columna", "Significado"],
      [
        ["Factura",    "Número de factura"],
        ["Vencimiento","Fecha prevista de cobro"],
        ["Días",       "Días restantes hasta el vencimiento"],
        ["Importe",    "Total de la factura"],
      ],
      [1, 2],
    ),
    Sp(),

    H2("5.3  Comisiones liquidables"),
    P("Consulta las comisiones generadas por facturas cobradas en el período seleccionado."),
    Li("Flechas de mes para cambiar el período dentro de esta sección."),
    Li("Indicador «Mes en curso» cuando estás viendo el período actual."),
    Li("Botón Liquidación para descargar el PDF de liquidación del período."),
    Li("Cada factura cobrada aparece como fila expandible con detalle por producto."),
    Warn("Las comisiones de facturas pendientes o vencidas NO son liquidables hasta que Holded las marque como cobradas."),
    Sp(),

    H2("5.4  Facturas"),
    Table(
      ["Pestaña", "Contenido"],
      [
        ["Todas",     "Historial completo de facturas"],
        ["Cobradas",  "Facturas pagadas"],
        ["Pendientes","Facturas emitidas sin cobrar"],
        ["Vencidas",  "Facturas con vencimiento superado"],
      ],
      [0.8, 2.2],
    ),
    Note("La tabla muestra 25 facturas por página. Usa los botones de paginación al pie para navegar."),
    Sp(),

    H2("5.5  Clientes asociados"),
    P("Lista de todos los clientes asignados. Haz clic en el nombre o en «Ver →» para acceder a la ficha completa del cliente."),
    Sp(),

    H2("5.6  Autofacturas emitidas"),
    P("Historial de todas las autofacturas generadas para tu delegación."),
    Table(
      ["Columna", "Significado"],
      [
        ["Número",       "Referencia de la autofactura (PO-AF-AA-NNNN)"],
        ["Período",      "Mes al que corresponde la liquidación"],
        ["Base",         "Comisión neta antes de impuestos"],
        ["IRPF",         "Retención aplicada (si corresponde)"],
        ["Recargo eq.",  "Recargo de equivalencia (si aplica)"],
        ["Total a pagar","Importe final que Prospectia te abona"],
      ],
      [1, 2],
    ),

    // 6. Página Clientes
    H1("6.  Página de Clientes (menú lateral)"),
    P("Accede desde el menú lateral → Clientes. Esta página es tu centro de gestión comercial con métricas, herramientas CRM y el detalle de actividad de tu cartera completa."),
    Sp(),

    H2("6.1  Resumen de métricas"),
    H3("Fila 1 — KPIs principales"),
    Table(
      ["Tarjeta", "Qué muestra"],
      [
        ["Total",    "Número total de clientes asignados"],
        ["Activos",  "Clientes con actividad en los últimos 30 días (fondo verde)"],
        ["Dormidos", "Clientes sin actividad en más de 30 días (fondo ámbar)"],
        ["Nuevos",   "Clientes con su primer pedido en el mes actual (fondo azul)"],
      ],
      [0.8, 2.2],
    ),
    H3("Fila 2 — Métricas adicionales"),
    Table(
      ["Tarjeta", "Qué muestra"],
      [
        ["Distribución",   "Barra visual que muestra % activos (verde) vs % dormidos (ámbar)"],
        ["En seguimiento", "Clientes marcados como «En seguimiento» en el CRM"],
        ["Reactivados",    "Clientes marcados como «Reactivado» en el CRM"],
      ],
      [1, 2],
    ),
    Sp(),

    H2("6.2  Seguimiento CRM — Clientes dormidos"),
    P("La herramienta más importante para gestión comercial. Una tarjeta visual por cada cliente dormido te permite gestionar las acciones de reactivación directamente desde aquí."),
    Sp(),

    H3("Las tarjetas de clientes dormidos"),
    Li("Franja de color superior: rojo (>90d crítico), naranja (60–90d urgente), ámbar (30–60d atención)."),
    Li("Nombre del cliente, ciudad y días desde la última compra."),
    Li("Barra de progreso: 10 píldoras, una por tarea. Las completadas se muestran en verde."),
    Li("Estado actual: Sin contactar / En seguimiento / Reactivado."),
    Li("Botón «Gestionar» para abrir el panel de gestión completo."),
    Sp(),

    H3("Panel de gestión del cliente (pantalla completa)"),
    P("Al pulsar «Gestionar» se abre un panel a pantalla completa con cuatro secciones:"),
    Sp(),

    P("A) Estado del seguimiento", true),
    Table(
      ["Estado", "Cuándo usarlo"],
      [
        ["Sin contactar",  "No has iniciado contacto todavía (estado por defecto)"],
        ["En seguimiento", "Ya has contactado y estás en proceso de reactivación"],
        ["Reactivado",     "El cliente ha vuelto a comprar o confirmado su interés"],
      ],
      [1, 2],
    ),
    Sp(),

    P("B) Key questions — LEER antes de llamar", true),
    P("Seis preguntas de reflexión para preparar el contacto:"),
    OLi(1, "¿Cuál fue la última conversación que tuviste con este cliente y qué quedó pendiente?"),
    OLi(2, "¿Qué necesidad específica puedes resolver hoy con tu catálogo actual?"),
    OLi(3, "¿Has presentado alguna novedad de producto que pueda despertar su interés?"),
    OLi(4, "¿Existe alguna razón concreta por la que este cliente dejó de comprar?"),
    OLi(5, "¿Podrías ofrecer una condición especial para reactivar la relación este mes?"),
    OLi(6, "¿Cuándo fue la última vez que contactaste a este cliente de forma proactiva?"),
    Warn("Dedica unos minutos a reflexionar sobre estas preguntas antes de llamar. El contacto preparado tiene más probabilidades de éxito."),
    Sp(),

    P("C) Tareas de seguimiento", true),
    Table(
      ["Tarea", "Descripción"],
      [
        ["Llamar al cliente",                  "Llamada telefónica directa al contacto habitual"],
        ["Enviar WhatsApp / mensaje",           "Mensaje informal para retomar el contacto"],
        ["Enviar email de seguimiento",         "Email formal con propuesta o información relevante"],
        ["Enviar muestra o catálogo",           "Material de producto o catálogo actualizado"],
        ["Proponer reunión o visita",           "Solicitud de reunión presencial o videollamada"],
        ["Hacer visita presencial",             "Visita física a las instalaciones del cliente"],
        ["Enviar propuesta de precio especial", "Oferta personalizada o descuento para reactivar"],
        ["Informar de novedades del catálogo",  "Comunicar lanzamientos o cambios de producto"],
        ["Solicitar feedback",                  "Preguntar su experiencia y detectar incidencias"],
        ["Otros",                               "Acción personalizada — abre un campo de texto libre"],
      ],
      [1.4, 1.6],
    ),
    Note("Al completar todas las tareas el sistema sugiere actualizar el estado a «Reactivado» si hubo respuesta positiva. Las tareas completadas se registran automáticamente en el Calendario CRM si el cliente está vinculado a un prospecto."),
    Sp(),

    P("D) Notas de seguimiento", true),
    P("Campo de texto libre para anotar el resultado de cada acción: conversaciones, compromisos, próximos pasos. Se guarda automáticamente — no hay botón de guardar."),
    Sp(),

    H2("6.3  Secciones de actividad — tabla de clientes"),
    Table(
      ["Sección", "Contenido"],
      [
        ["Nuevos en período",  "Clientes con su primera factura en el mes actual"],
        ["Clientes activos",   "Clientes con actividad en los últimos 30 días con fecha de última actividad"],
        ["Clientes dormidos",  "Vista de tabla con todos los dormidos e indicadores de severidad"],
      ],
      [1, 2],
    ),

    // 7. Ficha cliente
    H1("7.  Ficha de cliente"),
    P("Desde cualquier lista de clientes, haz clic en el nombre para acceder a la ficha completa."),
    Sp(),
    Table(
      ["Bloque", "Qué contiene"],
      [
        ["CRM / Seguimiento",  "Etapa del pipeline, últimas 5 actividades, crear prospecto si no existe"],
        ["Datos de contacto",  "Nombre, email, teléfono, dirección, ciudad, etiquetas"],
        ["Resumen económico",  "Total facturas, facturado, cobrado, pendiente"],
        ["Facturas",           "Últimas 10 facturas con número, fecha, importe y estado"],
        ["Pedidos en curso",   "Pedidos pendientes de facturar"],
        ["Afiliado asignado",  "Qué afiliado trajo a este cliente"],
      ],
      [1.2, 1.8],
    ),
    Note("Si el cliente ya tiene un prospecto CRM vinculado, puedes cambiar su etapa directamente desde la ficha sin ir al CRM."),

    // 8. CRM
    H1("8.  CRM — Mis Prospectos"),
    P("Accede desde el menú lateral → CRM. Tu pipeline de ventas para gestionar oportunidades comerciales."),
    Sp(),
    H2("8.1  Vistas disponibles"),
    Li("Vista Kanban: columnas por etapa, visión global del pipeline."),
    Li("Vista Lista: tabla con búsqueda y filtro por etapa."),
    Sp(),
    H2("8.2  Las 8 etapas del pipeline"),
    Table(
      ["Etapa", "Cuándo usarla"],
      [
        ["Nuevo",       "Recién añadido, aún sin contacto"],
        ["Contactado",  "Ya te has puesto en contacto"],
        ["Interesado",  "Ha mostrado interés real"],
        ["Propuesta",   "Le has enviado una oferta o propuesta formal"],
        ["Negociación", "Estáis negociando condiciones"],
        ["Ganado",      "Ha cerrado — ya es cliente activo"],
        ["Seguimiento", "Cliente ganado bajo seguimiento continuo"],
        ["Perdido",     "No ha cerrado — oportunidad descartada"],
      ],
      [1, 2],
    ),
    Sp(),
    H2("8.3  Crear un prospecto"),
    OLi(1, "Pulsa «Nuevo prospecto» en la esquina superior derecha."),
    OLi(2, "Rellena nombre, email, teléfono, empresa, ciudad y etapa inicial."),
    OLi(3, "Guarda. El prospecto aparece en el pipeline inmediatamente."),
    Note("También puedes crear un prospecto directamente desde el panel de seguimiento de un cliente dormido — pulsa el botón ámbar «Crear prospecto en CRM» dentro del panel de gestión."),

    // 9. Ficha prospecto
    H1("9.  Ficha de prospecto"),
    P("Al entrar en un prospecto ves su perfil completo, el historial de actividades y los emails enviados."),
    Sp(),
    H2("9.1  Pestañas"),
    Table(
      ["Pestaña", "Contenido"],
      [
        ["Actividad", "Historial cronológico de todas las acciones realizadas"],
        ["Emails",    "Emails enviados con estadísticas de apertura y clics"],
        ["Notas",     "Notas internas sobre el prospecto"],
      ],
      [0.8, 2.2],
    ),
    Sp(),
    H2("9.2  Cambiar etapa"),
    P("El selector de etapa está siempre visible en la cabecera del prospecto. Un solo clic cambia la etapa — no hay que guardar. Si hay un error de red, la etapa vuelve al estado anterior automáticamente."),
    Sp(),
    H2("9.3  Registrar una actividad"),
    P("Desde la pestaña «Actividad» → botón «Nueva actividad». Tipos disponibles:"),
    Table(
      ["Tipo", "Descripción"],
      [
        ["Llamada",       "Llamada telefónica realizada o recibida"],
        ["Email",         "Email enviado o recibido"],
        ["Reunión",       "Reunión presencial o videollamada"],
        ["Nota",          "Nota interna sin acción externa"],
        ["Tarea",         "Tarea pendiente de realizar"],
        ["Visita",        "Visita presencial a las instalaciones"],
        ["WhatsApp/SMS",  "Mensaje informal"],
        ["Propuesta",     "Envío de propuesta o presupuesto"],
      ],
      [0.8, 2.2],
    ),
    Note("Todas las actividades registradas en un prospecto aparecen automáticamente en el Calendario."),

    // 10. Calendario
    H1("10.  Calendario"),
    P("Accede desde el menú lateral → Calendario. Tu agenda de actividades comerciales."),
    P("El Calendario recoge todas las actividades registradas en tus prospectos: llamadas, emails, reuniones, visitas, notas. También incluye las tareas de seguimiento de clientes dormidos cuando están vinculadas a un prospecto CRM."),
    Sp(),
    Table(
      ["Filtro", "Qué muestra"],
      [
        ["Completadas", "Actividades ya realizadas"],
        ["Pendientes",  "Actividades programadas a futuro"],
        ["Por tipo",    "Llamada, email, reunión, visita…"],
      ],
      [1, 2],
    ),
    Note("No tienes que hacer nada: cada vez que registras una actividad en un prospecto, aparece automáticamente en el Calendario."),

    // 11. Tracking emails
    H1("11.  Tracking de emails"),
    P("Accede desde el menú lateral → Tracking emails. Muestra todos los emails enviados con sus estadísticas de apertura y clics."),
    Sp(),
    H2("11.1  Datos rastreados por email"),
    Table(
      ["Dato", "Significado"],
      [
        ["Entregado",         "El email llegó al buzón del destinatario"],
        ["Aperturas",         "Número de veces que lo ha abierto y fecha de primera apertura"],
        ["Clics",             "Si hizo clic en algún enlace del email"],
        ["Rebote (bounce)",   "El email no pudo entregarse (dirección inválida, buzón lleno)"],
        ["Spam (complaint)",  "El destinatario marcó el email como spam"],
      ],
      [1.2, 1.8],
    ),
    Sp(),
    H2("11.2  Cómo enviar un email con tracking"),
    OLi(1, "Ve a la ficha del prospecto (CRM → haz clic en el prospecto)."),
    OLi(2, "Selecciona la pestaña «Emails»."),
    OLi(3, "Elige una plantilla predefinida o escribe el contenido manualmente."),
    OLi(4, "Pulsa Enviar. El email sale desde tu dirección y queda registrado automáticamente."),

    // 12. Perfil
    H1("12.  Mi Perfil"),
    P("Accede desde el menú lateral → Mi Perfil. Actualiza tus datos personales y bancarios."),
    Table(
      ["Campo", "Descripción"],
      [
        ["Nombre completo", "Tu nombre y apellidos"],
        ["Email",           "Correo de acceso y contacto"],
        ["Teléfono",        "Número de contacto"],
        ["NIF",             "Número de identificación fiscal (imprescindible para autofacturas)"],
        ["Dirección",       "Calle y número de tu domicilio fiscal"],
        ["Ciudad",          "Localidad"],
        ["Código postal",   "C.P. de tu domicilio fiscal"],
        ["IBAN",            "Cuenta bancaria para el cobro de comisiones (imprescindible)"],
      ],
      [1, 2],
    ),
    Warn("Es imprescindible que el NIF y el IBAN estén siempre actualizados — se utilizan para generar las autofacturas y las transferencias de comisiones."),

    // 13. FAQ
    H1("13.  Preguntas frecuentes"),

    P("¿Por qué no veo comisiones en el período actual?", true),
    P("Las comisiones solo se calculan sobre facturas que Holded marca como cobradas. Si tus facturas están pendientes o vencidas no aparecerán hasta que se registre el cobro."),
    Sp(),

    P("¿Cuándo se actualiza la información del portal?", true),
    P("Los datos se sincronizan con Holded automáticamente cada 4 horas. Si acabas de registrar un cobro y no aparece, espera a la siguiente sincronización o contacta con Prospectia."),
    Sp(),

    P("¿Qué diferencia hay entre «Comisión liquidable» y «Facturas pendientes»?", true),
    Li("Comisión liquidable: sobre facturas ya cobradas. Es el importe que Prospectia te debe abonar."),
    Li("Facturas pendientes: emitidas sin cobrar. Generarán comisión cuando se cobren."),
    Sp(),

    P("¿Puedo ver las comisiones de meses anteriores?", true),
    P("Sí. Usa el selector de período en la cabecera del panel para navegar a cualquier mes anterior. El botón Hoy vuelve al mes en curso."),
    Sp(),

    P("¿Qué es una autofactura?", true),
    P("Documento fiscal que acredita el pago de tus comisiones. La genera Prospectia y aparece en el apartado «Autofacturas emitidas» de tu ficha. Recibirás una copia en PDF cuando sea emitida."),
    Sp(),

    P("¿Los datos de seguimiento de clientes dormidos se guardan?", true),
    P("Sí, se guardan automáticamente en la nube. No hay botón de guardar — la próxima vez que accedas al portal todo estará exactamente igual."),
    Sp(),

    P("¿Puedo descargar el PDF de liquidación?", true),
    P("Sí. En el panel, dentro de la sección «Comisiones liquidables», pulsa el botón «Liquidación» para descargar el PDF del período seleccionado."),
    Sp(),

    P("No puedo acceder al portal.", true),
    P("Comprueba que estás usando el correo y la contraseña correctos. Si el problema persiste, contacta con Prospectia en lvila@prospectia.es"),
    SpLg(),

    ce(View, { style: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, marginTop: 16 } },
      ce(Text, { style: { ...s.p, color: C.lgray, fontSize: 8, textAlign: "center" as const } },
        "Prospectia Overseas Consulting SL  ·  B66560939  ·  MANUAL DE USUARIO DELEGADOS"
      ),
      ce(Text, { style: { ...s.p, color: C.lgray, fontSize: 8, textAlign: "center" as const } },
        "dashboard.prospectia.es  ·  Soporte: lvila@prospectia.es"
      ),
    ),
  );

// ─── Document ─────────────────────────────────────────────────────────────────
const Manual = () =>
  ce(
    Document as React.ComponentType<DocumentProps & { children?: React.ReactNode }>,
    { title: "Manual de Usuario — Delegados · Prospectia", author: "Prospectia" },
    ce(CoverPage),
    ce(ContentPage),
  );

// ─── Route ────────────────────────────────────────────────────────────────────
export async function GET() {
  const profile = await getProfile();
  if (!profile) {
    redirect("/login");
  }

  const buffer = await renderToBuffer(ce(Manual) as React.ReactElement<DocumentProps>);

  return new Response(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": 'inline; filename="Manual_Delegado_Prospectia.pdf"',
      "Cache-Control":       "private, max-age=3600",
    },
  });
}
