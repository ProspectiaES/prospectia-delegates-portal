"use client";
import Image from "next/image";

export function MobileTopBar() {
  return (
    <header className="md:hidden flex items-center justify-between px-4 h-14 bg-white border-b border-[#E5E7EB] shrink-0 z-30">
      <button
        onClick={() => window.dispatchEvent(new Event("open-sidebar"))}
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
      <div className="w-8" />
    </header>
  );
}
