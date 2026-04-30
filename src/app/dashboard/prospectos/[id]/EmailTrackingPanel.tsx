"use client";

import { useState } from "react";

export interface EmailSendRow {
  id: string;
  to_email: string;
  subject: string;
  status: string;
  opens: number;
  clicks: number;
  sent_at: string | null;
  first_opened_at: string | null;
  last_opened_at: string | null;
  first_clicked_at: string | null;
  last_clicked_at: string | null;
  delivered_at: string | null;
  bounced_at: string | null;
  complained_at: string | null;
  bounce_type: string | null;
  sender_name: string | null;
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  queued:     { label: "En cola",   color: "text-[#6B7280]",   bg: "bg-[#F9FAFB]",   icon: "⏳" },
  sent:       { label: "Enviado",   color: "text-blue-700",    bg: "bg-blue-50",     icon: "✉️" },
  delivered:  { label: "Entregado", color: "text-teal-700",    bg: "bg-teal-50",     icon: "✓"  },
  opened:     { label: "Abierto",   color: "text-emerald-700", bg: "bg-emerald-50",  icon: "👁" },
  clicked:    { label: "Click",     color: "text-purple-700",  bg: "bg-purple-50",   icon: "🔗" },
  bounced:    { label: "Rebotado",  color: "text-red-700",     bg: "bg-red-50",      icon: "⚠️" },
  complained: { label: "Spam",      color: "text-orange-700",  bg: "bg-orange-50",   icon: "🚫" },
  failed:     { label: "Fallado",   color: "text-red-700",     bg: "bg-red-50",      icon: "✕"  },
};

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function EngagementBar({ opens, clicks }: { opens: number; clicks: number }) {
  const hasActivity = opens > 0 || clicks > 0;
  if (!hasActivity) return <span className="text-[11px] text-[#9CA3AF]">Sin interacción</span>;

  return (
    <div className="flex items-center gap-3">
      {opens > 0 && (
        <div className="flex items-center gap-1">
          <span className="text-sm">👁</span>
          <span className="text-[11px] font-bold text-emerald-700">{opens}</span>
          <span className="text-[10px] text-[#9CA3AF]">{opens === 1 ? "apertura" : "aperturas"}</span>
        </div>
      )}
      {clicks > 0 && (
        <div className="flex items-center gap-1">
          <span className="text-sm">🔗</span>
          <span className="text-[11px] font-bold text-purple-700">{clicks}</span>
          <span className="text-[10px] text-[#9CA3AF]">{clicks === 1 ? "click" : "clicks"}</span>
        </div>
      )}
    </div>
  );
}

interface Props {
  emails: EmailSendRow[];
}

export function EmailTrackingPanel({ emails }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (emails.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-[#9CA3AF]">Sin emails enviados.</p>
        <p className="text-xs text-[#9CA3AF] mt-1">Usa el formulario de actividad para enviar emails con tracking.</p>
      </div>
    );
  }

  const totalOpens  = emails.reduce((s, e) => s + e.opens, 0);
  const totalClicks = emails.reduce((s, e) => s + e.clicks, 0);
  const openRate    = emails.filter(e => e.opens > 0).length;

  return (
    <div className="space-y-4">

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Enviados",  value: emails.length,  color: "text-blue-700",    bg: "bg-blue-50"    },
          { label: "Aperturas", value: totalOpens,     color: "text-emerald-700", bg: "bg-emerald-50" },
          { label: "Clicks",    value: totalClicks,    color: "text-purple-700",  bg: "bg-purple-50"  },
        ].map(k => (
          <div key={k.label} className={`rounded-xl p-3 ${k.bg}`}>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            <p className={`text-[11px] font-medium mt-0.5 ${k.color}`}>{k.label}</p>
          </div>
        ))}
      </div>

      {openRate > 0 && (
        <p className="text-xs text-[#6B7280]">
          {openRate} de {emails.length} email{emails.length !== 1 ? "s" : ""} abierto{openRate !== 1 ? "s" : ""} ({Math.round(openRate / emails.length * 100)}% tasa de apertura)
        </p>
      )}

      {/* Email list */}
      <div className="space-y-2">
        {emails.map(e => {
          const cfg  = STATUS_CFG[e.status] ?? STATUS_CFG.sent;
          const open = expanded === e.id;

          return (
            <div key={e.id} className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden">
              <button
                onClick={() => setExpanded(open ? null : e.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#FAFAFA] transition-colors text-left"
              >
                {/* Status badge */}
                <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                  {cfg.icon} {cfg.label}
                </span>

                {/* Subject */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0A0A0A] truncate">{e.subject}</p>
                  <p className="text-[11px] text-[#9CA3AF] mt-0.5">{fmtDateTime(e.sent_at)}</p>
                </div>

                {/* Engagement */}
                <div className="shrink-0">
                  <EngagementBar opens={e.opens} clicks={e.clicks} />
                </div>

                {/* Chevron */}
                <svg
                  width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor"
                  strokeWidth="1.5" className={`shrink-0 text-[#9CA3AF] transition-transform ${open ? "rotate-180" : ""}`}
                >
                  <path d="M3 5l4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {/* Expanded detail */}
              {open && (
                <div className="px-4 pb-4 border-t border-[#F3F4F6] bg-[#FAFAFA] space-y-3">
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-2 mt-3">
                    <div>
                      <dt className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Para</dt>
                      <dd className="text-xs text-[#374151] mt-0.5">{e.to_email}</dd>
                    </div>
                    {e.sender_name && (
                      <div>
                        <dt className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Enviado por</dt>
                        <dd className="text-xs text-[#374151] mt-0.5">{e.sender_name}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Enviado</dt>
                      <dd className="text-xs text-[#374151] mt-0.5">{fmtDateTime(e.sent_at)}</dd>
                    </div>
                    {e.delivered_at && (
                      <div>
                        <dt className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Entregado</dt>
                        <dd className="text-xs text-teal-700 font-medium mt-0.5">{fmtDateTime(e.delivered_at)}</dd>
                      </div>
                    )}
                    {e.bounced_at && (
                      <div>
                        <dt className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Rebotado</dt>
                        <dd className="text-xs text-red-700 font-medium mt-0.5">
                          {fmtDateTime(e.bounced_at)}
                          {e.bounce_type && <span className="ml-1 text-[10px]">({e.bounce_type === "hard" ? "definitivo" : "temporal"})</span>}
                        </dd>
                      </div>
                    )}
                    {e.first_opened_at && (
                      <div>
                        <dt className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Primera apertura</dt>
                        <dd className="text-xs text-emerald-700 font-medium mt-0.5">{fmtDateTime(e.first_opened_at)}</dd>
                      </div>
                    )}
                    {e.last_opened_at && e.last_opened_at !== e.first_opened_at && (
                      <div>
                        <dt className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Última apertura</dt>
                        <dd className="text-xs text-[#374151] mt-0.5">{fmtDateTime(e.last_opened_at)}</dd>
                      </div>
                    )}
                    {e.first_clicked_at && (
                      <div>
                        <dt className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Primer click</dt>
                        <dd className="text-xs text-purple-700 font-medium mt-0.5">{fmtDateTime(e.first_clicked_at)}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Aperturas totales</dt>
                      <dd className={`text-xs font-bold mt-0.5 ${e.opens > 0 ? "text-emerald-700" : "text-[#9CA3AF]"}`}>{e.opens}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Clicks totales</dt>
                      <dd className={`text-xs font-bold mt-0.5 ${e.clicks > 0 ? "text-purple-700" : "text-[#9CA3AF]"}`}>{e.clicks}</dd>
                    </div>
                  </dl>

                  {/* Timeline visual */}
                  {(e.delivered_at || e.first_opened_at || e.first_clicked_at || e.bounced_at) && (
                    <div className="mt-2">
                      <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">Línea de tiempo</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="w-2 h-2 rounded-full bg-blue-400" />
                          <span className="text-[#6B7280]">Enviado</span>
                          <span className="font-medium text-[#374151]">{fmtDateTime(e.sent_at)}</span>
                        </div>
                        {e.delivered_at && (
                          <>
                            <span className="text-[#E5E7EB]">→</span>
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="w-2 h-2 rounded-full bg-teal-400" />
                              <span className="text-[#6B7280]">Entregado</span>
                              <span className="font-medium text-teal-700">{fmtDateTime(e.delivered_at)}</span>
                            </div>
                          </>
                        )}
                        {e.first_opened_at && (
                          <>
                            <span className="text-[#E5E7EB]">→</span>
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="w-2 h-2 rounded-full bg-emerald-400" />
                              <span className="text-[#6B7280]">Abierto</span>
                              <span className="font-medium text-emerald-700">{fmtDateTime(e.first_opened_at)}</span>
                            </div>
                          </>
                        )}
                        {e.first_clicked_at && (
                          <>
                            <span className="text-[#E5E7EB]">→</span>
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="w-2 h-2 rounded-full bg-purple-400" />
                              <span className="text-[#6B7280]">Click</span>
                              <span className="font-medium text-purple-700">{fmtDateTime(e.first_clicked_at)}</span>
                            </div>
                          </>
                        )}
                        {e.bounced_at && (
                          <>
                            <span className="text-[#E5E7EB]">→</span>
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="w-2 h-2 rounded-full bg-red-400" />
                              <span className="text-[#6B7280]">Rebotado</span>
                              <span className="font-medium text-red-700">{fmtDateTime(e.bounced_at)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
