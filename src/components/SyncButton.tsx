"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function SyncButton() {
  const [pending, setPending] = useState(false);
  const [result, setResult]   = useState<"ok" | "error" | null>(null);
  const router = useRouter();

  async function handleSync() {
    setPending(true);
    setResult(null);
    try {
      const res = await fetch("/api/holded/sync", { method: "POST" });
      setResult(res.ok ? "ok" : "error");
      if (res.ok) router.refresh();
    } catch {
      setResult("error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {result === "ok"    && <span className="text-xs text-[#4ADE80]">Sincronizado</span>}
      {result === "error" && <span className="text-xs text-[#E50914]">Error al sincronizar</span>}
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={handleSync}
      >
        {pending ? "Sincronizando…" : "Sincronizar ahora"}
      </Button>
    </div>
  );
}
