"use client";

import { useState, useTransition } from "react";
import { changeOrderStatus } from "@/app/actions/orders";

// Mirrors Holded Estado dropdown: Borrador → Pendiente → Aceptado → Cancelado
// Cancelado value -1 is tentative — Holded may use DELETE or another status code
const OPTIONS = [
  { value: 0,  label: "Borrador"  },
  { value: 1,  label: "Pendiente" },
  { value: 2,  label: "Aceptado"  },
  { value: -1, label: "Cancelado" },
];

export function OrderStatusSelect({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: number;
}) {
  const [selected, setSelected] = useState(currentStatus);
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = Number(e.target.value);
    if (newStatus === selected) return;
    setSelected(newStatus);
    startTransition(async () => {
      const result = await changeOrderStatus(orderId, newStatus);
      if (result.error) {
        alert(result.error);
        setSelected(currentStatus); // revert on error
      }
    });
  }

  return (
    <select
      value={selected}
      onChange={handleChange}
      disabled={isPending}
      className="text-xs border border-[#E5E7EB] rounded-md px-2 py-1 bg-white text-[#374151] focus:outline-none focus:ring-1 focus:ring-[#8E0E1A] disabled:opacity-50 cursor-pointer"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
