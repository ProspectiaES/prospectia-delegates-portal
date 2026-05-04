import Link from "next/link";

// ─── Shared mini-components ───────────────────────────────────────────────────

function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return <section id={id} className="scroll-mt-6">{children}</section>;
}

function SectionHeader({ num, color, title, subtitle }: {
  num: string; color: string; title: string; subtitle: string;
}) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white text-lg font-black ${color}`}>
        {num}
      </div>
      <div>
        <h2 className="text-xl font-bold text-[#0A0A0A] leading-tight">{title}</h2>
        <p className="text-sm text-[#6B7280]">{subtitle}</p>
      </div>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-[#E5E7EB] shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
      <span className="text-base shrink-0">💡</span>
      <span>{children}</span>
    </div>
  );
}

function StepArrow() {
  return (
    <div className="flex items-center justify-center text-[#D1D5DB] text-xl font-light shrink-0 px-1">→</div>
  );
}

function ActionBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${color}`}>
      {label}
    </span>
  );
}

// ─── Stage pill ───────────────────────────────────────────────────────────────

function StagePill({ label, color, dot }: { label: string; color: string; dot: string }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </div>
  );
}

// ─── Icon components ──────────────────────────────────────────────────────────

const IconClientes = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
    <circle cx="8" cy="6" r="3"/>
    <path d="M2 17c0-3.314 2.686-6 6-6s6 2.686 6 6" strokeLinecap="round"/>
    <path d="M15 7l1.5 1.5M17 5.5L15.5 7" strokeLinecap="round"/>
  </svg>
);

const IconCRM = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="2" y="4" width="4" height="13" rx="1"/>
    <rect x="8" y="8" width="4" height="9" rx="1"/>
    <rect x="14" y="2" width="4" height="15" rx="1"/>
  </svg>
);

const IconCalendar = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="2" y="4" width="16" height="14" rx="2"/>
    <path d="M6 2v3M14 2v3M2 9h16" strokeLinecap="round"/>
    <circle cx="7" cy="13" r="1" fill="currentColor"/>
    <circle cx="13" cy="13" r="1" fill="currentColor"/>
  </svg>
);

const IconEmail = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="2" y="5" width="16" height="12" rx="2"/>
    <path d="M2 7l8 5 8-5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconAfiliados = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
    <circle cx="10" cy="5" r="2.5"/>
    <circle cx="4" cy="14" r="2"/>
    <circle cx="16" cy="14" r="2"/>
    <path d="M10 7.5v2.5M10 10l-4 2M10 10l4 2" strokeLinecap="round"/>
  </svg>
);

const IconPerfil = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
    <circle cx="10" cy="7" r="4"/>
    <path d="M3 19c0-3.866 3.134-7 7-7s7 3.134 7 7" strokeLinecap="round"/>
  </svg>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ManualPage() {
  const sections = [
    { id: "clientes",  label: "Clientes",   Icon: IconClientes,  color: "text-blue-600"   },
    { id: "crm",       label: "Prospectos", Icon: IconCRM,       color: "text-purple-600" },
    { id: "calendario",label: "Calendario", Icon: IconCalendar,  color: "text-teal-600"   },
    { id: "emails",    label: "Emails",     Icon: IconEmail,     color: "text-orange-600" },
    { id: "afiliados", label: "Afiliados",  Icon: IconAfiliados, color: "text-emerald-600"},
  ];

  return (
    <div className="max-w-screen-lg mx-auto px-6 py-8 space-y-12">

      {/* ── Portada ────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#8E0E1A] via-[#7a0c16] to-[#5a0810] px-8 py-10 text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">🦉</span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-red-200">Prospectia</p>
              <h1 className="text-3xl font-black tracking-tight leading-tight">Manual de uso</h1>
              <p className="text-red-200 text-sm mt-0.5">Portal de Delegados</p>
            </div>
          </div>
          <p className="text-red-100 text-sm max-w-lg leading-relaxed">
            Todo lo que necesitas para gestionar tus clientes, hacer seguimiento de prospectos y potenciar tus ventas — en un solo lugar.
          </p>
          <div className="mt-5 flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 bg-white/10 text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/20">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Versión 1.0 · Primera versión, en evolución
            </span>
            <span className="text-xs text-red-200">Actualizado mayo 2026</span>
          </div>
        </div>
        {/* decorative */}
        <div className="absolute right-8 top-6 opacity-10 text-[120px] leading-none select-none pointer-events-none">📋</div>
      </div>

      {/* ── Índice ─────────────────────────────────────────────────────── */}
      <Card className="p-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9CA3AF] mb-4">Qué encontrarás aquí</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {sections.map(({ id, label, Icon, color }) => (
            <a key={id} href={`#${id}`}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[#F3F4F6] hover:border-[#8E0E1A]/30 hover:bg-[#FFF5F5] transition-all group">
              <span className={`${color} group-hover:scale-110 transition-transform`}><Icon /></span>
              <span className="text-xs font-semibold text-[#374151]">{label}</span>
            </a>
          ))}
        </div>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════
          1. CLIENTES
      ══════════════════════════════════════════════════════════════════ */}
      <Section id="clientes">
        <SectionHeader num="1" color="bg-blue-600" title="Tus Clientes" subtitle="Gestiona y activa a tus clientes asignados" />

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <Card className="p-5 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Cómo acceder</p>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-[#F3F4F6] px-3 py-1.5 rounded-lg text-xs font-medium text-[#374151]">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 8h12M8 2v12" strokeLinecap="round"/></svg>
                Menú lateral
              </div>
              <StepArrow />
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-semibold">
                Clientes
              </div>
            </div>
            <p className="text-xs text-[#6B7280]">Sólo ves los clientes que tienes asignados.</p>
          </Card>

          <Card className="p-5 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Búsqueda rápida</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-8 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg flex items-center px-3 gap-2">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#9CA3AF" strokeWidth="1.8"><circle cx="6.5" cy="6.5" r="4"/><path d="M11 11l3 3" strokeLinecap="round"/></svg>
                <span className="text-xs text-[#9CA3AF]">Nombre, email o código…</span>
              </div>
              <div className="h-8 px-3 bg-[#374151] text-white text-xs font-medium rounded-lg flex items-center">Filtrar</div>
            </div>
            <p className="text-xs text-[#6B7280]">Busca por nombre, email o código de cliente.</p>
          </Card>
        </div>

        {/* Clientes dormidos */}
        <Card className="p-5 mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF] mb-4">Estado de actividad</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Activo",    sub: "Factura <30 días",  color: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500", text: "text-emerald-700" },
              { label: "En riesgo", sub: "30–90 días sin compra", color: "bg-amber-50 border-amber-200",   dot: "bg-amber-500",   text: "text-amber-700"   },
              { label: "Dormido",   sub: "Más de 90 días",   color: "bg-red-50 border-red-200",     dot: "bg-red-400",     text: "text-[#8E0E1A]"  },
            ].map(s => (
              <div key={s.label} className={`rounded-xl border px-4 py-3 ${s.color}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  <span className={`text-sm font-bold ${s.text}`}>{s.label}</span>
                </div>
                <p className="text-[11px] text-[#6B7280]">{s.sub}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Ficha cliente */}
        <Card className="p-5 mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF] mb-4">Dentro de cada cliente encontrarás</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: "📄", label: "Facturas",      sub: "Historial completo de compras" },
              { icon: "📦", label: "Pedidos",        sub: "Estado de los pedidos activos" },
              { icon: "🎯", label: "CRM",            sub: "Pipeline y actividades" },
              { icon: "📎", label: "Datos",          sub: "Email, teléfono, ciudad" },
            ].map(item => (
              <div key={item.label} className="bg-[#F9FAFB] rounded-xl p-3 text-center space-y-1">
                <div className="text-2xl">{item.icon}</div>
                <p className="text-xs font-bold text-[#374151]">{item.label}</p>
                <p className="text-[10px] text-[#9CA3AF]">{item.sub}</p>
              </div>
            ))}
          </div>
        </Card>

        <Tip>Prioriza los clientes <strong>Dormidos</strong> — son los que más potencial de reactivación tienen. Abre su ficha y créales un prospecto en CRM con un clic.</Tip>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════
          2. CRM — PROSPECTOS
      ══════════════════════════════════════════════════════════════════ */}
      <Section id="crm">
        <SectionHeader num="2" color="bg-purple-600" title="CRM · Mis Prospectos" subtitle="Gestiona todo tu pipeline de ventas" />

        {/* Pipeline visual */}
        <Card className="p-5 mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF] mb-4">El pipeline de ventas — de izquierda a derecha</p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Nuevo",       color: "bg-[#F3F4F6] text-[#374151] border-[#D1D5DB]",       dot: "bg-[#9CA3AF]"   },
              { label: "Contactado",  color: "bg-blue-50 text-blue-700 border-blue-300",            dot: "bg-blue-500"    },
              { label: "Interesado",  color: "bg-purple-50 text-purple-700 border-purple-300",      dot: "bg-purple-500"  },
              { label: "Propuesta",   color: "bg-amber-50 text-amber-700 border-amber-300",         dot: "bg-amber-500"   },
              { label: "Negociación", color: "bg-orange-50 text-orange-700 border-orange-300",      dot: "bg-orange-500"  },
              { label: "Ganado",      color: "bg-emerald-50 text-emerald-700 border-emerald-400",   dot: "bg-emerald-500" },
              { label: "Seguimiento", color: "bg-teal-50 text-teal-700 border-teal-400",            dot: "bg-teal-500"    },
              { label: "Perdido",     color: "bg-red-50 text-[#8E0E1A] border-red-300",             dot: "bg-red-400"     },
            ].map((s, i, arr) => (
              <div key={s.label} className="flex items-center gap-2">
                <StagePill label={s.label} color={`border ${s.color}`} dot={s.dot} />
                {i < arr.length - 2 && <span className="text-[#D1D5DB] text-xs">›</span>}
                {i === arr.length - 2 && <span className="text-[#D1D5DB] text-xs mx-1">·</span>}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[#9CA3AF] mt-3">💡 <strong>Seguimiento</strong> = clientes Holded en mantenimiento activo. Mueve el prospecto de etapa con un clic en su ficha.</p>
        </Card>

        {/* Acciones principales */}
        <div className="grid sm:grid-cols-3 gap-4 mb-4">
          <Card className="p-5 space-y-3 border-l-4 border-l-[#8E0E1A]">
            <div className="text-2xl">➕</div>
            <p className="font-bold text-[#0A0A0A]">Nuevo prospecto</p>
            <p className="text-xs text-[#6B7280]">Rellena nombre, contacto, origen y etapa inicial. Lo añades a tu pipeline en segundos.</p>
            <div className="flex items-center gap-1 flex-wrap">
              <ActionBadge label="Nombre" color="bg-[#F3F4F6] text-[#374151]" />
              <ActionBadge label="Email / Teléfono" color="bg-[#F3F4F6] text-[#374151]" />
              <ActionBadge label="Empresa" color="bg-[#F3F4F6] text-[#374151]" />
            </div>
          </Card>

          <Card className="p-5 space-y-3 border-l-4 border-l-blue-500">
            <div className="text-2xl">📥</div>
            <p className="font-bold text-[#0A0A0A]">Importar desde Excel</p>
            <p className="text-xs text-[#6B7280]">¿Tienes una lista? Impórtala en masa desde un fichero Excel o CSV.</p>
            <div className="bg-blue-50 rounded-lg px-3 py-2 text-[11px] text-blue-700 font-medium">
              Botón "Importar CSV" en la cabecera de Prospectos
            </div>
          </Card>

          <Card className="p-5 space-y-3 border-l-4 border-l-emerald-500">
            <div className="text-2xl">🔗</div>
            <p className="font-bold text-[#0A0A0A]">Convertir a cliente</p>
            <p className="text-xs text-[#6B7280]">Cuando un prospecto firma, conviértelo a cliente Holded y pasa automáticamente a <span className="text-emerald-700 font-semibold">Ganado</span>.</p>
            <div className="bg-emerald-50 rounded-lg px-3 py-2 text-[11px] text-emerald-700 font-medium">
              Botón "Convertir a Holded" en la ficha
            </div>
          </Card>
        </div>

        {/* Ficha prospecto */}
        <Card className="p-5 mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF] mb-4">Dentro de cada prospecto</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: "🎯", label: "Etapa",       sub: "Cambia de fase con un clic" },
              { icon: "📋", label: "Actividades", sub: "Llamadas, reuniones, tareas" },
              { icon: "📝", label: "Notas",       sub: "Información relevante" },
              { icon: "📅", label: "Calendario",  sub: "Programa la próxima acción" },
            ].map(item => (
              <div key={item.label} className="bg-[#F9FAFB] rounded-xl p-3 text-center space-y-1">
                <div className="text-2xl">{item.icon}</div>
                <p className="text-xs font-bold text-[#374151]">{item.label}</p>
                <p className="text-[10px] text-[#9CA3AF]">{item.sub}</p>
              </div>
            ))}
          </div>
        </Card>

        <Tip>Usa la vista <strong>Kanban</strong> para ver todo tu pipeline de un vistazo, o la lista si quieres filtrar por etapa o buscar uno concreto.</Tip>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════
          3. CALENDARIO
      ══════════════════════════════════════════════════════════════════ */}
      <Section id="calendario">
        <SectionHeader num="3" color="bg-teal-600" title="Calendario de Actividades" subtitle="Organiza tu agenda de ventas" />

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <Card className="p-5 space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Tipos de actividad</p>
            <div className="space-y-2.5">
              {[
                { icon: "📞", type: "Llamada",          color: "bg-blue-50 text-blue-700" },
                { icon: "🤝", type: "Visita / Reunión", color: "bg-purple-50 text-purple-700" },
                { icon: "✉️", type: "Email",            color: "bg-amber-50 text-amber-700" },
                { icon: "✅", type: "Tarea",            color: "bg-emerald-50 text-emerald-700" },
                { icon: "📌", type: "Nota",             color: "bg-[#F3F4F6] text-[#374151]" },
              ].map(a => (
                <div key={a.type} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${a.color}`}>
                  <span>{a.icon}</span>
                  <span className="text-sm font-medium">{a.type}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Flujo de trabajo</p>
            <div className="space-y-3">
              {[
                { step: "1", text: "Crea la actividad desde la ficha del prospecto o desde el Calendario",      color: "bg-teal-600" },
                { step: "2", text: "Asigna fecha y hora — recibirás recordatorio automático",                    color: "bg-teal-600" },
                { step: "3", text: "Cuando la completes, márcala como hecha — quedará registrada en el historial", color: "bg-teal-600" },
              ].map(s => (
                <div key={s.step} className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${s.color}`}>
                    {s.step}
                  </div>
                  <p className="text-sm text-[#374151] pt-0.5">{s.text}</p>
                </div>
              ))}
            </div>
            <div className="bg-teal-50 border border-teal-200 rounded-lg px-3 py-2 text-xs text-teal-700">
              🔔 Recibirás notificaciones 24h y 1h antes de cada cita programada
            </div>
          </Card>
        </div>

        <Tip>Al <strong>convertir un prospecto a cliente Holded</strong>, el sistema crea automáticamente 3 actividades: llamada de bienvenida (mañana), seguimiento a 30 días y revisión trimestral.</Tip>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════
          4. TRACKING EMAILS
      ══════════════════════════════════════════════════════════════════ */}
      <Section id="emails">
        <SectionHeader num="4" color="bg-orange-500" title="Tracking de Emails" subtitle="Sabe quién ha leído tus mensajes" />

        <div className="grid sm:grid-cols-3 gap-4 mb-4">
          {[
            {
              icon: "👁️", label: "Abierto",
              desc: "El destinatario ha abierto el email",
              color: "bg-blue-50 border-blue-200",
              badge: "bg-blue-100 text-blue-700",
            },
            {
              icon: "🖱️", label: "Clic en enlace",
              desc: "Ha hecho clic en algún enlace del email",
              color: "bg-emerald-50 border-emerald-200",
              badge: "bg-emerald-100 text-emerald-700",
            },
            {
              icon: "📭", label: "Sin abrir",
              desc: "Aún no ha interactuado con el mensaje",
              color: "bg-[#F9FAFB] border-[#E5E7EB]",
              badge: "bg-[#F3F4F6] text-[#6B7280]",
            },
          ].map(s => (
            <Card key={s.label} className={`p-5 border ${s.color}`}>
              <div className="text-3xl mb-2">{s.icon}</div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.badge}`}>{s.label}</span>
              <p className="text-xs text-[#6B7280] mt-2">{s.desc}</p>
            </Card>
          ))}
        </div>

        <Card className="p-5 mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF] mb-3">Cómo usar el tracking</p>
          <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2 bg-[#F9FAFB] rounded-lg px-4 py-3 text-sm text-[#374151] min-w-[160px]">
              <span>📧</span> Envía email desde Plantillas
            </div>
            <StepArrow />
            <div className="flex items-center gap-2 bg-[#F9FAFB] rounded-lg px-4 py-3 text-sm text-[#374151] min-w-[160px]">
              <span>⏳</span> Espera la interacción
            </div>
            <StepArrow />
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm text-orange-700 min-w-[160px]">
              <span>📊</span> Consulta en Tracking Emails
            </div>
          </div>
        </Card>

        <Tip>Cuando veas que un prospecto ha abierto tu email, es el <strong>momento ideal para llamar</strong>. La actividad está fresca en su mente.</Tip>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════
          5. AFILIADOS
      ══════════════════════════════════════════════════════════════════ */}
      <Section id="afiliados">
        <SectionHeader num="5" color="bg-emerald-600" title="Afiliados" subtitle="Gestiona tu red de referencias" />

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <Card className="p-5 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">¿Qué es un afiliado?</p>
            <p className="text-sm text-[#374151]">
              Una persona o empresa que refiere clientes a Prospectia. Cada venta que genera tiene una comisión asociada que puedes consultar aquí.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Total generado", color: "bg-[#F3F4F6]" },
                { label: "Pendiente",      color: "bg-amber-50" },
                { label: "Por liquidar",   color: "bg-[#F3F4F6]" },
                { label: "Pagado",         color: "bg-emerald-50" },
              ].map(m => (
                <div key={m.label} className={`${m.color} rounded-lg px-3 py-2 text-xs font-medium text-[#374151]`}>
                  {m.label}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Dentro de cada afiliado verás</p>
            <div className="space-y-2">
              {[
                { icon: "📊", text: "Órdenes y comisiones generadas" },
                { icon: "💳", text: "Historial de pagos recibidos" },
                { icon: "👥", text: "Clientes que ha referido" },
                { icon: "🔗", text: "Su enlace de referido y código" },
              ].map(item => (
                <div key={item.text} className="flex items-center gap-2.5 text-sm text-[#374151]">
                  <span>{item.icon}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Tip>Accede a la ficha de cada afiliado para ver exactamente qué clientes ha referido y cuánto ha generado cada uno.</Tip>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════
          PERFIL
      ══════════════════════════════════════════════════════════════════ */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#374151] flex items-center justify-center shrink-0 text-white">
            <IconPerfil />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-[#0A0A0A] mb-1">Mi Perfil</h3>
            <p className="text-sm text-[#6B7280] mb-3">Mantén tus datos actualizados para que el equipo de Prospectia pueda contactarte correctamente.</p>
            <div className="flex flex-wrap gap-2">
              {["Nombre y apellidos", "Email de contacto", "Teléfono", "Ciudad", "IBAN (para liquidaciones)", "NIF"].map(f => (
                <span key={f} className="bg-[#F3F4F6] text-[#374151] text-xs font-medium px-2.5 py-1 rounded-full">{f}</span>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════
          RESUMEN RÁPIDO
      ══════════════════════════════════════════════════════════════════ */}
      <Card className="p-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF] mb-4">Resumen · Accesos directos del portal</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { href: "/dashboard/clientes",    emoji: "👥", label: "Mis Clientes",   sub: "Ver actividad e historial" },
            { href: "/dashboard/prospectos",  emoji: "🎯", label: "Mis Prospectos", sub: "Pipeline de ventas" },
            { href: "/dashboard/calendario",  emoji: "📅", label: "Calendario",     sub: "Actividades programadas" },
            { href: "/dashboard/emails",      emoji: "📊", label: "Tracking",       sub: "Aperturas y clics" },
            { href: "/dashboard/afiliados",   emoji: "🤝", label: "Afiliados",      sub: "Mi red de referencias" },
            { href: "/dashboard/perfil",      emoji: "👤", label: "Mi Perfil",      sub: "Mis datos personales" },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 p-3 rounded-xl border border-[#E5E7EB] hover:border-[#8E0E1A]/40 hover:bg-[#FFF5F5] transition-all group">
              <span className="text-xl">{item.emoji}</span>
              <div>
                <p className="text-sm font-semibold text-[#0A0A0A] group-hover:text-[#8E0E1A] transition-colors">{item.label}</p>
                <p className="text-[11px] text-[#9CA3AF]">{item.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </Card>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <div className="border-t border-[#F3F4F6] pt-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🦉</span>
          <div>
            <p className="text-xs font-bold text-[#0A0A0A]">Prospectia · Portal de Delegados</p>
            <p className="text-[11px] text-[#9CA3AF]">Versión 1.0 · Primera versión, el portal está en evolución continua</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs text-[#9CA3AF]">Nuevas funcionalidades próximamente</span>
        </div>
      </div>

    </div>
  );
}
