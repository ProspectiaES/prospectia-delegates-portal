"use client";

import { useState, useTransition, useActionState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { savePersona, deletePersona, type Persona } from "@/app/actions/bruixola-negoci";

function PersonaForm({ organitzacioId, initial, onClose }: { organitzacioId: string; initial?: Persona; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(savePersona, null);
  if (state?.success) { onClose(); return null; }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full" onClick={e => e.stopPropagation()}>
        <form action={formAction} className="p-5 space-y-3">
          <h3 className="text-sm font-semibold text-[#0A0A0A]">{initial ? "Editar contacte" : "Nou contacte"}</h3>
          <input type="hidden" name="organitzacio_id" value={organitzacioId} />
          {initial && <input type="hidden" name="id" value={initial.id} />}
          {state?.error && <p className="text-xs text-[#8E0E1A] bg-red-50 rounded-lg px-3 py-2">{state.error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Nom *</label>
              <input name="nom" defaultValue={initial?.nom} required className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A]" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Cognoms</label>
              <input name="cognoms" defaultValue={initial?.cognoms ?? ""} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Càrrec</label>
            <input name="carrec" defaultValue={initial?.carrec ?? ""} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Email</label>
            <input name="email" type="email" defaultValue={initial?.email ?? ""} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Telèfon</label>
              <input name="telefon" defaultValue={initial?.telefon ?? ""} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Mòbil</label>
              <input name="mobil" defaultValue={initial?.mobil ?? ""} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Notes</label>
            <textarea name="notes" defaultValue={initial?.notes ?? ""} rows={2} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel·lar</Button>
            <Button type="submit" disabled={pending}>{pending ? "Desant…" : "Desar"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function PersonesSection({ organitzacioId, persones }: { organitzacioId: string; persones: Persona[] }) {
  const [modal, setModal] = useState<{ open: boolean; initial?: Persona }>({ open: false });
  const [, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Persones de contacte ({persones.length})</CardTitle>
        <Button size="sm" onClick={() => setModal({ open: true })}>+ Nou contacte</Button>
      </CardHeader>
      <CardContent>
        {persones.length === 0 ? (
          <p className="text-sm text-[#9CA3AF]">Cap contacte registrat.</p>
        ) : (
          <div className="space-y-3">
            {persones.map(p => (
              <div key={p.id} className="flex items-start justify-between gap-4 pb-3 border-b border-[#F3F4F6] last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-semibold text-[#0A0A0A]">{p.nom} {p.cognoms}</p>
                  {p.carrec && <p className="text-xs text-[#6B7280]">{p.carrec}</p>}
                  <p className="text-xs text-[#9CA3AF]">{[p.email, p.telefon, p.mobil].filter(Boolean).join(" · ")}</p>
                </div>
                <div className="flex gap-3 shrink-0">
                  <button onClick={() => setModal({ open: true, initial: p })} className="text-xs text-[#6B7280] hover:text-[#0A0A0A]">Editar</button>
                  <button
                    onClick={() => { if (confirm(`Eliminar "${p.nom}"?`)) startTransition(async () => { await deletePersona(p.id, organitzacioId); }); }}
                    className="text-xs text-[#6B7280] hover:text-[#8E0E1A]"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      {modal.open && <PersonaForm organitzacioId={organitzacioId} initial={modal.initial} onClose={() => setModal({ open: false })} />}
    </Card>
  );
}
