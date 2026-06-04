"use client";

import { useState, useTransition } from "react";
import { setMrwTracking, markMrwDelivered } from "@/app/actions/mrw";

interface Props {
  orderId: string;
  mrwTrackingNumber?: string | null;
  mrwStatus?: string | null;
  mrwDeliveredAt?: string | null;
  mrwLastEvent?: string | null;
  shippingStatus?: number | null;
  isOwner: boolean;
}

const STATUS_COLOR: Record<string, string> = {
  "Entregado":          "bg-emerald-50 text-emerald-700",
  "Entregado (manual)": "bg-emerald-50 text-emerald-700",
  "En trànsit":         "bg-blue-50 text-blue-700",
  "Pendent":            "bg-amber-50 text-amber-700",
};

export function MrwTrackingCell({
  orderId, mrwTrackingNumber, mrwStatus, mrwDeliveredAt,
  mrwLastEvent, shippingStatus, isOwner,
}: Props) {
  const [editing,  setEditing]  = useState(false);
  const [input,    setInput]    = useState(mrwTrackingNumber ?? "");
  const [isPending, startTr]    = useTransition();

  function handleSave() {
    startTr(async () => {
      await setMrwTracking(orderId, input);
      setEditing(false);
    });
  }

  function handleMarkDelivered() {
    startTr(async () => {
      await markMrwDelivered(orderId);
    });
  }

  const isDelivered = mrwStatus?.startsWith("Entregado") || (shippingStatus ?? 0) >= 5;

  if (!mrwTrackingNumber && !editing) {
    if (!isOwner) return <span className="text-[#D1D5DB] text-xs">—</span>;
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-[11px] text-[#9CA3AF] hover:text-[#8E0E1A] transition-colors"
        title="Afegir tracking MRW"
      >
        + MRW
      </button>
    );
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 min-w-[160px]">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Núm. albarà MRW"
          className="text-xs px-2 py-1 rounded border border-[#E5E7EB] focus:outline-none focus:ring-1 focus:ring-[#8E0E1A] w-28 font-mono"
          autoFocus
          onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
        />
        <button onClick={handleSave} disabled={isPending}
          className="text-[10px] font-bold px-2 py-1 rounded bg-[#8E0E1A] text-white disabled:opacity-50">
          ✓
        </button>
        <button onClick={() => setEditing(false)}
          className="text-[10px] px-1.5 py-1 rounded text-[#9CA3AF] hover:text-[#374151]">
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1 min-w-[160px]">
      {/* Tracking number — clickable to edit */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-mono text-[#374151]">{mrwTrackingNumber}</span>
        {isOwner && !isDelivered && (
          <button onClick={() => setEditing(true)} title="Editar tracking"
            className="text-[#D1D5DB] hover:text-[#9CA3AF] transition-colors">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 8l1.5-1.5 5-5L9 3l-5 5L2.5 9z" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* Status badge */}
      {mrwStatus && (
        <span className={`inline-flex text-[9px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_COLOR[mrwStatus] ?? "bg-gray-100 text-gray-600"}`}>
          {isDelivered ? "✓ " : ""}{mrwStatus}
        </span>
      )}

      {/* Delivery timestamp */}
      {mrwDeliveredAt && (
        <p className="text-[10px] text-emerald-600">
          {new Date(mrwDeliveredAt).toLocaleDateString("ca-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
        </p>
      )}

      {/* Last event (tooltip on hover) */}
      {mrwLastEvent && !isDelivered && (
        <p className="text-[10px] text-[#9CA3AF] truncate max-w-[160px]" title={mrwLastEvent}>
          {mrwLastEvent}
        </p>
      )}

      {/* Manual delivery button (if tracking set but not yet delivered) */}
      {isOwner && mrwTrackingNumber && !isDelivered && (
        <button onClick={handleMarkDelivered} disabled={isPending}
          className="text-[10px] font-semibold text-[#6B7280] hover:text-emerald-700 transition-colors disabled:opacity-40">
          Marcar entregat ↗
        </button>
      )}
    </div>
  );
}
