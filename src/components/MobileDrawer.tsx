"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Sidebar, type UserProps } from "./Sidebar";
import type { NotificationItem } from "./NotificationBell";

export function MobileDrawer({ user, children, notifications = [] }: { user: UserProps; children: React.ReactNode; notifications?: NotificationItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* Top bar */}
      <div style={{
        height: 56, minHeight: 56, display: "flex", alignItems: "center",
        gap: 12, padding: "0 16px", background: "#fff",
        borderBottom: "1px solid #E5E7EB", zIndex: 30,
      }}>
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          style={{
            padding: 8, borderRadius: 8, border: "none", background: "transparent",
            cursor: "pointer", color: "#374151", display: "flex", alignItems: "center",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
          </svg>
        </button>
        <Image src="/OwlICO.png" alt="Prospectia" width={26} height={20} style={{ objectFit: "contain" }} />
        <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#0A0A0A" }}>
          Prospectia
        </span>
        {user && (
          <div style={{ marginLeft: "auto" }}>
            {user.avatar_url ? (
              <Image src={user.avatar_url} alt={user.full_name} width={32} height={32}
                style={{ borderRadius: 8, objectFit: "cover", border: "1px solid #E5E7EB" }} />
            ) : (
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#8E0E1A", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{user.full_name?.charAt(0) ?? "?"}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Drawer overlay */}
      {open && (
        <div onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 40 }} />
      )}

      {/* Drawer */}
      {open && <Sidebar user={user} drawer onClose={() => setOpen(false)} notifications={notifications} />}

      {/* Content */}
      <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden", background: "#F5F5F7", minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
}
