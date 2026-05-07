"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Sidebar, type UserProps } from "./Sidebar";

export function ResponsiveLayout({
  user,
  children,
}: {
  user: UserProps;
  children: React.ReactNode;
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Close drawer on navigation
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Lock scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  // Before hydration: render desktop layout (SSR default)
  if (!mounted) {
    return (
      <div style={{ display: "flex", height: "100%" }}>
        <Sidebar user={user} />
        <main style={{ flex: 1, overflowY: "auto", background: "#F5F5F7", minWidth: 0 }}>
          {children}
        </main>
      </div>
    );
  }

  // MOBILE layout
  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Fixed top bar */}
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, height: 56,
          background: "#fff", borderBottom: "1px solid #E5E7EB",
          display: "flex", alignItems: "center", gap: 12, padding: "0 16px",
          zIndex: 30,
        }}>
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menú"
            style={{
              padding: 8, borderRadius: 8, border: "none", background: "transparent",
              cursor: "pointer", display: "flex", alignItems: "center", color: "#374151",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
            </svg>
          </button>
          <Image src="/OwlICO.png" alt="Prospectia" width={28} height={22} style={{ objectFit: "contain" }} />
          <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#0A0A0A" }}>
            Prospectia
          </span>
          {user && (
            <div style={{ marginLeft: "auto" }}>
              {user.avatar_url ? (
                <Image
                  src={user.avatar_url}
                  alt={user.full_name}
                  width={32} height={32}
                  style={{ borderRadius: 8, objectFit: "cover", border: "1px solid #E5E7EB" }}
                />
              ) : (
                <div style={{
                  width: 32, height: 32, borderRadius: 8, background: "#8E0E1A",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>
                    {user.full_name?.charAt(0) ?? "?"}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer overlay */}
        {drawerOpen && (
          <div
            onClick={() => setDrawerOpen(false)}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 40,
            }}
          />
        )}

        {/* Drawer sidebar */}
        {drawerOpen && (
          <Sidebar user={user} drawer onClose={() => setDrawerOpen(false)} />
        )}

        {/* Main content — pushed down by topbar height */}
        <main style={{
          flex: 1, overflowY: "auto", overflowX: "hidden",
          background: "#F5F5F7", marginTop: 56, minWidth: 0,
        }}>
          {children}
        </main>
      </div>
    );
  }

  // DESKTOP layout
  return (
    <div style={{ display: "flex", height: "100%" }}>
      <Sidebar user={user} />
      <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden", background: "#F5F5F7", minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
}
