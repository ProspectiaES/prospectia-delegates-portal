"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { useWeather, wmoLookup } from "@/lib/weather";
import { NotificationBell, type NotificationItem } from "@/components/NotificationBell";

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconDashboard = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
    <rect x="1" y="1" width="6" height="6" rx="1.5" />
    <rect x="9" y="1" width="6" height="6" rx="1.5" />
    <rect x="1" y="9" width="6" height="6" rx="1.5" />
    <rect x="9" y="9" width="6" height="6" rx="1.5" />
  </svg>
);

const IconClientes = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <circle cx="8" cy="5.5" r="2.5" />
    <path d="M2 13c0-2.761 2.686-5 6-5s6 2.239 6 5" strokeLinecap="round" />
  </svg>
);

const IconFacturas = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <rect x="2.5" y="1.5" width="11" height="13" rx="1.5" />
    <path d="M5 5.5h6M5 8.5h6M5 11h3.5" strokeLinecap="round" />
  </svg>
);

const IconProductos = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <path d="M2 5l6-3 6 3v6l-6 3-6-3V5z" strokeLinejoin="round" />
    <path d="M8 2v13M2 5l6 3 6-3" strokeLinejoin="round" />
  </svg>
);

const IconAfiliados = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <circle cx="5" cy="5" r="2" />
    <circle cx="11" cy="5" r="2" />
    <circle cx="8" cy="12" r="2" />
    <path d="M5 7c0 1.657 1.343 3 3 3" strokeLinecap="round" />
    <path d="M11 7c0 1.657-1.343 3-3 3" strokeLinecap="round" />
  </svg>
);

const IconRecomendadores = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <circle cx="8" cy="4" r="2" />
    <path d="M4 13c0-2.209 1.791-4 4-4s4 1.791 4 4" strokeLinecap="round" />
    <path d="M12 6l1.5 1.5L16 5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconPedidos = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <path d="M2 3h12l-1.5 8H3.5L2 3z" strokeLinejoin="round" />
    <circle cx="6" cy="14" r="1" fill="currentColor" stroke="none" />
    <circle cx="11" cy="14" r="1" fill="currentColor" stroke="none" />
    <path d="M2 3L1 1H0" strokeLinecap="round" />
  </svg>
);

const IconPerfil = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <circle cx="8" cy="5.5" r="2.5" />
    <path d="M2 13c0-2.761 2.686-5 6-5s6 2.239 6 5" strokeLinecap="round" />
    <path d="M11 2l1 1 2-2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconDelegados = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <circle cx="8" cy="4.5" r="2" />
    <path d="M3.5 13c0-2.485 2.015-4.5 4.5-4.5s4.5 2.015 4.5 4.5" strokeLinecap="round" />
    <circle cx="2.5" cy="6" r="1.5" />
    <circle cx="13.5" cy="6" r="1.5" />
    <path d="M0.5 13c0-1.657.895-3 2-3" strokeLinecap="round" />
    <path d="M15.5 13c0-1.657-.895-3-2-3" strokeLinecap="round" />
  </svg>
);

const IconLogout = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <path d="M10.5 11l3-3-3-3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M13.5 8H6" strokeLinecap="round" />
    <path d="M6 2H3.5A1.5 1.5 0 002 3.5v9A1.5 1.5 0 003.5 14H6" strokeLinecap="round" />
  </svg>
);

const IconAdmin = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <path d="M8 1l1.8 3.6L14 5.6l-3 2.9.7 4.1L8 10.5l-3.7 2.1.7-4.1-3-2.9 4.2-.6z" strokeLinejoin="round"/>
  </svg>
);

const IconManual = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <rect x="3" y="1" width="10" height="14" rx="1.5"/>
    <path d="M6 5h4M6 8h4M6 11h2" strokeLinecap="round"/>
  </svg>
);


const IconAutofacturas = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <rect x="2" y="2" width="12" height="12" rx="1.5"/>
    <path d="M5 5.5h6M5 8h6M5 10.5h3" strokeLinecap="round"/>
  </svg>
);

const IconComissions = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <circle cx="8" cy="8" r="6"/>
    <path d="M8 5v1.5m0 3V11m-1.5-5.5h2.25a1.25 1.25 0 010 2.5H7.5a1.25 1.25 0 010 2.5H10" strokeLinecap="round"/>
  </svg>
);

const IconPressupost = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <rect x="1.5" y="2.5" width="13" height="11" rx="1.5"/>
    <path d="M5 6h2M5 9h6M5 12h4" strokeLinecap="round"/>
    <path d="M10 5l1.5 1.5L13 4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconRemeses = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <rect x="1" y="3" width="14" height="10" rx="1.5"/>
    <path d="M1 6h14" strokeLinecap="round"/>
    <path d="M5 10h3M10 10h1" strokeLinecap="round"/>
  </svg>
);

const IconRendimiento = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <polyline points="1,12 5,7 8,9 12,4 15,6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 4h3v3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconAnalitica = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v7a2.5 2.5 0 0 1-5 0v-7A2.5 2.5 0 0 1 9.5 2Z" strokeLinejoin="round"/>
    <path d="M4.5 8A1.5 1.5 0 0 1 6 9.5v2A1.5 1.5 0 0 1 3 11.5v-2A1.5 1.5 0 0 1 4.5 8Z" strokeLinejoin="round"/>
    <path d="M0.5 14.5h15" strokeLinecap="round"/>
  </svg>
);

const IconCRM = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <path d="M1 12.5C1 10.567 2.567 9 4.5 9h7C13.433 9 15 10.567 15 12.5v0" strokeLinecap="round"/>
    <circle cx="8" cy="4.5" r="2.5"/>
    <path d="M11 7.5l1.5 1.5M13 6l-1.5 1.5" strokeLinecap="round"/>
  </svg>
);

const IconCalendario = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <rect x="1.5" y="2.5" width="13" height="12" rx="1.5"/>
    <path d="M1.5 6.5h13M5 1.5v2M11 1.5v2" strokeLinecap="round"/>
    <rect x="4" y="9" width="2" height="2" rx="0.5" fill="currentColor" stroke="none"/>
    <rect x="7" y="9" width="2" height="2" rx="0.5" fill="currentColor" stroke="none"/>
    <rect x="10" y="9" width="2" height="2" rx="0.5" fill="currentColor" stroke="none"/>
  </svg>
);

const IconTemplates = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <rect x="2" y="2" width="12" height="12" rx="1.5"/>
    <path d="M5 6h6M5 9h4" strokeLinecap="round"/>
  </svg>
);

const IconEmails = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <rect x="1.5" y="3.5" width="13" height="9" rx="1.5"/>
    <path d="M1.5 5.5l6.5 4.5 6.5-4.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconBruixola = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <circle cx="8" cy="8" r="6.5"/>
    <path d="M8 3v2M8 11v2M3 8h2M11 8h2" strokeLinecap="round"/>
    <path d="M8 8l-2-3 5 1-3 2z" fill="currentColor" strokeWidth="0.5"/>
  </svg>
);

const IconTasques = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <rect x="1.5" y="3" width="3" height="10" rx="1"/>
    <rect x="6.5" y="1.5" width="3" height="11.5" rx="1"/>
    <rect x="11.5" y="5" width="3" height="8" rx="1"/>
  </svg>
);

// ─── Role config ──────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
  OWNER:        "Owner",
  KOL:          "KOL",
  COORDINATOR:  "Coordinador",
  ADMIN:        "Admin",
  DELEGATE:     "Delegado",
  COM6:         "Comisión 6",
  CLIENT:       "Cliente",
  CONSIGLIERE:  "Consigliere",
};

const ROLE_COLOR: Record<string, string> = {
  OWNER:        "bg-[#FEF2F2] text-[#8E0E1A]",
  KOL:          "bg-purple-50 text-purple-700",
  COORDINATOR:  "bg-blue-50 text-blue-700",
  ADMIN:        "bg-amber-50 text-amber-700",
  DELEGATE:     "bg-emerald-50 text-emerald-700",
  COM6:         "bg-[#F3F4F6] text-[#6B7280]",
  CLIENT:       "bg-[#F3F4F6] text-[#6B7280]",
  CONSIGLIERE:  "bg-slate-100 text-slate-700",
};

export type UserProps = {
  id: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
  created_at: string;
  member_since?: string | null;
  is_kol?: boolean;
  is_coordinator?: boolean;
} | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function antigüedad(createdAt: string): string {
  const d     = new Date(createdAt);
  const now   = new Date();
  const months =
    (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (months < 1)  return "Nuevo";
  if (months < 12) return `${months} mes${months !== 1 ? "es" : ""}`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m === 0 ? `${y} año${y !== 1 ? "s" : ""}` : `${y}a ${m}m`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function greeting(name: string, hour: number) {
  const first = name?.split(" ")[0] ?? "";
  if (hour >= 6  && hour < 12) return { saludo: "Buenos días",   nombre: first };
  if (hour >= 12 && hour < 21) return { saludo: "Buenas tardes", nombre: first };
  return                              { saludo: "Buenas noches",  nombre: first };
}

// ─── Identity panel ───────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    });
  }
  return (
    <button
      onClick={copy}
      title="Copiar ID"
      className="ml-1 shrink-0 p-0.5 rounded text-[#9CA3AF] hover:text-[#8E0E1A] transition-colors"
    >
      {done ? (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="4" y="1" width="7" height="8" rx="1" />
          <rect x="1" y="3" width="7" height="8" rx="1" />
        </svg>
      )}
    </button>
  );
}

// ─── Identity card — always visible, no collapse ──────────────────────────────
// Design: cockpit HUD. Clock as the hero. Weather + identity + ID always present.

function IdentityCard({ user }: { user: NonNullable<UserProps> }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const { weather } = useWeather();
  const weatherInfo  = weather ? wmoLookup(weather.code) : null;

  const hhmm   = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  const ss     = String(now.getSeconds()).padStart(2, "0");
  const dateStr = now.toLocaleDateString("es-ES", {
    weekday: "short", day: "numeric", month: "short",
  });

  const divider = <div className="h-px bg-[#F0F0F0] mx-3" />;

  return (
    <div className="mx-2 my-2 rounded-2xl border border-[#EBEBEB] bg-white shadow-sm overflow-hidden shrink-0">

      {/* User */}
      <Link href="/dashboard/perfil" className="flex items-center gap-2.5 px-3 pt-3 pb-2.5 group">
        <div className="relative shrink-0">
          {user.avatar_url ? (
            <Image src={user.avatar_url} alt={user.full_name} width={32} height={32}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-sm" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#8E0E1A] flex items-center justify-center shadow-sm">
              <span className="text-[12px] font-bold text-white">{user.full_name?.charAt(0) ?? "?"}</span>
            </div>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold text-[#111827] truncate leading-tight group-hover:text-[#8E0E1A] transition-colors">
            {user.full_name}
          </p>
          <span className={[
            "inline-flex items-center px-1.5 py-0 rounded-full text-[9px] font-bold leading-[14px] mt-0.5",
            ROLE_COLOR[user.role] ?? "bg-[#F3F4F6] text-[#6B7280]",
          ].join(" ")}>
            {ROLE_LABEL[user.role] ?? user.role}
          </span>
        </div>
      </Link>

      {divider}

      {/* Clock */}
      <div className="px-3 py-3 text-center select-none">
        <div className="flex items-baseline justify-center">
          <span className="text-[30px] font-bold tabular-nums tracking-tight text-[#111827] leading-none">{hhmm}</span>
          <span className="text-[13px] font-medium tabular-nums text-[#9CA3AF] leading-none ml-0.5">:{ss}</span>
        </div>
        <p className="text-[10px] text-[#6B7280] mt-1.5 capitalize">{dateStr}</p>
      </div>

      {/* Weather */}
      {weather && weatherInfo && (
        <>
          {divider}
          <div className="px-3 py-2 flex items-center gap-1.5 text-[10px]">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#9CA3AF" strokeWidth="1.4">
              <path d="M9 7a3 3 0 10-5.83 1H3a2 2 0 000 4h6a2 2 0 100-4h-.17z" />
            </svg>
            <span className="font-semibold text-[#374151]">{weather.temp}°</span>
            {weather.city && <span className="text-[#9CA3AF]">{weather.city}</span>}
            <span className="text-[#9CA3AF] flex-1">{weatherInfo.label}</span>
          </div>
        </>
      )}

      {divider}

      {/* Antiguitat + ID */}
      <div className="px-3 py-2 flex items-center gap-2">
        <div className="shrink-0">
          <p className="text-[8px] font-semibold text-[#C4ABA8] uppercase tracking-widest mb-0.5">Antigüedad</p>
          <p className="text-[10px] font-semibold text-[#8C7070]">{antigüedad(user.member_since ?? user.created_at)}</p>
        </div>
        <div className="flex-1 min-w-0 border-l border-[#EDD5D5]/70 pl-2">
          <p className="text-[8px] font-semibold text-[#C4ABA8] uppercase tracking-widest mb-0.5">ID</p>
          <div className="flex items-center gap-1">
            <p className="text-[9px] font-mono text-[#9C8686] truncate leading-none flex-1">{user.id}</p>
            <CopyButton text={user.id} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Navigation tree ──────────────────────────────────────────────────────────

function buildSections(role: string, userId: string, isKol = false, isCoordinator = false) {
  const isDelegate    = role === "DELEGATE";
  const isOwner       = role === "OWNER";
  const isConsigliere = role === "CONSIGLIERE";
  const isAnyDelegate = isDelegate || isKol || isCoordinator || role === "KOL" || role === "COORDINATOR";

  return [
    // ── Principal ──────────────────────────────────────────────────────────
    {
      label: "",
      items: [
        {
          href:  (isDelegate && !isKol && !isCoordinator) ? `/dashboard/delegados/${userId}` : "/dashboard",
          label: "Dashboard",
          Icon:  IconDashboard,
          exact: !(isDelegate && !isKol && !isCoordinator),
          startsWith: (isDelegate && !isKol && !isCoordinator) ? `/dashboard/delegados/${userId}` : undefined,
        },
        ...(isAnyDelegate && (isKol || isCoordinator || role === "KOL" || role === "COORDINATOR") ? [{
          href: `/dashboard/delegados/${userId}`, label: "Mi cartera",
          Icon: IconClientes, exact: false, startsWith: `/dashboard/delegados/${userId}`,
        }] : []),
      ],
    },

    // ── Cuadro de Mando (2ª posició — OWNER/CONSIGLIERE) ──────────────────
    ...((isOwner || isConsigliere) ? [{
      label: "Cuadro de Mando",
      dot: "bg-indigo-400", iconColor: "text-indigo-500",
      labelColor: "text-indigo-500",
      activeClasses: "bg-indigo-50 text-indigo-700", activeBar: "bg-indigo-500",
      items: [
        { href: "/dashboard/bruixola",               label: "Cuadro de Mando", Icon: IconBruixola, exact: true  },
        { href: "/dashboard/bruixola/internacional", label: "· Internacional",  Icon: IconBruixola, exact: false },
      ],
    }] : []),

    // ── Clientes & Ventas ──────────────────────────────────────────────────
    {
      label: "Clientes & Ventas",
      dot: "bg-blue-400", iconColor: "text-blue-500",
      labelColor: "text-blue-500",
      activeClasses: "bg-blue-50 text-blue-700", activeBar: "bg-blue-500",
      items: [
        { href: "/dashboard/clientes", label: "Clientes", Icon: IconClientes, exact: false },
        { href: "/dashboard/facturas", label: "Facturas", Icon: IconFacturas, exact: false },
        { href: "/dashboard/pedidos",  label: "Pedidos",  Icon: IconPedidos,  exact: false },
      ],
    },

    // ── Delegados ──────────────────────────────────────────────────────────
    ...(!isDelegate || isKol || isCoordinator ? [{
      label: "Delegados",
      dot: "bg-violet-400", iconColor: "text-violet-500",
      labelColor: "text-violet-500",
      activeClasses: "bg-violet-50 text-violet-700", activeBar: "bg-violet-500",
      items: [
        { href: "/dashboard/delegados",                label: "Delegados",  Icon: IconDelegados,  exact: false },
        ...(isOwner ? [
          { href: "/dashboard/performance/comisiones", label: "Comisiones", Icon: IconComissions, exact: false },
        ] : []),
      ],
    }] : []),

    // ── CRM & Equipo ───────────────────────────────────────────────────────
    {
      label: "CRM & Equipo",
      dot: "bg-teal-400", iconColor: "text-teal-500",
      labelColor: "text-teal-600",
      activeClasses: "bg-teal-50 text-teal-700", activeBar: "bg-teal-500",
      items: [
        { href: "/dashboard/prospectos", label: "Prospectos",      Icon: IconCRM,        exact: false },
        { href: "/dashboard/calendario", label: "Calendario",      Icon: IconCalendario, exact: false },
        { href: "/dashboard/tareas",     label: "Tareas",          Icon: IconTasques,    exact: false },
        ...(isOwner ? [{ href: "/dashboard/plantillas", label: "Plantillas email", Icon: IconTemplates, exact: false }] : []),
      ],
    },

    // ── Afiliados ──────────────────────────────────────────────────────────
    {
      label: "Afiliados",
      dot: "bg-amber-400", iconColor: "text-amber-500",
      labelColor: "text-amber-600",
      activeClasses: "bg-amber-50 text-amber-700", activeBar: "bg-amber-500",
      items: [
        { href: "/dashboard/afiliados",       label: "Afiliados",       Icon: IconAfiliados,       exact: false },
        ...(isOwner ? [{ href: "/dashboard/recomendadores", label: "Recomendadores", Icon: IconRecomendadores, exact: false }] : []),
      ],
    },

    // ── Finanzas ───────────────────────────────────────────────────────────
    // Nota: Rendimiento + Rentabilidad pendents de fusionar amb Performance
    ...((isOwner || isConsigliere) ? [{
      label: "Finanzas",
      dot: "bg-emerald-400", iconColor: "text-emerald-500",
      labelColor: "text-emerald-600",
      activeClasses: "bg-emerald-50 text-emerald-700", activeBar: "bg-emerald-500",
      items: [
        { href: "/dashboard/pressupost",              label: "Presupuesto",      Icon: IconPressupost,  exact: false },
        { href: "/dashboard/bruixola/rendiment",      label: "Rendimiento",      Icon: IconBruixola,    exact: false },
      ],
    }] : []),

    // ── Administración ─────────────────────────────────────────────────────
    ...(isOwner ? [{
      label: "Administración",
      dot: "bg-rose-400", iconColor: "text-rose-500",
      labelColor: "text-rose-500",
      activeClasses: "bg-rose-50 text-rose-700", activeBar: "bg-rose-500",
      items: [
        { href: "/dashboard/productos",             label: "Productos",        Icon: IconProductos,    exact: false },
        { href: "/dashboard/remeses",               label: "Remesas SEPA",     Icon: IconRemeses,      exact: false },
        { href: "/dashboard/performance/pedidos",   label: "Pedidos delegados",Icon: IconPedidos,      exact: false },
        { href: "/dashboard/autofacturas",          label: "Autofacturas",     Icon: IconAutofacturas, exact: false },
      ],
    }] : []),

    // ── Bloque Técnico ─────────────────────────────────────────────────────
    ...(isOwner || isKol || isCoordinator || role === "KOL" || role === "COORDINATOR" ? [{
      label: "Bloque Técnico",
      dot: "bg-gray-400", iconColor: "text-gray-500",
      labelColor: "text-gray-500",
      activeClasses: "bg-gray-100 text-gray-700", activeBar: "bg-gray-500",
      items: [
        { href: "/dashboard/admin/asignaciones", label: "Asignaciones", Icon: IconDelegados, exact: false },
        ...(isOwner ? [{ href: "/dashboard/admin", label: "Auditoría", Icon: IconAdmin, exact: true }] : []),
      ],
    }] : []),

    // ── Cuenta ─────────────────────────────────────────────────────────────
    {
      label: "Cuenta",
      dot: "bg-slate-300", iconColor: "text-slate-400",
      labelColor: "text-slate-400",
      activeClasses: "bg-[#FEF2F2] text-[#8E0E1A]", activeBar: "bg-[#8E0E1A]",
      items: [
        { href: "/dashboard/perfil", label: "Mi perfil",     Icon: IconPerfil, exact: false },
        { href: "/dashboard/manual", label: "Manual de uso", Icon: IconManual, exact: false },
      ],
    },
  ];
}

// ─── Tooltip button ───────────────────────────────────────────────────────────

function TooltipButton({
  label, title, icon, badge, onClick,
}: {
  label: string;
  title: string;
  icon: React.ReactNode;
  badge: number | null;
  onClick: () => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      <button
        onClick={onClick}
        aria-label={title}
        className="relative p-1.5 rounded-md text-[#8E0E1A] bg-transparent hover:bg-[#FEF2F2] transition-colors"
      >
        {icon}
        {badge != null && badge > 0 && (
          <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-[#8E0E1A] border border-white" />
        )}
      </button>
      {visible && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 pointer-events-none">
          <div className="bg-[#0A0A0A] text-white text-[10px] font-semibold px-2 py-1 rounded-md whitespace-nowrap shadow-lg">
            {label}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-1 overflow-hidden">
              <div className="w-2 h-2 bg-[#0A0A0A] rotate-45 translate-y-0.5 mx-auto" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Compact AI strip (Próspero + Analytics + Mensajería) ────────────────────

function AIStrip({ initialUnread = 0 }: { initialUnread?: number }) {
  const [unread, setUnread] = useState(initialUnread);

  useEffect(() => {
    function handler(e: Event) {
      setUnread((e as CustomEvent<number>).detail ?? 0);
    }
    document.addEventListener("chat-unread", handler);
    return () => document.removeEventListener("chat-unread", handler);
  }, []);

  const btns = [
    {
      label: "Próspero",
      title: "Próspero · Asistente IA",
      event: "open-prospero",
      icon: (
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M8 1.5C4.41 1.5 1.5 4.41 1.5 8c0 1.16.3 2.25.82 3.19L1.5 14.5l3.31-.82A6.5 6.5 0 1 0 8 1.5z" strokeLinejoin="round"/>
          <circle cx="5.5" cy="8" r="0.85" fill="currentColor" stroke="none"/>
          <circle cx="8" cy="8" r="0.85" fill="currentColor" stroke="none"/>
          <circle cx="10.5" cy="8" r="0.85" fill="currentColor" stroke="none"/>
        </svg>
      ),
      badge: null as number | null,
    },
    {
      label: "Analytics",
      title: "Próspero Analytics · Inteligencia financiera",
      event: "open-prospero-analitic",
      icon: (
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M2 13L6 8l3 3 3-4 2-2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 2v12h12" strokeLinecap="round"/>
        </svg>
      ),
      badge: null as number | null,
    },
    {
      label: "Mensajería",
      title: "Mensajería instantánea",
      event: "open-mensajeria",
      icon: (
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M14 2H2a1 1 0 00-1 1v8a1 1 0 001 1h2v2.5L7 12h7a1 1 0 001-1V3a1 1 0 00-1-1z" strokeLinejoin="round"/>
        </svg>
      ),
      badge: unread || null,
    },
  ];

  return (
    <>
      {btns.map((btn) => (
        <TooltipButton
          key={btn.label}
          label={btn.label}
          title={btn.title}
          badge={btn.badge}
          icon={btn.icon}
          onClick={() => document.dispatchEvent(new CustomEvent(btn.event))}
        />
      ))}
    </>
  );
}


export function Sidebar({ user, drawer = false, onClose, notifications = [], initialUnread = 0 }: {
  user?: UserProps;
  drawer?: boolean;
  onClose?: () => void;
  notifications?: NotificationItem[];
  initialUnread?: number;
}) {
  const pathname = usePathname();

  const sections = user
    ? buildSections(user.role, user.id, user.is_kol ?? false, user.is_coordinator ?? false)
    : buildSections("", "");

  const asideClass = drawer
    ? "fixed inset-y-0 left-0 w-64 z-50 flex flex-col bg-white border-r border-[#E5E7EB] shadow-2xl"
    : "sidebar-desktop w-56 h-full flex-col bg-white border-r border-[#E5E7EB] shrink-0";

  return (
    <>
      {drawer && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} aria-hidden />
      )}

      <aside className={asideClass}>

        {/* Brand + AI icon buttons */}
        <div className="h-12 flex items-center justify-between px-3 border-b border-[#E5E7EB] shrink-0">
          <div className="flex items-center gap-2">
            <Image src="/OwlICO.png" alt="Prospectia" width={22} height={22} className="w-[22px] h-[22px] shrink-0 object-contain" />
            <div>
              <p className="text-[11px] font-bold text-[#0A0A0A] tracking-widest leading-none uppercase">Prospectia</p>
              <p className="text-[9px] text-[#9CA3AF] leading-none mt-0.5 tracking-wide">Delegates Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <AIStrip initialUnread={initialUnread} />
            <NotificationBell initialNotifications={notifications} />
          </div>
          {drawer && (
            <button onClick={onClose} aria-label="Cerrar menú"
              className="p-1.5 rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] transition-colors">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M2 2l10 10M12 2L2 12" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* Identity card — always visible cockpit HUD */}
        {user && <IdentityCard user={user} />}

        {/* Navigation — scrollable */}
        <nav className="flex-1 py-2 px-2 overflow-y-auto min-h-0 space-y-0.5" aria-label="Navegación principal">
          {sections.map(({ label, items, ...sectionRest }) => {
            type SR = { dot?: string; iconColor?: string; labelColor?: string; activeClasses?: string; activeBar?: string };
            const sr = sectionRest as SR;
            const dot          = sr.dot;
            const iconColor    = sr.iconColor    ?? "text-[#9CA3AF]";
            const labelColor   = sr.labelColor   ?? "text-[#8A8F9A]";
            const activeClasses = sr.activeClasses ?? "bg-[#FEF2F2] text-[#8E0E1A]";
            const activeBar    = sr.activeBar    ?? "bg-[#8E0E1A]";

            if (items.length === 0) return null;
            return (
              <div key={label || "_root"} className={label ? "pt-3 first:pt-1" : ""}>
                {label && (
                  <div className="px-3 mb-1.5 flex items-center gap-1.5">
                    {dot && <span className={`w-2 h-2 rounded-full ${dot} shrink-0`} />}
                    <p className={`text-[9px] font-bold uppercase tracking-[0.12em] ${labelColor}`}>
                      {label}
                    </p>
                  </div>
                )}
                <ul className="space-y-0.5">
                  {items.map(({ href, label: itemLabel, Icon, exact, ...rest }) => {
                    const startsWith = (rest as { startsWith?: string }).startsWith;
                    const isActive   = exact
                      ? pathname === href
                      : pathname.startsWith(startsWith ?? href);
                    return (
                      <li key={href}>
                        <Link
                          href={href}
                          onClick={onClose}
                          className={[
                            "relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-150",
                            isActive
                              ? `${activeClasses} font-semibold`
                              : "text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6]",
                          ].join(" ")}
                        >
                          {isActive && (
                            <span className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full ${activeBar}`} aria-hidden />
                          )}
                          <span className={`shrink-0 ${isActive ? "" : iconColor}`}>
                            <Icon />
                          </span>
                          {itemLabel}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        {/* Bottom — solo logout */}
        <div className="px-2 py-1.5 border-t border-[#F3F4F6] shrink-0">
          <form action={logout}>
            <button type="submit"
              className="w-full flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[12px] font-medium text-[#9CA3AF] hover:text-red-600 hover:bg-red-50 transition-all duration-150"
            >
              <IconLogout />
              <span>Cerrar sesión</span>
            </button>
          </form>
        </div>

      </aside>
    </>
  );
}
