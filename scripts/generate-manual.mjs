import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, Table, TableRow, TableCell, WidthType,
  BorderStyle, ShadingType, convertInchesToTwip,
} from "docx";
import { writeFileSync } from "fs";

// ─── Palette ──────────────────────────────────────────────────────────────────
const RED    = "8E0E1A";
const DARK   = "0A0A0A";
const GRAY   = "6B7280";
const LGRAY  = "9CA3AF";
const BORDER = "E5E7EB";
const GREEN  = "059669";
const AMBER  = "D97706";
const BLUE   = "2563EB";
const BG     = "F9FAFB";

// ─── Text helpers ─────────────────────────────────────────────────────────────
const t  = (text, opts = {}) => new TextRun({ text, font: "Calibri", size: 22, color: DARK, ...opts });
const tb = (text, opts = {}) => t(text, { bold: true, ...opts });
const tc = (text, color, opts = {}) => t(text, { color, ...opts });

const h1 = (text) => new Paragraph({
  text, heading: HeadingLevel.HEADING_1,
  spacing: { before: 480, after: 160 },
  run: { font: "Calibri", bold: true, color: RED, size: 36 },
  border: { bottom: { color: RED, size: 8, space: 4, style: BorderStyle.SINGLE } },
});

const h2 = (text) => new Paragraph({
  text, heading: HeadingLevel.HEADING_2,
  spacing: { before: 320, after: 120 },
  run: { font: "Calibri", bold: true, color: DARK, size: 28 },
});

const h3 = (text) => new Paragraph({
  text, heading: HeadingLevel.HEADING_3,
  spacing: { before: 240, after: 80 },
  run: { font: "Calibri", bold: true, color: RED, size: 24 },
});

const p = (...runs) => new Paragraph({
  children: Array.isArray(runs[0]) ? runs[0] : runs,
  spacing: { before: 80, after: 80 },
  run: { font: "Calibri" },
});

const ul = (items) => items.map(item => new Paragraph({
  children: [t(item)],
  bullet: { level: 0 },
  spacing: { before: 40, after: 40 },
  indent: { left: convertInchesToTwip(0.25) },
}));

const ol = (items) => items.map((item, i) => new Paragraph({
  children: [tb(`${i + 1}.  `), t(item)],
  spacing: { before: 40, after: 40 },
  indent: { left: convertInchesToTwip(0.25) },
}));

const note = (text) => new Paragraph({
  children: [t("ℹ  "), t(text, { italics: true, color: BLUE })],
  spacing: { before: 120, after: 120 },
  indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
  shading: { fill: "EFF6FF", type: ShadingType.CLEAR },
  border: {
    left: { color: BLUE, size: 12, space: 4, style: BorderStyle.SINGLE },
  },
});

const warn = (text) => new Paragraph({
  children: [t("⚠  "), t(text, { italics: true, color: AMBER })],
  spacing: { before: 120, after: 120 },
  indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
  shading: { fill: "FFFBEB", type: ShadingType.CLEAR },
  border: { left: { color: AMBER, size: 12, space: 4, style: BorderStyle.SINGLE } },
});

const br = () => new Paragraph({ text: "", spacing: { before: 80, after: 80 } });

// ─── Table builder ────────────────────────────────────────────────────────────
function buildTable(headers, rows) {
  const headerRow = new TableRow({
    children: headers.map(h => new TableCell({
      children: [new Paragraph({ children: [tb(h, { color: "FFFFFF", size: 20 })], spacing: { before: 60, after: 60 }, alignment: AlignmentType.LEFT })],
      shading: { fill: RED, type: ShadingType.CLEAR },
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
    })),
    tableHeader: true,
  });

  const dataRows = rows.map((row, ri) => new TableRow({
    children: row.map(cell => new TableCell({
      children: [new Paragraph({ children: [t(cell, { size: 20 })], spacing: { before: 40, after: 40 }, alignment: AlignmentType.LEFT })],
      shading: { fill: ri % 2 === 0 ? "FFFFFF" : "F9FAFB", type: ShadingType.CLEAR },
      margins: { top: 40, bottom: 40, left: 120, right: 120 },
    })),
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
    borders: {
      top:          { style: BorderStyle.SINGLE, size: 4, color: BORDER },
      bottom:       { style: BorderStyle.SINGLE, size: 4, color: BORDER },
      left:         { style: BorderStyle.SINGLE, size: 4, color: BORDER },
      right:        { style: BorderStyle.SINGLE, size: 4, color: BORDER },
      insideH:      { style: BorderStyle.SINGLE, size: 2, color: BORDER },
      insideV:      { style: BorderStyle.SINGLE, size: 2, color: BORDER },
    },
  });
}

// ─── Cover page ───────────────────────────────────────────────────────────────
const cover = [
  new Paragraph({ text: "", spacing: { before: 1440 } }),
  new Paragraph({
    children: [new TextRun({ text: "PROSPECTIA", font: "Calibri", bold: true, size: 72, color: RED })],
    alignment: AlignmentType.CENTER,
  }),
  new Paragraph({
    children: [new TextRun({ text: "Delegates Portal", font: "Calibri", size: 48, color: GRAY })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 320 },
  }),
  new Paragraph({
    children: [new TextRun({ text: "Manual de Usuario — Delegados", font: "Calibri", bold: true, size: 36, color: DARK })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 160 },
  }),
  new Paragraph({
    children: [new TextRun({ text: "Versión mayo 2026", font: "Calibri", size: 24, color: LGRAY })],
    alignment: AlignmentType.CENTER,
  }),
  new Paragraph({ text: "", spacing: { before: 800 } }),
  new Paragraph({
    children: [new TextRun({ text: "dashboard.prospectia.es", font: "Calibri", size: 22, color: RED, italics: true })],
    alignment: AlignmentType.CENTER,
  }),
  new Paragraph({
    children: [new TextRun({ text: "Soporte: lvila@prospectia.es", font: "Calibri", size: 20, color: GRAY })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 80 },
  }),
];

// ─── Document sections ────────────────────────────────────────────────────────
const content = [

  // ── 1. Acceso ────────────────────────────────────────────────────────────
  h1("1.  Acceso al portal"),
  p(t("El portal está disponible en "), tb("dashboard.prospectia.es", { color: RED }), t(". Solo accesible con las credenciales que te ha proporcionado Prospectia.")),
  br(),
  h3("Cómo iniciar sesión"),
  ...ol([
    "Abre el navegador y ve a dashboard.prospectia.es",
    "Introduce tu correo electrónico y contraseña.",
    "Pulsa Entrar.",
    "Serás redirigido automáticamente a tu panel personal.",
  ]),
  note("Si has olvidado tu contraseña, contacta con el equipo de Prospectia en lvila@prospectia.es para que te la restablezcan."),
  br(),

  // ── 2. Panel principal ────────────────────────────────────────────────────
  h1("2.  Tu panel principal (Dashboard)"),
  p(t("Al iniciar sesión llegas directamente a tu ficha personal de delegado. Esta es tu central de mando: muestra toda tu actividad de facturación, clientes, comisiones y afiliados de un vistazo.")),
  br(),
  h3("Estructura de la página"),
  buildTable(
    ["Zona", "Contenido"],
    [
      ["Cabecera", "Tu nombre, badge de rol y fecha de alta"],
      ["Tarjetas KPI", "Cuatro bloques de métricas clave: Facturación, Clientes, Comisiones y Afiliados"],
      ["Columna izquierda", "Tus datos personales, asignaciones (KOL, coordinador) y afiliados"],
      ["Columna derecha", "Seis secciones desplegables con el detalle de tu actividad"],
    ]
  ),
  br(),

  // ── 3. KPIs ───────────────────────────────────────────────────────────────
  h1("3.  Indicadores clave (KPIs)"),
  p(t("En la parte superior de tu panel hay cuatro tarjetas compactas, cada una agrupando métricas relacionadas.")),
  br(),
  h3("Facturación"),
  buildTable(
    ["Métrica", "Qué muestra"],
    [
      ["Total facturado", "Suma de todas tus facturas (histórico completo sin filtro de fecha)"],
      ["Cobradas en período", "Importe cobrado en el mes seleccionado actualmente"],
      ["Pendientes", "Facturas emitidas que aún no han sido pagadas"],
      ["Vencidas", "Facturas que han superado su fecha de vencimiento sin cobrar (aparecen en rojo)"],
    ]
  ),
  br(),
  h3("Clientes"),
  buildTable(
    ["Métrica", "Qué muestra"],
    [
      ["Total", "Número de clientes asignados a ti"],
      ["Activos", "Clientes que han generado factura en los últimos 30 días"],
      ["Dormidos", "Clientes sin actividad en más de 30 días"],
    ]
  ),
  br(),
  h3("Comisiones"),
  buildTable(
    ["Métrica", "Qué muestra"],
    [
      ["Liquidable", "Comisión neta generada por facturas cobradas en el período seleccionado"],
      ["En riesgo", "Comisión potencial sobre facturas vencidas (pendiente de cobro)"],
      ["Pendiente cobro", "Comisión potencial sobre facturas aún no vencidas"],
    ]
  ),
  br(),
  h3("Afiliados"),
  buildTable(
    ["Métrica", "Qué muestra"],
    [
      ["Total", "Número de afiliados asignados a ti"],
      ["Facturado", "Suma de todas las órdenes de tus afiliados"],
      ["Liquidable", "Comisión de afiliados aprobada pendiente de pago"],
      ["Pagado", "Comisión de afiliados ya liquidada (histórico)"],
    ]
  ),
  br(),

  // ── 4. Selector de período ────────────────────────────────────────────────
  h1("4.  Cambiar de período"),
  p(t("Por defecto el panel muestra el "), tb("mes en curso"), t(". Puedes consultar cualquier mes anterior para revisar comisiones e historial.")),
  br(),
  h3("Cómo cambiar el período"),
  ...ul([
    "Usa las flechas ← y → junto al nombre del mes para avanzar o retroceder un mes.",
    "O haz clic directamente sobre el nombre del mes para seleccionar la fecha manualmente.",
    "El botón Hoy vuelve al mes actual.",
  ]),
  note("El período afecta a las comisiones liquidables y a «Cobradas en período». Las facturas, clientes y riesgo siempre muestran el estado actual."),
  br(),

  // ── 5. Secciones del panel ────────────────────────────────────────────────
  h1("5.  Secciones del panel principal"),
  p(t("En la columna derecha del dashboard encontrarás seis secciones desplegables. Haz clic en el encabezado de cualquiera para abrirla o cerrarla.")),
  br(),

  h2("5.1  Actividad Clientes"),
  p(t("Muestra qué clientes están comprando y cuáles llevan tiempo sin actividad.")),
  br(),
  h3("Nuevos en período"),
  p(t("Clientes cuya primera factura registrada cae dentro del mes seleccionado. Son tus clientes más recientes.")),
  br(),
  h3("Clientes activos"),
  p(t("Clientes con al menos una factura en los últimos 30 días, ordenados de más a menos reciente.")),
  buildTable(
    ["Columna", "Significado"],
    [
      ["Cliente", "Nombre del cliente (enlace a su ficha)"],
      ["Fecha", "Fecha de la última factura registrada"],
      ["Hace", "Días transcurridos desde esa factura"],
    ]
  ),
  br(),
  h3("Clientes dormidos"),
  p(t("Clientes sin actividad en más de 30 días, ordenados de mayor a menor inactividad. Cada cliente muestra un indicador de color según la urgencia:")),
  buildTable(
    ["Color", "Rango", "Significado"],
    [
      ["Ámbar", "30–60 días", "Atención — es hora de contactar"],
      ["Naranja", "60–90 días", "Urgente — riesgo real de pérdida"],
      ["Rojo", ">90 días", "Crítico — requiere acción inmediata"],
      ["Gris", "Sin actividad", "Nunca ha generado factura"],
    ]
  ),
  br(),

  h2("5.2  Riesgo Clientes"),
  p(t("Muestra las facturas que requieren atención inmediata, ordenadas por urgencia.")),
  br(),
  h3("Facturas vencidas"),
  p(t("Facturas cuya fecha de vencimiento ya ha pasado y siguen sin cobrar. Se muestran en rojo.")),
  buildTable(
    ["Columna", "Significado"],
    [
      ["Factura", "Número de factura (enlace al detalle)"],
      ["Cliente", "Nombre del cliente"],
      ["Vencida el", "Fecha en que venció"],
      ["Días vencida", "Días de retraso"],
      ["Importe", "Total de la factura"],
    ]
  ),
  br(),
  h3("Facturas pendientes"),
  p(t("Facturas emitidas aún no cobradas, con fecha de vencimiento futura.")),
  buildTable(
    ["Columna", "Significado"],
    [
      ["Factura", "Número de factura"],
      ["Cliente", "Nombre del cliente"],
      ["Vencimiento", "Fecha prevista de cobro"],
      ["Días", "Días restantes hasta el vencimiento"],
      ["Importe", "Total de la factura"],
    ]
  ),
  note("Haz clic en el número de factura para ver su detalle completo."),
  br(),

  h2("5.3  Comisiones liquidables"),
  p(t("Aquí consultas las comisiones generadas por las facturas cobradas en el período seleccionado.")),
  br(),
  h3("Barra de navegación"),
  ...ul([
    "Flechas de mes para cambiar el período consultado independientemente del selector global.",
    "Indicador «Mes en curso» cuando estás viendo el período actual.",
    "Botón Liquidación para descargar el PDF de liquidación del período (generado por Prospectia).",
  ]),
  br(),
  h3("Detalle de comisiones"),
  p(t("Cada factura cobrada aparece como una fila expandible:")),
  ...ul([
    "Cabecera: número de factura, nombre del cliente, importe neto de comisión.",
    "Detalle (al expandir): desglose por producto, unidades, precio, descuento, tasa de comisión e importe por línea.",
  ]),
  note("Si tienes rol KOL además de delegado, verás dos bloques separados: uno para comisiones como Delegado y otro para las comisiones KOL."),
  br(),
  h3("Facturas pendientes y vencidas"),
  p(t("Al final de la sección aparecen dos apartados adicionales:")),
  ...ul([
    "Facturas pendientes: importes que generarán comisión una vez se cobren.",
    "Facturas vencidas: importes en riesgo de no cobro.",
  ]),
  warn("Las comisiones de facturas pendientes o vencidas NO son liquidables hasta que Holded las marque como cobradas."),
  br(),

  h2("5.4  Facturas"),
  p(t("Acceso completo a todas las facturas de tus clientes asignados.")),
  br(),
  h3("Pestañas disponibles"),
  buildTable(
    ["Pestaña", "Contenido"],
    [
      ["Todas", "Historial completo de facturas"],
      ["Cobradas", "Facturas pagadas (filtra por fecha de cobro en el período)"],
      ["Pendientes", "Facturas emitidas sin cobrar"],
      ["Vencidas", "Facturas que han superado su vencimiento"],
    ]
  ),
  br(),
  buildTable(
    ["Columna", "Significado"],
    [
      ["Número", "Referencia de la factura en Holded (enlace al detalle)"],
      ["Cliente", "Nombre del cliente"],
      ["Emisión", "Fecha en que se emitió"],
      ["Vencimiento", "Fecha límite de pago"],
      ["Cobro", "Fecha en que se cobró (si aplica)"],
      ["Importe", "Total de la factura"],
      ["Estado", "Cobrada / Pendiente / Vencida"],
    ]
  ),
  note("La tabla muestra 25 facturas por página. Usa los botones de paginación al pie para navegar."),
  br(),

  h2("5.5  Clientes asociados"),
  p(t("Lista de todos los clientes asignados a ti. Haz clic en el nombre o en «Ver →» para acceder a la ficha completa del cliente, donde encontrarás su historial de facturas y datos de contacto.")),
  br(),

  h2("5.6  Autofacturas emitidas"),
  p(t("Historial de todas las autofacturas generadas para tu delegación. Cada fila muestra:")),
  buildTable(
    ["Columna", "Significado"],
    [
      ["Número", "Referencia de la autofactura (formato PO-AF-AA-NNNN)"],
      ["Período", "Mes al que corresponde la liquidación"],
      ["Base", "Comisión neta antes de impuestos"],
      ["IRPF", "Retención aplicada (si corresponde)"],
      ["Recargo eq.", "Recargo de equivalencia (si aplica)"],
      ["Total a pagar", "Importe final que Prospectia te abona"],
      ["Generada", "Fecha de emisión del documento"],
    ]
  ),
  br(),

  // ── 6. Página Clientes ────────────────────────────────────────────────────
  h1("6.  Página de Clientes"),
  p(t("Accede desde el menú lateral "), tb("Clientes"), t(". Esta página es tu centro de gestión comercial: muestra métricas, herramientas CRM y el detalle de actividad de todos tus clientes.")),
  br(),

  h2("6.1  Resumen de métricas"),
  p(t("En la parte superior encontrarás dos filas de tarjetas:")),
  br(),
  h3("Fila 1 — KPIs principales"),
  buildTable(
    ["Tarjeta", "Qué muestra"],
    [
      ["Total", "Número total de clientes asignados"],
      ["Activos", "Clientes con actividad en los últimos 30 días (fondo verde)"],
      ["Dormidos", "Clientes sin actividad en más de 30 días (fondo ámbar)"],
      ["Nuevos", "Clientes con su primer pedido en el mes actual (fondo azul)"],
    ]
  ),
  br(),
  h3("Fila 2 — Métricas adicionales"),
  buildTable(
    ["Tarjeta", "Qué muestra"],
    [
      ["Distribución", "Barra visual que muestra el % de clientes activos (verde) vs dormidos (ámbar)"],
      ["En seguimiento", "Clientes marcados como «En seguimiento» en el CRM"],
      ["Reactivados", "Clientes marcados como «Reactivado» en el CRM"],
    ]
  ),
  note("Las métricas de «En seguimiento» y «Reactivados» se actualizan automáticamente mientras trabajas en el CRM durante la sesión."),
  br(),

  h2("6.2  Búsqueda y filtros"),
  p(t("Usa la barra de búsqueda para filtrar por nombre, email o código de cliente. El menú «Todos los tipos» permite filtrar por tipo de contacto (Cliente, Proveedor, etc.).")),
  br(),

  h2("6.3  Seguimiento CRM — Clientes dormidos"),
  p(t("Esta es la sección más importante para la gestión comercial. Muestra una tarjeta visual por cada cliente dormido, con toda la información necesaria para planificar y registrar las acciones de reactivación.")),
  br(),

  h3("Las tarjetas de clientes dormidos"),
  p(t("Cada tarjeta muestra:")),
  ...ul([
    "Franja de color en el borde superior: rojo (>90d crítico), naranja (60–90d urgente), ámbar (30–60d atención).",
    "Nombre del cliente y ciudad.",
    "Último pedido: fecha de la última factura registrada.",
    "Barra de progreso de tareas: 10 píldoras (una por tarea). Las completadas se muestran en verde.",
    "Estado actual del seguimiento: Sin contactar / En seguimiento / Reactivado.",
    "Botón «Abrir →» para acceder al panel de gestión completo.",
  ]),
  br(),

  h3("Panel de gestión del cliente (pantalla completa)"),
  p(t("Al hacer clic en una tarjeta se abre un panel a pantalla completa con cuatro secciones:")),
  br(),
  p(tb("A) Estado del seguimiento")),
  p(t("Selecciona el estado actual del proceso de reactivación:")),
  buildTable(
    ["Estado", "Cuándo usarlo"],
    [
      ["Sin contactar", "Todavía no has iniciado contacto con este cliente (estado por defecto)"],
      ["En seguimiento", "Ya has contactado y estás en proceso de reactivación"],
      ["Reactivado", "El cliente ha vuelto a comprar o ha confirmado su interés"],
    ]
  ),
  br(),
  p(tb("B) Key questions — LEER antes de proceder")),
  p(t("Seis preguntas de reflexión que debes plantearte antes de contactar al cliente:")),
  ...ol([
    "¿Cuál fue la última conversación que tuviste con este cliente y qué quedó pendiente?",
    "¿Qué necesidad específica puedes resolver hoy con tu catálogo actual?",
    "¿Has presentado alguna novedad de producto que pueda despertar su interés?",
    "¿Existe alguna razón concreta por la que este cliente dejó de comprar?",
    "¿Podrías ofrecer una condición especial para reactivar la relación este mes?",
    "¿Cuándo fue la última vez que contactaste a este cliente de forma proactiva?",
  ]),
  warn("Dedica unos minutos a reflexionar sobre estas preguntas antes de llamar. El contacto preparado tiene más probabilidades de éxito."),
  br(),
  p(tb("C) Tareas de seguimiento")),
  p(t("Lista de acciones que puedes marcar como completadas. Se actualizan en tiempo real y la barra de progreso refleja el avance:")),
  buildTable(
    ["Tarea", "Descripción"],
    [
      ["Llamar al cliente", "Llamada telefónica directa al contacto habitual"],
      ["Enviar WhatsApp / mensaje", "Mensaje informal para retomar el contacto"],
      ["Enviar email de seguimiento", "Email formal con propuesta o información relevante"],
      ["Enviar muestra o catálogo", "Envío de material de producto o catálogo actualizado"],
      ["Proponer reunión o visita", "Solicitud de reunión presencial o videollamada"],
      ["Hacer visita presencial", "Visita física a las instalaciones del cliente"],
      ["Enviar propuesta de precio especial", "Oferta personalizada o descuento para reactivar"],
      ["Informar de novedades del catálogo", "Comunicar lanzamientos o cambios de producto"],
      ["Solicitar feedback sobre últimos pedidos", "Preguntar su experiencia y detectar incidencias"],
      ["Otros", "Acción personalizada — se abre un campo de texto para describir la acción"],
    ]
  ),
  note("Al completar todas las tareas, el sistema sugiere actualizar el estado a «Reactivado» si hubo respuesta positiva."),
  br(),
  p(tb("D) Notas de seguimiento")),
  p(t("Campo de texto libre para anotar el resultado de cada acción: conversaciones, compromisos, próximos pasos, etc. Las notas se guardan en la sesión actual.")),
  br(),

  h3("Secciones de actividad (tabla de clientes)"),
  p(t("Debajo del grid CRM encontrarás tres secciones desplegables con la vista tabular de todos los clientes:")),
  buildTable(
    ["Sección", "Contenido"],
    [
      ["Nuevos en período", "Clientes con su primera factura en el mes actual"],
      ["Clientes activos", "Clientes con actividad en los últimos 30 días, con fecha y días de última actividad"],
      ["Clientes dormidos", "Vista de tabla con todos los dormidos, incluyendo indicadores de severidad (colores)"],
    ]
  ),
  br(),

  // ── 7. Página Facturas ────────────────────────────────────────────────────
  h1("7.  Página de Facturas"),
  p(t("Accede desde el menú lateral "), tb("Facturas"), t(". Muestra el histórico completo de facturas con filtros por estado.")),
  br(),
  buildTable(
    ["Pestaña", "Contenido"],
    [
      ["Todas", "Histórico completo sin filtro de estado"],
      ["Cobradas", "Facturas pagadas"],
      ["Pendientes", "Facturas emitidas sin pagar"],
      ["Vencidas", "Facturas con fecha de vencimiento superada"],
    ]
  ),
  p(t("Haz clic en el número de factura para ver el detalle completo con el desglose de líneas de producto.")),
  br(),

  // ── 8. Página Afiliados ───────────────────────────────────────────────────
  h1("8.  Página de Afiliados"),
  p(t("Accede desde el menú lateral "), tb("Afiliados"), t(". Si tienes afiliados asignados, esta sección te permite hacer seguimiento de su actividad y las comisiones generadas.")),
  br(),
  h3("Resumen global"),
  buildTable(
    ["Métrica", "Significado"],
    [
      ["Total afiliados", "Número de afiliados asignados a ti"],
      ["Comisiones totales", "Suma de todas las comisiones generadas"],
      ["Pendiente de pago", "Comisiones aprobadas aún no liquidadas"],
      ["Pagado", "Comisiones ya pagadas"],
    ]
  ),
  br(),
  h3("Ficha de afiliado"),
  p(t("Al hacer clic en un afiliado accedes a su ficha detallada:")),
  ...ul([
    "Datos: nombre, email, programa, código de referido, estado.",
    "Órdenes: historial de ventas generadas con importes y comisiones.",
    "Pagos: historial de liquidaciones realizadas.",
    "KPIs: total facturado, comisión pendiente, aprobada y pagada.",
  ]),
  br(),

  // ── 9. Mi perfil ─────────────────────────────────────────────────────────
  h1("9.  Mi Perfil"),
  p(t("Accede desde el menú lateral "), tb("Mi Perfil"), t(". Aquí puedes actualizar tus datos personales y bancarios.")),
  br(),
  h3("Datos editables"),
  buildTable(
    ["Campo", "Descripción"],
    [
      ["Nombre completo", "Tu nombre y apellidos"],
      ["Email", "Correo de acceso y contacto"],
      ["Teléfono", "Número de contacto"],
      ["NIF", "Número de identificación fiscal (imprescindible para autofacturas)"],
      ["Dirección", "Calle y número de tu domicilio fiscal"],
      ["Ciudad", "Localidad"],
      ["Código postal", "C.P. de tu domicilio fiscal"],
      ["IBAN", "Cuenta bancaria para el cobro de comisiones (imprescindible)"],
    ]
  ),
  br(),
  h3("Cómo actualizar tus datos"),
  ...ol([
    "Haz clic en el campo que quieres modificar.",
    "Escribe el nuevo valor.",
    "Pulsa Guardar (o el botón de confirmación correspondiente).",
  ]),
  warn("Es imprescindible que el NIF y el IBAN estén siempre actualizados, ya que se utilizan para generar las autofacturas y las transferencias de comisiones."),
  br(),

  // ── 10. Preguntas frecuentes ──────────────────────────────────────────────
  h1("10.  Preguntas frecuentes"),
  br(),
  p(tb("¿Por qué no veo comisiones en el período actual?")),
  p(t("Las comisiones solo se calculan sobre facturas que Holded marca como cobradas (estado = Cobrado). Si tus facturas están pendientes o vencidas, no aparecerán en el cálculo hasta que se registre el cobro.")),
  br(),
  p(tb("¿Cuándo se actualiza la información del portal?")),
  p(t("Los datos se sincronizan con Holded automáticamente cada 4 horas. Si acabas de registrar un cobro y no aparece todavía, espera a la siguiente sincronización o contacta con Prospectia para forzar una actualización manual.")),
  br(),
  p(tb("¿Qué diferencia hay entre «Comisión liquidable» y «Facturas pendientes»?")),
  ...ul([
    "Comisión liquidable: comisión calculada sobre facturas ya cobradas. Es el importe que Prospectia te debe abonar por el período.",
    "Facturas pendientes: facturas emitidas que aún no se han cobrado. Generarán comisión cuando se cobren.",
  ]),
  br(),
  p(tb("¿Cómo sé si un cliente está dormido?")),
  p(t("Un cliente se considera dormido cuando lleva más de 30 días sin ninguna factura registrada en Holded. Aparece en la sección Clientes → Seguimiento CRM y en Actividad Clientes del dashboard.")),
  br(),
  p(tb("¿Los datos del CRM de clientes se guardan?")),
  p(t("Actualmente, los estados de seguimiento (tareas, notas, estado) se guardan durante la sesión activa del navegador. Si cierras o recargas la página, se restablecen. Próximamente se implementará persistencia permanente.")),
  br(),
  p(tb("¿Puedo descargar el PDF de liquidación?")),
  p(t("Sí. En el dashboard, dentro de la sección Comisiones liquidables, pulsa el botón Liquidación para descargar el PDF del período seleccionado.")),
  br(),
  p(tb("¿Qué es una autofactura?")),
  p(t("La autofactura es el documento fiscal que acredita el pago de tus comisiones. La genera el equipo de Prospectia y aparece en el apartado Autofacturas emitidas de tu ficha de delegado.")),
  br(),
  p(tb("No puedo acceder al portal.")),
  p(t("Comprueba que estás usando el correo y la contraseña correctos. Si el problema persiste, contacta con Prospectia en "), tb("lvila@prospectia.es", { color: RED }), t(".")),
  br(),

  // ── Footer note ───────────────────────────────────────────────────────────
  new Paragraph({
    children: [
      t("─────────────────────────────────────────────────────────────────────────────────", { color: BORDER }),
    ],
    spacing: { before: 480, after: 80 },
  }),
  new Paragraph({
    children: [t("Manual generado para Prospectia Overseas Consulting SL · B66560939 · Mayo 2026", { color: LGRAY, size: 18, italics: true })],
    alignment: AlignmentType.CENTER,
  }),
  new Paragraph({
    children: [t("Soporte técnico: lvila@prospectia.es  ·  dashboard.prospectia.es", { color: LGRAY, size: 18, italics: true })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 40 },
  }),
];

// ─── Build document ───────────────────────────────────────────────────────────
const doc = new Document({
  creator:  "Prospectia",
  title:    "Manual de Usuario — Delegados",
  subject:  "Prospectia Delegates Portal",
  keywords: "manual delegados prospectia portal",
  styles: {
    default: {
      document: {
        run: { font: "Calibri", size: 22, color: DARK },
      },
    },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        run: { font: "Calibri", bold: true, size: 36, color: RED },
        paragraph: { spacing: { before: 480, after: 160 } },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        run: { font: "Calibri", bold: true, size: 28, color: DARK },
        paragraph: { spacing: { before: 320, after: 120 } },
      },
      {
        id: "Heading3",
        name: "Heading 3",
        run: { font: "Calibri", bold: true, size: 24, color: RED },
        paragraph: { spacing: { before: 240, after: 80 } },
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          margin: {
            top:    convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left:   convertInchesToTwip(1.2),
            right:  convertInchesToTwip(1.2),
          },
        },
      },
      children: [...cover, ...content],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync("public/docs/MANUAL_DELEGADOS.docx", buffer);
console.log("✅ Manual generado: public/docs/MANUAL_DELEGADOS.docx");
