"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";

export function MobileDashboardShell({
  children,
  sidebar,
}: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on navigation
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Listen for close event dispatched from Sidebar's X button
  useEffect(() => {
    const handler = () => setDrawerOpen(false);
    window.addEventListener("close-sidebar", handler);
    return () => window.removeEventListener("close-sidebar", handler);
  }, []);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  return (
    <div className="flex h-full">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:flex md:shrink-0">
        {sidebar}
      </div>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden
        />
      )}

      {/* Mobile drawer */}
      <div
        className={[
          "fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-250 ease-in-out",
          drawerOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {sidebar}
      </div>

      {/* Main content column */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 bg-white border-b border-[#E5E7EB] shrink-0 z-30">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 -ml-2 rounded-lg text-[#374151] hover:bg-[#F3F4F6] transition-colors"
            aria-label="Abrir menú"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <Image src="/OwlICO.png" alt="Prospectia" width={22} height={22} className="object-contain" />
            <span className="text-[13px] font-bold text-[#0A0A0A] uppercase tracking-wider">Prospectia</span>
          </div>

          {/* Spacer to balance hamburger */}
          <div className="w-8" />
        </header>

        {children}
      </div>
    </div>
  );
}
