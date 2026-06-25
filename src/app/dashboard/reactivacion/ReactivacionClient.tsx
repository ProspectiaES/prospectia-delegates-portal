"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import {
  saveEmailDraft, authorizeReactivation, markNoContactar, markResueltoManualmente, assignClientTemplate, sendReactivationNow,
} from "@/app/actions/reactivacion";
import { renderTemplate, buildUltimaCompraClause, firstName, type EmailLang, type LastOrderInfo } from "@/lib/email-template-render";

export interface TemplateOption {
  id: string;
  name: string;
  subject: string;
  body_text: string;
  language: EmailLang;
  is_default: boolean;
}

export interface ReactivacionRow {
  id: string;
  clientId: string;
  entityType: string;
  clientName: string;
  clientEmail: string | null;
  status: string;
  daysInactive: number | null;
  dormancyStatus: string;
  antiguitySegment: string | null;
  volumeSegment: string;
  lifetimeRevenue: number;
  delegateName: string;
  createdAt: string;
  authorizedAt: string | null;
  language: EmailLang;
  templateId: string | null;
  lastOrder: LastOrderInfo | null;
  emailText: string;
}

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 0 }).format(n);

const DORMANCY_BADGE: Record<string, string> = {
  dormido:  "bg-amber-50 text-amber-700 border-amber-200",
  perdido:  "bg-red-50 text-[#8E0E1A] border-red-200",
  inactivo: "bg-amber-50 text-amber-700 border-amber-200",
};

const VOLUME_BADGE: Record<string, string> = {
  alto:  "bg-emerald-50 text-emerald-700",
  medio: "bg-blue-50 text-blue-700",
  bajo:  "bg-[#F3F4F6] text-[#6B7280]",
  sin_volumen: "bg-[#F3F4F6] text-[#9CA3AF]",
};

const ANTIGUITY_LABEL: Record<string, string> = {
  nuevo: "Nuevo", establecido: "Establecido", veterano: "Veterano",
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pendiente:  { label: "Pendiente",  cls: "bg-amber-100 text-amber-700" },
  autorizado: { label: "Autorizado", cls: "bg-blue-100 text-blue-700" },
  enviado:    { label: "Enviado",    cls: "bg-emerald-100 text-emerald-700" },
};

function Row({ row, templatesByLang }: { row: ReactivacionRow; templatesByLang: Record<EmailLang, TemplateOption[]> }) {
  const [open, setOpen]           = useState(false);
  const [lang, setLang]           = useState<EmailLang>(row.language);
  const [templateId, setTemplateId] = useState<string | null>(row.templateId);
  const [emailText, setEmailText] = useState(row.emailText);
  const [preview, setPreview]     = useState(false);
  const [pending, startTr]        = useTransition();
  const [savedAt, setSavedAt]     = useState<number | null>(null);
  const [pinnedAt, setPinnedAt]   = useState<number | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  // Debounced autosave (2s) — text, idioma i plantilla escollida
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      startTr(async () => {
        await saveEmailDraft(row.id, emailText, lang, templateId);
        setSavedAt(Date.now());
      });
    }, 2000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailText, lang, templateId]);

  function regenerate(newLang: EmailLang, newTemplateId: string | null) {
    const tpl = templatesByLang[newLang].find(t => t.id === newTemplateId) ?? null;
    if (!tpl) return;
    const rendered = renderTemplate(tpl.body_text, {
      nombre: firstName(row.clientName),
      delegado: row.delegateName,
      ultima_compra: buildUltimaCompraClause(newLang, row.lastOrder),
    });
    setEmailText(rendered);
  }

  function handleLangChange(newLang: EmailLang) {
    setLang(newLang);
    const defaultTpl = templatesByLang[newLang].find(t => t.is_default) ?? templatesByLang[newLang][0] ?? null;
    setTemplateId(defaultTpl?.id ?? null);
    regenerate(newLang, defaultTpl?.id ?? null);
  }

  function handleTemplateChange(newTemplateId: string) {
    setTemplateId(newTemplateId);
    regenerate(lang, newTemplateId);
  }

  function handlePinTemplate() {
    if (!templateId) return;
    startTr(async () => {
      await assignClientTemplate(row.clientId, lang, templateId);
      setPinnedAt(Date.now());
    });
  }

  function handleAuthorize() {
    setSendError(null);
    startTr(async () => {
      const res = await authorizeReactivation(row.id, emailText, lang, templateId);
      if (res.error) setSendError(res.error);
    });
  }
  function handleSendNow() {
    if (!confirm(`¿Enviar el email de reactivación a ${row.clientName} ahora? Esta acción no se puede deshacer.`)) return;
    setSendError(null);
    startTr(async () => {
      const res = await sendReactivationNow(row.id);
      if (res.error) setSendError(res.error);
    });
  }
  function handleNoContactar() {
    if (!confirm(`¿Marcar a ${row.clientName} como "no contactar"? Se cerrará este ciclo de reactivación.`)) return;
    startTr(async () => { await markNoContactar(row.id); });
  }
  function handleResuelto() {
    if (!confirm(`¿Marcar a ${row.clientName} como resuelto manualmente?`)) return;
    startTr(async () => { await markResueltoManualmente(row.id); });
  }

  const statusCfg = STATUS_BADGE[row.status] ?? { label: row.status, cls: "bg-gray-100 text-gray-600" };
  const severity  = (row.daysInactive ?? 0) > 150 ? "text-[#8E0E1A] font-bold" : "text-amber-700 font-semibold";
  const editable  = row.status === "pendiente";

  return (
    <div className="border-b border-[#F3F4F6] last:border-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[#F9FAFB] transition-colors text-left"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
          className={`shrink-0 text-[#9CA3AF] transition-transform ${open ? "rotate-90" : ""}`}>
          <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#0A0A0A] truncate">{row.clientName}</p>
          <p className="text-[11px] text-[#9CA3AF]">{row.entityType === "afiliado" ? "Afiliado" : "Cliente"}</p>
        </div>

        <span className={`text-xs tabular-nums shrink-0 w-20 text-right ${severity}`}>
          {row.daysInactive ?? "—"} días
        </span>

        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${DORMANCY_BADGE[row.dormancyStatus] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>
          {row.dormancyStatus}
        </span>

        {row.antiguitySegment && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280] shrink-0 hidden sm:inline">
            {ANTIGUITY_LABEL[row.antiguitySegment] ?? row.antiguitySegment}
          </span>
        )}

        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 hidden md:inline ${VOLUME_BADGE[row.volumeSegment]}`}>
          {fmtEuro(row.lifetimeRevenue)}
        </span>

        <span className="text-xs text-[#6B7280] shrink-0 w-28 truncate hidden lg:inline">{row.delegateName}</span>

        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${statusCfg.cls}`}>
          {statusCfg.label}
        </span>
      </button>

      {open && (
        <div className="px-5 pb-4 space-y-3 bg-[#FAFAFA]">

          {/* Idioma + plantilla */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 bg-white border border-[#E5E7EB] rounded-lg p-0.5">
              {(["es", "ca"] as const).map(l => (
                <button key={l} onClick={() => editable && handleLangChange(l)} disabled={!editable}
                  className={`text-xs font-semibold px-3 py-1 rounded-md transition-colors ${
                    lang === l ? "bg-[#8E0E1A] text-white" : "text-[#6B7280] hover:bg-[#F3F4F6]"
                  }`}>
                  {l === "es" ? "Español" : "Català"}
                </button>
              ))}
            </div>

            <select
              value={templateId ?? ""}
              onChange={e => editable && handleTemplateChange(e.target.value)}
              disabled={!editable}
              className="text-xs border border-[#E5E7EB] rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-[#8E0E1A] disabled:bg-[#F3F4F6]"
            >
              {templatesByLang[lang].map(t => (
                <option key={t.id} value={t.id}>{t.name}{t.is_default ? " (por defecto)" : ""}</option>
              ))}
            </select>

            {editable && (
              <button onClick={handlePinTemplate} disabled={pending || !templateId}
                className="text-[11px] font-medium text-[#6B7280] hover:text-[#8E0E1A] underline-offset-2 hover:underline disabled:opacity-50">
                {pinnedAt ? "✓ Fijada para este cliente" : "Usar siempre para este cliente"}
              </button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
              Email de reactivación {row.clientEmail ? `→ ${row.clientEmail}` : ""}
            </p>
            <button onClick={() => setPreview(p => !p)} className="text-xs font-medium text-[#8E0E1A] hover:underline">
              {preview ? "Editar" : "Vista previa"}
            </button>
          </div>

          {preview ? (
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 text-sm text-[#374151] whitespace-pre-wrap">
              {emailText}
            </div>
          ) : (
            <textarea
              value={emailText}
              onChange={e => setEmailText(e.target.value)}
              rows={7}
              disabled={!editable}
              className="w-full text-sm text-[#374151] border border-[#E5E7EB] rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-[#8E0E1A] disabled:bg-[#F3F4F6] disabled:text-[#9CA3AF]"
            />
          )}

          {sendError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              ⚠ {sendError}
            </p>
          )}

          <div className="flex items-center justify-between">
            <p className="text-[10px] text-[#9CA3AF]">
              {pending ? "Guardando…" : savedAt ? "Guardado" : ""}
            </p>
            <div className="flex items-center gap-2">
              {row.status === "pendiente" && (
                <>
                  <button onClick={handleNoContactar} disabled={pending}
                    className="text-xs font-medium text-[#6B7280] hover:text-[#374151] px-3 py-1.5 rounded-lg border border-[#E5E7EB] hover:bg-white transition-colors disabled:opacity-50">
                    No contactar
                  </button>
                  <button onClick={handleResuelto} disabled={pending}
                    className="text-xs font-medium text-[#6B7280] hover:text-emerald-700 px-3 py-1.5 rounded-lg border border-[#E5E7EB] hover:bg-white transition-colors disabled:opacity-50">
                    Resuelto manualmente
                  </button>
                  <button onClick={handleAuthorize} disabled={pending}
                    className="text-xs font-bold text-white bg-[#8E0E1A] hover:bg-[#6B0A14] px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                    Autorizar
                  </button>
                </>
              )}
              {row.status === "autorizado" && (
                <>
                  <span className="text-xs text-blue-700 font-medium">
                    Autorizado {row.authorizedAt ? `el ${new Date(row.authorizedAt).toLocaleDateString("es-ES")}` : ""}
                  </span>
                  <button onClick={handleSendNow} disabled={pending}
                    className="text-xs font-bold text-white bg-[#8E0E1A] hover:bg-[#6B0A14] px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                    Enviar ahora
                  </button>
                </>
              )}
              {row.status === "enviado" && (
                <span className="text-xs text-emerald-700 font-medium">
                  ✓ Email enviado
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ReactivacionClient({
  rows, templatesByLang,
}: { rows: ReactivacionRow[]; templatesByLang: Record<EmailLang, TemplateOption[]>; isOwner: boolean }) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB] flex items-center gap-3 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">
        <span className="w-3" />
        <span className="flex-1">Cliente</span>
        <span className="w-20 text-right">Inactivo</span>
        <span className="w-24 text-center">Estado</span>
        <span className="hidden sm:inline w-20 text-center">Antigüedad</span>
        <span className="hidden md:inline w-16 text-center">Valor</span>
        <span className="hidden lg:inline w-28">Delegado</span>
        <span className="w-20 text-center">Ciclo</span>
      </div>
      <div>
        {rows.map(r => <Row key={r.id} row={r} templatesByLang={templatesByLang} />)}
      </div>
    </div>
  );
}
