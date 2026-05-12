"use client";

import { useTransition } from "react";
import { changeOrderStatus } from "@/app/actions/orders";

// Mirrors Holded Estado dropdown exactly: Pendiente → Aceptado → Cancelado
// Borrador (0) is the automatic initial state when created via API (not in Holded dropdown)
// Cancelado value -1 is tentative — Holded may use DELETE or another status code
const OPTIONS = [
  { value: 1, label: "Pendiente" },
  { value: 2, label: "Aceptado" },
  { value: -1, label: "Cancelado" },
];

export function OrderStatusSelect({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: number;
}) {
  const [isPending, startTransition] = useTransition();

  // Borrador (0) is shown as a placeholder option if not yet set in Holded
  const isInitialDraft = currentStatus === 0;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = Number(e.target.value);
    if (!newStatus && newStatus !== 0) return; // ignore placeholder selection
    startTransition(async () => {
      const result = await changeOrderStatus(orderId, newStatus);
      if (result.error) alert(result.error);
    });
  }

  return (
    <select
      value={isInitialDraft ? "" : currentStatus}
      onChange={handleChange}
      disabled={isPending}
      className="text-xs border border-[#E5E7EB] rounded-md px-2 py-1 bg-white text-[#374151] focus:outline-none focus:ring-1 focus:ring-[#8E0E1A] disabled:opacity-50 cursor-pointer"
    >
      {isInitialDraft && (
        <option value="" disabled>Borrador</option>
      )}
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
