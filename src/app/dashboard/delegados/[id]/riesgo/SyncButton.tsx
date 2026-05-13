"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { triggerHoldedSync } from "./actions";

export function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [done, setDone]       = useState(false);
  const router = useRouter();

  async function handleSync() {
    setSyncing(true);
    setDone(false);
    await triggerHoldedSync();
    setDone(true);
    setSyncing(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleSync}
      disabled={syncing}
      className="h-9 px-4 rounded-lg border border-[#E5E7EB] text-sm font-medium text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-50 transition-colors flex items-center gap-2 print:hidden"
    >
      <svg
        width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className={syncing ? "animate-spin" : ""}
      >
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
        <path d="M16 21h5v-5" />
      </svg>
      {syncing ? "Sincronizando…" : done ? "✓ Actualizado" : "Sincronizar Holded"}
    </button>
  );
}
