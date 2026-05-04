import Link from "next/link";

// ─── Shared components ─────────────────────────────────────────────────────────

function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return <section id={id} className="scroll-mt-6">{children}</section>;
}

function SectionHeader({ num, color, title, subtitle }: {
  num: string; color: string; title: string; subtitle: string;
}) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-white text-xl font-black shadow-sm ${color}`}>
        {num}
      </div>
      <div>
        <h2 className="text-xl font-bold text-[#0A0A0A] leading-tight">{title}</h2>
        <p className="text-sm text-[#6B7280] mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function InfoBox({ icon, title, body, color = "blue" }: {
  icon: React.ReactNode; title: string; body: string;
  color?: "blue" | "amber" | "green" | "red" | "purple" | "teal";
}) {
  const cls = {
    blue:   "bg-blue-50 border-blue-100 text-blue-900",
    amber:  "bg-amber-50 border-amber-100 text-amber-900",
    green:  "bg-emerald-50 border-emerald-100 text-emerald-900",
    red:    "bg-red-50 border-red-100 text-[#8E0E1A]",
    purple: "bg-purple-50 border-purple-100 text-purple-900",
    teal:   "bg-teal-50 border-teal-100 text-teal-900",
  }[color];
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <div className="flex items-start gap-3">
        <div className="text-2xl shrink-0 mt-0.5">{icon}</div>
        <div>
          <p className="text-sm font-bold">{title}</p>
          <p className="text-sm mt-0.5 opacity-80">{body}</p>
        </div>
      </div>
    </div>
  );
}

function StepRow({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-8 h-8 rounded-full bg-[#8E0E1A] text-white text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
        {n}
      </div>
      <div>
        <p className="text-sm font-semibold text-[#0A0A0A]">{title}</p>
        <p className="text-xs text-[#6B7280] mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function BadgePill({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${color}`}>
      {label}
    </span>
  );
}

function Divider() {
  return <div className="border-t border-[#F3F4F6] my-8" />;
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ManualPage() {
  const sections = [
    { id: "dashboard",  label: "Dashboard",        num: "01" },
    { id: "clientes",   label: "Clientes",          num: "02" },
    { id: "dormidos",   label: "Clientes dormidos", num: "03" },
    { id: "crm",        label: "CRM / Prospectos",  num: "04" },
    { id: "prospecto",  label: "Ficha prospecto",   num: "05" },
    { id: "calendario", label: "Calendario",        num: "06" },
    { id: "emails",     label: "Tracking emails",   num: "07" },
    { id: "perfil",     label: "Mi perfil",         num: "08" },
  ];

  return (
    <div className="max-w-screen-lg mx-auto px-6 py-8">

      {/* Hero */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#8E0E1A] flex items-center justify-center shadow-sm">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.8">
              <rect x="2" y="1" width="12" height="14" rx="2"/>
              <path d="M5 5h6M5 8h6M5 11h4" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#0A0A0A] tracking-tight">Manual del Delegado</h1>
            <p className="text-xs text-[#9CA3AF] font-medium mt-0.5">Portal Prospectia · v1 (en evolución)</p>
          </div>
        </div>
        <p className="text-sm text-[#6B7280] max-w-2xl mt-3">
          Guía completa de todas las secciones del portal. Úsala como referencia rápida o para
          aprender funcionalidades que todavía no conoces. Este manual crece con el producto.
        </p>

        {/* Nav pills */}
        <div className="flex flex-wrap gap-2 mt-5">
          {sections.map(s => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="px-3 py-1.5 rounded-lg bg-white border border-[#E5E7EB] text-xs font-semibold text-[#374151] hover:border-[#8E0E1A] hover:text-[#8E0E1A] transition-colors shadow-sm"
            >
              {s.num} {s.label}
            </a>
          ))}
        </div>
      </div>

      <div className="space-y-14">

        {/* ══════════════════════════════════════════════════════════ 01 DASHBOARD */}
        <Section id="dashboard">
          <SectionHeader num="01" color="bg-[#8E0E1A]" title="Dashboard" subtitle="Visión general de tu actividad comercial" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <p className="text-sm text-[#374151]">
                La primera pantalla que ves al entrar. Muestra un resumen del mes seleccionado:
                facturación, clientes activos/dormidos, prospectos y el rendimiento del período.
              </p>

              {/* KPI cards visual */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Facturación",    sub: "facturas emitidas",     color: "border-emerald-100 bg-emerald-50",  num: "€ 18.430", nc: "text-emerald-600" },
                  { label: "Clientes",       sub: "en tu cartera",         color: "border-blue-100 bg-blue-50",        num: "47",        nc: "text-blue-600" },
                  { label: "Dormidos",       sub: "sin compra > 30 días",  color: "border-amber-100 bg-amber-50",      num: "12",        nc: "text-amber-600" },
                  { label: "Prospectos",     sub: "activos en CRM",        color: "border-purple-100 bg-purple-50",    num: "8",         nc: "text-purple-600" },
                ].map(k => (
                  <div key={k.label} className={`rounded-xl border ${k.color} p-4 shadow-sm`}>
                    <p className={`text-2xl font-black tabular-nums ${k.nc}`}>{k.num}</p>
                    <p className="text-xs font-semibold text-[#374151] mt-1">{k.label}</p>
                    <p className="text-[10px] text-[#9CA3AF]">{k.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] mb-3">Selector de mes</p>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-9 rounded-lg border-2 border-[#8E0E1A]/30 bg-[#FFF5F5] flex items-center px-3">
                    <span className="text-sm font-semibold text-[#8E0E1A]">mayo 2026</span>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="#9CA3AF" strokeWidth="1.5"><rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M5 1v2M11 1v2M2 7h12" strokeLinecap="round"/></svg>
                </div>
                <p className="text-xs text-[#6B7280]">
                  Haz clic en el mes para abrir el selector nativo. Los datos de facturación y clientes nuevos
                  se recalculan para el período elegido.
                </p>
              </div>

              <InfoBox
                icon="💡"
                color="blue"
                title="Accesos directos"
                body="El Dashboard tiene botones de acceso rápido a Clientes, CRM (Prospectos), Calendario y Tracking de emails. Úsalos para navegar sin buscar en el menú."
              />
            </div>
          </div>
        </Section>

        <Divider />

        {/* ══════════════════════════════════════════════════════════ 02 CLIENTES */}
        <Section id="clientes">
          <SectionHeader num="02" color="bg-blue-600" title="Clientes" subtitle="Tu cartera completa sincronizada con Holded" />

          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <p className="text-sm text-[#374151]">
                  En <strong>Clientes</strong> ves todos los contactos que tienes asignados en Holded.
                  Los datos se sincronizan automáticamente: nombre, email, ciudad, facturas y pedidos.
                </p>

                <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#F3F4F6] bg-[#F9FAFB]">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">Resumen de actividad</p>
                  </div>
                  <div className="grid grid-cols-4 divide-x divide-[#F3F4F6]">
                    {[
                      { n: "47", l: "Total",    c: "text-[#0A0A0A]" },
                      { n: "35", l: "Activos",  c: "text-emerald-600" },
                      { n: "12", l: "Dormidos", c: "text-amber-600" },
                      { n: "5",  l: "Nuevos",   c: "text-blue-600" },
                    ].map(t => (
                      <div key={t.l} className="px-3 py-4 text-center">
                        <p className={`text-xl font-black tabular-nums ${t.c}`}>{t.n}</p>
                        <p className="text-[10px] text-[#9CA3AF] mt-1">{t.l}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4 space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">Filtros y búsqueda</p>
                  <div className="space-y-2">
                    {[
                      { icon: "🔍", text: "Buscar por nombre, email o ciudad" },
                      { icon: "🟢", text: "Filtrar: Activos / Dormidos / Nuevos este mes" },
                      { icon: "📊", text: "Barra de progreso: distribución activos vs dormidos" },
                    ].map((f, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm text-[#374151]">
                        <span className="text-base">{f.icon}</span>
                        <span>{f.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <InfoBox
                  icon="⚡"
                  color="amber"
                  title="Paginación por secciones"
                  body="La lista está dividida en tres secciones plegables: Nuevos, Activos y Dormidos. Cada sección muestra 20 clientes por página."
                />
              </div>
            </div>

            {/* Ficha cliente */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-[#F3F4F6] bg-[#F9FAFB]">
                <p className="text-sm font-semibold text-[#0A0A0A]">Ficha de cliente — ¿qué puedes ver y hacer?</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-[#F3F4F6]">
                {[
                  {
                    icon: "🏷️",
                    title: "Datos del contacto",
                    items: ["Nombre, email, teléfono", "Dirección y ciudad", "Tipo de contacto (cliente/proveedor)", "Etiquetas de Holded"],
                  },
                  {
                    icon: "💶",
                    title: "Resumen económico",
                    items: ["Nº de facturas", "Total facturado", "Total cobrado", "Importe pendiente"],
                  },
                  {
                    icon: "📋",
                    title: "Pedidos en curso",
                    items: ["Pedidos sin facturar", "Número de pedido", "Fecha e importe", "Estado del pedido"],
                  },
                  {
                    icon: "📄",
                    title: "Facturas",
                    items: ["Últimas 10 facturas", "Número, fecha, importe", "Estado: borrador / pendiente / cobrada", "Enlace a ficha de factura"],
                  },
                  {
                    icon: "🤝",
                    title: "Afiliado asignado",
                    items: ["Ver qué afiliado trajo al cliente", "Cambiar asignación", "Visible para delegados y propietario"],
                  },
                  {
                    icon: "🎯",
                    title: "CRM / Seguimiento",
                    items: ["Etapa del prospecto en el pipeline", "Últimas 5 actividades del CRM", "Cambiar etapa directamente", "Crear prospecto si no existe"],
                  },
                ].map(block => (
                  <div key={block.title} className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{block.icon}</span>
                      <p className="text-sm font-semibold text-[#374151]">{block.title}</p>
                    </div>
                    <ul className="space-y-1.5">
                      {block.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-[#6B7280]">
                          <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <InfoBox
              icon="🔗"
              color="teal"
              title="CRM vinculado a la ficha del cliente"
              body="Si el cliente tiene un prospecto CRM asociado, verás directamente en su ficha la etapa actual y las últimas actividades. Puedes cambiar la etapa sin salir de la ficha del cliente."
            />
          </div>
        </Section>

        <Divider />

        {/* ══════════════════════════════════════════════════════════ 03 DORMIDOS */}
        <Section id="dormidos">
          <SectionHeader num="03" color="bg-amber-500" title="Clientes dormidos y CRM de seguimiento" subtitle="La herramienta más importante para reactivar tu cartera" />

          <div className="space-y-6">

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                <p className="text-sm text-[#374151]">
                  Un cliente está <strong>dormido</strong> cuando lleva más de 30 días sin realizar ningún
                  pedido o factura. El portal detecta esto automáticamente y los agrupa en la sección
                  «Seguimiento — clientes dormidos» dentro de <strong>Clientes</strong>.
                </p>

                {/* Severity scale */}
                <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#F3F4F6] bg-[#F9FAFB]">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">Escala de alerta por tiempo sin actividad</p>
                  </div>
                  <div className="divide-y divide-[#F3F4F6]">
                    {[
                      { color: "bg-amber-400",  label: "30 – 60 días",  desc: "Prioridad media — sigue sin compra un mes",    tc: "text-amber-700",   bg: "bg-amber-50" },
                      { color: "bg-orange-400", label: "60 – 90 días",  desc: "Prioridad alta — más de 2 meses inactivo",    tc: "text-orange-700",  bg: "bg-orange-50" },
                      { color: "bg-[#8E0E1A]",  label: "Más de 90 días", desc: "Crítico — riesgo real de pérdida del cliente", tc: "text-[#8E0E1A]",   bg: "bg-red-50" },
                      { color: "bg-[#D1D5DB]",  label: "Sin actividad registrada", desc: "Nuevo o sin historial en el sistema", tc: "text-[#6B7280]", bg: "bg-[#F9FAFB]" },
                    ].map(s => (
                      <div key={s.label} className={`flex items-center gap-4 px-4 py-3 ${s.bg}`}>
                        <div className={`w-3 h-3 rounded-full shrink-0 ${s.color}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold ${s.tc}`}>{s.label}</p>
                          <p className="text-[11px] text-[#9CA3AF]">{s.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] mb-3">Estado CRM del seguimiento</p>
                  <div className="space-y-2">
                    {[
                      { dot: "bg-[#D1D5DB]",   label: "Sin contactar",  desc: "Aún no has iniciado contacto" },
                      { dot: "bg-blue-500",     label: "En seguimiento", desc: "Has tomado acciones de contacto" },
                      { dot: "bg-emerald-500",  label: "Reactivado",     desc: "Ha vuelto a comprar o responder" },
                    ].map(s => (
                      <div key={s.label} className="flex items-start gap-3">
                        <span className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${s.dot}`} />
                        <div>
                          <p className="text-xs font-semibold text-[#374151]">{s.label}</p>
                          <p className="text-[11px] text-[#9CA3AF]">{s.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <InfoBox
                  icon="💾"
                  color="green"
                  title="Guardado automático"
                  body="Todo lo que marcas (tareas, estado, notas) se guarda automáticamente en la nube. No hay botón de guardar — la próxima vez que abras el portal, todo estará igual."
                />
              </div>
            </div>

            {/* CRM card anatomy */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-[#F3F4F6] bg-[#F9FAFB]">
                <p className="text-sm font-semibold text-[#0A0A0A]">Tarjeta de cliente dormido — anatomía</p>
              </div>
              <div className="p-4">
                <div className="max-w-sm mx-auto rounded-xl border-2 border-[#E5E7EB] overflow-hidden shadow-sm">
                  {/* Color strip */}
                  <div className="h-1.5 bg-orange-400 w-full" />
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-bold text-[#0A0A0A]">Farmacia López</p>
                        <p className="text-xs text-[#6B7280]">Barcelona</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">73 días</span>
                    </div>
                    {/* Progress bar */}
                    <div>
                      <div className="flex gap-0.5 mb-1">
                        {[true, true, false, false, false, false, false, false, false, false].map((done, i) => (
                          <div key={i} className={`h-1.5 flex-1 rounded-full ${done ? "bg-emerald-500" : "bg-[#E5E7EB]"}`} />
                        ))}
                      </div>
                      <p className="text-[10px] text-[#9CA3AF]">2 / 9 tareas completadas</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-[11px] font-semibold text-blue-700">En seguimiento</span>
                      </div>
                      <button className="text-xs font-semibold text-white bg-[#8E0E1A] rounded-lg px-3 py-1.5">
                        Gestionar
                      </button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-center">
                  {[
                    { icon: "🔴", label: "Franja de color",    desc: "Indica urgencia: ámbar, naranja, rojo" },
                    { icon: "📊", label: "Barra de progreso",  desc: "Tareas completadas de las 9 disponibles" },
                    { icon: "🟢", label: "Estado",             desc: "Sin contactar / En seguimiento / Reactivado" },
                    { icon: "▶️",  label: "Botón Gestionar",   desc: "Abre el panel completo de CRM" },
                  ].map(t => (
                    <div key={t.label} className="bg-[#F9FAFB] rounded-lg p-3">
                      <div className="text-xl mb-1">{t.icon}</div>
                      <p className="text-xs font-semibold text-[#374151]">{t.label}</p>
                      <p className="text-[10px] text-[#9CA3AF] mt-0.5">{t.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal / Panel CRM */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-[#F3F4F6] bg-[#F9FAFB]">
                <p className="text-sm font-semibold text-[#0A0A0A]">Modal de seguimiento — cómo usarlo paso a paso</p>
              </div>
              <div className="p-5 space-y-5">

                <div className="space-y-3">
                  <StepRow n={1} title="Abre el panel" desc="Pulsa «Gestionar» en cualquier tarjeta de cliente dormido. Se abre un panel a pantalla completa." />
                  <StepRow n={2} title="Lee las Key Questions" desc="Antes de actuar, despliega las 6 preguntas clave. Te ayudan a preparar la conversación y recordar el historial del cliente." />
                  <StepRow n={3} title="Marca las tareas realizadas" desc="La sección «Tareas de seguimiento» tiene 9 acciones predefinidas + campo libre «Otros». Marca las que ya hayas hecho." />
                  <StepRow n={4} title="Actualiza el estado" desc="Cambia el estado según cómo esté la situación: Sin contactar → En seguimiento → Reactivado." />
                  <StepRow n={5} title="Escribe notas" desc="El campo «Notas de seguimiento» es libre. Anota el resultado de la llamada, compromisos, próximos pasos." />
                  <StepRow n={6} title="Vincula al CRM (opcional pero recomendado)" desc="Si el cliente tiene potencial, pulsa «Crear prospecto en CRM» para vincularlo al pipeline de ventas." />
                </div>

                {/* 9 tasks */}
                <div className="bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] mb-3">Las 9 tareas de seguimiento disponibles</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {[
                      "Llamar al cliente",
                      "Enviar WhatsApp / mensaje",
                      "Enviar email de seguimiento",
                      "Enviar muestra o catálogo",
                      "Proponer reunión o visita",
                      "Hacer visita presencial",
                      "Enviar propuesta de precio especial",
                      "Informar de novedades del catálogo",
                      "Solicitar feedback sobre últimos pedidos",
                    ].map((t, i) => (
                      <div key={i} className="flex items-center gap-2.5 bg-white rounded-lg border border-[#E5E7EB] px-3 py-2.5">
                        <span className="w-5 h-5 rounded border-2 border-[#8E0E1A]/40 flex-shrink-0" />
                        <span className="text-xs text-[#374151]">{t}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2.5 bg-white rounded-lg border border-[#E5E7EB] px-3 py-2.5">
                      <span className="w-5 h-5 rounded border-2 border-[#8E0E1A]/40 flex-shrink-0" />
                      <span className="text-xs text-[#374151] italic text-[#9CA3AF]">Otros (campo libre)</span>
                    </div>
                  </div>
                </div>

                {/* Key Questions */}
                <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">⚠️</span>
                    <p className="text-sm font-bold text-amber-900">Las 6 Key Questions — léelas antes de llamar</p>
                  </div>
                  <ol className="space-y-1.5">
                    {[
                      "¿Cuándo fue la última vez que este cliente realizó un pedido?",
                      "¿Qué productos ha comprado históricamente?",
                      "¿Ha habido incidencias o problemas en pedidos anteriores?",
                      "¿Tiene algún competidor activo en su zona?",
                      "¿Conoce las novedades recientes del catálogo?",
                      "¿Hay algún motivo externo que explique su inactividad (cierre temporal, cambio de proveedor…)?",
                    ].map((q, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-xs text-amber-800">{q}</p>
                      </li>
                    ))}
                  </ol>
                </div>

                <InfoBox
                  icon="🎯"
                  color="teal"
                  title="Tareas completadas → se registran en el Calendario CRM"
                  body="Cuando marcas una tarea Y el cliente ya tiene un prospecto CRM vinculado, la tarea se registra automáticamente como actividad en el Calendario. Así tienes el historial completo en un solo sitio."
                />

                <InfoBox
                  icon="➕"
                  color="purple"
                  title="Crear prospecto desde cliente dormido"
                  body="Desde el modal, si el cliente no tiene prospecto CRM, aparece el botón «Crear prospecto en CRM» (fondo ámbar). Al pulsarlo, se crea un prospecto en etapa «Nuevo» y queda vinculado. A partir de ese momento, las tareas que marques también se añaden al Calendario."
                />
              </div>
            </div>

            {/* CRM section dentro del modal — actividades */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-[#F3F4F6] bg-[#F9FAFB]">
                <p className="text-sm font-semibold text-[#0A0A0A]">Sección CRM dentro del panel de seguimiento</p>
              </div>
              <div className="p-5 space-y-3">
                <p className="text-sm text-[#374151]">
                  Si el cliente ya tiene un prospecto CRM vinculado, el panel muestra una sección «CRM»
                  con la etapa actual y las últimas 5 actividades registradas.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { icon: "📍", title: "Etapa actual",        desc: "La etapa del pipeline CRM para este cliente (p.ej. «Interesado», «Propuesta»)" },
                    { icon: "📅", title: "Últimas actividades", desc: "Feed de las 5 acciones más recientes: llamadas, emails, visitas, notas" },
                    { icon: "🔗", title: "Enlace al prospecto", desc: "Acceso directo a la ficha completa del prospecto CRM" },
                  ].map(i => (
                    <div key={i.title} className="bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] p-4">
                      <div className="text-2xl mb-2">{i.icon}</div>
                      <p className="text-sm font-semibold text-[#374151]">{i.title}</p>
                      <p className="text-xs text-[#6B7280] mt-1">{i.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </Section>

        <Divider />

        {/* ══════════════════════════════════════════════════════════ 04 CRM */}
        <Section id="crm">
          <SectionHeader num="04" color="bg-purple-600" title="CRM — Mis prospectos" subtitle="Pipeline de ventas para gestionar oportunidades" />

          <div className="space-y-6">

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <p className="text-sm text-[#374151]">
                  El CRM es tu pipeline de ventas. Aquí gestionas los contactos que aún no son clientes
                  pero que tienen potencial. Cada <strong>prospecto</strong> avanza por etapas hasta
                  convertirse en cliente (ganado) o descartarse (perdido).
                </p>
                <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] mb-3">Vistas disponibles</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-[#8E0E1A]/20 bg-[#FFF5F5]">
                      <span className="text-lg">📊</span>
                      <div>
                        <p className="text-sm font-semibold text-[#0A0A0A]">Vista Kanban</p>
                        <p className="text-xs text-[#6B7280]">Columnas por etapa, arrastrable. Visión global del pipeline.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-[#E5E7EB] bg-white">
                      <span className="text-lg">📋</span>
                      <div>
                        <p className="text-sm font-semibold text-[#0A0A0A]">Vista Lista</p>
                        <p className="text-xs text-[#6B7280]">Tabla con búsqueda, filtro por etapa y datos completos.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pipeline stages */}
              <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-[#F3F4F6] bg-[#F9FAFB]">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">Las 8 etapas del pipeline</p>
                </div>
                <div className="divide-y divide-[#F3F4F6]">
                  {[
                    { key: "nuevo",       label: "Nuevo",       dot: "bg-[#9CA3AF]",   desc: "Recién añadido, aún sin contacto" },
                    { key: "contactado",  label: "Contactado",  dot: "bg-blue-500",    desc: "Ya te has puesto en contacto" },
                    { key: "interesado",  label: "Interesado",  dot: "bg-purple-500",  desc: "Ha mostrado interés real" },
                    { key: "propuesta",   label: "Propuesta",   dot: "bg-amber-500",   desc: "Le has enviado una oferta o propuesta" },
                    { key: "negociacion", label: "Negociación", dot: "bg-orange-500",  desc: "Estáis negociando condiciones" },
                    { key: "ganado",      label: "Ganado",      dot: "bg-emerald-500", desc: "Ha cerrado — ya es cliente activo" },
                    { key: "seguimiento", label: "Seguimiento", dot: "bg-teal-500",    desc: "Cliente ganado bajo seguimiento continuo" },
                    { key: "perdido",     label: "Perdido",     dot: "bg-red-400",     desc: "No ha cerrado — oportunidad descartada" },
                  ].map(s => (
                    <div key={s.key} className="flex items-center gap-3 px-4 py-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.dot}`} />
                      <span className="text-xs font-semibold text-[#374151] w-24 shrink-0">{s.label}</span>
                      <span className="text-xs text-[#9CA3AF]">{s.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-[#F3F4F6] bg-[#F9FAFB]">
                <p className="text-sm font-semibold text-[#0A0A0A]">Qué puedes hacer en Prospectos</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-[#F3F4F6]">
                {[
                  {
                    icon: "➕", title: "Crear prospecto",
                    items: ["Botón «Nuevo prospecto»", "Nombre, email, teléfono", "Empresa y ciudad", "Etapa inicial y fuente"],
                  },
                  {
                    icon: "📥", title: "Importar CSV",
                    items: ["Carga masiva desde Excel", "Formato: nombre, email, empresa…", "Los duplicados se detectan", "Útil para migraciones"],
                  },
                  {
                    icon: "🔎", title: "Buscar y filtrar",
                    items: ["Búsqueda por nombre/empresa", "Filtrar por etapa", "Vista kanban o lista", "Ver solo tus prospectos"],
                  },
                  {
                    icon: "📊", title: "Métricas rápidas",
                    items: ["Total de prospectos", "Activos (no ganado/perdido)", "Ganados", "Convertidos a Holded"],
                  },
                ].map(b => (
                  <div key={b.title} className="p-4">
                    <div className="text-2xl mb-2">{b.icon}</div>
                    <p className="text-sm font-semibold text-[#374151] mb-2">{b.title}</p>
                    <ul className="space-y-1">
                      {b.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-[#6B7280]">
                          <span className="text-emerald-500 shrink-0 mt-0.5">✓</span>{item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </Section>

        <Divider />

        {/* ══════════════════════════════════════════════════════════ 05 PROSPECTO */}
        <Section id="prospecto">
          <SectionHeader num="05" color="bg-teal-600" title="Ficha de prospecto" subtitle="Todo el historial y las acciones de un contacto en un solo lugar" />

          <div className="space-y-6">

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <p className="text-sm text-[#374151]">
                  Al entrar en un prospecto ves su perfil completo: datos personales, la etapa actual
                  del pipeline, todas las actividades pasadas y los emails enviados con tracking.
                  Es la «hoja de vida» de la oportunidad comercial.
                </p>
                <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4 space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">Pestañas de la ficha</p>
                  {[
                    { tab: "Actividad",  desc: "Historial cronológico de todas las acciones realizadas" },
                    { tab: "Emails",     desc: "Emails enviados con estadísticas de apertura y clics" },
                    { tab: "Notas",      desc: "Notas internas sobre el prospecto" },
                  ].map(t => (
                    <div key={t.tab} className="flex items-start gap-3 p-3 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB]">
                      <span className="text-xs font-bold text-white bg-[#8E0E1A] px-2 py-0.5 rounded shrink-0">{t.tab}</span>
                      <p className="text-xs text-[#6B7280]">{t.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stage change visual */}
              <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4 space-y-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">Cambio de etapa</p>
                <p className="text-xs text-[#374151]">
                  El selector de etapa está siempre visible en la cabecera del prospecto.
                  Un solo clic cambia la etapa — no hay que guardar.
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { l: "Nuevo",       c: "bg-[#F9FAFB] text-[#6B7280] border-[#E5E7EB]" },
                    { l: "Contactado",  c: "bg-blue-50 text-blue-700 border-blue-200" },
                    { l: "Interesado",  c: "bg-purple-50 text-purple-700 border-purple-200" },
                    { l: "Propuesta",   c: "bg-amber-50 text-amber-700 border-amber-200" },
                    { l: "Negociación", c: "bg-orange-50 text-orange-700 border-orange-200" },
                    { l: "Ganado",      c: "bg-emerald-50 text-emerald-700 border-emerald-200 ring-2 ring-emerald-400" },
                    { l: "Seguimiento", c: "bg-teal-50 text-teal-700 border-teal-200" },
                    { l: "Perdido",     c: "bg-red-50 text-red-700 border-red-200" },
                  ].map(s => (
                    <BadgePill key={s.l} label={s.l} color={s.c} />
                  ))}
                </div>
                <InfoBox
                  icon="✅"
                  color="green"
                  title="Cambio inmediato"
                  body="El cambio de etapa se guarda instantáneamente. La página se actualiza para confirmar. Si hay un error de red, la etapa vuelve al estado anterior automáticamente."
                />
              </div>
            </div>

            {/* Actividad log */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-[#F3F4F6] bg-[#F9FAFB]">
                <p className="text-sm font-semibold text-[#0A0A0A]">Registrar una nueva actividad</p>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-sm text-[#374151]">
                  Desde la pestaña «Actividad» puedes añadir cualquier acción realizada con el prospecto.
                  Estas actividades quedan registradas en el Calendario también.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { icon: "📞", label: "Llamada",       color: "bg-blue-50 border-blue-100" },
                    { icon: "✉️",  label: "Email",         color: "bg-purple-50 border-purple-100" },
                    { icon: "🤝", label: "Reunión",        color: "bg-emerald-50 border-emerald-100" },
                    { icon: "📝", label: "Nota",           color: "bg-amber-50 border-amber-100" },
                    { icon: "📅", label: "Tarea",          color: "bg-teal-50 border-teal-100" },
                    { icon: "👋", label: "Visita",         color: "bg-orange-50 border-orange-100" },
                    { icon: "💬", label: "WhatsApp/SMS",   color: "bg-green-50 border-green-100" },
                    { icon: "📤", label: "Propuesta",      color: "bg-red-50 border-red-100" },
                  ].map(a => (
                    <div key={a.label} className={`rounded-xl border ${a.color} px-3 py-3 flex items-center gap-2`}>
                      <span className="text-xl">{a.icon}</span>
                      <span className="text-xs font-semibold text-[#374151]">{a.label}</span>
                    </div>
                  ))}
                </div>
                <InfoBox
                  icon="📅"
                  color="blue"
                  title="Las actividades aparecen en el Calendario"
                  body="Todo lo que registres aquí — una llamada, una reunión, una nota — queda también en el Calendario. Así tienes la agenda de tu trabajo comercial siempre actualizada."
                />
              </div>
            </div>

            {/* Convert to Holded */}
            <InfoBox
              icon="🏆"
              color="green"
              title="Convertir prospecto a cliente Holded"
              body="Cuando un prospecto cierra (etapa «Ganado»), puedes vincularlo a un contacto existente en Holded con el botón «Vincular a Holded». Esto une el historial CRM con los datos de facturación del cliente real."
            />

          </div>
        </Section>

        <Divider />

        {/* ══════════════════════════════════════════════════════════ 06 CALENDARIO */}
        <Section id="calendario">
          <SectionHeader num="06" color="bg-orange-500" title="Calendario" subtitle="Tu agenda de actividades comerciales" />

          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <p className="text-sm text-[#374151]">
                  El Calendario recoge todas las actividades que has registrado en los prospectos CRM:
                  llamadas hechas, emails enviados, reuniones, visitas, notas… También muestra las
                  tareas de seguimiento de clientes dormidos cuando están vinculadas a un prospecto.
                </p>
                <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4 space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">Filtros del calendario</p>
                  <div className="space-y-2">
                    {[
                      { icon: "✅", label: "Completadas",  desc: "Actividades ya realizadas" },
                      { icon: "⏳", label: "Pendientes",   desc: "Actividades programadas a futuro" },
                      { icon: "📋", label: "Por tipo",     desc: "Llamada, email, reunión, visita…" },
                    ].map(f => (
                      <div key={f.label} className="flex items-center gap-3 p-3 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB]">
                        <span className="text-base">{f.icon}</span>
                        <div>
                          <p className="text-xs font-semibold text-[#374151]">{f.label}</p>
                          <p className="text-[11px] text-[#9CA3AF]">{f.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <InfoBox
                  icon="🔄"
                  color="blue"
                  title="Sincronización automática"
                  body="No tienes que hacer nada: cada vez que registras una actividad en un prospecto, aparece automáticamente en el Calendario. El historial siempre está completo."
                />
                <InfoBox
                  icon="📌"
                  color="amber"
                  title="Actividades de tareas dormidos"
                  body="Cuando marcas una tarea en el panel de seguimiento de un cliente dormido (y ese cliente ya tiene prospecto CRM), la tarea se crea como actividad «completada» en el Calendario."
                />
                <InfoBox
                  icon="👁️"
                  color="purple"
                  title="Solo tus actividades"
                  body="El Calendario es personal: muestra solo las actividades de tus prospectos. El propietario puede ver actividades de todos los delegados."
                />
              </div>
            </div>
          </div>
        </Section>

        <Divider />

        {/* ══════════════════════════════════════════════════════════ 07 EMAILS */}
        <Section id="emails">
          <SectionHeader num="07" color="bg-indigo-600" title="Tracking de emails" subtitle="Sigue en tiempo real si tus emails se abren y si hacen clic" />

          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <p className="text-sm text-[#374151]">
                  Desde la ficha de cualquier prospecto (pestaña «Emails»), puedes enviar emails
                  usando plantillas predefinidas. El sistema registra automáticamente si el destinatario
                  abre el email, cuántas veces, y si hace clic en algún enlace.
                </p>
                <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#F3F4F6] bg-[#F9FAFB]">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">Datos que se rastrean</p>
                  </div>
                  <div className="divide-y divide-[#F3F4F6]">
                    {[
                      { icon: "📬", label: "Entregado",           desc: "El email llegó al buzón" },
                      { icon: "👁️",  label: "Aperturas",          desc: "Cuántas veces lo ha abierto y primera apertura" },
                      { icon: "🖱️", label: "Clics",              desc: "Si hizo clic en algún enlace del email" },
                      { icon: "❌", label: "Rebote (bounce)",     desc: "Si el email no pudo entregarse" },
                      { icon: "⚠️", label: "Spam (complaint)",   desc: "Si marcó el email como spam" },
                    ].map(d => (
                      <div key={d.label} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="text-base w-6 shrink-0">{d.icon}</span>
                        <span className="text-xs font-semibold text-[#374151] w-28 shrink-0">{d.label}</span>
                        <span className="text-xs text-[#9CA3AF]">{d.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] mb-3">Cómo enviar un email tracked</p>
                  <div className="space-y-3">
                    <StepRow n={1} title="Ve a la ficha del prospecto" desc="Entra en CRM → haz clic en el prospecto" />
                    <StepRow n={2} title="Pestaña «Emails»" desc="Cambia a la pestaña de emails en la cabecera" />
                    <StepRow n={3} title="Elige una plantilla" desc="Selecciona una de las plantillas predefinidas o escribe el tuyo" />
                    <StepRow n={4} title="Enviar" desc="El email sale desde tu dirección y queda registrado automáticamente" />
                  </div>
                </div>
                <InfoBox
                  icon="📊"
                  color="purple"
                  title="Vista global: Tracking emails"
                  body="La sección «Tracking emails» del menú muestra todos los emails enviados, con sus estadísticas consolidadas. Puedes ver de un vistazo cuáles han sido abiertos y cuáles no."
                />
              </div>
            </div>
          </div>
        </Section>

        <Divider />

        {/* ══════════════════════════════════════════════════════════ 08 PERFIL */}
        <Section id="perfil">
          <SectionHeader num="08" color="bg-[#374151]" title="Mi perfil" subtitle="Tus datos de delegado y configuración de cuenta" />

          <div className="space-y-4">
            <p className="text-sm text-[#374151]">
              En la sección <strong>Mi perfil</strong> puedes actualizar tus datos personales y de
              delegado. Algunos campos son públicos (visible para clientes), otros son internos.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  icon: "👤",
                  title: "Datos personales",
                  items: ["Nombre completo", "Email de contacto", "Teléfono"],
                  color: "border-[#E5E7EB]",
                },
                {
                  icon: "🏷️",
                  title: "Nombre de delegado",
                  items: ["Nombre comercial (visible a clientes)", "Aparece en tus prospectos y facturas"],
                  color: "border-blue-100 bg-blue-50/30",
                },
                {
                  icon: "🔒",
                  title: "Seguridad",
                  items: ["Cambiar contraseña", "Gestión de sesión", "Acceso con email/contraseña"],
                  color: "border-[#E5E7EB]",
                },
              ].map(b => (
                <div key={b.title} className={`bg-white rounded-xl border ${b.color} shadow-sm p-4`}>
                  <div className="text-2xl mb-2">{b.icon}</div>
                  <p className="text-sm font-semibold text-[#374151] mb-2">{b.title}</p>
                  <ul className="space-y-1">
                    {b.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-[#6B7280]">
                        <span className="text-emerald-500 shrink-0 mt-0.5">✓</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Divider />

        {/* Footer */}
        <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-6 py-5 text-center space-y-2">
          <p className="text-sm font-semibold text-[#374151]">¿Tienes dudas o encuentras algo que no funciona?</p>
          <p className="text-xs text-[#6B7280]">
            Este portal está en constante evolución. Contacta con el equipo de Prospectia para cualquier
            consulta o para solicitar nuevas funcionalidades.
          </p>
          <p className="text-[10px] text-[#9CA3AF] mt-2">
            Manual del Delegado · Versión 1.0 · Portal Prospectia
          </p>
        </div>

      </div>
    </div>
  );
}
