export const SKU_SPRAY = "VIHO-OBE-SPRAY-002";
export const SKUS_PROMO = new Set(["VIHO-OBE-PROMO-002", "VIHO-OBE-PROMO-CP-12M"]);

export type DelegateStatus = "sin-ventas" | "bajo" | "activo" | "top";

export function delegateStatus(sprayUnits: number): DelegateStatus {
  if (sprayUnits === 0) return "sin-ventas";
  if (sprayUnits < 25)  return "bajo";
  if (sprayUnits < 100) return "activo";
  return "top";
}

export const STATUS_BADGE: Record<DelegateStatus, { label: string; cls: string }> = {
  "sin-ventas": { label: "Sin ventas", cls: "bg-[#F3F4F6] text-[#9CA3AF]" },
  "bajo":       { label: "Bajo",       cls: "bg-amber-100 text-amber-700"  },
  "activo":     { label: "Activo",     cls: "bg-blue-100 text-blue-700"    },
  "top":        { label: "Top",        cls: "bg-emerald-100 text-emerald-700" },
};

export function roiBadgeCls(roi: number | null): string {
  if (roi === null || roi <= 0) return "bg-[#F3F4F6] text-[#9CA3AF]";
  if (roi >= 15) return "bg-emerald-100 text-emerald-700";
  if (roi >= 10) return "bg-blue-100 text-blue-700";
  if (roi >= 5)  return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}
