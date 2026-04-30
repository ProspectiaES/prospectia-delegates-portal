"use client";

import { useState } from "react";
import Link from "next/link";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";

export interface DormantRecoveryItem {
  clientId: string;
  name: string;
  daysDormant: number;
}

const TASK_LABELS = [
  "Llamar al cliente",
  "Enviar email de seguimiento",
  "Enviar muestra o catálogo",
  "Proponer reunión o visita",
  "Informar de novedades del catálogo",
] as const;

type TaskKey = typeof TASK_LABELS[number];

function ClientChecklist({ c }: { c: DormantRecoveryItem }) {
  const [open,    setOpen]    = useState(false);
  const [checked, setChecked] = useState<Set<TaskKey>>(new Set());

  const toggle = (task: TaskKey) =>
    setChecked(prev => {
      const next = new Set(prev);
      next.has(task) ? next.delete(task) : next.add(task);
      return next;
    });

  const done  = checked.size;
  const total = TASK_LABELS.length;

  const urgency    = c.daysDormant > 90 ? "Crítico" : c.daysDormant > 60 ? "Urgente" : "Atención";
  const urgencyCls = c.daysDormant > 90
    ? "text-[#8E0E1A] bg-red-50"
    : c.daysDormant > 60
      ? "text-orange-600 bg-orange-50"
      : "text-amber-600 bg-amber-50";

  return (
    <div className="border-t border-[#F3F4F6] first:border-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[#F9FAFB] transition-colors text-left"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"
          className={`shrink-0 text-[#9CA3AF] transition-transform duration-150 ${open ? "rotate-90" : ""}`}>
          <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-[#0A0A0A] truncate block">{c.name}</span>
        </div>

        {/* Progress pill */}
        {done > 0 && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 shrink-0">
            {done}/{total}
          </span>
        )}

        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${urgencyCls}`}>
          {urgency} · {c.daysDormant >= 999 ? "Sin actividad" : `${c.daysDormant}d`}
        </span>
      </button>

      {open && (
        <div className="px-5 pb-4 pt-0.5 bg-[#FAFAFA] border-t border-[#F3F4F6]">
          <ul className="mt-2 space-y-1">
            {TASK_LABELS.map(task => {
              const isChecked = checked.has(task);
              return (
                <li key={task}>
                  <label className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-white transition-colors cursor-pointer border border-transparent hover:border-[#E5E7EB]">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggle(task)}
                      className="w-4 h-4 rounded border-[#D1D5DB] text-[#8E0E1A] accent-[#8E0E1A] cursor-pointer shrink-0"
                    />
                    <span className={`text-sm ${isChecked ? "line-through text-[#9CA3AF]" : "text-[#374151]"}`}>
                      {task}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          <div className="mt-3 flex items-center justify-between">
            {done === total ? (
              <span className="text-xs font-semibold text-emerald-600">¡Todas las tareas completadas!</span>
            ) : (
              <span className="text-xs text-[#9CA3AF]">{total - done} tarea{total - done !== 1 ? "s" : ""} pendiente{total - done !== 1 ? "s" : ""}</span>
            )}
            <Link
              href={`/dashboard/clientes/${c.clientId}`}
              className="text-xs font-medium text-[#8E0E1A] hover:underline"
            >
              Ver ficha →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export function DormantRecoveryCard({ dormidos }: { dormidos: DormantRecoveryItem[] }) {
  if (dormidos.length === 0) return null;

  const top         = dormidos.slice(0, 8);
  const hasCritical = dormidos.some(c => c.daysDormant > 90);

  const badge = (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${hasCritical ? "bg-red-50 text-[#8E0E1A]" : "bg-amber-50 text-amber-700"}`}>
      {dormidos.length} dormido{dormidos.length !== 1 ? "s" : ""}
    </span>
  );

  return (
    <CollapsibleCard title="Tareas — clientes dormidos" subtitle="Lista de acciones por cliente" badge={badge}>
      <div>
        {top.map(c => (
          <ClientChecklist key={c.clientId} c={c} />
        ))}

        {dormidos.length > 8 && (
          <div className="border-t border-[#F3F4F6] px-5 py-3 flex items-center gap-1 justify-center">
            <span className="text-xs text-[#9CA3AF]">+{dormidos.length - 8} clientes dormidos más —</span>
            <Link href="/dashboard/clientes" className="text-xs font-medium text-[#8E0E1A] hover:underline">ver todos</Link>
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
}
