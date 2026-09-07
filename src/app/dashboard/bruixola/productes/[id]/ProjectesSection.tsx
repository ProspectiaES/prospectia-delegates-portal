"use client";

import { useState, useTransition, useActionState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  saveProjecteNegoci, deleteProjecteNegoci,
  type ProjecteNegoci, type EstatProjecteNegoci,
} from "@/app/actions/bruixola-negoci";

const ESTAT_LABEL: Record<EstatProjecteNegoci, string> = {
  actiu: "Actiu", pausat: "Pausat", aturat: "Aturat", completat: "Completat",
};
const ESTAT_VARIANT: Record<EstatProjecteNegoci, "success" | "warning" | "danger" | "neutral"> = {
  actiu: "success", pausat: "warning", aturat: "danger", completat: "neutral",
};

function ProjecteForm({ producteId, initial, onClose }: { producteId: string; initial?: ProjecteNegoci; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(saveProjecteNegoci, null);
  if (state?.success) { onClose(); return null; }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full" onClick={e => e.stopPropagation()}>
        <form action={formAction} className="p-5 space-y-3">
          <h3 className="text-sm font-semibold text-[#0A0A0A]">{initial ? "Editar projecte" : "Nou projecte (mercat)"}</h3>
          <input type="hidden" name="producte_id" value={producteId} />
          {initial && <input type="hidden" name="id" value={initial.id} />}
          {state?.error && <p className="text-xs text-[#8E0E1A] bg-red-50 rounded-lg px-3 py-2">{state.error}</p>}

          <div>
            <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Mercat (país) *</label>
            <input name="mercat" defaultValue={initial?.mercat} required placeholder="Ex: España, Irán, Kenia…"
              className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A]" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Nom (opcional)</label>
            <input name="nom" defaultValue={initial?.nom ?? ""} placeholder="Per defecte: Producte — Mercat"
              className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Estat</label>
            <select name="estat" defaultValue={initial?.estat ?? "actiu"}
              className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20">
              {Object.entries(ESTAT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Notes</label>
            <textarea name="notes" defaultValue={initial?.notes ?? ""} rows={2}
              className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
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

export function ProjectesSection({ producteId, projectes }: { producteId: string; projectes: ProjecteNegoci[] }) {
  const [modal, setModal] = useState<{ open: boolean; initial?: ProjecteNegoci }>({ open: false });
  const [, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Projectes / mercats ({projectes.length})</CardTitle>
        <Button size="sm" onClick={() => setModal({ open: true })}>+ Nou projecte</Button>
      </CardHeader>
      <CardContent>
        {projectes.length === 0 ? (
          <p className="text-sm text-[#9CA3AF]">Cap projecte registrat encara.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {projectes.map(pr => (
              <div key={pr.id} className="rounded-lg border border-[#E5E7EB] p-3">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/dashboard/bruixola/projectes/${pr.id}`} className="min-w-0">
                    <p className="text-sm font-semibold text-[#0A0A0A] hover:text-[#8E0E1A] transition-colors">
                      {pr.nom || pr.mercat}
                    </p>
                    <p className="text-xs text-[#6B7280]">{pr.mercat}</p>
                  </Link>
                  <Badge variant={ESTAT_VARIANT[pr.estat]}>{ESTAT_LABEL[pr.estat]}</Badge>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setModal({ open: true, initial: pr })} className="text-xs text-[#6B7280] hover:text-[#0A0A0A]">Editar</button>
                  <button
                    onClick={() => { if (confirm(`Eliminar "${pr.mercat}"?`)) startTransition(async () => { await deleteProjecteNegoci(pr.id, producteId); }); }}
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
      {modal.open && <ProjecteForm producteId={producteId} initial={modal.initial} onClose={() => setModal({ open: false })} />}
    </Card>
  );
}
