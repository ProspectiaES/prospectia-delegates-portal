"use client";

import { useState } from "react";
import Link from "next/link";

export interface EmailSendFull {
  id: string;
  prospecto_id: string;
  prospecto_name: string | null;
  prospecto_company: string | null;
  sender_name: string | null;
  to_email: string;
  subject: string;
  status: string;
  opens: number;
  clicks: number;
  sent_at: string | null;
  first_opened_at: string | null;
  last_opened_at: string | null;
  first_clicked_at: string | null;
  delivered_at: string | null;
  bounced_at: string | null;
  complained_at: string | null;
  bounce_type: string | null;
  created_at: string;
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  queued:    { label: "En cola",    color: "text-[#6B7280]",    bg: "bg-[#F9FAFB]",    dot: "bg-[#9CA3AF]"    },
  sent:      { label: "Enviado",    color: "text-blue-700",     bg: "bg-blue-50",      dot: "bg-blue-400"     },
  delivered: { label: "Entregado",  color: "text-teal-700",     bg: "bg-teal-50",      dot: "bg-teal-400"     },
  opened:    { label: "Abierto",    color: "text-emerald-700",  bg: "bg-emerald-50",   dot: "bg-emerald-400"  },
  clicked:   { label: "Click",      color: "text-purple-700",   bg: "bg-purple-50",    dot: "bg-purple-400"   },
  bounced:   { label: "Rebotado",   color: "text-red-700",      bg: "bg-red-50",       dot: "bg-red-400"      },
  complained:{ label: "Spam",       color: "text-orange-700",   bg: "bg-orange-50",    dot: "bg-orange-400"   },
  failed:    { label: "Fallado",    color: "text-red-700",      bg: "bg-red-50",       dot: "bg-red-400"      },
};

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

// ─── KPI cards ─────────────────────────────────────────────────────────────────

function KPICard({ label, value, sub, color, bg }: { label: string; value: string | number; sub?: string; color: string; bg: string }) {
  return (
    <div className={`rounded-xl p-4 ${bg}`}>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className={`text-xs font-semibold mt-0.5 ${color}`}>{label}</p>
      {sub && <p className="text-[10px] text-[#9CA3AF] mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Detail drawer ─────────────────────────────────────────────────────────────

function EmailDetail({ e, onClose }: { e: EmailSendFull; onClose: () => void }) {
  const s = STATUS[e.status] ?? STATUS.sent;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-white shadow-2xl overflow-y-auto flex flex-col">

        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-[#0A0A0A] leading-snug">{e.subject}</p>
            <p className="text-xs text-[#6B7280] mt-0.5">{e.to_email}</p>
          </div>
          <button onClick={onClose} className="shrink-0 text-[#9CA3AF] hover:text-[#0A0A0A] transition-colors mt-0.5">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 4l10 10M14 4L4 14" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 px-6 py-5 space-y-5">

          {/* Status badge */}
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${s.bg} ${s.color}`}>
            <span className={`w-2 h-2 rounded-full ${s.dot}`} />
            {s.label}
            {e.bounce_type && ` (${e.bounce_type === "hard" ? "definitivo" : "temporal"})`}
          </span>

          {/* Prospecto */}
          <div>
            <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1">Prospecto</p>
            <Link
              href={`/dashboard/prospectos/${e.prospecto_id}?tab=emails`}
              className="text-sm font-medium text-[#8E0E1A] hover:underline"
            >
              {e.prospecto_name ?? "—"}
            </Link>
            {e.prospecto_company && <p className="text-xs text-[#6B7280] mt-0.5">{e.prospecto_company}</p>}
          </div>

          {/* Timeline */}
          <div>
            <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">Línea de tiempo</p>
            <ol className="relative border-l-2 border-[#F3F4F6] space-y-4 ml-2">
              {[
                { label: "Enviado",          at: e.sent_at,          color: "bg-blue-400",    show: true },
                { label: "Entregado",        at: e.delivered_at,     color: "bg-teal-400",    show: !!e.delivered_at },
                { label: "Primera apertura", at: e.first_opened_at,  color: "bg-emerald-400", show: !!e.first_opened_at },
                { label: "Última apertura",  at: e.last_opened_at,   color: "bg-emerald-300", show: !!e.last_opened_at && e.last_opened_at !== e.first_opened_at },
                { label: "Primer click",     at: e.first_clicked_at, color: "bg-purple-400",  show: !!e.first_clicked_at },
                { label: "Rebotado",         at: e.bounced_at,       color: "bg-red-400",     show: !!e.bounced_at },
                { label: "Marcado spam",     at: e.complained_at,    color: "bg-orange-400",  show: !!e.complained_at },
              ].filter(t => t.show).map(t => (
                <li key={t.label} className="pl-5">
                  <span className={`absolute -left-[5px] w-2.5 h-2.5 rounded-full ${t.color}`} />
                  <p className="text-[11px] font-semibold text-[#374151]">{t.label}</p>
                  <p className="text-[10px] text-[#9CA3AF]">{fmt(t.at)}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Engagement */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-xl p-3 ${e.opens > 0 ? "bg-emerald-50" : "bg-[#F9FAFB]"}`}>
              <p className={`text-2xl font-bold ${e.opens > 0 ? "text-emerald-700" : "text-[#9CA3AF]"}`}>{e.opens}</p>
              <p className={`text-[11px] font-semibold mt-0.5 ${e.opens > 0 ? "text-emerald-700" : "text-[#9CA3AF]"}`}>
                {e.opens === 1 ? "Apertura" : "Aperturas"}
              </p>
            </div>
            <div className={`rounded-xl p-3 ${e.clicks > 0 ? "bg-purple-50" : "bg-[#F9FAFB]"}`}>
              <p className={`text-2xl font-bold ${e.clicks > 0 ? "text-purple-700" : "text-[#9CA3AF]"}`}>{e.clicks}</p>
              <p className={`text-[11px] font-semibold mt-0.5 ${e.clicks > 0 ? "text-purple-700" : "text-[#9CA3AF]"}`}>
                {e.clicks === 1 ? "Click" : "Clicks"}
              </p>
            </div>
          </div>

          {/* Meta */}
          <dl className="space-y-2 text-xs">
            {e.sender_name && (
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 font-semibold text-[#9CA3AF]">Enviado por</dt>
                <dd className="text-[#374151]">{e.sender_name}</dd>
              </div>
            )}
            <div className="flex gap-3">
              <dt className="w-24 shrink-0 font-semibold text-[#9CA3AF]">Para</dt>
              <dd className="text-[#374151] break-all">{e.to_email}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-24 shrink-0 font-semibold text-[#9CA3AF]">Fecha envío</dt>
              <dd className="text-[#374151]">{fmt(e.sent_at)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function EmailsDashboardClient({ emails }: { emails: EmailSendFull[] }) {
  const [search,   setSearch]   = useState("");
  const [statusF,  setStatusF]  = useState("all");
  const [selected, setSelected] = useState<EmailSendFull | null>(null);

  // KPI calculations
  const total     = emails.length;
  const opened    = emails.filter(e => e.opens > 0).length;
  const clicked   = emails.filter(e => e.clicks > 0).length;
  const bounced   = emails.filter(e => e.status === "bounced").length;
  const openRate  = total > 0 ? Math.round(opened  / total * 100) : 0;
  const clickRate = total > 0 ? Math.round(clicked / total * 100) : 0;

  // Filter
  const filtered = emails.filter(e => {
    if (statusF !== "all" && e.status !== statusF) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        e.subject.toLowerCase().includes(q) ||
        e.to_email.toLowerCase().includes(q) ||
        (e.prospecto_name ?? "").toLowerCase().includes(q) ||
        (e.sender_name ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Tracking de emails</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">Seguimiento de todos los emails enviados desde el CRM</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard label="Enviados"      value={total}                   color="text-blue-700"    bg="bg-blue-50"    />
        <KPICard label="Tasa apertura" value={`${openRate}%`}          sub={`${opened} abiertos`}   color="text-emerald-700" bg="bg-emerald-50" />
        <KPICard label="Tasa de click" value={`${clickRate}%`}         sub={`${clicked} con click`} color="text-purple-700"  bg="bg-purple-50"  />
        <KPICard label="Rebotados"     value={bounced}                  sub={total > 0 ? `${Math.round(bounced/total*100)}%` : undefined} color="text-red-700" bg="bg-red-50" />
      </div>

      {/* Status breakdown bar */}
      {total > 0 && (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
          <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">Distribución por estado</p>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(STATUS).map(([key, cfg]) => {
              const cnt = emails.filter(e => e.status === key).length;
              if (cnt === 0) return null;
              const pct = Math.round(cnt / total * 100);
              return (
                <button
                  key={key}
                  onClick={() => setStatusF(statusF === key ? "all" : key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${statusF === key ? `${cfg.bg} ${cfg.color} border-transparent` : "bg-white border-[#E5E7EB] text-[#6B7280] hover:border-[#9CA3AF]"}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                  <span className="font-bold">{cnt}</span>
                  <span className="opacity-60">({pct}%)</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar asunto, destinatario, prospecto…"
          className="h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0A0A0A] placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors w-72 shadow-sm"
        />
        <select
          value={statusF}
          onChange={e => setStatusF(e.target.value)}
          className="h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0A0A0A] focus:border-[#8E0E1A] focus:outline-none shadow-sm"
        >
          <option value="all">Todos los estados</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {(search || statusF !== "all") && (
          <button
            onClick={() => { setSearch(""); setStatusF("all"); }}
            className="h-9 px-3 rounded-lg border border-[#E5E7EB] text-xs text-[#6B7280] hover:bg-[#F9FAFB] transition-colors"
          >
            Limpiar
          </button>
        )}
        <span className="h-9 flex items-center text-xs text-[#9CA3AF]">{filtered.length} emails</span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E7EB] py-16 text-center">
          <p className="text-sm font-medium text-[#0A0A0A]">Sin emails{search || statusF !== "all" ? " para este filtro" : " enviados aún"}.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#F3F4F6] bg-[#F9FAFB]">
                  {["Estado", "Asunto", "Prospecto", "Para", "Enviado por", "Fecha", "Aperturas", "Clicks"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F9FAFB]">
                {filtered.map(e => {
                  const s = STATUS[e.status] ?? STATUS.sent;
                  return (
                    <tr
                      key={e.id}
                      className="hover:bg-[#FAFAFA] cursor-pointer"
                      onClick={() => setSelected(e)}
                    >
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 max-w-[220px]">
                        <p className="text-xs font-medium text-[#0A0A0A] truncate">{e.subject}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/dashboard/prospectos/${e.prospecto_id}?tab=emails`}
                          className="text-xs font-medium text-[#8E0E1A] hover:underline whitespace-nowrap"
                          onClick={ev => ev.stopPropagation()}
                        >
                          {e.prospecto_name ?? "—"}
                        </Link>
                        {e.prospecto_company && (
                          <p className="text-[10px] text-[#9CA3AF] truncate max-w-[140px]">{e.prospecto_company}</p>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[11px] text-[#6B7280] max-w-[160px] truncate">{e.to_email}</td>
                      <td className="px-4 py-2.5 text-[11px] text-[#9CA3AF] whitespace-nowrap">{e.sender_name ?? "—"}</td>
                      <td className="px-4 py-2.5 text-[11px] text-[#9CA3AF] tabular-nums whitespace-nowrap">{fmtDate(e.sent_at)}</td>
                      <td className="px-4 py-2.5">
                        {e.opens > 0
                          ? <span className="text-[11px] font-bold text-emerald-700">{e.opens}</span>
                          : <span className="text-[11px] text-[#D1D5DB]">—</span>
                        }
                      </td>
                      <td className="px-4 py-2.5">
                        {e.clicks > 0
                          ? <span className="text-[11px] font-bold text-purple-700">{e.clicks}</span>
                          : <span className="text-[11px] text-[#D1D5DB]">—</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {selected && <EmailDetail e={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
