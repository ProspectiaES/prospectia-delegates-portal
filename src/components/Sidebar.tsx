"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { useWeather, wmoLookup } from "@/lib/weather";

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

// ─── Role config ──────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
  OWNER:       "Owner",
  KOL:         "KOL",
  COORDINATOR: "Coordinador",
  ADMIN:       "Admin",
  DELEGATE:    "Delegado",
  COM6:        "Comisión 6",
  CLIENT:      "Cliente",
};

const ROLE_COLOR: Record<string, string> = {
  OWNER:       "bg-[#FEF2F2] text-[#8E0E1A]",
  KOL:         "bg-purple-50 text-purple-700",
  COORDINATOR: "bg-blue-50 text-blue-700",
  ADMIN:       "bg-amber-50 text-amber-700",
  DELEGATE:    "bg-emerald-50 text-emerald-700",
  COM6:        "bg-[#F3F4F6] text-[#6B7280]",
  CLIENT:      "bg-[#F3F4F6] text-[#6B7280]",
};

type UserProps = {
  id: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
  created_at: string;
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

function MiniClock(fullName: string) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const dayStr  = now.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
  const timeStr = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  const { saludo, nombre } = greeting(fullName, now.getHours());

  return { dayStr, timeStr, saludo, nombre };
}

function IdentityPanel({ user, open, onToggle }: {
  user: NonNullable<UserProps>;
  open: boolean;
  onToggle: () => void;
}) {
  const { weather } = useWeather();
  const { dayStr, timeStr, saludo, nombre } = MiniClock(user.full_name);

  const weatherInfo = weather ? wmoLookup(weather.code) : null;

  return (
    <div className="border-b border-[#E5E7EB] shrink-0">
      {/* Panel header — always visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-[#FEF9F9] transition-colors duration-150"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Tiny avatar */}
          {user.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt={user.full_name}
              width={20}
              height={20}
              className="w-5 h-5 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-[#8E0E1A] flex items-center justify-center shrink-0">
              <span className="text-[9px] font-bold text-white">{user.full_name?.charAt(0) ?? "?"}</span>
            </div>
          )}
          <span className="text-[11px] font-semibold text-[#374151] truncate">{user.full_name}</span>
        </div>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor"
          strokeWidth="1.5" className={`shrink-0 text-[#9CA3AF] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="M2 4.5l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Expanded panel */}
      {open && (
        <div className="px-4 pb-4 space-y-3 bg-[#FAFAFA]">

          {/* Date + time */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#8E0E1A" strokeWidth="1.5">
                <rect x="1" y="2" width="10" height="9" rx="1.5" />
                <path d="M4 1v2M8 1v2M1 5h10" strokeLinecap="round" />
              </svg>
              <span className="text-[11px] text-[#6B7280] capitalize">{dayStr}</span>
            </div>
            <span className="text-[12px] font-bold text-[#0A0A0A] tabular-nums">{timeStr}</span>
          </div>

          {/* Weather */}
          {weatherInfo && weather && (
            <div className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#6B7280" strokeWidth="1.5">
                <path d="M9 7a3 3 0 10-5.83 1H3a2 2 0 000 4h6a2 2 0 100-4h-.17z" />
              </svg>
              <span className="text-[12px] font-bold text-[#374151]">{weather.temp}°</span>
              {weather.city && (
                <span className="text-[11px] text-[#9CA3AF] truncate">{weather.city}</span>
              )}
              <span className="text-[11px] text-[#6B7280] truncate">{weatherInfo.label}</span>
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-semibold text-[#9CA3AF] uppercase tracking-widest">Identidad</span>
            <div className="flex-1 h-px bg-[#E5E7EB]" />
          </div>

          {/* Greeting */}
          <p className="text-[12px] text-[#6B7280]">
            {saludo},{" "}
            <span className="font-semibold text-[#8E0E1A]">{nombre}</span>
          </p>

          {/* Avatar + name + role */}
          <Link href="/dashboard/perfil" className="flex items-center gap-2.5 group">
            <div className="relative shrink-0">
              {user.avatar_url ? (
                <Image
                  src={user.avatar_url}
                  alt={user.full_name}
                  width={36}
                  height={36}
                  className="w-9 h-9 rounded-lg object-cover ring-1 ring-[#E5E7EB]"
                />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-[#8E0E1A] flex items-center justify-center">
                  <span className="text-sm font-bold text-white">{user.full_name?.charAt(0) ?? "?"}</span>
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-[#0A0A0A] truncate group-hover:text-[#8E0E1A] transition-colors leading-tight">
                {user.full_name}
              </p>
              <span className={[
                "inline-flex items-center mt-0.5 px-1.5 py-0 rounded-full text-[9px] font-bold leading-4",
                ROLE_COLOR[user.role] ?? "bg-[#F3F4F6] text-[#6B7280]",
              ].join(" ")}>
                {ROLE_LABEL[user.role] ?? user.role}
              </span>
            </div>
          </Link>

          {/* Alta + Antigüedad */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[9px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Alta</p>
              <p className="text-[11px] font-medium text-[#374151] mt-0.5">{fmtDate(user.created_at)}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Antigüedad</p>
              <p className="text-[11px] font-medium text-[#374151] mt-0.5">{antigüedad(user.created_at)}</p>
            </div>
          </div>

          {/* Prospectia ID */}
          <div>
            <p className="text-[9px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1">
              Prospectia ID
            </p>
            <div className="flex items-start gap-1">
              <p className="text-[10px] font-mono text-[#6B7280] break-all leading-tight flex-1">
                {user.id}
              </p>
              <CopyButton text={user.id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Navigation tree ──────────────────────────────────────────────────────────

function buildSections(role: string, userId: string, isKol = false, isCoordinator = false) {
  const isDelegate    = role === "DELEGATE";
  const isOwner       = role === "OWNER";
  const canSeeTeam    = !isDelegate || isKol || isCoordinator;
  return [
    {
      label: "General",
      items: [
        {
          href:  (isDelegate && !isKol && !isCoordinator) ? `/dashboard/delegados/${userId}` : "/dashboard",
          label: "Dashboard",
          Icon:  IconDashboard,
          exact: !(isDelegate && !isKol && !isCoordinator),
          startsWith: (isDelegate && !isKol && !isCoordinator) ? `/dashboard/delegados/${userId}` : undefined,
        },
      ],
    },
    {
      label: "Holded",
      items: [
        { href: "/dashboard/clientes",  label: "Clientes",   Icon: IconClientes,  exact: false },
        { href: "/dashboard/facturas",  label: "Facturas",   Icon: IconFacturas,  exact: false },
        { href: "/dashboard/productos", label: "Productos",  Icon: IconProductos, exact: false },
      ],
    },
    {
      label: "Ventas",
      items: [
        { href: "/dashboard/pedidos", label: "Pedidos", Icon: IconPedidos, exact: false },
      ],
    },
    ...(canSeeTeam ? [{
      label: "Delegados",
      items: [
        { href: "/dashboard/delegados", label: "Delegados", Icon: IconDelegados, exact: false },
      ],
    }] : []),
    {
      label: "CRM",
      items: [
        { href: "/dashboard/prospectos",  label: "Mis prospectos",   Icon: IconCRM,        exact: false },
        { href: "/dashboard/calendario",  label: "Calendario",       Icon: IconCalendario, exact: false },
        { href: "/dashboard/emails",      label: "Tracking emails",  Icon: IconEmails,     exact: false },
        ...(isOwner ? [{ href: "/dashboard/plantillas", label: "Plantillas email", Icon: IconTemplates, exact: false }] : []),
      ],
    },
    {
      label: "Afiliados",
      items: [
        { href: "/dashboard/afiliados", label: "Afiliados", Icon: IconAfiliados, exact: false },
      ],
    },
    {
      label: "Cuenta",
      items: [
        { href: "/dashboard/perfil", label: "Mi Perfil", Icon: IconPerfil, exact: false },
      ],
    },
    ...(isOwner ? [{
      label: "Sistema",
      items: [
        { href: "/dashboard/admin", label: "Auditoría", Icon: IconAdmin, exact: false },
      ],
    }] : []),
  ];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Sidebar({ user }: { user?: UserProps }) {
  const pathname  = usePathname();
  const [panelOpen, setPanelOpen] = useState(true);
  const togglePanel = useCallback(() => setPanelOpen(o => !o), []);

  const sections = user
    ? buildSections(user.role, user.id, user.is_kol ?? false, user.is_coordinator ?? false)
    : buildSections("", "");

  return (
    <aside className="w-56 h-full flex flex-col bg-white border-r border-[#E5E7EB] shrink-0">

      {/* Brand */}
      <div className="h-14 flex items-center px-4 border-b border-[#E5E7EB] shrink-0">
        <div className="flex items-center gap-2.5">
          <Image
            src="/OwlICO.png"
            alt="Prospectia"
            width={28}
            height={28}
            className="w-7 h-7 shrink-0 object-contain"
          />
          <div>
            <p className="text-[12px] font-bold text-[#0A0A0A] tracking-wider leading-none uppercase">
              Prospectia
            </p>
            <p className="text-[10px] text-[#9CA3AF] leading-none mt-0.5">Delegates Portal</p>
          </div>
        </div>
      </div>

      {/* Identity panel */}
      {user && (
        <IdentityPanel user={user} open={panelOpen} onToggle={togglePanel} />
      )}

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-4 overflow-y-auto min-h-0" aria-label="Navegación principal">
        {sections.map(({ label, items }) => {
          const visibleItems = items.filter(item => {
            if (item.href === "/dashboard/productos") return user?.role === "OWNER";
            return true;
          });
          if (visibleItems.length === 0) return null;
          return (
          <div key={label}>
            <p className="px-3 mb-1 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest">
              {label}
            </p>
            <ul className="space-y-0.5">
              {visibleItems.map(({ href, label: itemLabel, Icon, exact, ...rest }) => {
                const startsWith = (rest as { startsWith?: string }).startsWith;
                const isActive = exact
                  ? pathname === href
                  : pathname.startsWith(startsWith ?? href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={[
                        "relative flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-sm font-medium transition-colors duration-150",
                        isActive
                          ? "text-[#8E0E1A] bg-[#FEF2F2]"
                          : "text-[#374151] hover:text-[#0A0A0A] hover:bg-[#F3F4F6]",
                      ].join(" ")}
                    >
                      {isActive && (
                        <span
                          className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[#8E0E1A]"
                          aria-hidden
                        />
                      )}
                      <span className={isActive ? "text-[#8E0E1A]" : "text-[#6B7280]"}>
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

      {/* Logout */}
      <div className="px-2 py-3 border-t border-[#E5E7EB] shrink-0">
        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-sm font-medium text-[#6B7280] hover:text-[#0A0A0A] hover:bg-[#F3F4F6] transition-colors duration-150"
          >
            <IconLogout />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
