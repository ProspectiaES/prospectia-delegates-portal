import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityRow {
  id: string;
  user_id:     string | null;
  user_name:   string | null;
  event_type:  string;
  path:        string | null;
  action_name: string | null;
  duration_ms: number | null;
  metadata:    Record<string, unknown>;
  ip:          string | null;
  user_agent:  string | null;
  session_id:  string | null;
  created_at:  string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDur(ms: number | null): string {
  if (!ms || ms < 1000) return ms ? `${ms}ms` : "—";
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

function fmtDt(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function parseBrowser(ua: string | null): string {
  if (!ua) return "—";
  if (ua.includes("Edg/"))     return "Edge";
  if (ua.includes("OPR/"))     return "Opera";
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("Chrome/"))  return "Chrome";
  if (ua.includes("Safari/"))  return "Safari";
  return ua.slice(0, 20);
}

function parseDevice(ua: string | null): string {
  if (!ua) return "—";
  if (ua.includes("iPhone"))  return "📱 iPhone";
  if (ua.includes("Android")) return "📱 Android";
  if (ua.includes("iPad"))    return "📱 iPad";
  return "🖥 Escritorio";
}

const EVENT_BADGE: Record<string, string> = {
  login:     "bg-emerald-50 text-emerald-700",
  logout:    "bg-[#F3F4F6] text-[#6B7280]",
  page_view: "bg-blue-50 text-blue-700",
  action:    "bg-amber-50 text-amber-700",
};

const EVENT_LABEL: Record<string, string> = {
  login:     "Login",
  logout:    "Logout",
  page_view: "Página",
  action:    "Acción",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ user?: string; days?: string; type?: string }>;
}

export default async function AdminActivityPage({ searchParams }: PageProps) {
  const profile = await getProfile();
  if (profile?.role !== "OWNER") notFound();

  const { user: filterUser, days: filterDays, type: filterType } = await searchParams;

  const admin = createAdminClient();
  const daysBack = parseInt(filterDays ?? "7", 10);
  const since    = new Date(Date.now() - daysBack * 86_400_000).toISOString();

  let query = admin
    .from("user_activity_logs")
    .select("*")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(500);

  if (filterUser && filterUser !== "all") query = query.eq("user_id", filterUser);
  if (filterType && filterType !== "all") query = query.eq("event_type", filterType);

  const { data: rows } = await query;
  const logs = (rows ?? []) as ActivityRow[];

  // Users list for filter
  const { data: userRows } = await admin
    .from("user_activity_logs")
    .select("user_id, user_name")
    .gte("created_at", since)
    .not("user_id", "is", null);

  const uniqueUsers = Array.from(
    new Map((userRows ?? []).map(r => [r.user_id, r.user_name])).entries()
  ).map(([id, name]) => ({ id: id!, name: name ?? id! }))
   .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

  // Stats
  const totalSessions = new Set(logs.map(l => l.session_id).filter(Boolean)).size;
  const uniqueVisitors = new Set(logs.map(l => l.user_id).filter(Boolean)).size;
  const loginCount     = logs.filter(l => l.event_type === "login").length;
  const pageViews      = logs.filter(l => l.event_type === "page_view").length;

  // Top pages
  const pageCounts: Record<string, number> = {};
  for (const l of logs) {
    if (l.event_type === "page_view" && l.path) {
      pageCounts[l.path] = (pageCounts[l.path] ?? 0) + 1;
    }
  }
  const topPages = Object.entries(pageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Auditoría de actividad</h1>
          <p className="mt-1 text-sm text-[#6B7280]">Acceso exclusivo — Lluís Vila</p>
        </div>
        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-[#FEF2F2] text-[#8E0E1A] uppercase tracking-widest">PRIVADO</span>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Período</label>
          <select name="days" defaultValue={filterDays ?? "7"}
            className="h-8 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm text-[#374151] focus:outline-none focus:ring-1 focus:ring-[#8E0E1A]">
            <option value="1">Hoy</option>
            <option value="7">Últimos 7 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="90">Últimos 90 días</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Usuario</label>
          <select name="user" defaultValue={filterUser ?? "all"}
            className="h-8 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm text-[#374151] focus:outline-none focus:ring-1 focus:ring-[#8E0E1A]">
            <option value="all">Todos</option>
            {uniqueUsers.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Tipo</label>
          <select name="type" defaultValue={filterType ?? "all"}
            className="h-8 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm text-[#374151] focus:outline-none focus:ring-1 focus:ring-[#8E0E1A]">
            <option value="all">Todos</option>
            <option value="login">Login</option>
            <option value="logout">Logout</option>
            <option value="page_view">Páginas</option>
            <option value="action">Acciones</option>
          </select>
        </div>
        <button type="submit"
          className="h-8 px-4 rounded-lg bg-[#8E0E1A] text-xs font-semibold text-white hover:bg-[#6B0A14] transition-colors">
          Filtrar
        </button>
      </form>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Sesiones", value: totalSessions,   bg: "bg-blue-50",    text: "text-blue-700"    },
          { label: "Visitantes",value: uniqueVisitors, bg: "bg-purple-50",  text: "text-purple-700"  },
          { label: "Logins",    value: loginCount,     bg: "bg-emerald-50", text: "text-emerald-700" },
          { label: "Páginas vistas", value: pageViews, bg: "bg-amber-50",   text: "text-amber-700"   },
        ].map(k => (
          <div key={k.label} className={`rounded-xl p-4 ${k.bg}`}>
            <p className={`text-2xl font-bold ${k.text}`}>{k.value}</p>
            <p className={`text-xs font-medium mt-0.5 ${k.text}`}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Top pages */}
      {topPages.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
          <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">Páginas más visitadas</p>
          <div className="space-y-2">
            {topPages.map(([path, count]) => (
              <div key={path} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#374151] font-mono truncate">{path}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="h-2 rounded-full bg-[#8E0E1A]" style={{ width: `${Math.round((count / topPages[0][1]) * 80) + 20}px` }} />
                  <span className="text-xs font-bold text-[#0A0A0A] w-6 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#F3F4F6] flex items-center justify-between">
          <p className="text-sm font-semibold text-[#0A0A0A]">Log completo</p>
          <p className="text-xs text-[#9CA3AF]">{logs.length} eventos</p>
        </div>
        {logs.length === 0 ? (
          <p className="px-5 py-8 text-sm text-center text-[#9CA3AF]">Sin actividad en el período seleccionado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#F3F4F6] bg-[#F9FAFB]">
                  {["Fecha/Hora", "Usuario", "Tipo", "Ruta / Acción", "Duración", "IP", "Dispositivo", "Navegador"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F9FAFB]">
                {logs.map(l => (
                  <tr key={l.id} className="hover:bg-[#FAFAFA]">
                    <td className="px-4 py-2.5 text-xs text-[#6B7280] whitespace-nowrap tabular-nums">{fmtDt(l.created_at)}</td>
                    <td className="px-4 py-2.5 text-xs font-medium text-[#0A0A0A] whitespace-nowrap">{l.user_name ?? "—"}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${EVENT_BADGE[l.event_type] ?? "bg-[#F3F4F6] text-[#6B7280]"}`}>
                        {EVENT_LABEL[l.event_type] ?? l.event_type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[#374151] font-mono max-w-[240px] truncate">{l.action_name ?? l.path ?? "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-[#9CA3AF] whitespace-nowrap tabular-nums">{fmtDur(l.duration_ms)}</td>
                    <td className="px-4 py-2.5 text-xs text-[#9CA3AF] font-mono whitespace-nowrap">{l.ip ?? "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-[#9CA3AF] whitespace-nowrap">{parseDevice(l.user_agent)}</td>
                    <td className="px-4 py-2.5 text-xs text-[#9CA3AF] whitespace-nowrap">{parseBrowser(l.user_agent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
