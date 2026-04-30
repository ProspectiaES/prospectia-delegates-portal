"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

export interface CalActivity {
  id: string;
  prospecto_id: string;
  prospecto_name: string;
  delegate_name: string | null;
  type: string;
  title: string;
  notes: string | null;
  scheduled_at: string;
  completed_at: string | null;
  reminder_sent_24h: string | null;
  reminder_sent_1h: string | null;
}

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  call:    { label: "Llamada",  icon: "📞", color: "text-blue-700",   bg: "bg-blue-50"   },
  meeting: { label: "Reunión",  icon: "🤝", color: "text-purple-700", bg: "bg-purple-50" },
  email:   { label: "Email",    icon: "✉️", color: "text-amber-700",  bg: "bg-amber-50"  },
  task:    { label: "Tarea",    icon: "✅", color: "text-emerald-700",bg: "bg-emerald-50"},
  note:    { label: "Nota",     icon: "📝", color: "text-[#6B7280]",  bg: "bg-[#F9FAFB]" },
};

function typeCfg(t: string) {
  return TYPE_CONFIG[t] ?? TYPE_CONFIG.note;
}

function groupByDay(acts: CalActivity[]) {
  const groups: Record<string, CalActivity[]> = {};
  for (const a of acts) {
    const day = a.scheduled_at.slice(0, 10);
    if (!groups[day]) groups[day] = [];
    groups[day].push(a);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

function dayLabel(iso: string) {
  const d   = new Date(iso + "T00:00:00");
  const now = new Date();
  const today    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const dayDate  = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (+dayDate === +today)    return "Hoy";
  if (+dayDate === +tomorrow) return "Mañana";

  const diff = Math.round((+dayDate - +today) / 86_400_000);
  if (diff < 0) return `Hace ${-diff} día${-diff !== 1 ? "s" : ""}`;
  if (diff < 7) return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function isPast(iso: string) {
  return new Date(iso) < new Date();
}

function CompleteButton({ actId, onDone }: { actId: string; onDone: () => void }) {
  const [pending, startT] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startT(async () => {
        await fetch("/api/activity/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: actId }),
        });
        onDone();
      })}
      className="text-[10px] font-semibold px-2 py-1 rounded border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 transition-colors"
    >
      {pending ? "…" : "✓ Completar"}
    </button>
  );
}

interface Props {
  activities: CalActivity[];
  isOwner: boolean;
}

export function CalendarioClient({ activities: initial, isOwner }: Props) {
  const [activities, setActivities] = useState(initial);
  const [filter, setFilter]         = useState<"pending" | "completed" | "all">("pending");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const now = new Date();

  const filtered = activities.filter(a => {
    if (filter === "pending"   && a.completed_at) return false;
    if (filter === "completed" && !a.completed_at) return false;
    if (typeFilter !== "all" && a.type !== typeFilter) return false;
    return true;
  });

  const groups   = groupByDay(filtered.filter(a => a.scheduled_at));
  const overdue  = filtered.filter(a => !a.completed_at && isPast(a.scheduled_at));
  const upcoming = filtered.filter(a => !a.completed_at && !isPast(a.scheduled_at));

  function markComplete(id: string) {
    setActivities(prev => prev.map(a =>
      a.id === id ? { ...a, completed_at: new Date().toISOString() } : a
    ));
  }

  return (
    <div className="space-y-5">

      {/* Stats pills */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Pendientes", count: activities.filter(a => !a.completed_at).length, color: "bg-amber-50 text-amber-700" },
          { label: "Vencidas",   count: overdue.length,  color: "bg-red-50 text-red-700" },
          { label: "Esta semana", count: upcoming.filter(a => {
            const d = new Date(a.scheduled_at);
            const diff = Math.round((+d - +now) / 86_400_000);
            return diff >= 0 && diff < 7;
          }).length, color: "bg-blue-50 text-blue-700" },
          { label: "Completadas", count: activities.filter(a => a.completed_at).length, color: "bg-emerald-50 text-emerald-700" },
        ].map(s => (
          <div key={s.label} className={`px-3 py-2 rounded-xl ${s.color}`}>
            <p className="text-xl font-bold leading-none">{s.count}</p>
            <p className="text-[11px] font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex rounded-lg border border-[#E5E7EB] overflow-hidden shadow-sm">
          {(["pending", "all", "completed"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${filter === f ? "bg-[#8E0E1A] text-white" : "bg-white text-[#6B7280] hover:bg-[#F9FAFB]"}`}>
              {f === "pending" ? "Pendientes" : f === "completed" ? "Completadas" : "Todas"}
            </button>
          ))}
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="h-8 rounded-lg border border-[#E5E7EB] bg-white px-3 text-xs text-[#374151] focus:border-[#8E0E1A] focus:outline-none shadow-sm">
          <option value="all">Todos los tipos</option>
          {Object.entries(TYPE_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>
      </div>

      {/* Overdue alert */}
      {overdue.length > 0 && filter !== "completed" && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 flex items-center gap-3">
          <span className="text-red-500 text-lg">⚠️</span>
          <p className="text-sm text-red-700 font-medium">
            {overdue.length} actividad{overdue.length !== 1 ? "es" : ""} vencida{overdue.length !== 1 ? "s" : ""} sin completar
          </p>
        </div>
      )}

      {/* Empty state */}
      {groups.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#E5E7EB] py-16 text-center">
          <p className="text-sm font-medium text-[#0A0A0A]">Sin actividades</p>
          <p className="mt-1 text-xs text-[#9CA3AF]">Crea actividades con fecha en la ficha de un prospecto.</p>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-6">
        {groups.map(([day, acts]) => {
          const isToday    = day === new Date().toISOString().slice(0, 10);
          const isTomorrow = day === new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
          const dayPast    = day < new Date().toISOString().slice(0, 10);

          return (
            <div key={day}>
              {/* Day header */}
              <div className="flex items-center gap-3 mb-3">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
                  isToday    ? "bg-[#8E0E1A] text-white" :
                  isTomorrow ? "bg-amber-100 text-amber-800" :
                  dayPast    ? "bg-red-50 text-red-600" :
                               "bg-[#F3F4F6] text-[#374151]"
                }`}>
                  {dayPast && !isToday && <span>⚠️ </span>}
                  {dayLabel(day)}
                </div>
                <div className="flex-1 h-px bg-[#E5E7EB]" />
                <span className="text-[10px] text-[#9CA3AF]">{acts.length} acto.</span>
              </div>

              {/* Activities */}
              <div className="space-y-2 pl-2">
                {acts.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)).map(a => {
                  const cfg  = typeCfg(a.type);
                  const done = !!a.completed_at;
                  return (
                    <div key={a.id} className={`flex gap-3 rounded-xl border p-3 transition-all ${done ? "border-[#F3F4F6] bg-[#FAFAFA] opacity-60" : "border-[#E5E7EB] bg-white hover:border-[#8E0E1A]/20"}`}>

                      {/* Time */}
                      <div className="shrink-0 w-14 text-right">
                        <p className={`text-[12px] font-bold tabular-nums ${done ? "text-[#9CA3AF]" : "text-[#0A0A0A]"}`}>
                          {fmtTime(a.scheduled_at)}
                        </p>
                      </div>

                      {/* Dot */}
                      <div className="shrink-0 flex flex-col items-center pt-1">
                        <div className={`w-2.5 h-2.5 rounded-full ${done ? "bg-emerald-400" : cfg.bg.replace("bg-", "bg-")} border-2 ${done ? "border-emerald-300" : "border-white shadow-sm"}`}
                          style={{ background: done ? "#34d399" : undefined }} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                                {cfg.icon} {cfg.label}
                              </span>
                              {a.reminder_sent_1h  && <span className="text-[9px] text-[#9CA3AF]">✓ Recordatorio 1h</span>}
                              {a.reminder_sent_24h && !a.reminder_sent_1h && <span className="text-[9px] text-[#9CA3AF]">✓ Recordatorio 24h</span>}
                            </div>
                            <Link href={`/dashboard/prospectos/${a.prospecto_id}`}
                              className={`block mt-1 text-sm font-semibold leading-tight hover:text-[#8E0E1A] transition-colors ${done ? "line-through text-[#9CA3AF]" : "text-[#0A0A0A]"}`}>
                              {a.title}
                            </Link>
                            <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                              {a.prospecto_name}
                              {isOwner && a.delegate_name && ` · ${a.delegate_name}`}
                            </p>
                            {a.notes && (
                              <p className="mt-1 text-xs text-[#6B7280] truncate">{a.notes}</p>
                            )}
                          </div>
                          {!done && (
                            <CompleteButton actId={a.id} onDone={() => markComplete(a.id)} />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
