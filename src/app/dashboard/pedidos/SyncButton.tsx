"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SyncButton() {
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<string | null>(null);
  const router = useRouter();

  async function handleSync() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/holded/sync", { method: "POST" });
      if (res.ok) {
        setResult("✓ Sincronizado");
        router.refresh();
      } else {
        setResult("Error al sincronizar");
      }
    } catch {
      setResult("Error de conexión");
    } finally {
      setLoading(false);
      setTimeout(() => setResult(null), 3000);
    }
  }

  return (
    <button
      onClick={handleSync}
      disabled={loading}
      className="h-9 px-3 rounded-lg border border-[#E5E7EB] text-sm font-medium text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-50 transition-colors flex items-center gap-2"
      title="Sincronizar con Holded"
    >
      <svg
        width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"
        className={loading ? "animate-spin" : ""}
      >
        <path d="M12 7A5 5 0 112 7" strokeLinecap="round"/>
        <path d="M12 7l-2-2M12 7l2-2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {loading ? "Sincronizando…" : result ?? "Sincronizar"}
    </button>
  );
}
