"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return "hace un momento";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} días`;
}

interface Props {
  lastSyncedAt?: string | null;
  endpoint?: string;
  label?: string;
}

export function SyncButton({
  lastSyncedAt,
  endpoint = "/api/holded/sync-status",
  label = "Forzar actualización",
}: Props) {
  const [pending, setPending] = useState(false);
  const [result, setResult]   = useState<"ok" | "error" | null>(null);
  const [syncedAt, setSyncedAt] = useState(lastSyncedAt);
  const router = useRouter();

  async function handleSync() {
    setPending(true);
    setResult(null);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      if (res.ok) {
        setResult("ok");
        setSyncedAt(new Date().toISOString());
        router.refresh();
      } else {
        setResult("error");
      }
    } catch {
      setResult("error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        {syncedAt && (
          <p className="text-xs text-[#9CA3AF]">
            Actualizado {timeAgo(syncedAt)}
          </p>
        )}
        {result === "ok"    && <p className="text-xs font-medium text-emerald-600">Sincronizado</p>}
        {result === "error" && <p className="text-xs font-medium text-[#8E0E1A]">Error al sincronizar</p>}
      </div>
      <Button variant="outline" size="sm" disabled={pending} onClick={handleSync}>
        {pending ? "Sincronizando…" : label}
      </Button>
    </div>
  );
}
