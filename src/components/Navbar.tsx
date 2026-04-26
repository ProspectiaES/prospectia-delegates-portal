"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";

const navLinks = [
  { href: "/dashboard",          label: "Dashboard"  },
  { href: "/dashboard/clientes", label: "Clientes"   },
  { href: "/dashboard/facturas", label: "Facturas"   },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="w-full bg-[#0A0A0A] border-b border-[#2A2A2A] sticky top-0 z-40">
      <div className="max-w-screen-2xl mx-auto px-6 h-14 flex items-center gap-8">

        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-[#F5F5F5] font-bold text-sm tracking-wider uppercase">
            Prospectia
          </span>
          <span className="w-px h-4 bg-[#2A2A2A]" aria-hidden />
          <span className="text-[#A0A0A0] text-xs">Delegates Portal</span>
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-1 flex-1" aria-label="Navegación principal">
          {navLinks.map(({ href, label }) => {
            const isActive =
              href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={[
                  "px-3 py-1.5 rounded-[6px] text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[#1E1E1E] text-[#F5F5F5]"
                    : "text-[#A0A0A0] hover:text-[#F5F5F5] hover:bg-[#1A1A1A]",
                ].join(" ")}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <form action={logout} className="shrink-0">
          <button
            type="submit"
            className="text-xs font-medium text-[#A0A0A0] hover:text-[#E50914] transition-colors"
          >
            Cerrar sesión
          </button>
        </form>

      </div>
    </header>
  );
}
