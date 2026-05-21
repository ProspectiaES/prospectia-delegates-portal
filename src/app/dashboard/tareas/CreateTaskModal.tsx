"use client";

import { useActionState, useEffect } from "react";
import { createTaskAction, TaskFormState, TaskStatus } from "@/app/actions/tasks";

interface Profile { id: string; full_name: string; }
interface Project { id: string; name: string; color: string; }

interface Props {
  defaultStatus?: TaskStatus;
  profiles: Profile[];
  projects: Project[];
  onClose: () => void;
}

const inputCls =
  "w-full h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0A0A0A] placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors";
const selectCls =
  "w-full h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0A0A0A] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors";

export function CreateTaskModal({ defaultStatus = "todo", profiles, projects, onClose }: Props) {
  const [state, action, pending] = useActionState<TaskFormState | null, FormData>(
    createTaskAction,
    null
  );

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg">

        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-sm font-semibold text-[#0A0A0A]">Nueva tarea</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[#9CA3AF] hover:text-[#0A0A0A] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <form action={action} className="p-5 space-y-4">
          <input type="hidden" name="status" value={defaultStatus} />

          {state?.error && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-[#8E0E1A]">
              {state.error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">Título *</label>
            <input
              name="title"
              required
              placeholder="Descripción breve de la tarea…"
              className={inputCls}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">Descripción</label>
            <textarea
              name="description"
              rows={3}
              placeholder="Detalles opcionales…"
              className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#0A0A0A] placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Prioridad</label>
              <select name="priority" defaultValue="medium" className={selectCls}>
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Fecha límite</label>
              <input name="due_date" type="date" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Asignar a</label>
              <select name="assignee_id" className={selectCls}>
                <option value="">— Nadie —</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Proyecto</label>
              <select name="project_id" className={selectCls}>
                <option value="">— Sin proyecto —</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-lg text-sm font-medium text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="h-9 px-5 rounded-lg bg-[#8E0E1A] text-sm font-semibold text-white hover:bg-[#6B0A14] disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#8E0E1A] focus:ring-offset-2"
            >
              {pending ? "Creando…" : "Crear tarea"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
