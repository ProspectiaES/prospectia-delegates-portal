"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Sidebar, type UserProps } from "./Sidebar";

export function MobileHeader({ user }: { user: UserProps }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Barra fija solo en mobile */}
      <div className="mobile-header fixed top-0 inset-x-0 h-14 z-30 bg-white border-b border-[#E5E7EB] items-center gap-3 px-4">
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="p-2 rounded-lg text-[#374151] hover:bg-[#F3F4F6] transition-colors active:bg-[#E5E7EB]"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round"/>
          </svg>
        </button>
        <Image src="/OwlICO.png" alt="Prospectia" width={28} height={22} className="h-7 w-auto object-contain" />
        <span className="text-[13px] font-bold text-[#0A0A0A] uppercase tracking-wider">Prospectia</span>
        {user && (
          <div className="ml-auto">
            {user.avatar_url ? (
              <Image
                src={user.avatar_url}
                alt={user.full_name}
                width={32}
                height={32}
                className="w-8 h-8 rounded-lg object-cover ring-1 ring-[#E5E7EB]"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-[#8E0E1A] flex items-center justify-center">
                <span className="text-xs font-bold text-white">{user.full_name?.charAt(0)}</span>
              </div>
            )}
          </div>
        )}
      </div>
      {open && <Sidebar user={user} drawer onClose={() => setOpen(false)} />}
    </>
  );
}
