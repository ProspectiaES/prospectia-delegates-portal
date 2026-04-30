"use client";

import { useState, useTransition } from "react";

export interface Template {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  body_text: string | null;
  created_at: string;
}

interface Props {
  templates: Template[];
  onSave: (fd: FormData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function TemplateForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Template;
  onSave: (fd: FormData) => Promise<void>;
  onCancel: () => void;
}) {
  const [pending, startT] = useTransition();

  return (
    <form
      action={(fd) => startT(async () => { await onSave(fd); onCancel(); })}
      className="bg-white rounded-xl border border-[#E5E7EB] p-5 space-y-4"
    >
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div>
        <label className="block text-xs font-semibold text-[#374151] mb-1.5">Nombre de la plantilla *</label>
        <input name="name" required defaultValue={initial?.name}
          placeholder="Seguimiento inicial, Propuesta, Reactivación…"
          className="w-full h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 shadow-sm" />
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#374151] mb-1.5">Asunto *</label>
        <input name="subject" required defaultValue={initial?.subject}
          placeholder="Asunto del email…"
          className="w-full h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 shadow-sm" />
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#374151] mb-1.5">
          Cuerpo (texto plano) *
          <span className="ml-2 font-normal text-[#9CA3AF]">Puedes usar {"{{nombre}}"}, {"{{empresa}}"}</span>
        </label>
        <textarea name="body_text" required rows={8}
          defaultValue={initial?.body_text ?? initial?.body_html.replace(/<[^>]+>/g, "") ?? ""}
          placeholder="Hola {{nombre}},&#10;&#10;Me pongo en contacto…"
          className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 shadow-sm resize-y" />
      </div>

      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={onCancel}
          className="h-9 px-4 rounded-lg border border-[#E5E7EB] bg-white text-sm font-medium text-[#6B7280] hover:border-[#0A0A0A] hover:bg-[#F9FAFB] transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={pending}
          className="h-9 px-4 rounded-lg bg-[#8E0E1A] text-sm font-semibold text-white hover:bg-[#6B0A14] disabled:opacity-50 transition-colors">
          {pending ? "Guardando…" : initial ? "Guardar cambios" : "Crear plantilla"}
        </button>
      </div>
    </form>
  );
}

export function PlantillasClient({ templates, onSave, onDelete }: Props) {
  const [creating, setCreating]   = useState(false);
  const [editing, setEditing]     = useState<string | null>(null);
  const [deleting, startDelT]     = useTransition();

  return (
    <div className="space-y-4">

      {!creating && (
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 h-9 px-4 rounded-lg bg-[#8E0E1A] text-sm font-semibold text-white hover:bg-[#6B0A14] transition-colors shadow-sm"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 2v10M2 7h10" strokeLinecap="round"/>
          </svg>
          Nueva plantilla
        </button>
      )}

      {creating && (
        <TemplateForm onSave={onSave} onCancel={() => setCreating(false)} />
      )}

      {templates.length === 0 && !creating ? (
        <div className="rounded-xl border border-dashed border-[#E5E7EB] py-16 text-center">
          <p className="text-sm font-medium text-[#0A0A0A]">Sin plantillas.</p>
          <p className="mt-1 text-xs text-[#9CA3AF]">Crea la primera para que los delegados puedan usarla.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(t => (
            <div key={t.id}>
              {editing === t.id ? (
                <TemplateForm initial={t} onSave={onSave} onCancel={() => setEditing(null)} />
              ) : (
                <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0A0A0A]">{t.name}</p>
                      <p className="text-xs text-[#6B7280] mt-0.5">{t.subject}</p>
                      <p className="mt-2 text-xs text-[#9CA3AF] line-clamp-2 whitespace-pre-wrap">
                        {t.body_text ?? t.body_html.replace(/<[^>]+>/g, "")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-[#9CA3AF]">{fmtDate(t.created_at)}</span>
                      <button onClick={() => setEditing(t.id)}
                        className="text-xs text-[#9CA3AF] hover:text-[#8E0E1A] px-2 py-1 rounded border border-[#E5E7EB] hover:border-[#8E0E1A] transition-colors">
                        Editar
                      </button>
                      <button
                        disabled={deleting}
                        onClick={() => startDelT(() => onDelete(t.id))}
                        className="text-xs text-[#9CA3AF] hover:text-red-600 px-2 py-1 rounded border border-[#E5E7EB] hover:border-red-200 transition-colors disabled:opacity-50">
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
