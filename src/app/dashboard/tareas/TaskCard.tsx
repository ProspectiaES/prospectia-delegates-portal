"use client";

import Link from "next/link";
import type { TaskPriority, TaskStatus } from "@/app/actions/tasks";

export interface TaskCardData {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  assignee: { id: string; full_name: string; avatar_url: string | null } | null;
  project: { id: string; name: string; color: string } | null;
  comment_count: number;
  contact_id: string | null;
  salesorder_id: string | null;
}

const PRIORITY: Record<TaskPriority, { label: string; cls: string }> = {
  low:    { label: "Baixa",   cls: "bg-[#F3F4F6] text-[#6B7280]" },
  medium: { label: "Mitjana", cls: "bg-blue-50 text-blue-600" },
  high:   { label: "Alta",    cls: "bg-amber-50 text-amber-600" },
  urgent: { label: "Urgent",  cls: "bg-[#FEF2F2] text-[#8E0E1A]" },
};

function relativeDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Avui";
  if (diff === 1) return "Demà";
  if (diff === -1) return "Ahir";
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export function TaskCard({ task }: { task: TaskCardData }) {
  const prio    = PRIORITY[task.priority];
  const overdue = task.due_date
    ? new Date(task.due_date + "T00:00:00") < new Date(new Date().setHours(0, 0, 0, 0))
    : false;

  return (
    <Link
      href={`/dashboard/tareas/${task.id}`}
      className="block bg-white rounded-lg border border-[#E5E7EB] p-3 hover:border-[#8E0E1A]/40 hover:shadow-sm transition-all group"
    >
      <p className="text-sm font-medium text-[#0A0A0A] leading-snug group-hover:text-[#8E0E1A] transition-colors line-clamp-2">
        {task.title}
      </p>

      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${prio.cls}`}>
          {prio.label}
        </span>
        {task.project && (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-[#374151]"
            style={{ background: task.project.color + "20" }}
          >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: task.project.color }} />
            {task.project.name}
          </span>
        )}
        {task.contact_id && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-600">
            Client
          </span>
        )}
        {task.salesorder_id && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-600">
            Pedido
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-2.5">
        <div className="flex items-center gap-2.5">
          {task.due_date && (
            <span className={`text-[11px] font-medium flex items-center gap-0.5 ${overdue ? "text-[#8E0E1A]" : "text-[#6B7280]"}`}>
              {overdue && (
                <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
                  <path d="M6 1L1 10h10L6 1zm0 2.5l2.8 4.5H3.2L6 3.5zm0 2v1.5" strokeWidth="0"/>
                  <rect x="5.5" y="5" width="1" height="2" rx="0.5"/>
                  <rect x="5.5" y="8" width="1" height="1" rx="0.5"/>
                </svg>
              )}
              {relativeDate(task.due_date)}
            </span>
          )}
          {task.comment_count > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] text-[#9CA3AF]">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <path d="M10 1H2a1 1 0 00-1 1v5a1 1 0 001 1h1v2l2.5-2H10a1 1 0 001-1V2a1 1 0 00-1-1z" strokeLinejoin="round"/>
              </svg>
              {task.comment_count}
            </span>
          )}
        </div>

        {task.assignee && (
          <div title={task.assignee.full_name}>
            {task.assignee.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={task.assignee.avatar_url}
                alt={task.assignee.full_name}
                className="w-6 h-6 rounded-full object-cover ring-1 ring-white"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-[#8E0E1A] flex items-center justify-center shrink-0">
                <span className="text-[9px] font-bold text-white">
                  {task.assignee.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
