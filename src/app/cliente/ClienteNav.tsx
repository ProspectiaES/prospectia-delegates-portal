"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/cliente", label: "Dashboard" },
  { href: "/cliente/facturas", label: "Facturas" },
  { href: "/cliente/pedidos", label: "Pedidos" },
];

export function ClienteNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {TABS.map(t => {
        const active = t.href === "/cliente" ? pathname === "/cliente" : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              active ? "bg-[#F5F1E6] text-[#0A0A0A]" : "text-[#6B7280] hover:text-[#0A0A0A]"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
