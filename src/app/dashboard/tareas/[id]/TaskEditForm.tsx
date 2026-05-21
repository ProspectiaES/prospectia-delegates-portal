"use client";

import { useActionState } from "react";
import { updateTaskAction, TaskFormState, TaskStatus, TaskPriority } from "@/app/actions/tasks";

interface Profile { id: string; full_name: string; }
interface Project { id: string; name: string; color: string; }

interface TaskData {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  project_id: string | null;
  assignee_id: string | null;
  contact_id: string | null;
  salesorder_id: string | null;
}

interface Props {
  task: TaskData;
  profiles: Profile[];
  projects: Project[];
}

const inputCls =
  "w-full h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0A0A0A] placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors";
const selectCls =
  "w-full h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0A0A0A] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#374151] mb-1">{label}</label>
      {children}
    </div>
  );
}

export function TaskEditForm({ task, profiles, projects }: Props) {
  const [state, action, pending] = useActionState<TaskFormState | null, FormData>(
    updateTaskAction,
    null
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="task_id" value={task.id} />

      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-[#8E0E1A]">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-sm text-emerald-700">
          Canvis guardats correctament.
        </div>
      )}

      <Field label="Títol *">
        <input
          name="title"
          required
          defaultValue={task.title}
          className={inputCls}
        />
      </Field>

      <Field label="Descripció">
        <textarea
          name="description"
          rows={4}
          defaultValue={task.description ?? ""}
          className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#0A0A0A] placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors resize-none"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Estat">
          <select name="status" defaultValue={task.status} className={selectCls}>
            <option value="todo">Pendent</option>
            <option value="in_progress">En curs</option>
            <option value="done">Completat</option>
            <option value="cancelled">Cancel·lat</option>
          </select>
        </Field>
        <Field label="Prioritat">
          <select name="priority" defaultValue={task.priority} className={selectCls}>
            <option value="low">Baixa</option>
            <option value="medium">Mitjana</option>
            <option value="high">Alta</option>
            <option value="urgent">Urgent</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Assignar a">
          <select name="assignee_id" defaultValue={task.assignee_id ?? ""} className={selectCls}>
            <option value="">— Ningú —</option>
            {profiles.map(p => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>
        </Field>
        <Field label="Projecte">
          <select name="project_id" defaultValue={task.project_id ?? ""} className={selectCls}>
            <option value="">— Sense projecte —</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Data límit">
        <input
          name="due_date"
          type="date"
          defaultValue={task.due_date ?? ""}
          className={inputCls}
        />
      </Field>

      <div className="flex items-center justify-end pt-2 border-t border-[#F3F4F6]">
        <button
          type="submit"
          disabled={pending}
          className="h-9 px-5 rounded-lg bg-[#8E0E1A] text-sm font-semibold text-white hover:bg-[#6B0A14] disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#8E0E1A] focus:ring-offset-2"
        >
          {pending ? "Guardant…" : "Guardar canvis"}
        </button>
      </div>
    </form>
  );
}
