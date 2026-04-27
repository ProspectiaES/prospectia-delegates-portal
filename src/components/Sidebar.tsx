"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";

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

const IconAfiliados = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <circle cx="5" cy="5" r="2" />
    <circle cx="11" cy="5" r="2" />
    <circle cx="8" cy="12" r="2" />
    <path d="M5 7c0 1.657 1.343 3 3 3" strokeLinecap="round" />
    <path d="M11 7c0 1.657-1.343 3-3 3" strokeLinecap="round" />
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

// ─── Navigation tree ──────────────────────────────────────────────────────────

const sections = [
  {
    label: "General",
    items: [
      { href: "/dashboard", label: "Dashboard", Icon: IconDashboard, exact: true },
    ],
  },
  {
    label: "Holded",
    items: [
      { href: "/dashboard/clientes",  label: "Clientes",   Icon: IconClientes,  exact: false },
      { href: "/dashboard/facturas",  label: "Facturas",   Icon: IconFacturas,  exact: false },
    ],
  },
  {
    label: "Delegados",
    items: [
      { href: "/dashboard/delegados", label: "Delegados",  Icon: IconDelegados, exact: false },
    ],
  },
  {
    label: "Afiliados",
    items: [
      { href: "/dashboard/afiliados", label: "Afiliados", Icon: IconAfiliados, exact: false },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 h-full flex flex-col bg-white border-r border-[#E5E7EB] shrink-0">

      {/* Brand */}
      <div className="h-14 flex items-center px-4 border-b border-[#E5E7EB] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[6px] bg-[#8E0E1A] flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm leading-none select-none">P</span>
          </div>
          <div>
            <p className="text-[12px] font-bold text-[#0A0A0A] tracking-wider leading-none uppercase">
              Prospectia
            </p>
            <p className="text-[10px] text-[#9CA3AF] leading-none mt-0.5">Delegates Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-4 overflow-y-auto" aria-label="Navegación principal">
        {sections.map(({ label, items }) => (
          <div key={label}>
            <p className="px-3 mb-1 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest">
              {label}
            </p>
            <ul className="space-y-0.5">
              {items.map(({ href, label: itemLabel, Icon, exact }) => {
                const isActive = exact ? pathname === href : pathname.startsWith(href);
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
        ))}
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
