"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { markAllNotificationsReadAction } from "@/app/actions/tasks";

export interface NotificationItem {
  id: string;
  type: "assigned" | "commented" | "status_changed" | "mentioned" | "due_soon";
  is_read: boolean;
  created_at: string;
  task: { id: string; title: string } | null;
  actor: { full_name: string } | null;
}

const TYPE_TEXT: Record<NotificationItem["type"], string> = {
  assigned:       "te ha asignado",
  commented:      "ha comentado en",
  status_changed: "cambió el estado de",
  mentioned:      "te mencionó en",
  due_soon:       "vence pronto:",
};

function relativeTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)   return "ara mateix";
  if (diff < 3600) return `fa ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `fa ${Math.floor(diff / 3600)} h`;
  return `fa ${Math.floor(diff / 86400)} d`;
}

export function NotificationBell({
  initialNotifications,
  compact = false,
}: {
  initialNotifications: NotificationItem[];
  compact?: boolean;  // icon-only, no text, fits in brand bar
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifications.filter(n => !n.is_read).length;

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsReadAction();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={compact
          ? "relative p-1.5 rounded-md text-[#8E0E1A] bg-transparent hover:bg-[#FEF2F2] transition-colors"
          : "relative flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-sm font-medium text-[#374151] hover:text-[#0A0A0A] hover:bg-[#F3F4F6] transition-colors w-full"
        }
        aria-label={`Notificaciones${unread > 0 ? ` (${unread} sin leer)` : ""}`}
      >
        <span className="relative">
          <svg width={compact ? 15 : 16} height={compact ? 15 : 16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <path d="M8 2a5 5 0 00-5 5v2l-1.5 2.5h13L13 9V7a5 5 0 00-5-5z" strokeLinejoin="round"/>
            <path d="M6.5 13.5a1.5 1.5 0 003 0" strokeLinecap="round"/>
          </svg>
          {unread > 0 && (
            <span className={compact
              ? "absolute top-0 right-0 w-2 h-2 rounded-full bg-[#8E0E1A] border border-white"
              : "absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 rounded-full bg-[#8E0E1A] text-white text-[9px] font-bold flex items-center justify-center leading-none"
            }>
              {!compact && (unread > 9 ? "9+" : unread)}
            </span>
          )}
        </span>
        {!compact && <span>Notificaciones</span>}
      </button>

      {open && (
        <div className={`absolute w-80 bg-white rounded-xl border border-[#E5E7EB] shadow-xl z-50 ${compact ? "top-full right-0 mt-1" : "bottom-full left-0 mb-1"}`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#F3F4F6]">
            <span className="text-xs font-semibold text-[#374151]">
              Notificaciones
              {unread > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF2F2] text-[#8E0E1A]">
                  {unread}
                </span>
              )}
            </span>
            {unread > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={isPending}
                className="text-[11px] font-medium text-[#8E0E1A] hover:underline disabled:opacity-50"
              >
                Marcar todo leído
              </button>
            )}
          </div>

          <ul className="max-h-72 overflow-y-auto divide-y divide-[#F9FAFB]">
            {notifications.length === 0 ? (
              <li className="px-4 py-6 text-center text-xs text-[#9CA3AF]">
                Sin notificaciones
              </li>
            ) : (
              notifications.map(n => (
                <li key={n.id}>
                  <Link
                    href={n.task ? `/dashboard/tareas/${n.task.id}` : "/dashboard/tareas"}
                    onClick={() => setOpen(false)}
                    className={[
                      "flex items-start gap-2.5 px-4 py-3 hover:bg-[#FAFAFA] transition-colors",
                      !n.is_read ? "bg-[#FEF2F2]/40" : "",
                    ].join(" ")}
                  >
                    {!n.is_read && (
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#8E0E1A] shrink-0" />
                    )}
                    {n.is_read && <span className="mt-1.5 w-1.5 h-1.5 shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-[#374151] leading-snug">
                        <span className="font-semibold">{n.actor?.full_name ?? "Algú"}</span>
                        {" "}{TYPE_TEXT[n.type]}{" "}
                        {n.task && (
                          <span className="font-medium text-[#0A0A0A]">&ldquo;{n.task.title}&rdquo;</span>
                        )}
                      </p>
                      <p className="text-[11px] text-[#9CA3AF] mt-0.5">{relativeTime(n.created_at)}</p>
                    </div>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
